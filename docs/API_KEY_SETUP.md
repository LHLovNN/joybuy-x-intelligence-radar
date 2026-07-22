# API Key Setup Guide

The current MVP runs with deterministic sample data for local preview. The
production-like daily job runs on the user's Mac, so provider keys are stored in
macOS Keychain or another approved local/company-trusted secret store. GitHub
Actions only publishes committed static dashboard files and does not need
provider secrets.

## Recommended MVP Order

1. Select one X data provider for a 3-5 day bake-off.
2. Configure the company JoyBuilder key locally for Chinese translation.
3. Add Tavily for external verification.
4. Add Perplexity for high-risk analysis and executive summaries.
5. Keep optional fallback providers disabled until needed.

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
5. Store it in macOS Keychain through `npm run local:secrets`.
6. Optional for manual terminal runs: set `X_SOURCE_PROVIDER=twitterapi_io`.

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

Manual local daily test after the bake-off:

```bash
export X_SOURCE_PROVIDER=twitterapi_io
export X_JOYBUY_DAILY_LIMIT=45
export X_TEMU_DAILY_LIMIT=15
npm run local:daily
```

The normal local daily command saves a local checkpoint as soon as X collection
finishes. If translation or dashboard generation fails after that point, use the
resume command to continue without another X request:

```bash
npm run local:daily:resume
```

Notes:

- Suitable as the first low-cost MVP candidate.
- Keep the key in macOS Keychain or a local one-off environment variable only.
  Do not paste it into source files or commit it.
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
4. Store it in macOS Keychain if Xpoz becomes the selected local provider.
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
6. Store it in macOS Keychain if Apify becomes the selected local provider.

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
4. Store it in macOS Keychain if AIsa becomes the selected local provider.
5. Test the X-related skill against Joybuy and Temu queries.

Notes:

- Useful as a skill/API fallback.
- Confirm field coverage before relying on it for dashboard metrics.

Local secret names:

```text
TWITTERAPI_IO_KEY=...
XPOZ_API_KEY=...
APIFY_TOKEN=...
AISA_API_KEY=...
```

`X_SOURCE_PROVIDER=twitterapi_io` is optional for TwitterAPI.io. Set it only
when you want to force a specific provider explicitly in a manual terminal run.

Risk notes:

- Free plans are generally not enough for 3,000-10,000 posts/day.
- Apify free plan does not guarantee that every X actor supports API usage.
- Provider pricing and X access rules can change quickly.
- Start with a monthly cost cap.

## Company JoyBuilder Translation

Real X posts may be English, German, French, Dutch, Spanish or other languages.
MVP production runs try to translate every non-Chinese post into Chinese before
the dashboard is published. If translation is unavailable, the report still
publishes and the affected posts show their original text as fallback.

Security decision:

```text
Do not add JDCLOUD_GPT_API_KEY to GitHub repository Secrets during the MVP.
```

Default runtime configuration:

```text
TRANSLATION_PROVIDER=joybuilder
JDBUILDER_TRANSLATION_MODEL=GPT-5.5
JDBUILDER_RESPONSES_URL=http://ai-api.jdcloud.com/v1/responses
JDBUILDER_TRANSLATION_TIMEOUT_SECONDS=90
JDBUILDER_TRANSLATION_BATCH_SIZE=6
JDBUILDER_TRANSLATION_RETRIES=1
JDBUILDER_TRANSLATION_MAX_CHARS=3500
```

The daily runner uses small translation batches by default. If one batch times
out, it is split into smaller batches and retried so that successful items still
receive Chinese translations. Original-text fallback is only the final safety
net for items that still fail after retry and split recovery.

Setup steps:

1. Use the same company API key pattern as the company image plugin.
2. Store `JDCLOUD_GPT_API_KEY` in macOS Keychain through `npm run local:secrets`, or use another company-trusted local secret store.
3. Do not paste the key into source files, Markdown, JSON or screenshots.
4. Keep the model value as `GPT-5.5` unless the JoyBuilder documentation changes.
5. Run `python3 scripts/smoke_translation_joybuilder.py` from a normal terminal to verify the company service.

Safety policy:

- GitHub Actions only publishes committed static dashboard files, so it does
  not call the company GPT service and does not require the company key.
- If `JDCLOUD_GPT_API_KEY` is missing or the translation service fails,
  real-provider daily runs continue and affected non-Chinese posts use original
  text as fallback. The run summary records how many posts used fallback text.
- Sample-mode runs use a local deterministic sample dictionary and do not call
  the company API.

## Tavily

Use Tavily for external verification, evidence checks and keyword expansion.

Website:

```text
https://www.tavily.com/
https://docs.tavily.com/documentation/api-credits
```

Local secret:

```text
TAVILY_API_KEY=...
```

Setup steps:

1. Open `https://www.tavily.com/`.
2. Create an account.
3. Open the API key page in the Tavily dashboard.
4. Copy the key.
5. Store it in macOS Keychain if Tavily is enabled.

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

Local secret:

```text
PERPLEXITY_API_KEY=...
```

Setup steps:

1. Open `https://docs.perplexity.ai/`.
2. Follow the dashboard/API setup flow.
3. Create or copy an API key.
4. Store it in macOS Keychain if Perplexity is enabled.
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

Local secret:

```text
OPENAI_API_KEY=...
```

Setup steps:

1. Open `https://platform.openai.com/`.
2. Create or select the organization/project.
3. Create an API key.
4. Store it in macOS Keychain if OpenAI is enabled.

## macOS Keychain Steps

Use these steps for the Mac-local automation. Do not add provider keys or
`JDCLOUD_GPT_API_KEY` to GitHub repository Secrets during the MVP.

1. Open a normal local terminal in the repo root.
2. Run `npm run local:secrets`.
3. Paste `TWITTERAPI_IO_KEY` when prompted.
4. Paste `JDCLOUD_GPT_API_KEY` when prompted.
5. The script writes both values to macOS Keychain and does not print them.

## GitHub Pages Steps

1. Open the repository.
2. Go to `Settings`.
3. Go to `Pages`.
4. Set source to `GitHub Actions`.
5. Push committed `public/**` dashboard files.
6. The `Publish dashboard` workflow deploys the Pages site.
7. Open the Pages URL from the workflow output.

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
5. Start Mac local daily automation at 08:00.
