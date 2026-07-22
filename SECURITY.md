# Security Policy

## Red Lines

- Never commit API keys, tokens, cookies, account credentials, private config or local environment files.
- Keep provider keys only in local environment variables or approved secret stores.
- Keep company GPT keys local-only or in a company-trusted secret store. Do not add company GPT keys to GitHub repository Secrets during the MVP.
- Treat raw provider output and local logs as run artifacts, not source code.
- Public dashboard JSON under `public/dashboard-data/` is product content and may be committed for historical daily browsing, but sample-mode dashboard JSON must not be published as if it were real X data.
- Before publishing or pushing, run the security check script.

## Local Secrets

Use macOS Keychain for the local daily automation:

```bash
npm run local:secrets
```

The script stores these Keychain services without printing values:

```text
joybuy-radar.TWITTERAPI_IO_KEY
joybuy-radar.JDCLOUD_GPT_API_KEY
```

Environment variables are acceptable for one-off local smoke tests, but do not
put secret values into Python, JavaScript, Markdown, JSON, shell scripts,
screenshots or committed logs.

For local company JoyBuilder translation:

```bash
export JDCLOUD_GPT_API_KEY="..."
export TRANSLATION_PROVIDER=joybuilder
```

Do not add `JDCLOUD_GPT_API_KEY` to GitHub repository Secrets for this MVP.

## GitHub Secrets

The MVP GitHub workflow only publishes already committed static dashboard files.
It does not collect X data, does not call translation services and does not need
provider secrets.

Do not add `TWITTERAPI_IO_KEY`, `JDCLOUD_GPT_API_KEY` or other provider keys to
GitHub repository Secrets for the current Mac-local automation architecture.

## Generated Data

The following paths are ignored by Git:

```text
data/raw/
data/processed/
data/logs/
data/clusters/
public/dashboard-data/clusters/
```

The following public dashboard paths are intentionally committed when they contain
approved public product data:

```text
public/dashboard-data/*.json
public/dashboard-data/daily/*.json
public/dashboard-data-bundle.js
```

Before committing these files, confirm the collection status. If the provider is
`sample`, either keep the files local for preview only or label the release as a
sample-data preview.
