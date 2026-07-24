# Implementation Notes

## Current Build

The MVP is a static brand-intelligence dashboard with sample public
configuration and reviewed public dashboard archives.

It includes:

- Daily dashboard data generation.
- Configurable primary-brand normalization.
- Ambiguous-alias filtering.
- Competitor baseline monitoring.
- IPS scoring.
- Evidence labels for source role and propagation context.
- Multilingual source-content display with Chinese-first UX.
- Static dashboard pages under `public/`.
- Public-data validation and security checks.

## Product Surface

Current visible navigation:

- `舆情焦点`
- `全部舆情`
- `舆情日报`
- `设置`

The delayed-spread tracking module is parked for future redesign and is not a
visible MVP page.

## Public/Private Boundary

Tracked configuration is sample-only. Private runtime configuration lives in an
ignored local override directory. Public dashboard JSON may include public
evidence content, but should not expose internal connector names, keyword
dictionaries, budget/quota values or deployment mechanics.

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

For visual QA, use a normal local browser session against the local static
preview URL and inspect the visible product pages.
