# Security Policy

## Red Lines

- Never commit API keys, tokens, cookies, account credentials, private config or
  local environment files.
- Keep real connector credentials and language-service credentials in an
  approved secret manager outside the public repository.
- Treat raw connector output, private runtime logs, checkpoints and local notes
  as private artifacts.
- Before publishing, run the security check and review public dashboard JSON for
  accidental operational disclosure.

## Public Repository Boundary

The repository may contain:

- Static dashboard code.
- Sample configuration.
- Public dashboard archives after review.
- Generic setup and verification instructions.

The repository must not contain:

- Secret values or private environment files.
- Real monitoring keyword dictionaries.
- Internal connector/provider names in public docs or UI copy.
- Private deployment, budget, quota or request-cap details.
- Raw connector payloads or private run logs.

## Generated Data

The following public dashboard paths may be committed when reviewed:

```text
public/dashboard-data/*.json
public/dashboard-data/daily/*.json
public/dashboard-data-bundle.js
```

The following paths are private runtime artifacts and remain ignored:

```text
config/private/
data/raw/
data/processed/
data/logs/
data/clusters/
data/checkpoints/
data/local-notes/
public/dashboard-data/clusters/
```
