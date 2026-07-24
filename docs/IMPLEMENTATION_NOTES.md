# Implementation Notes

## Current Build

The MVP is a static brand-intelligence dashboard with demo configuration and
bundled dashboard archives.

It includes:

- daily dashboard data generation
- configurable primary-brand normalization
- ambiguous-alias filtering
- competitor baseline monitoring
- IPS and CSI scoring
- evidence labels for source role and propagation context
- multilingual source-content display with Chinese-first UX
- static dashboard pages under `public/`
- data validation checks

## Product Surface

Current visible navigation:

- `舆情焦点`
- `全部舆情`
- `舆情日报`
- `设置`

The delayed-spread tracking module is parked for future redesign and is not a
visible MVP page.

## Page Responsibilities

- `舆情焦点` answers what deserves priority today.
- `全部舆情` answers what happened across the full stream.
- `舆情日报` answers how to brief stakeholders by date.
- `设置` explains run status, data quality and scoring logic.

## Verification

```bash
python3 scripts/check_dashboard_data.py
python3 scripts/verify_data.py
python3 scripts/report_run_summary.py
PYTHONPYCACHEPREFIX=.pycache python3 -m compileall scripts src
node --check public/assets/app.js
node --check public/dashboard-data-bundle.js
```
