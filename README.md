# Joybuy X Intelligence Radar

Joybuy X Intelligence Radar is an MVP implementation for daily X public-opinion intelligence monitoring.

The current build is a working local prototype:

- Generates sample Joybuy and Temu intelligence data.
- Scores Joybuy intelligence clusters with IPS.
- Builds a fermentation radar.
- Builds a lightweight Temu competitor radar.
- Publishes a static dashboard from `public/`.
- Can run a low-volume TwitterAPI.io real-data bake-off when a local key is set.

## Quick Start

```bash
python3 scripts/run_daily.py
python3 scripts/verify_data.py
python3 -m http.server 4173 --directory public
```

Open:

```text
http://localhost:4173
```

You can also open `public/index.html` directly in a browser. The build includes
`public/dashboard-data-bundle.js` so the dashboard can render under `file://`
without a local server.

## Current MVP Status

This repo uses deterministic sample data by default so the dashboard can be reviewed without API keys. TwitterAPI.io can be enabled manually through environment variables for real X data testing.

GitHub Actions status:

- `Daily report` runs daily at UTC 00:00, which is Beijing time 08:00.
- Current MVP automation caps are 140 total X posts per day: up to 100 Joybuy/JD/京东 posts and up to 40 Temu posts.
- `Fermentation refresh` is manual-only for now. Its scheduled triggers are intentionally disabled until real historical metric refresh is ready and the API budget is approved.

Current sample output:

- 5 Joybuy intelligence clusters.
- 4 fermentation-tracked clusters.
- Temu lightweight competitor baseline.
- Static dashboard data in `public/dashboard-data/`.

Provider secrets:

- `TWITTERAPI_IO_KEY`
- `XPOZ_API_KEY`
- `APIFY_TOKEN`
- `AISA_API_KEY`
- `TAVILY_API_KEY`
- `PERPLEXITY_API_KEY`
- `OPENAI_API_KEY`

## Architecture

```text
config/
  keywords.json
  scoring.json
  sources.json

scripts/
  run_daily.py
  run_fermentation_refresh.py
  check_dashboard_data.py
  report_run_summary.py

src/
  pipeline/
  utils/

public/
  index.html
  assets/
  dashboard-data/
```

## Notes

- Joybuy is treated as a canonical monitored entity, not a single literal keyword.
- `JD` is treated as an ambiguous keyword and must be supported by ecommerce context.
- Quote posts are public propagation signals. Bookmarks are save signals and are optional.
- All valid Joybuy intelligence clusters are archived in history, but only high-value clusters enter the fermentation tracking pool.

## Verification

```bash
python3 scripts/run_daily.py
python3 scripts/run_fermentation_refresh.py
python3 scripts/check_dashboard_data.py
python3 scripts/verify_data.py
python3 scripts/report_run_summary.py
PYTHONPYCACHEPREFIX=.pycache python3 -m compileall scripts src
node --check public/assets/app.js
```

## TwitterAPI.io Bake-Off

Do not put API keys in files. Set the key only in the current shell:

```bash
export TWITTERAPI_IO_KEY="paste-your-key-here"
python3 scripts/bakeoff_twitterapi_io.py
```

For a very small first run:

```bash
export X_BAKEOFF_POST_LIMIT=20
python3 scripts/bakeoff_twitterapi_io.py
```

After the bake-off, run a capped daily test:

```bash
export X_SOURCE_PROVIDER=twitterapi_io
export X_DAILY_LIMIT=140
export X_JOYBUY_DAILY_LIMIT=100
export X_TEMU_DAILY_LIMIT=40
python3 scripts/run_daily.py
```

In GitHub Actions, setting `TWITTERAPI_IO_KEY` is enough to select
TwitterAPI.io automatically. `X_SOURCE_PROVIDER` remains available as an
optional override.

Optional browser verification, when Playwright browsers are installed:

```bash
NODE_PATH=/Users/liuhe89/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node scripts/verify_dashboard.cjs
```

## Deployment

The repository includes GitHub Actions workflows:

- `.github/workflows/daily-report.yml`: daily automatic report and GitHub Pages publish.
- `.github/workflows/fermentation-refresh.yml`: manual fermentation refresh only during the MVP bake-off.

Set GitHub Pages source to `GitHub Actions`, then run the daily workflow manually once.
The workflows print a metrics-only report summary after generation so scheduled
runs can be reviewed without exposing post text in logs.

## Next Step

Let the capped `Daily report` workflow collect several scheduled runs, then review data quality, source coverage and dashboard story value.

See:

```text
docs/API_KEY_SETUP.md
docs/IMPLEMENTATION_NOTES.md
```
