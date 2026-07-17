# Security Policy

## Red Lines

- Never commit API keys, tokens, cookies, account credentials, private config or local environment files.
- Keep provider keys only in local environment variables or GitHub Secrets.
- Treat generated real-provider data as run output, not source code.
- Before publishing or pushing, run the security check script.

## Local Secrets

Use environment variables only:

```bash
export TWITTERAPI_IO_KEY="..."
export X_SOURCE_PROVIDER=twitterapi_io
```

Do not put those values into Python, JavaScript, Markdown, JSON, shell scripts or screenshots.

## GitHub Secrets

For deployment, add keys under:

```text
GitHub repository -> Settings -> Secrets and variables -> Actions
```

Required first secret:

```text
TWITTERAPI_IO_KEY
```

Optional future secrets:

```text
TAVILY_API_KEY
PERPLEXITY_API_KEY
OPENAI_API_KEY
XPOZ_API_KEY
APIFY_TOKEN
AISA_API_KEY
```

## Generated Data

The following paths are ignored by Git:

```text
data/raw/
data/processed/
data/logs/
data/clusters/
public/dashboard-data/
public/dashboard-data-bundle.js
```

GitHub Actions regenerates dashboard data during deployment.
