# Brand X Intelligence Radar

Brand X Intelligence Radar is an MVP implementation for daily brand
public-opinion intelligence monitoring on X.

The current build is a static dashboard prototype:

- Monitors configurable brand-related public conversation signals.
- Keeps a lightweight competitor baseline.
- Scores and ranks higher-value public-opinion signals with IPS.
- Publishes a static dashboard from `public/`.
- Supports local maintainer-only real-data runs with secrets kept outside Git.

The public demo configuration currently uses Joybuy/JD as the monitored sample
brand and Temu as the competitor sample. The product structure is intentionally
brand-agnostic: keyword dictionaries, source settings, scoring rules and
dashboard copy can be adjusted for another monitored brand.

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

This repo uses seeded public dashboard data by default so the dashboard can be
reviewed without access to private credentials. The production-like MVP path
runs from a maintainer-controlled local machine: it collects public X data,
translates non-Chinese content through an approved local service, generates
public dashboard JSON, commits it, and pushes the static output to GitHub.

Automation status:

- The local automation runs daily at Beijing time 08:00.
- GitHub Actions does not collect X data, call translation services, or hold provider credentials.
- GitHub Actions only publishes already committed static dashboard files to GitHub Pages.
- Daily collection runs use bounded guardrails for source volume and request count.
- Each successful Mac run commits the public dashboard JSON archive back to Git, then the GitHub publish workflow deploys Pages. This keeps historical daily reports browsable without pulling old data from Pages.
- If a source budget or request cap is reached, the daily run publishes a partial report with collection warnings instead of failing the whole dashboard deployment.
- The dashboard information architecture follows a clearer intelligence-product hierarchy: `舆情焦点`, `全部舆情`, `舆情日报`, and `设置`. `舆情日报` contains both monitored-brand radar and competitor baseline sections, with signals shown on a publish-time vertical timeline.

Current seeded public archive:

- `2026-07-17`: summary-only placeholder for the first manual run before history storage existed.
- `2026-07-18`: summary-only archive from the scheduled Daily report run.
- `2026-07-19`: summary-only archive from the scheduled Daily report run.
- Future Mac scheduled runs will add full daily archive files under `public/dashboard-data/daily/`.

Credential policy:

- Secrets must never be committed to this repository.
- Provider keys, translation-service keys and other credentials must stay in a
  local secret store or another approved secret manager.
- GitHub Actions should receive only the permissions needed to publish already
  committed static dashboard files.

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

- A monitored brand is treated as a canonical entity, not a single literal keyword.
- Short aliases can be ambiguous and should be supported by domain context.
- Quote posts are public propagation signals. Bookmarks are save signals and are optional.
- Valid monitored-brand signals are archived in history. Delayed-spread tracking is a
  future product module and is not exposed in the current MVP navigation.
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

## Maintainer Real-Data Runs

Real-data collection is intentionally local and maintainer-only. Do not put API
keys, tokens or other credentials in files.

Store approved local secrets through the maintainer setup flow:

```bash
npm run local:secrets
```

Run a non-publishing real-data preview:

```bash
npm run local:daily:preview
```

Resume from the latest local collection checkpoint without calling X again:

```bash
npm run local:daily:preview:resume
```

The translation runner uses small batches and split recovery: if a batch times
out, it is divided into smaller requests so successful posts can still show
Chinese translations. Original text is shown only when an item still cannot be
translated after recovery.

## Mac Local Automation

Store local secrets in the approved local secret store:

```bash
npm run local:secrets
```

Run one manual local daily job:

```bash
npm run local:daily
```

The normal daily job writes a local collection checkpoint immediately after X
collection succeeds and before translation starts. If translation or later
generation fails, resume from that checkpoint without calling X again:

```bash
npm run local:daily:resume
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
the public data source, translation service and GitHub at 08:00.

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

Continue real-data quality review, then install the 08:00 local schedule when
the current dashboard output is accepted.
