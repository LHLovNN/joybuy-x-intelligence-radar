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
python3 scripts/check_dashboard_data.py
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

The repo includes seeded public dashboard data for preview. Running
`python3 scripts/run_daily.py` without a real provider regenerates deterministic
sample data for local development, so review the resulting dashboard files
before committing.

## Current MVP Status

This repo uses deterministic sample data by default so the dashboard can be
reviewed without API keys. The production-like MVP path runs on the user's Mac:
the Mac collects X data, calls local company JoyBuilder translation, generates
public dashboard JSON, commits it, and pushes it to GitHub.

Automation status:

- The Mac local automation runs daily at Beijing time 08:00 through launchd.
- GitHub Actions no longer collects X data, calls translation services, or holds company GPT keys.
- GitHub Actions only publishes already committed static dashboard files to GitHub Pages.
- Daily guardrail caps are 60 total X posts per day: up to 45 Joybuy/JD/京东 posts, up to 15 Temu posts and up to 6 X API requests per run.
- Each successful Mac run commits the public dashboard JSON archive back to Git, then the GitHub publish workflow deploys Pages. This keeps historical daily reports browsable without pulling old data from Pages.
- If the X API budget is exhausted or the request cap is reached, the daily run publishes a partial report with collection warnings instead of failing the whole dashboard deployment.
- The dashboard information architecture follows a clearer intelligence-product hierarchy: `舆情焦点`, `全部舆情`, `舆情日报`, `发酵追踪`, and `设置`. `舆情日报` contains both Joybuy Radar and the Temu competitor baseline, with signals shown on a publish-time vertical timeline.

Current seeded public archive:

- `2026-07-17`: summary-only placeholder for the first manual run before history storage existed.
- `2026-07-18`: summary-only archive from the scheduled Daily report run.
- `2026-07-19`: summary-only archive from the scheduled Daily report run.
- Future Mac scheduled runs will add full daily archive files under `public/dashboard-data/daily/`.

Local provider secrets:

- `TWITTERAPI_IO_KEY`
- `XPOZ_API_KEY`
- `APIFY_TOKEN`
- `AISA_API_KEY`
- `TAVILY_API_KEY`
- `PERPLEXITY_API_KEY`
- `OPENAI_API_KEY`

Company JoyBuilder translation uses `JDCLOUD_GPT_API_KEY`, but this key is
local-only for the MVP and must not be added to GitHub repository Secrets.

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
- Public dashboard JSON is product content and can be committed. Raw provider outputs, local logs, cluster detail caches and all credentials remain excluded.

## Verification

```bash
python3 scripts/check_dashboard_data.py
python3 scripts/verify_data.py
python3 scripts/report_run_summary.py
PYTHONPYCACHEPREFIX=.pycache python3 -m compileall scripts src
node --check public/assets/app.js
node --check public/dashboard-data-bundle.js
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

After the bake-off, run a capped local daily test:

```bash
export X_SOURCE_PROVIDER=twitterapi_io
export X_DAILY_LIMIT=60
export X_JOYBUY_DAILY_LIMIT=45
export X_TEMU_DAILY_LIMIT=15
export X_MAX_API_REQUESTS=6
npm run local:daily
```

Local trusted runs can translate every non-Chinese post into Chinese through the
company JoyBuilder Responses API:

```text
JDCLOUD_GPT_API_KEY
TRANSLATION_PROVIDER=joybuilder
JDBUILDER_TRANSLATION_MODEL=GPT-5.5
```

`JDCLOUD_GPT_API_KEY` must be stored only as a local environment variable or
another company-trusted secret store. It must not be added to GitHub repository
Secrets during the MVP.

## Mac Local Automation

Store local secrets in macOS Keychain:

```bash
npm run local:secrets
```

Run one manual local daily job:

```bash
npm run local:daily
```

Install the 08:00 launchd schedule:

```bash
npm run local:daily:install
```

Check local automation status and logs:

```bash
npm run local:daily:status
```

Uninstall the launchd schedule:

```bash
npm run local:daily:uninstall
```

Lock screen is fine. Sleep is not: keep the Mac awake, online and able to reach
TwitterAPI.io, GitHub and the company JoyBuilder endpoint at 08:00.

Local real-browser screenshot QA:

```bash
npm run qa:local-browser
```

This first tries the full Playwright browser QA. If Playwright is not available,
it falls back to local Google Chrome or Firefox headless screenshots and writes
images to `data/logs/screenshots-local/`.
Run this from a normal local terminal. Some Codex sandbox sessions cannot launch
system browsers or bind local preview ports, even when Chrome or Firefox is
installed.

For full local Playwright interaction QA:

```bash
npm install --no-save --no-package-lock playwright
npx playwright install chromium
node scripts/verify_dashboard.cjs
```

In GitHub Actions, browser screenshot QA is part of the publish path only. The
workflow installs Playwright Chromium on the runner, runs
`scripts/verify_dashboard.cjs`, and uploads screenshots from
`data/logs/screenshots` as an artifact.

## Deployment

The repository includes one GitHub Actions workflow:

- `.github/workflows/publish-dashboard.yml`: publishes already committed static dashboard data to GitHub Pages. It runs on `public/**` pushes and can also be triggered manually.

Set GitHub Pages source to `GitHub Actions`. The publish workflow does not
receive provider secrets and does not run `scripts/run_daily.py`. It only runs
security/data checks, browser screenshot QA, and Pages deployment.

## Next Step

Review the `舆情日报` historical view, then continue the real-data quality
bake-off once source credits or fallback source coverage are confirmed.

See:

```text
docs/API_KEY_SETUP.md
docs/IMPLEMENTATION_NOTES.md
```
