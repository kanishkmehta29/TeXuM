// content.js — Text extraction + right-side summary panel

(function () {
    "use strict";

    const PANEL_ID = "texum-panel";

    // ─── SVG Icons (Lucide-style, inline) ────────────────────────────────────
    const ICONS = {
        zap: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
               <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
             </svg>`,

        x: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
             <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
           </svg>`,

        loader: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"
                  style="animation:texum-spin 0.9s linear infinite;">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>`,

        alertTriangle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                         <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                         <path d="M12 9v4"/><path d="M12 17h.01"/>
                       </svg>`
    };

    // ─── Text extractor ───────────────────────────────────────────────────────
    function extractPageText() {
        const SKIP_TAGS = new Set([
            "SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "OBJECT",
            "EMBED", "CANVAS", "SVG", "HEADER", "FOOTER", "NAV"
        ]);

        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const el = node.parentElement;
                    if (!el) return NodeFilter.FILTER_REJECT;
                    if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
                    const style = window.getComputedStyle(el);
                    if (style.display === "none" || style.visibility === "hidden")
                        return NodeFilter.FILTER_REJECT;
                    if (node.textContent.trim().length < 3) return NodeFilter.FILTER_SKIP;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const chunks = [];
        let node;
        while ((node = walker.nextNode())) chunks.push(node.textContent.trim());
        const deduped = chunks.filter((c, i) => c !== chunks[i - 1]);
        return deduped.join(" ").replace(/\s{2,}/g, " ").trim();
    }

    // ─── Panel helpers ────────────────────────────────────────────────────────
    function removePanel() {
        document.getElementById(PANEL_ID)?.remove();
    }

    function injectStyles() {
        if (document.getElementById("texum-styles")) return;
        const style = document.createElement("style");
        style.id = "texum-styles";
        style.textContent = `
            @keyframes texum-spin { to { transform: rotate(360deg); } }
            @keyframes texum-slide-in {
                from { transform: translateX(calc(100% + 20px)); opacity: 0; }
                to   { transform: translateX(0); opacity: 1; }
            }
            #texum-panel {
                animation: texum-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            #texum-panel * { box-sizing: border-box; }

            .texum-bullet-item {
                display: flex;
                gap: 10px;
                align-items: flex-start;
                padding: 9px 10px;
                border-radius: 5px;
                border-left: 2px solid #000000;
                background: #f5f5f5;
                margin-bottom: 6px;
                opacity: 0;
                transform: translateX(8px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            .texum-bullet-item.visible {
                opacity: 1;
                transform: translateX(0);
            }
            .texum-bullet-dot {
                color: #000000;
                font-size: 16px;
                line-height: 1.4;
                flex-shrink: 0;
                margin-top: -1px;
                font-weight: 700;
            }
            .texum-bullet-text {
                color: #2d3748;
                font-size: 12.5px;
                line-height: 1.6;
            }
            #texum-close-btn:hover {
                background: #eef1f5 !important;
                color: #111318 !important;
            }
        `;
        document.head.appendChild(style);
    }

    function buildPanel() {
        const panel = document.createElement("div");
        panel.id = PANEL_ID;

        Object.assign(panel.style, {
            position: "fixed",
            top: "16px",
            right: "16px",
            width: "510px",
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
            zIndex: "2147483647",
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            background: "#ffffff",
            border: "1px solid #e2e6ed",
            borderRadius: "8px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            color: "#111318"
        });

        return panel;
    }

    function buildHeader() {
        const header = document.createElement("div");
        Object.assign(header.style, {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "11px 14px",
            borderBottom: "1px solid #e2e6ed",
            background: "#ffffff",
            position: "sticky",
            top: "0",
            zIndex: "1"
        });

        // Left: logo
        const left = document.createElement("div");
        left.style.display = "flex";
        left.style.alignItems = "center";
        left.style.gap = "8px";

        const logoBox = document.createElement("div");
        Object.assign(logoBox.style, {
            width: "22px",
            height: "22px",
            background: "#000000",
            borderRadius: "5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flexShrink: "0"
        });
        logoBox.innerHTML = ICONS.zap;

        const name = document.createElement("span");
        name.textContent = "TeXuM";
        Object.assign(name.style, {
            fontWeight: "700",
            fontSize: "13px",
            letterSpacing: "0.04em",
            color: "#111318"
        });

        left.appendChild(logoBox);
        left.appendChild(name);

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.id = "texum-close-btn";
        closeBtn.setAttribute("aria-label", "Close summary panel");
        closeBtn.innerHTML = ICONS.x;
        Object.assign(closeBtn.style, {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "26px",
            height: "26px",
            background: "transparent",
            border: "1px solid #e2e6ed",
            borderRadius: "5px",
            cursor: "pointer",
            color: "#8896a5",
            transition: "all 0.15s",
            padding: "0",
            fontFamily: "inherit"
        });
        closeBtn.addEventListener("click", removePanel);

        header.appendChild(left);
        header.appendChild(closeBtn);
        return header;
    }

    function showPanel(state, content) {
        removePanel();
        injectStyles();

        const panel = buildPanel();
        panel.appendChild(buildHeader());

        const body = document.createElement("div");
        body.style.padding = "14px";

        if (state === "loading") {
            body.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px 0;color:#8896a5;">
                    <div style="color:#000000;">${ICONS.loader}</div>
                    <span style="font-size:12px;letter-spacing:0.02em;">Extracting &amp; summarizing…</span>
                </div>
            `;
        } else if (state === "bullets") {
            const { bullets, provider, model } = content;

            bullets.forEach((bullet, i) => {
                const item = document.createElement("div");
                item.className = "texum-bullet-item";

                const dot = document.createElement("span");
                dot.className = "texum-bullet-dot";
                dot.textContent = "•";

                const text = document.createElement("span");
                text.className = "texum-bullet-text";
                text.textContent = bullet.replace(/^[•\-\*]\s*/, "").trim();

                item.appendChild(dot);
                item.appendChild(text);
                body.appendChild(item);

                // Stagger entrance
                setTimeout(() => item.classList.add("visible"), 40 + i * 60);
            });
        } else if (state === "error") {
            const box = document.createElement("div");
            Object.assign(box.style, {
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                padding: "11px",
                background: "#fff1f2",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                color: "#dc2626"
            });
            box.innerHTML = `<span style="flex-shrink:0;margin-top:1px;">${ICONS.alertTriangle}</span>`;

            const msg = document.createElement("span");
            msg.textContent = content;
            msg.style.fontSize = "12.5px";
            msg.style.lineHeight = "1.55";
            msg.style.color = "#991b1b";
            box.appendChild(msg);
            body.appendChild(box);
        }

        panel.appendChild(body);
        document.body.appendChild(panel);
    }

    // ─── Keyboard: Escape closes panel ───────────────────────────────────────
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") removePanel();
    });

    // ─── Message listener ─────────────────────────────────────────────────────
    browser.runtime.onMessage.addListener((message) => {
        if (message.action !== "triggerSummarize") return;

        showPanel("loading");

        const pageText = extractPageText();
        if (!pageText || pageText.length < 50) {
            showPanel("error", "Not enough readable text on this page.");
            return;
        }

        browser.runtime.sendMessage({
            action: "summarize",
            text: pageText.slice(0, 12000)
        }).then((response) => {
            if (response.error) showPanel("error", response.error);
            else showPanel("bullets", response);
        }).catch((err) => {
            showPanel("error", err.message || "Failed to reach background script.");
        });
    });

})();
