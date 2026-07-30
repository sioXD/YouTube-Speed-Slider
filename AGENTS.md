# AGENTS.md — YouTube Speed Slider

Firefox MV3 extension (plain JS/CSS/HTML, no build step).

## Commands

```bash
# Format all files
npx prettier --write .

# Package for distribution (requires web-ext globally)
npm install --global web-ext
./pack.ps1              # Windows / pwsh (cross-platform)
./pack.sh               # Linux / bash
```

## Key paths

- `src/content.js` — main content script (injected on `*://*.youtube.com/*`)
- `src/popup/popup.html` + `src/popup/popup.js` — extension popup (settings)
- `manifest.json` — extension manifest (contains Gecko ID `{f70c3909-be56-453d-975a-28c2321de710}`)
- `pack.ps1` — modifies `popup.html` with version + date, then runs `web-ext build`
- `docs/` — marketing landing page (not part of the extension)

## Workflow quirks

- **No tests, no linter.** Only Prettier formatting (`useTabs: true, tabWidth: 4, singleQuote: false, semi: true, printWidth: 120`).
- VSCode formats on save with `esbenp.prettier-vscode`.
- `options_ui` in manifest references `pages/options.html` — this file does **not** exist yet (unimplemented).
- **Release:** push a `v*` tag. CI via `.github/workflows/release.yml` needs `echo "" | pwsh -File pack.ps1` because pack.ps1 prompts on error. AMO publish requires `AMO_ENABLED` org var + `AMO_JWT_ISSUER` / `AMO_JWT_SECRET` secrets.
- CI runs `pack.ps1` via `pwsh` on Ubuntu — works because it only does file manipulation + `web-ext build`.
- No `package.json`; `web-ext` must be installed globally.
- All settings stored in `chrome.storage.local`.

## Style

- German inline comments in `content.js` are legacy. Keep or clean up — no strong convention.
- CSS uses `!important` pervasively in injected styles (follow existing pattern).
- Content script retries player detection at 5s/10s/15s/20s/30s — this is intentional for slow-loading YouTube.
