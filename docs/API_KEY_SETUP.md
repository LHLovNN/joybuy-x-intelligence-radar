# API Key Setup Guide

The current MVP runs with deterministic sample data. To connect real data, add provider keys as GitHub repository secrets.

## Recommended MVP Order

1. Select one X data provider for a 3-5 day bake-off.
2. Add Tavily for external verification.
3. Add Perplexity for high-risk analysis and executive summaries.
4. Keep optional fallback providers disabled until needed.

## X Data Provider

Recommended first candidates:

- TwitterAPI.io
- Xpoz

Fallback candidates:

- Apify paid Actor
- AIsa X skill/API

### TwitterAPI.io

Website:

```text
https://twitterapi.io/
https://twitterapi.io/pricing
```

Setup steps:

1. Open `https://twitterapi.io/`.
2. Create an account.
3. Open the dashboard or API key section.
4. Create or copy an API key.
5. Add it to GitHub Secrets as `TWITTERAPI_IO_KEY`.
6. Optional: set `X_SOURCE_PROVIDER=twitterapi_io`. The workflow auto-selects
   TwitterAPI.io when `TWITTERAPI_IO_KEY` exists.

Local first test:

```bash
export TWITTERAPI_IO_KEY="paste-your-key-here"
python3 scripts/bakeoff_twitterapi_io.py
```

Optional safer first limit:

```bash
export X_BAKEOFF_POST_LIMIT=20
python3 scripts/bakeoff_twitterapi_io.py
```

Manual daily test after the bake-off:

```bash
export X_SOURCE_PROVIDER=twitterapi_io
export X_JOYBUY_DAILY_LIMIT=100
export X_TEMU_DAILY_LIMIT=40
python3 scripts/run_daily.py
```

Notes:

- Suitable as the first low-cost MVP candidate.
- Keep the key in local environment variables or GitHub Secrets only. Do not
  paste it into source files or commit it.
- Public pricing currently advertises pay-per-use tweet access from about `$0.15 / 1K tweets`.
- Before production use, run a 3-5 day bake-off with Joybuy and Temu queries to verify returned fields, duplicate rate and daily cost.

### Xpoz

Website:

```text
https://www.xpoz.ai/
https://www.xpoz.ai/pricing/
https://apify.com/xpoz/xpoz-twitter-scraper
```

Setup steps:

1. Open `https://www.xpoz.ai/`.
2. Create an account.
3. Get an API key from the Xpoz token/API key page.
4. Add it to GitHub Secrets as `XPOZ_API_KEY`.
5. Set `X_SOURCE_PROVIDER=xpoz` if selected as primary.

Notes:

- Public pricing currently lists a free one-time credit package for testing and paid monthly plans.
- Xpoz also has an Apify Actor, but the Actor preview is limited without an API key.
- Test credit consumption carefully because credits may be charged by query rather than by returned row.

### Apify Paid Actor

Website:

```text
https://apify.com/
https://apify.com/store
https://apify.com/xpoz/xpoz-twitter-scraper
```

Setup steps:

1. Open `https://apify.com/`.
2. Create an account.
3. Choose a specific X/Twitter Actor.
4. Confirm the Actor supports API usage under your plan.
5. Create an Apify API token.
6. Add it to GitHub Secrets as `APIFY_TOKEN`.

Notes:

- Do not assume Apify free plan can run any X Actor through API.
- Some Actors only allow small previews or block API usage for free users.
- Treat Apify as fallback unless a paid Actor is verified.

### AIsa X Skill/API

Website:

```text
https://aisa.one/
https://github.com/AIsa-team/agent-skills
```

Setup steps:

1. Open `https://aisa.one/`.
2. Create or access an AIsa account.
3. Create an API key.
4. Add it to GitHub Secrets as `AISA_API_KEY`.
5. Test the X-related skill against Joybuy and Temu queries.

Notes:

- Useful as a skill/API fallback.
- Confirm field coverage before relying on it for dashboard metrics.

GitHub Secrets:

```text
TWITTERAPI_IO_KEY=...
XPOZ_API_KEY=...
APIFY_TOKEN=...
AISA_API_KEY=...
```

`X_SOURCE_PROVIDER=twitterapi_io` is optional for TwitterAPI.io. Add it only
when you want to force a specific provider explicitly.

Risk notes:

- Free plans are generally not enough for 3,000-10,000 posts/day.
- Apify free plan does not guarantee that every X actor supports API usage.
- Provider pricing and X access rules can change quickly.
- Start with a monthly cost cap.

## Tavily

Use Tavily for external verification, evidence checks and keyword expansion.

Website:

```text
https://www.tavily.com/
https://docs.tavily.com/documentation/api-credits
```

GitHub Secret:

```text
TAVILY_API_KEY=...
```

Setup steps:

1. Open `https://www.tavily.com/`.
2. Create an account.
3. Open the API key page in the Tavily dashboard.
4. Copy the key.
5. Add it to GitHub Secrets as `TAVILY_API_KEY`.

Usage policy:

- Use for high-risk or low-credibility intelligence.
- Do not call Tavily for every raw post.

## Perplexity

Use Perplexity for high-risk deep analysis and executive summaries.

Website:

```text
https://docs.perplexity.ai/
https://docs.perplexity.ai/docs/getting-started/pricing
```

GitHub Secret:

```text
PERPLEXITY_API_KEY=...
```

Setup steps:

1. Open `https://docs.perplexity.ai/`.
2. Follow the dashboard/API setup flow.
3. Create or copy an API key.
4. Add it to GitHub Secrets as `PERPLEXITY_API_KEY`.
5. Keep daily call limits low during MVP.

Usage policy:

- Use for IPS Top items and fermentation events.
- Do not use for full-volume post analysis.

## OpenAI Or Internal LLM Provider

Use for scoring explanations, summaries and translation if required.

Website:

```text
https://platform.openai.com/
```

GitHub Secret:

```text
OPENAI_API_KEY=...
```

Setup steps:

1. Open `https://platform.openai.com/`.
2. Create or select the organization/project.
3. Create an API key.
4. Add it to GitHub Secrets as `OPENAI_API_KEY`.

## GitHub Secrets Steps

1. Open the GitHub repository.
2. Go to `Settings`.
3. Go to `Secrets and variables`.
4. Open `Actions`.
5. Click `New repository secret`.
6. Add the key name exactly as listed above.
7. Paste the API key value.
8. Save.

## GitHub Pages Steps

1. Open the repository.
2. Go to `Settings`.
3. Go to `Pages`.
4. Set source to `GitHub Actions`.
5. Run the `Daily report` workflow manually once.
6. Open the Pages URL from the workflow output.

## MVP Cost Guidance

Recommended budget:

```text
$100-$200/month cap
```

Suggested rollout:

1. Run the sample dashboard locally.
2. Run real data source bake-off for 3-5 days.
3. Compare cost, field quality, duplicate rate and result quality.
4. Select primary provider.
5. Start daily report automation.
