// popup.js — Settings persistence + Summarize trigger

(function () {
    "use strict";

    // ─── DOM refs ──────────────────────────────────────────────────────────
    const providerEl         = document.getElementById("provider");
    const apiKeyEl           = document.getElementById("apiKey");
    const modelEl            = document.getElementById("model");
    const baseUrlEl          = document.getElementById("baseUrl");
    const rowBaseUrl         = document.getElementById("row-baseurl");
    const rowApiKey          = document.getElementById("row-apikey");
    const btnToggleKey       = document.getElementById("btn-toggle-key");
    const iconEye            = document.getElementById("icon-eye");
    const iconEyeOff         = document.getElementById("icon-eye-off");
    const btnSummarize       = document.getElementById("btn-summarize");
    const btnLabel           = document.getElementById("btn-label");
    const settingsForm       = document.getElementById("settings-form");
    const statusMsg          = document.getElementById("status-msg");
    const saveLabel          = document.getElementById("save-label");
    const btnToggleSettings  = document.getElementById("btn-toggle-settings");
    const settingsPanel      = document.getElementById("settings-panel");
    const settingsChevron    = document.getElementById("settings-chevron");

    // ─── Settings panel toggle ─────────────────────────────────────────────
    function openSettings() {
        settingsPanel.classList.add("open");
        btnToggleSettings.classList.add("open");
        btnToggleSettings.setAttribute("aria-expanded", "true");
        settingsPanel.setAttribute("aria-hidden", "false");
        settingsChevron.style.transform = "rotate(180deg)";
    }

    function closeSettings() {
        settingsPanel.classList.remove("open");
        btnToggleSettings.classList.remove("open");
        btnToggleSettings.setAttribute("aria-expanded", "false");
        settingsPanel.setAttribute("aria-hidden", "true");
        settingsChevron.style.transform = "rotate(0deg)";
    }

    btnToggleSettings.addEventListener("click", () => {
        const isOpen = settingsPanel.classList.contains("open");
        if (isOpen) { closeSettings(); } else { openSettings(); }
    });



    // ─── Provider-dependent UI ─────────────────────────────────────────────
    const PROVIDERS_WITH_BASEURL  = new Set(["openai_compatible", "ollama"]);
    const PROVIDERS_NO_APIKEY     = new Set(["ollama"]);

    function updateConditionalFields() {
        const p = providerEl.value;
        rowBaseUrl.style.display = PROVIDERS_WITH_BASEURL.has(p) ? "flex" : "none";
        rowApiKey.style.display  = PROVIDERS_NO_APIKEY.has(p)    ? "none"  : "flex";

        // Placeholder hints per provider
        const placeholders = {
            openai:            "sk-…",
            anthropic:         "sk-ant-…",
            gemini:            "AIzaSy…",
            openai_compatible: "your-api-key",
            ollama:            ""
        };
        apiKeyEl.placeholder = placeholders[p] || "your-api-key";

        const modelHints = {
            openai:            "gpt-4o-mini",
            anthropic:         "claude-haiku-4-5-20251001",
            gemini:            "gemini-2.5-flash-lite-preview",
            openai_compatible: "mixtral-8x7b-32768",
            ollama:            "llama3"
        };
        modelEl.placeholder = modelHints[p] || "";
    }

    providerEl.addEventListener("change", updateConditionalFields);

    // ─── Toggle API key visibility ─────────────────────────────────────────
    btnToggleKey.addEventListener("click", () => {
        const isPassword = apiKeyEl.type === "password";
        apiKeyEl.type = isPassword ? "text" : "password";
        iconEye.style.display    = isPassword ? "none"  : "block";
        iconEyeOff.style.display = isPassword ? "block" : "none";
    });

    // ─── Load saved settings ───────────────────────────────────────────────
    browser.storage.local.get([
        "provider", "apiKey", "model", "baseUrl"
    ]).then((stored) => {
        providerEl.value  = stored.provider || "openai";
        apiKeyEl.value    = stored.apiKey   || "";
        modelEl.value     = stored.model    || "";
        baseUrlEl.value   = stored.baseUrl  || "";
        updateConditionalFields();
    });

    // ─── Save settings ─────────────────────────────────────────────────────
    settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        clearStatus();

        const provider = providerEl.value;
        const apiKey   = apiKeyEl.value.trim();
        if (!apiKey && provider !== "ollama") {
            showStatus("Please enter your API key.", "error");
            return;
        }

        browser.storage.local.set({
            provider,
            apiKey,
            model:   modelEl.value.trim(),
            baseUrl: baseUrlEl.value.trim()
        }).then(() => {
            saveLabel.textContent = "✓ Saved!";
            showStatus("Settings saved successfully.", "success");
            setTimeout(() => { saveLabel.textContent = "Save Settings"; }, 1800);
        }).catch((err) => {
            showStatus("Save failed: " + err.message, "error");
        });
    });

    // ─── Summarize button ──────────────────────────────────────────────────
    btnSummarize.addEventListener("click", async () => {
        btnSummarize.disabled = true;
        btnLabel.textContent  = "Summarizing…";

        try {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            await browser.tabs.sendMessage(tab.id, { action: "triggerSummarize" });
        } catch (err) {
            showStatus("Could not reach page: " + (err.message || err), "error");
        } finally {
            btnSummarize.disabled = false;
            btnLabel.textContent  = "Summarize This Page";
            // Close popup so the panel on the page is visible
            window.close();
        }
    });

    // ─── Status helpers ────────────────────────────────────────────────────
    function showStatus(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className   = "status-msg " + (type || "");
    }

    function clearStatus() {
        statusMsg.textContent = "";
        statusMsg.className   = "status-msg";
    }

})();
