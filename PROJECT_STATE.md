# Project State

## Objective

Build the Joybuy X Intelligence Radar MVP:

- X-only monitoring for Joybuy/JD/京东 and Joybuy European sites.
- Temu as lightweight competitor baseline.
- Daily report in the Beijing time 08:00 morning window.
- Fermentation radar for delayed spread.
- Static GitHub Pages-ready dashboard.

## Current Decisions

- Static dashboard is served from `public/`.
- Dashboard data lives under `public/dashboard-data/`.
- Python pipeline generates JSON data.
- Security red line: never commit or paste API keys, tokens, cookies, credentials, private config or local secret files. Use local environment variables and GitHub Secrets only.
- Generated real-provider data and dashboard JSON are run artifacts and should be ignored by Git.
- GitHub Actions `Daily report` is the production-like daily automation: UTC 00:23 / Beijing time 08:23, moved off the top of the hour after scheduled runs landed around 09:40-09:50 BJT.
- Weekend guardrail caps are 60 total X posts per day: up to 45 Joybuy/JD/京东 posts, up to 15 Temu posts and up to 6 X API requests per run.
- GitHub Actions `Fermentation refresh` is manual-only during the current MVP bake-off. Scheduled triggers are intentionally disabled until real historical metric refresh is complete and API budget is approved.
- If the X provider budget is exhausted or the request cap is reached, the daily workflow should publish a partial report and expose collection warnings in `run-status.json` and the Actions summary.
- The first implementation uses deterministic sample data until API keys are available.
- Joybuy is a canonical brand entity:
  - Joybuy
  - JD
  - JD.com
  - 京东
  - Joybuy UK, Netherlands, France, Luxembourg, Germany, Belgium
- `JD` is ambiguous and requires ecommerce context evidence.
- Every valid Joybuy intelligence cluster goes to the historical archive.
- Only high-priority clusters enter the fermentation tracking pool.
- Quote/Quote post is a public propagation action.
- Bookmark is a save action and optional.

## Completed

- Created project directory structure.
- Added initial README and project state file.
- Implemented static dashboard shell in `public/`.
- Implemented deterministic sample X data.
- Implemented normalization with Joybuy/JD/京东 canonical entity handling.
- Implemented JD ambiguity context handling.
- Implemented clustering, IPS scoring, evidence chain, fermentation radar and Temu lightweight radar.
- Implemented static dashboard data generation.
- Implemented GitHub Pages workflow files.
- Added API key setup guide.
- Added data verification script.
- Added provider adapter skeletons for TwitterAPI.io, Xpoz, Apify and AIsa.
- Added direct local `file://` preview support through `public/dashboard-data-bundle.js`.
- Implemented TwitterAPI.io advanced-search adapter with environment-variable key loading.
- Added real-provider daily collection path while keeping sample mode as the default.
- Added small TwitterAPI.io bake-off script for low-volume provider validation.
- Fixed TwitterAPI.io created-time field mapping after the first real-key bake-off attempt.
- Added a no-network TwitterAPI.io response-mapping smoke test.
- Added TwitterAPI.io free-tier rate-limit handling: at least 5 seconds between requests and 429 retry backoff.
- First successful TwitterAPI.io bake-off returned real X posts: Joybuy 18, Temu 20.
- First real sample showed high noise from broad `京东` / `temu` queries, including recharge spam and non-shopping uses.
- Tightened X query builder with shopping/logistics/after-sales/overseas context terms.
- Added spam and context filters in normalization for low-value recharge, account-theft and unrelated broad keyword matches.
- Latest real sample after first tightening: Joybuy 13 raw / 6 effective before stricter offline refilter; Temu 20 raw / 20 effective before coupon-spam refilter.
- Added stricter standalone `JD` handling to exclude JD Vance/political noise and require stronger ecommerce/overseas context.
- Added Temu coupon-template spam exclusions and saved filtered examples with reasons in future bake-off logs.
- Added query-level and normalization-level hard exclusions for JD Vance/political false positives.
- Added `scripts/test_quality_filters.py` so JD Vance political posts and JD card recharge spam cannot regress into valid intelligence.
- Latest real bake-off after JD Vance exclusions: Joybuy 3 raw / 2 effective; no Vance mentions returned.
- Tightened Temu competitor filters for coupon spam, Polish `lat temu` false positives and Temu-as-insult/low-grade metaphor noise.
- Latest offline refilter of Temu sample: 20 raw / 13 effective after stricter competitor filters.
- Ran capped real-data daily pipeline with TwitterAPI.io: 43 raw posts, 3 Joybuy candidates, 2 effective Joybuy posts, 1 low-risk Joybuy cluster, 40 Temu candidates, 36 effective Temu posts.
- Updated dashboard metrics to show both Joybuy effective volume and Joybuy candidate volume.
- Updated verification script so real low-risk days no longer fail because they lack positive or high-risk sample clusters.
- Renamed generated cluster IDs from `joybuy-sample-###` to `joybuy-cluster-###`.
- Added `SECURITY.md`, expanded `.gitignore`, and added `scripts/security_check.py` before GitHub publishing.
- Updated GitHub Actions and provider selection so `TWITTERAPI_IO_KEY` alone enables TwitterAPI.io, while `X_SOURCE_PROVIDER` remains an optional override.
- Created and published the GitHub repository, configured GitHub Pages through GitHub Actions, and added `TWITTERAPI_IO_KEY` as a repository Secret.
- Confirmed the first manual GitHub Actions `Daily report` run succeeded.
- Added explicit MVP GitHub Actions caps: `X_DAILY_LIMIT=140`, `X_JOYBUY_DAILY_LIMIT=100`, `X_TEMU_DAILY_LIMIT=40`.
- Changed `Fermentation refresh` to manual-only to avoid unnecessary API calls during the weekend source bake-off.
- Added `scripts/report_run_summary.py` and wired it into GitHub Actions so each run prints a metrics-only summary.
- Relaxed real-provider dashboard verification so a quiet day with 0 Joybuy clusters can still publish successfully.
- Added a weekend API guardrail: lower automatic X collection caps, per-run X API request cap, partial-report handling and run-status output.
- Confirmed the 2026-07-18 and 2026-07-19 scheduled runs completed with TwitterAPI.io, complete collection status, 4/6 API requests used and low estimated source cost.
- Moved the daily schedule from UTC 00:00 to UTC 00:23 to reduce GitHub Actions top-of-hour delay risk.

