# TeXuM — AI Page Summarizer (Firefox Extension)

TeXuM is a personal Firefox extension that summarizes any webpage into concise bullet points using an LLM of your choice. It runs entirely through your own API key — no third-party servers, no data collection.

---

## How it works

1. You navigate to any webpage.
2. Click the **⚡ TeXuM** icon in the Firefox toolbar.
3. Click **Summarize This Page**.
4. TeXuM extracts the visible text from the page, sends it to your configured LLM, and displays the summary as a **slide-in panel on the right side of the screen**.
5. Press **Esc** or click **✕** to close the panel.

The system prompt enforces a strict, uniform bullet format regardless of which LLM you use — each bullet covers a distinct point, ordered from most to least important.

---

## File structure

```
TeXuM/
├── manifest.json       # Extension manifest (Firefox MV2)
├── background.js       # LLM API calls + system prompt
├── content.js          # Page text extraction + summary panel UI
├── popup.html          # Toolbar popup (Summarize button + Settings)
├── popup.css           # Popup styles
├── popup.js            # Popup logic (settings save/load, trigger)
└── icons/
    ├── icon48.png      # Toolbar icon (48×48)
    └── icon96.png      # High-DPI icon (96×96)
```

---

## Supported LLM providers

| Provider | Notes |
|---|---|
| **OpenAI** | GPT-4o, GPT-4o-mini, GPT-3.5-turbo, etc. |
| **Anthropic** | Claude 3 Haiku, Sonnet, Opus |
| **Google Gemini** | gemini-2.0-flash, gemini-1.5-pro, etc. |
| **OpenAI-Compatible** | Groq, Together AI, Mistral, OpenRouter — any endpoint that speaks the OpenAI chat format |
| **Ollama** | Fully local, no API key required — runs models like Llama 3, Mistral, Phi-3 on your machine |

---

## Setting up in Firefox (macOS)

### Step 1 — Open the Add-ons debugging page

In Firefox, go to:
```
about:debugging
```
Click **This Firefox** in the left sidebar.

### Step 2 — Load the extension

1. Click **Load Temporary Add-on…**
2. Navigate to the `TeXuM/` folder
3. Select `manifest.json` and click **Open**

The **⚡** icon will appear in the Firefox toolbar immediately.

> **Note:** Temporary add-ons are removed when Firefox restarts. See [Making it permanent](#making-it-permanent) below to keep it across restarts.

### Step 3 — Configure your API key

1. Click the **⚡** icon in the toolbar to open the popup.
2. Click **Configure** to expand the settings panel.
3. Select your **LLM Provider** from the dropdown.
4. Paste your **API Key**.
5. Optionally enter a specific **Model name** (leave blank to use the provider's default).
6. If using Groq, Ollama, or another self-hosted endpoint, enter its **Base URL**.
7. Click **Save Settings**.

### Step 4 — Summarize a page

1. Go to any article, documentation page, or news story.
2. Click the **⚡** icon → **Summarize This Page**.
3. The summary panel slides in from the right side of the screen.

---

## Configuration reference

| Field | Required | Example |
|---|---|---|
| Provider | Yes | `gemini` |
| API Key | Yes (except Ollama) | `AIzaSy…` |
| Model | No | `gemini-2.0-flash` |
| Base URL | Only for OpenAI-Compatible / Ollama | `https://api.groq.com` |

### API key sources

| Provider | Where to get a key |
|---|---|
| OpenAI | https://platform.openai.com/api-keys |
| Anthropic | https://console.anthropic.com/settings/keys |
| Google Gemini | https://aistudio.google.com/app/apikey |
| Groq | https://console.groq.com/keys |
| Ollama | No key needed — install from https://ollama.com |

---

## Making it permanent

Temporary add-ons are cleared on Firefox restart. To install permanently:

### Option A — Pack and install as .xpi

```bash
cd /path/to/TeXuM
zip -r texum.xpi manifest.json background.js content.js \
    popup.html popup.css popup.js icons/
```

Then in Firefox:
1. Go to `about:addons`
2. Click the **⚙ gear icon** → **Install Add-on From File…**
3. Select `texum.xpi`

> Firefox requires extensions to be signed by Mozilla for permanent installation. For personal use only, disable signature checking:
> 1. Go to `about:config`
> 2. Search for `xpinstall.signatures.required`
> 3. Set it to `false`

### Option B — Use Firefox Developer Edition or Nightly

These builds support unsigned extension installation without any config changes. Load via `about:debugging` as usual — the extension will persist across restarts.

---

## Reloading after code changes

Any time you edit a file, reload the extension to apply changes:

1. Go to `about:debugging` → **This Firefox**
2. Find **TeXuM** in the list
3. Click **Reload**

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "No API key configured" | Open popup → Configure → enter key → Save Settings |
| API error 401 / 403 | Wrong key or wrong provider selected |
| API error 429 | Quota exhausted — try a different model or wait |
| "Not enough readable text" | Page may be JS-rendered; scroll to load content, then retry |
| Panel doesn't appear | Open browser console (F12) and check for errors; reload the extension |
| Groq / OpenRouter not working | Select **OpenAI-Compatible**, set Base URL (e.g. `https://api.groq.com`), enter API key |
| Ollama connection refused | Run `ollama serve` in terminal first |
