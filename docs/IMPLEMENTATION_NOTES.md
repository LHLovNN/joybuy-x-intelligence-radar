# Implementation Notes

## Current Build

The current MVP is a working static prototype with sample data. Its
production-like daily path runs on the user's Mac through launchd, using
macOS Keychain for provider secrets. GitHub Actions only publishes already
committed static dashboard files.

It includes:

- Daily report data generation.
- Joybuy/JD/京东 canonical entity normalization.
- JD ambiguity filtering.
- IPS scoring.
- Evidence chain labels:
  - 热源
  - 当事人
  - 热门
  - 扩散源
  - 最新
  - 佐证
  - 反证/存疑
- Fermentation tracking pool.
- Temu lightweight competitor radar.
- Static dashboard under `public/`.
- Secret-free GitHub Pages publish workflow.
- Direct `file://` preview support through `public/dashboard-data-bundle.js`.
- TwitterAPI.io advanced-search adapter.
- Low-volume TwitterAPI.io bake-off script.
- macOS local daily automation scripts under `scripts/macos/`.

## Current Limitations

- The Mac local daily automation needs user-side Keychain setup and one manual
  real run before installing the 08:00 launchd schedule.
- Xpoz, Apify and AIsa adapters are reserved fallback scaffolds.
- Tavily and Perplexity adapters are documented but not yet implemented.
- Browser screenshot verification could not run in the current sandbox because the Playwright browser binary is missing.
- Local HTTP server preview was blocked by sandbox/network policy.

## How To Run Locally

```bash
python3 scripts/run_daily.py
python3 scripts/verify_data.py
python3 -m http.server 4173 --directory public
```

Then open:

```text
http://localhost:4173
```

If local port serving is blocked, open `public/index.html` directly in a browser.
The dashboard reads `dashboard-data-bundle.js` first, then falls back to JSON
fetch when served through HTTP/GitHub Pages.

## Mac Local Daily Automation

Store the local keys in macOS Keychain:

```bash
npm run local:secrets
```

Run one manual local daily job:

```bash
npm run local:daily
```

Install the 08:00 local launchd schedule:

```bash
npm run local:daily:install
```

Check status and logs:

```bash
npm run local:daily:status
```

Uninstall the schedule:

```bash
npm run local:daily:uninstall
```

## How To Verify

```bash
python3 scripts/run_daily.py
python3 scripts/run_fermentation_refresh.py
python3 scripts/check_dashboard_data.py
python3 scripts/verify_data.py
PYTHONPYCACHEPREFIX=.pycache python3 -m compileall scripts src
node --check public/assets/app.js
```

Optional browser verification, if Playwright browsers are installed:

```bash
NODE_PATH=/Users/liuhe89/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node scripts/verify_dashboard.cjs
```

## TwitterAPI.io Bake-Off

Keep the sample dashboard as the default. For a low-volume real-data test, set
the provider key in the shell and run:

```bash
export TWITTERAPI_IO_KEY="paste-your-key-here"
python3 scripts/bakeoff_twitterapi_io.py
```

Optional low-volume limit:

```bash
export X_BAKEOFF_POST_LIMIT=20
python3 scripts/bakeoff_twitterapi_io.py
```

After the bake-off looks healthy, run one manual local daily job:

```bash
export X_SOURCE_PROVIDER=twitterapi_io
export X_JOYBUY_DAILY_LIMIT=45
export X_TEMU_DAILY_LIMIT=15
npm run local:daily
```

## Next Implementation Step

Have the user run `npm run local:secrets`, then one approved manual
`npm run local:daily` real run. If it succeeds, install the 08:00 launchd
schedule with `npm run local:daily:install`.

Fallback providers remain reserved in:

```text
src/adapters/xpoz.py
src/adapters/apify.py
src/adapters/aisa_x.py
```