## In Progress

- Run multi-day capped `Daily report` bake-off and review real data quality.

## Next

- Continue real-data quality bake-off over multiple days with weekend guardrails; review whether to restore larger caps after Monday inspection.
- Add Tavily verification adapter for high-risk/low-confidence intelligence checks.
- Add Perplexity executive-summary adapter for high-priority intelligence interpretation.
- Review GitHub Pages output after several scheduled `Daily report` runs.
- Build real fermentation metric hydration and then re-enable scheduled intraday refresh if the value/cost ratio is acceptable.
- Redesign and polish the dashboard UI. Current layout is a functional MVP shell, but it still needs a much more premium, executive-ready visual design before showing to important stakeholders.

## Milestone Plan

1. Concept and PRD/design archive.
2. Local MVP skeleton and sample dashboard.
3. Real X source connection and data-quality bake-off.
4. Real daily report pipeline with capped production-like limits.
5. AI-assisted verification and executive analysis.
6. Fermentation tracking against real historical metrics.
7. GitHub Pages deployment and scheduled daily refresh.
8. Premium dashboard redesign and stakeholder-ready polish.

## Verification

Passed:

- `python3 scripts/run_daily.py`
- `python3 scripts/run_fermentation_refresh.py`
- `python3 scripts/check_dashboard_data.py`
- `python3 scripts/verify_data.py`
- `PYTHONPYCACHEPREFIX=.pycache python3 -m compileall scripts src`
- `node --check public/assets/app.js`
- `node --check public/dashboard-data-bundle.js`

Not completed in this environment:

- Local HTTP preview: blocked by sandbox/network policy.
- Playwright browser screenshot verification: Playwright browser binary is not installed in this environment.

The dashboard can now be opened directly through `public/index.html` because it reads `dashboard-data-bundle.js` before falling back to JSON fetch. It can also be served through the `public/` directory locally or published through GitHub Pages.

## External Setup Needed Later

The user will eventually need to register or provide API keys for:

- TwitterAPI.io or Xpoz as the primary X data source.
- Tavily for external verification.
- Perplexity for high-risk deep research and executive summaries.
- Optional Apify/AIsa as fallback data sources.
