# Brand X Intelligence Radar

Brand X Intelligence Radar is a static MVP for brand public-opinion monitoring.
It demonstrates how a configurable brand radar can collect public social
signals, normalize multilingual content, score intelligence value, and publish a
daily dashboard.

The repository is intentionally brand-agnostic. Public configuration files use
sample primary-brand and sample competitor placeholders. Real monitoring
keywords, source credentials, connector choices and runtime details should live
outside the public repository.

## What It Shows

- A focus feed for high-priority opinion signals.
- A complete opinion stream with date-based browsing.
- A daily report view with primary-brand radar and competitor baseline sections.
- A settings page for public status, data quality and scoring methodology.
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

The dashboard can also render through `public/index.html` because the public
data bundle is committed with the static files.

## Public Data Policy

The public dashboard archive may contain public-source evidence text, translated
content, source links, public engagement counts and product-level scoring
results. It should not contain:

- API keys, tokens, cookies or credentials.
- Private runtime logs or raw connector dumps.
- Internal connector/provider names.
- Real monitoring keyword dictionaries.
- Internal deployment or secret-storage details.
- Budget, quota or request-cap information.

## Configuration Model

Tracked files under `config/` are sample placeholders. Maintainers can provide
private runtime configuration through an ignored local override directory:

```text
config/private/
```

The application loads private overrides first and falls back to the public sample
configuration when no override exists.

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

## Maintainer Notes

Real-data collection and language processing are maintainer-controlled. Keep
credentials in an approved secret manager and run local/private setup outside
the public repository.

Generated public dashboard JSON can be committed after review. Private raw data,
checkpoints, connector logs and local notes are ignored by Git.
