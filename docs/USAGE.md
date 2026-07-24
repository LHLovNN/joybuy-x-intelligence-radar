# Usage Guide

## Local Preview

Run the static preview server from the project root:

```bash
python3 -m http.server 4173 --directory public
```

Then open:

```text
http://localhost:4173
```

## Dashboard Pages

- `舆情焦点`: focus feed for high-priority opinion signals.
- `全部舆情`: full date-based stream.
- `舆情日报`: daily report and historical issue archive.
- `设置`: data status, quality funnel and scoring explanation.

## Customization

The product is designed around configurable monitoring dictionaries, scoring
weights and static dashboard output. Demo configuration files live under
`config/`, while generated dashboard assets are served from `public/`.

## Validation

```bash
python3 scripts/check_dashboard_data.py
python3 scripts/verify_data.py
node --check public/assets/app.js
node --check public/dashboard-data-bundle.js
```
