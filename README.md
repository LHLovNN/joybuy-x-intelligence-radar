# Brand X Intelligence Radar

Brand X Intelligence Radar is a static MVP for brand public-opinion monitoring.
It turns public social signals into a Chinese-first intelligence dashboard with
focus ranking, full-stream browsing, daily reports and scoring methodology.

## Product Surface

- `舆情焦点`: prioritized signals selected by relevance, impact and risk.
- `全部舆情`: date-based opinion stream for scanning and tracing source posts.
- `舆情日报`: daily issue view with primary-brand radar and competitor baseline.
- `设置`: public run status, data quality and scoring explanation.

## Highlights

- Chinese-first reading experience with original-text switching.
- IPS and CSI scoring for focus prioritization and competitor comparison.
- Source-card rendering with author, metrics, tags, media and original-post entry.
- Daily archive browsing with a lightweight timeline structure.
- Static dashboard output under `public/`.

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

The dashboard can also render through `public/index.html` because the demo data
bundle is committed with the static files.

## Data Model

The included dashboard data demonstrates the product structure:

- source posts and translated content
- public engagement metrics
- focus tags and attention reasons
- primary-brand signal scoring
- competitor baseline scoring
- daily archive metadata

## Verification

```bash
python3 scripts/security_check.py
python3 scripts/check_dashboard_data.py
python3 scripts/verify_data.py
python3 scripts/report_run_summary.py
PYTHONPYCACHEPREFIX=.pycache python3 -m compileall scripts src
node --check public/assets/app.js
node --check public/dashboard-data-bundle.js
```
