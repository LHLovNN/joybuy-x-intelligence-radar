# Project State

## Objective

Build the Joybuy X Intelligence Radar MVP:

- X-only monitoring for Joybuy/JD/京东 and Joybuy European sites.
- Temu as lightweight competitor baseline.
- Daily report in the Beijing time 08:00 morning window.
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
- Daily guardrail caps are 240 total X posts per day: up to 160 Joybuy/JD/京东 posts, up to 80 Temu posts and up to 12 X API requests per run. This maps to the current six collection lanes fetching about two pages each, giving the daily archive stronger volume for product storytelling while keeping the MVP source spend bounded.
- TwitterAPI.io Advanced Search collection uses a two-lane search strategy: `Latest` and `Top` at a 1:1 ratio. `Top` should be understood as X/Twitter search's relevance/popular lane, not a guaranteed strict descending sort by likes or total interactions. Final product ordering still comes from local relevance, interaction, author, risk and IPS logic.
- Twitter/X advanced-search engagement threshold operators such as `min_faves`, `min_retweets` and `min_replies` are recognized future capabilities, but they are not enabled in MVP queries yet.
- GitHub Actions only publishes already committed static dashboard files through `.github/workflows/publish-dashboard.yml`. It must not collect X data, call translation services, run `scripts/run_daily.py`, or hold provider secrets.
- Real-provider daily runs can translate non-Chinese posts into Chinese through the company JoyBuilder Responses API with local `JDCLOUD_GPT_API_KEY` and model `GPT-5.5`. Translation is not a publishing blocker: if the key is missing or the translation request fails, the daily report still publishes and affected posts show original text as fallback, with fallback counts recorded in the run summary.
- For local visual/page-interaction QA, use the Chrome MCP plugin first when the user has a normal-terminal preview server running, especially for `127.0.0.1:4173` dashboard checks. Do not waste attempts on known-sandbox-brittle headless Chrome/Firefox terminal routes before trying Chrome MCP. `npm run qa:local-browser` remains a fallback script, not the default path in Codex.
- GitHub Actions publish workflow must run browser screenshot QA before deploying Pages and upload screenshots as workflow artifacts.
- If the X provider budget is exhausted or the request cap is reached, the local daily run should publish a partial report and expose collection warnings in `run-status.json` and the Actions summary.
- The local daily run must save a non-Git collection checkpoint immediately after X collection succeeds. If translation or dashboard generation fails after collection, use `npm run local:daily:resume` to continue from checkpoint without calling X again.
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
- MVP no longer exposes `发酵追踪` as a standalone visible module. Delayed-spread tracking is a future product problem to redesign after the core focus/all/daily/settings flow is stable.
- Quote/Quote post is a public propagation action.
- Bookmark is a save action and optional.
- User-facing product language should avoid exposing the internal "cluster" concept. Use `舆情焦点`, `焦点舆情`, `同日相似讨论`, `关联讨论` and `关注原因` instead.
- The standalone `舆情详情` page is product-deprecated for MVP. Keep source post, metrics, tags, context and original-link actions in list cards; place scoring-system explanation in `设置`.
- `舆情焦点` should prioritize Joybuy/JD/京东 signals over Temu competitor baseline. Temu remains visible as competitor context, but it should not dominate the primary narrative.
- Opinion cards in `舆情焦点`, `全部舆情` and `舆情日报` must show the translated X post itself as the main body. AI-derived summaries or scoring explanations may appear only as titles, tags or `关注原因`; they must not replace the source post content.
- Treat X status URLs and links embedded inside a post as separate product concepts: `在 X 查看原帖` must use the X status URL, while embedded post links should be labeled as `帖内链接` if shown.
- MVP video-post display currently uses direct media rendering again. The reversible official X embed trial remains behind the `USE_X_EMBED_FOR_VIDEO` switch in `public/assets/app.js`, now defaulted to `false`.
- Current video fallback UX: show the X video thumbnail with a centered play icon; clicking it opens the X video URL generated as `/video/{media index}` from the status URL. This avoids unreliable in-page hotlink playback while keeping the card visually clean.

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
- Relaxed real-provider dashboard verification so a quiet day with 0 Joybuy signals can still publish successfully.
- Added a weekend API guardrail: lower automatic X collection caps, per-run X API request cap, partial-report handling and run-status output.
- Confirmed the 2026-07-18 and 2026-07-19 scheduled runs completed with TwitterAPI.io, complete collection status, 4/6 API requests used and low estimated source cost.
- Moved the daily schedule from UTC 00:00 to UTC 00:23 to reduce GitHub Actions top-of-hour delay risk.
- Added `舆情日报` historical browsing with a left-side daily archive list and date-level metrics/summary view.
- Seeded summary-only public daily archives for 2026-07-17, 2026-07-18 and 2026-07-19. Future successful runs will create full daily archives automatically.
- Added a deploy-only GitHub Actions workflow so committed dashboard changes can be published without consuming X API credits.
- Started product information-architecture refactor inspired by AIhot: navigation is now `舆情焦点 / 全部舆情 / 舆情日报 / 设置`, and the daily report uses a publish-time vertical timeline for Joybuy and Temu signals.
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
- Added macOS automation scripts under `scripts/macos/`: Keychain secret setup, local daily runner, checkpoint resume, launchd install/uninstall and status/log inspection. The local runner uses Keychain, `caffeinate`, source-change guards, real-provider checks, security/data verification and public-dashboard-only Git staging.
- Removed `发酵追踪` from the MVP visible product surface: no left-nav entry, no standalone route rendering, no daily-report section and no `全部舆情` type filter. Historical data fields can remain for compatibility, but the product module is parked for redesign.
- Tried and then rolled back the official X embed path for video posts. The code path remains available behind `USE_X_EMBED_FOR_VIDEO=false`, while the current MVP view has returned to direct media rendering plus original-post fallback.
- Replaced the visible `打开视频` text pill with a centered play icon over the video thumbnail. Video click-through now generates X media-index links such as `https://x.com/BASS_TRANIC/status/2080063834631315473/video/2` instead of trusting the provider's sometimes-wrong media `expanded_url`.
- Updated real X collection from single-lane `Latest` to configurable `Latest` + `Top` dual-lane search at a 1:1 ratio. Added offline coverage so TwitterAPI.io `queryType=Top` remains configurable instead of being hardcoded to `Latest`.
- Expanded the X daily collection execution profile from 60 to 240 posts: Joybuy/JD 160 and Temu 80, with the request cap increased from 6 to 12 so the six Latest/Top collection lanes can each fetch roughly two pages.
- Verified the served local dashboard through the Chrome MCP plugin at `http://127.0.0.1:4173/#/`: `高潜传播` filter shows a clean empty state without the previous oversized circular-chip layout, no horizontal overflow, no console errors, and no visible `发酵追踪` navigation.
- User accepted `舆情焦点` and `全部舆情` as OK for the current MVP stage after the latest layout/content fixes.
- Completed local Keychain setup for `TWITTERAPI_IO_KEY` and `JDCLOUD_GPT_API_KEY`, then completed a manual real local daily run with JoyBuilder translation: 20 raw posts, 17 effective posts, 0 missing translations and the 2026-07-22 daily archive committed/pushed by the local runner.
- Optimized the `舆情日报` history rail before the next real-provider run: removed the non-existent weekly/monthly report switch, replaced heavy day cards with an AIhot-like month-grouped lightweight daily list, and verified the local Chrome view has no old tabs or horizontal overflow.
- Refined `舆情日报` from a duplicated feed into a report product: the top content now includes a daily conclusion, day-over-day metric changes, handling priority, review task and competitor observation before the supporting Joybuy/Temu evidence sections. The old `今日看点` directory copy was replaced by `报告目录`.
- Added a non-publishing real-data preview path: `npm run local:daily:preview` runs local real collection, translation and dashboard generation without `git pull`, `git commit` or `git push`; `npm run local:daily:preview:resume` resumes from checkpoint without calling X again.
- Completed the 2026-07-23 real-data preview/resume run: window `2026-07-22 08:00 BJT - 2026-07-23 08:00 BJT`, TwitterAPI.io 4/6 requests, 38 raw posts, 35 effective posts, JoyBuilder translation missing 0, Joybuy effective 21, Temu effective 14, 3 Joybuy signals, 1 high-risk signal, 1 fermenting signal. Top signal is JD.com/Ceconomy regulatory and market-access scrutiny, IPS 91 / urgent.
- Completed a 2026-07-23放量 real-data preview after switching to Latest/Top dual-lane and the 240-post execution profile: TwitterAPI.io used 9/12 requests, returned 80 raw posts, 73 effective posts, Joybuy 40 candidates / 38 effective, Temu 40 candidates / 35 effective, JoyBuilder translation missing 0 and fallback original 0. The cap did not bind; the provider returned only 80 unique posts in this window. `Top` ran but added no unique post beyond `Latest`; 17 kept posts were seen by both lanes.
- Field QA from the 2026-07-23放量 preview: author followers/following/avatar/joined-at/view/bookmark/conversation IDs were present on all 80 raw posts; author location was present on 51/80; media was present on 12/80 including 2 videos and 1 animated GIF; links were present on 42/80; quoted post IDs were present on 6/80. Author bio was still absent on all 80. The provider returned an `author_verified` field for all 80 but every value was false, including accounts such as Reuters, so verified status should not be trusted without a future profile/hydration check.
- Data-quality note from the 2026-07-23放量 preview: JD.com/Ceconomy regulatory discussion remains the strongest and valid Joybuy/JD signal, but放量 also surfaced weakly related noise such as `$JD` stock-analysis posts and `cv-by-jd.com` false positives. Decide whether to filter finance/stock chatter or classify it separately as corporate/IR monitoring before the next scheduled run.
- Fixed the shared-scroll bug between `舆情焦点` and `全部舆情`: the right content panel now resets to the top when the route changes, while same-page filters, date expansion and language toggles keep the current scroll position.
- Fixed the 2026-07-23 JD.com/Ceconomy data-quality issue: Joybuy/JD relevance now considers expanded links as well as post text, `t.co` links are replaced with readable labels in cleaned text, and regulatory/acquisition keywords are included so EU review and overseas market-access news is collected as important Joybuy/JD public opinion.
- Real-data field QA from the 2026-07-23 preview: TwitterAPI.io search results returned author followers/following/verified status for all 38 posts, but returned no author bios; it returned media on 6 raw posts including one video, and public dashboard data preserved at least the media attached to displayed Joybuy/Temu items; it returned conversation IDs broadly and one quoted post ID, but no reply target IDs/handles in this run.
- Updated media rendering after real-data QA: dashboard cards now prefer `media_url_https` / preview images over `t.co` media links and render mp4 video variants with native controls when available.
- Replaced user-facing "cluster" terminal copy with `Joybuy signals` / `Top signal`, and changed visible aggregate copy to `同日相似讨论` / `关联讨论` where it describes multiple same-day discussions rather than one literal original post.
- Upgraded post-card media and language UX across `舆情焦点`, `全部舆情` and `舆情日报`: images open in a lightbox, videos use preserved mp4 variants with native controls, and post text has a Chinese/original language switch defaulting to Chinese when both versions exist.
- Fixed the author hover card interaction so the card remains visible when moving from avatar to the popover and the `查看主页` action can be clicked. Author location and joined-at fields are now preserved and displayed if TwitterAPI.io returns them, but the 2026-07-23 data returned `null` bios and no location/joined-at fields.
- Front-chain restoration status: current TwitterAPI.io search payloads can expose `conversation_id`, `quoted_post_id`, `reply_to_post_id` or leading-mention hints, but they usually do not include the parent/quoted post body and media. Full forward-chain reconstruction requires a later low-call-count hydrate/conversation lookup design rather than assuming the search payload is enough.

