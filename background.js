// background.js — Handles LLM API calls (runs outside page CSP)

// ─── System prompt factory ────────────────────────────────────────────────────
// The LLM decides how many bullets are needed and how long each one is.
// Only format consistency is enforced.

function buildSystemPrompt() {
    return `You are a precise summarization engine.

Your ONLY job: read the provided text and return a summary as bullet points.

══════════════════════════════════════════
MANDATORY FORMAT RULES (no exceptions):
══════════════════════════════════════════
1. Output ONLY the bullet points — no title, no intro, no conclusion, no commentary.
2. Every bullet point MUST start with the "•" character followed by a single space.
3. Each bullet point occupies exactly ONE line.
4. Write as many bullets as the content genuinely requires — no padding, no omissions.
5. Each bullet should be as long as needed to convey the point clearly and completely.
6. No sub-bullets, no indentation, no nesting.
7. No markdown (no **bold**, no _italic_, no headers, no code blocks).
8. No numbering alongside the bullet symbol.

══════════════════════════════════════════
CONTENT RULES:
══════════════════════════════════════════
• Order bullets from MOST important → LEAST important.
• Each bullet must cover a DISTINCT aspect; zero redundancy between bullets.
• Begin each bullet with a strong action verb OR a key noun phrase.
• Use plain, direct language — no filler words, no hedging.
• Preserve names, figures, dates, and technical terms accurately.

Now produce the summary for the text provided by the user.`;
}

// ─── Provider adapters ────────────────────────────────────────────────────────

function buildRequest(provider, settings, text) {
    const { apiKey, model, baseUrl } = settings;
    const systemPrompt = buildSystemPrompt();
    const userMessage = `Summarize the following page text:\n\n${text}`;

    switch (provider) {
        // ── OpenAI & OpenAI-compatible (Groq, Together, OpenRouter, Mistral, local) ──
        case "openai":
        case "openai_compatible": {
            const base = (baseUrl || "https://api.openai.com").replace(/\/$/, "");
            return {
                url: `${base}/v1/chat/completions`,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: {
                    model: model || "gpt-4o-mini",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userMessage }
                    ],
                    max_tokens: 1200,
                    temperature: 0.2,
                    top_p: 0.9
                },
                extract: (data) => data.choices[0].message.content.trim()
            };
        }

        // ── Anthropic (Claude) ────────────────────────────────────────────────────
        case "anthropic": {
            return {
                url: "https://api.anthropic.com/v1/messages",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01"
                },
                body: {
                    model: model || "claude-haiku-4-5-20251001",
                    max_tokens: 1200,
                    system: systemPrompt,
                    messages: [
                        { role: "user", content: userMessage }
                    ],
                    temperature: 0.2
                },
                extract: (data) => data.content[0].text.trim()
            };
        }

        // ── Google Gemini ─────────────────────────────────────────────────────────
        case "gemini": {
            const geminiModel = model || "gemini-3.1-flash-lite-preview";
            return {
                url: `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
                headers: {
                    "Content-Type": "application/json"
                },
                body: {
                    contents: [
                        {
                            parts: [
                                { text: `${systemPrompt}\n\n---\n\n${userMessage}` }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.2,
                        topP: 0.9,
                        maxOutputTokens: 1200
                    }
                },
                extract: (data) => data.candidates[0].content.parts[0].text.trim()
            };
        }

        // ── Ollama (local) ────────────────────────────────────────────────────────
        case "ollama": {
            const base = (baseUrl || "http://localhost:11434").replace(/\/$/, "");
            return {
                url: `${base}/api/chat`,
                headers: {
                    "Content-Type": "application/json"
                },
                body: {
                    model: model || "llama3",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userMessage }
                    ],
                    stream: false,
                    options: { temperature: 0.2 }
                },
                extract: (data) => data.message.content.trim()
            };
        }

        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

// ─── Text post-processor ──────────────────────────────────────────────────────
// Normalises bullet format regardless of what the LLM returns.

function parseBullets(rawText) {
    const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);

    const bullets = [];
    for (const line of lines) {
        // Accept lines starting with •, -, *, or numbers like "1."
        const cleaned = line
            .replace(/^[-*]\s+/, "")
            .replace(/^\d+\.\s+/, "")
            .replace(/^•\s*/, "")
            .trim();
        if (cleaned.length > 0) {
            bullets.push("• " + cleaned);
        }
    }

    return bullets;
}

// ─── Main message handler ─────────────────────────────────────────────────────

browser.runtime.onMessage.addListener((message, _sender) => {
    if (message.action !== "summarize") return;

    return new Promise(async (resolve) => {
        try {
            // Load settings from storage
            const stored = await browser.storage.local.get([
                "provider", "apiKey", "model", "baseUrl"
            ]);

            const settings = {
                apiKey: stored.apiKey || "",
                model: stored.model || "",
                baseUrl: stored.baseUrl || ""
            };

            const provider = stored.provider || "openai";

            if (!settings.apiKey && provider !== "ollama") {
                resolve({ error: "No API key configured. Open Settings to add one." });
                return;
            }

            const { url, headers, body, extract } = buildRequest(provider, settings, message.text);

            const response = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                let errMsg = `API error ${response.status}`;
                try {
                    const errBody = await response.json();
                    // Different providers use different error shapes
                    errMsg = errBody?.error?.message
                        || errBody?.message
                        || errBody?.error
                        || errMsg;
                } catch (_) { /* ignore */ }
                resolve({ error: errMsg });
                return;
            }

            const data = await response.json();
            const rawText = extract(data);
            const bullets = parseBullets(rawText);

            if (bullets.length === 0) {
                resolve({ error: "The LLM returned an empty response. Try again." });
                return;
            }

            resolve({ bullets, provider, model: settings.model });

        } catch (err) {
            resolve({ error: err.message || "Unexpected error. Check the browser console." });
        }
    });
});