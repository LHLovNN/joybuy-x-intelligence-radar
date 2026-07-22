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
- Collaboration principle: choose the correct architecture first. Do not route around permissions, sandbox limits or missing user-side access with a weaker workaround. When the correct solution needs user authorization, local setup, manual platform configuration or another action outside Codex's permissions, state the blocker clearly and ask the user to execute or approve that step.
- GitHub network operation rule: in the current Codex sandbox, GitHub network actions such as `git push`, `git pull`, `git fetch` and remote workflow checks may fail because `github.com` cannot be resolved. Do not repeatedly attempt these actions from the sandbox after this known failure. When a GitHub network action is needed, first finish local validation, then give the user one exact normal-terminal command to run.
- Security red line: never commit or paste API keys, tokens, cookies, credentials, private config or local secret files. For the current MVP, provider keys live in macOS Keychain or another local/company-trusted secret store. GitHub repository Secrets must not receive X provider keys or company GPT keys.
- Public dashboard JSON is product content and is committed to Git for daily history. Raw provider outputs, local logs, cluster detail caches and all credentials remain excluded.
- Mac local launchd automation is the production-like daily automation: it runs at Beijing time 08:00, collects X data, calls local JoyBuilder translation, generates public dashboard data, commits and pushes it.
- Daily guardrail caps are 60 total X posts per day: up to 45 Joybuy/JD/京东 posts, up to 15 Temu posts and up to 6 X API requests per run.
- GitHub Actions only publishes already committed static dashboard files through `.github/workflows/publish-dashboard.yml`. It must not collect X data, call translation services, run `scripts/run_daily.py`, or hold provider secrets.
- Real-provider daily runs can translate non-Chinese posts into Chinese through the company JoyBuilder Responses API with local `JDCLOUD_GPT_API_KEY` and model `GPT-5.5`. Translation is not a publishing blocker: if the key is missing or the translation request fails, the daily report still publishes and affected posts show original text as fallback, with fallback counts recorded in the run summary.
- Local real-browser screenshot QA should be run with `npm run qa:local-browser`. It first tries full Playwright QA, then falls back to system Chrome/Firefox headless screenshots. GitHub Actions is only the publish fallback quality gate, not the replacement for local QA.
- GitHub Actions publish workflow must run browser screenshot QA before deploying Pages and upload screenshots as workflow artifacts.
- If the X provider budget is exhausted or the request cap is reached, the local daily run should publish a partial report and expose collection warnings in `run-status.json` and the Actions summary.
- Each successful Mac daily run commits `public/dashboard-data/*.json`, `public/dashboard-data/daily/*.json` and `public/dashboard-data-bundle.js` back to Git before GitHub deploys Pages, so the dashboard can browse historical daily reports without pulling history from Pages.
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
- User-facing product language should avoid exposing the internal "cluster" concept. Use `舆情焦点`, `舆情详情`, `焦点舆情`, `相关原帖` and `关注原因` instead.
- `舆情焦点` should prioritize Joybuy/JD/京东 signals over Temu competitor baseline. Temu remains visible as competitor context, but it should not dominate the primary narrative.

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
- Added `舆情日报` historical browsing with a left-side daily archive list and date-level metrics/summary view.
- Seeded summary-only public daily archives for 2026-07-17, 2026-07-18 and 2026-07-19. Future successful runs will create full daily archives automatically.
- Added a deploy-only GitHub Actions workflow so committed dashboard changes can be published without consuming X API credits.
- Started product information-architecture refactor inspired by AIhot: navigation is now `舆情焦点 / 全部舆情 / 舆情日报 / 发酵追踪 / 设置`, and the daily report uses a publish-time vertical timeline for Joybuy and Temu signals.
- Refactored `舆情焦点` cards into an AIhot-like single-card flow: source identity, Chinese X content, public metrics, tags, attention reason and action buttons. The focus feed no longer shows a separate oversized AI judgement title.
- Refactored `舆情详情` toward AIhot's read-detail structure: narrow reading column, source account and IPS top row, lightweight `关注原因` and `舆情摘要` cards, translated X body, tags/original-link area, then lower-priority fermentation, scoring and evidence groups.
- Refined `舆情详情`: Chinese/original toggle is interactive, source evidence labels such as `热源` / `热门` / `扩散源` are displayed directly on related-post rows, the standalone bottom evidence section is removed from the page, and scoring now explains IPS through weighted contribution rows plus boost logic.
- Updated `舆情详情` related-post evidence cards: related X posts must show full text instead of one-line truncation, public metrics must be split into likes, replies, reposts, quotes, bookmarks and views rather than only showing a combined interaction number, and each real-data related post must expose an explicit `在 X 查看` original-post entry. Sample data shows `样本不跳转` instead of linking to fake URLs.
- Refactored `全部舆情` into an AIhot-inspired full information stream: it now uses cross-day archive data, source/type/search filters, date-based collapsible timeline groups, compact opinion cards, Chinese-first content, split public metrics, detail/original-post actions and empty-result handling. Product responsibility is clarified: `舆情焦点` answers what to prioritize, while `全部舆情` answers how to scan, filter and trace the full pool.
- Unified the `舆情焦点` and `全部舆情` presentation system: shared page hero, stats pills, filter panel, timeline date header, opinion-card shell, bottom action layout and sample-data badge treatment. The fake favorite button was removed from these two pages until a real favorite interaction exists.
- Fixed presentation QA issues in `舆情焦点` and `全部舆情`: page-level duplicate titles were removed from the content hero because the global topbar already owns the page title, and public interaction metrics now share one `card-metrics` pill style across both pages.
- Removed the standalone `当前焦点` hot-topic list from `舆情焦点`; it looked like an exposed topic-cluster artifact and duplicated the role of the date-based focus timeline. `舆情焦点` should now lead directly into the filtered, date-grouped opinion cards.
- Refactored `舆情日报` toward an AIhot-style daily issue: left-side report history, current issue masthead, `今日看点` navigation, and separate Joybuy/JD, Temu competitor and fermentation sections.
- Refined the visual density toward AIhot's reading-product style: 180px sidebar, about 1038px main content width, lighter 14px base typography, smaller section/card titles, softer shadows and more compact cards. `全部舆情` card titles now use topic-based generated headlines instead of duplicating the translated body text.
- Completed a recursive local audit of the current frontend pass: fixed item-level sample/original-link handling, updated the browser verification script for chip-based filters, removed stale filter listener code, and verified route rendering, old-label removal, sample-link suppression and `全部舆情` title/body separation with DOM smoke checks.
- Refactored `发酵追踪` into the same AIhot-inspired opinion-feed language: page hero, compact status pills, tracking timeline, Chinese topic headlines, split public metrics, 24h growth indicators, signal chips, Chinese tracking reasons and detail entry. User-facing copy no longer exposes the hard-to-understand "cluster" concept.
- Refactored `设置` into a product-readable `数据与自动化状态` page: collection run status, daily automation rhythm, fermentation refresh behavior, data quality funnel, MVP monitoring scope, and security/budget boundaries. The page now states that provider keys and company GPT keys stay in local Keychain and do not enter GitHub.
- Completed an implementation confidence audit pass: fixed stale browser-verification selectors for `发酵追踪`/`设置`, made the browser verifier read cluster details from `dashboard-data-bundle.js`, added http/https-only URL guards for rendered external links/media, and protected publish workflows from accidental API consumption.
- Added CI-level browser screenshot QA to the secret-free Pages publish path. The workflow installs Playwright Chromium on the GitHub runner, runs `scripts/verify_dashboard.cjs`, stops deployment on failure, and uploads screenshots from `data/logs/screenshots`.
- Added `scripts/local_browser_qa.sh` and `npm run qa:local-browser` for local real-browser screenshot QA. The script uses full Playwright verification when available, otherwise it tries local Chrome/Firefox headless screenshots for the dashboard routes.
- Completed local real Chrome screenshot QA through the Codex Chrome plugin and a user-started `127.0.0.1:4173` preview server. Desktop pages, mobile breakpoints, detail-page language toggle and console errors were checked without calling external collection APIs.
- Added multilingual translation for X posts: sample mode uses a deterministic local sample dictionary, while local trusted real-provider runs can use the company JoyBuilder Responses API (`JDCLOUD_GPT_API_KEY`, `GPT-5.5`). User-run real smoke test succeeded with one French Joybuy sentence returning Chinese translation. The local daily runner now prioritizes successful Chinese translation through smaller default batches, a 90-second timeout, one retry, max-character batching and split recovery after batch timeouts. Original-text fallback remains the final safety net and does not block daily publishing, including real `socket.timeout` failures; the dashboard run summary reports translation provider, missing count and original-text fallback count.
- Re-architected automation so GitHub no longer runs daily collection or fermentation refresh. The new model is Mac local launchd at 08:00 BJT for collection/translation/generation/push, with GitHub Actions reduced to a secret-free static Pages publish workflow.
- Added macOS automation scripts under `scripts/macos/`: Keychain secret setup, local daily runner, launchd install/uninstall and status/log inspection. The local runner uses Keychain, `caffeinate`, source-change guards, real-provider checks, security/data verification and public-dashboard-only Git staging.

