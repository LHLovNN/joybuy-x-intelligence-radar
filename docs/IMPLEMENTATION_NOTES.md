# Implementation Notes

## Current Build

The current MVP is a working static prototype with sample data. It also has a
TwitterAPI.io real-data path that is enabled only when the provider environment
variables are set.

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
- GitHub Pages workflow files.
- Direct `file://` preview support through `public/dashboard-data-bundle.js`.
- TwitterAPI.io advanced-search adapter.
- Low-volume TwitterAPI.io bake-off script.

## Current Limitations

- TwitterAPI.io is implemented but still needs first real-key validation against
  Joybuy and Temu queries.
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

After the bake-off looks healthy, the daily pipeline can be switched for one
manual run:

```bash
export X_SOURCE_PROVIDER=twitterapi_io
export X_JOYBUY_DAILY_LIMIT=100
export X_TEMU_DAILY_LIMIT=40
python3 scripts/run_daily.py
```

## Next Implementation Step

Validate TwitterAPI.io returned fields, duplicate rate and cost, then run a
3-5 day bake-off before making it the default provider in GitHub Actions.

Fallback providers remain reserved in:

```text
src/adapters/xpoz.py
src/adapters/apify.py
src/adapters/aisa_x.py
```