## In Progress

- User review of the remaining redesigned pages: `舆情日报` and `设置`.
- Mac local automation still needs launchd installation after the current UI/data QA loop is closed.

## Next

- Before the next real collection, get explicit user approval because it consumes TwitterAPI.io and JoyBuilder quota.
- Next real collection QA must重点验证 three data-source capabilities:
  - Author profile enrichment: whether TwitterAPI.io returns poster bio, follower/following counts, verified status or other profile fields; if returned, preserve them in normalized data and show them in the avatar hover card.
  - Original-post media fidelity: whether collected posts include image/video media URLs, preview thumbnails and media types; if returned, preserve them through the adapter, public JSON and card rendering so X posts can be restored with higher fidelity.
  - Upstream context chain: when a collected post is a reply, quote, repost or comment-like item, verify whether the provider returns related parent/original post IDs, authors, text and media, or whether an additional lookup is needed; if feasible, render the forward/reply chain clearly in the list card instead of using a separate detail page.
- If the next real collection confirms missing author/media/context fields are available from the provider, update the TwitterAPI.io adapter, normalizer, dashboard builder and card UI in one pass.
- If search results keep omitting author bios and upstream reply/quote bodies, evaluate a low-call-count follow-up lookup strategy before increasing daily caps. Candidate use cases: enrich displayed focus items only, hydrate quote/reply parents only when `conversation_id` differs from `post_id`, and avoid full-thread crawling in the MVP.
- After the current QA loop succeeds, install the 08:00 launchd schedule with `npm run local:daily:install`.
- Continue real-data quality bake-off; review whether to restore larger caps after source budget is stable.
- Add Tavily verification adapter for high-risk/low-confidence intelligence checks.
- Add Perplexity executive-summary adapter for high-priority intelligence interpretation.
- Revisit delayed-spread tracking later as a fresh product design problem; do not re-enable a visible `发酵追踪` module until its value, data source, and cost model are clear.
- For local screenshot QA before the next GitHub push, use Chrome MCP against the user-started `npm run serve` preview first. If the current Codex tool surface only exposes the indirect Node REPL browser-control path and not direct Chrome page commands, state that clearly before trying fallbacks.

## Milestone Plan

1. Concept and PRD/design archive.
2. Local MVP skeleton and sample dashboard.
3. Real X source connection and data-quality bake-off.
4. Real daily report pipeline with capped production-like limits.
5. AI-assisted verification and executive analysis.
6. Future delayed-spread tracking design, after MVP core pages are stable.
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
- lightweight route-render smoke check for `#/settings` and legacy `#/fermentation` redirect behavior
- `node --check scripts/verify_dashboard.cjs`
- Real Chrome screenshot QA through the Chrome MCP plugin against `http://127.0.0.1:4173/#/` in earlier UI passes; the current session only exposed the indirect Node REPL browser-control path, and sandbox policy blocked local-port/system-Chrome fallback attempts.
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