## In Progress

- User review of the local redesigned pages: `舆情焦点`, `全部舆情`, `舆情详情`, `舆情日报`, `发酵追踪` and `设置`.
- Mac local automation needs user-side Keychain setup, one manual real local daily run and launchd installation.

## Next

- Ask the user to run `npm run local:secrets` from a normal terminal to store `TWITTERAPI_IO_KEY` and `JDCLOUD_GPT_API_KEY` in macOS Keychain.
- After Keychain setup, run one user-approved manual `npm run local:daily` real daily job; this will call TwitterAPI.io and JoyBuilder.
- If the manual local daily run succeeds, install the 08:00 launchd schedule with `npm run local:daily:install`.
- Remove obsolete provider secrets from GitHub repository Secrets, especially `TWITTERAPI_IO_KEY` if still present. Never add `JDCLOUD_GPT_API_KEY`.
- Continue real-data quality bake-off; review whether to restore larger caps after source budget is stable.
- Add Tavily verification adapter for high-risk/low-confidence intelligence checks.
- Add Perplexity executive-summary adapter for high-priority intelligence interpretation.
- Build real fermentation metric hydration and then re-enable scheduled intraday refresh if the value/cost ratio is acceptable.
- On the user's normal terminal, run `npm run qa:local-browser` for local screenshot QA before the next GitHub push.

## Milestone Plan

1. Concept and PRD/design archive.
2. Local MVP skeleton and sample dashboard.
3. Real X source connection and data-quality bake-off.
4. Real daily report pipeline with capped production-like limits.
5. AI-assisted verification and executive analysis.
6. Fermentation tracking against real historical metrics.
7. Mac local scheduled daily refresh and GitHub Pages deployment.
8. Premium dashboard redesign and stakeholder-ready polish.

## Verification

Passed:

- `python3 scripts/check_dashboard_data.py`
- `python3 scripts/verify_data.py`
- `python3 scripts/report_run_summary.py`
- `PYTHONPYCACHEPREFIX=.pycache python3 -m compileall scripts src`
- `node --check public/assets/app.js`
- `node --check public/dashboard-data-bundle.js`
- lightweight route-render smoke check for `#/fermentation` and `#/settings`
- `node --check scripts/verify_dashboard.cjs`
- Real Chrome screenshot QA through the Chrome plugin against `http://127.0.0.1:4173/index.html`
- `python3 scripts/test_translation.py`
- CI publish workflows now include browser screenshot QA through Playwright Chromium and screenshot artifact upload.

Not completed in this environment:

- Starting the local HTTP preview directly from the Codex sandbox is blocked by sandbox/network policy; the user can start it from a normal terminal.
- Full local Playwright browser verification from the Codex sandbox remains unavailable because the managed Chromium binary is not installed and system Chrome aborts under the sandbox. Use Chrome-plugin QA or GitHub Actions Playwright QA for screenshot-level checks.

The dashboard can now be opened directly through `public/index.html` because it reads `dashboard-data-bundle.js` before falling back to JSON fetch. It can also be served through the `public/` directory locally or published through GitHub Pages.

## External Setup Needed Later

The user will eventually need to register or provide API keys for:

- TwitterAPI.io or Xpoz as the primary X data source.
- Tavily for external verification.
- Perplexity for high-risk deep research and executive summaries.
- Optional Apify/AIsa as fallback data sources.
