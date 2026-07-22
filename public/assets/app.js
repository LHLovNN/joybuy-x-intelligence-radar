const state = {
  overview: null,
  daily: null,
  dailyIndex: null,
  dailyArchive: [],
  selectedDaily: null,
  fermentation: null,
  competitor: null,
  sourceStatus: null,
  currentEvidenceTab: "origin",
  detailLanguage: "zh",
  allBrandFilter: "all",
  allTypeFilter: "all",
  allSearchQuery: "",
  allExpandedDates: new Set(),
  featuredFilter: "all",
  featuredExpandedDates: new Set(),
};

const routeTitles = {
  overview: "舆情焦点",
  all: "全部舆情",
  daily: "舆情日报",
  fermentation: "发酵追踪",
  settings: "设置",
  detail: "舆情详情",
};

async function loadJson(path) {
  const key = path.replace(/^\.\//, "");
  if (window.__DASHBOARD_DATA__) {
    if (window.__DASHBOARD_DATA__[key]) return window.__DASHBOARD_DATA__[key];
    if (window.__DASHBOARD_DATA__.clusters && window.__DASHBOARD_DATA__.clusters[key]) {
      return window.__DASHBOARD_DATA__.clusters[key];
    }
  }
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

async function init() {
  state.overview = await loadJson("./dashboard-data/latest.json");
  state.daily = await loadJson("./dashboard-data/daily/latest.json");
  state.dailyIndex = await loadJson("./dashboard-data/daily/index.json");
  state.dailyArchive = await loadDailyArchive();
  if (!state.dailyArchive.length) state.dailyArchive = [state.daily];
  state.featuredExpandedDates = new Set(state.dailyArchive.slice(0, 1).map((daily) => daily.date).filter(Boolean));
  state.allExpandedDates = new Set(state.dailyArchive.slice(0, 3).map((daily) => daily.date).filter(Boolean));
  state.selectedDaily = state.daily;
  state.fermentation = await loadJson("./dashboard-data/fermentation.json");
  state.competitor = await loadJson("./dashboard-data/competitor.json");
  state.sourceStatus = await loadJson("./dashboard-data/source-status.json");
  window.addEventListener("hashchange", render);
  render();
}

async function loadDailyArchive() {
  const items = state.dailyIndex?.items || [];
  const records = await Promise.all(
    items.map(async (item) => {
      try {
        return await loadJson(`./dashboard-data/daily/${item.date}.json`);
      } catch (error) {
        return null;
      }
    })
  );
  return records.filter(Boolean).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function route() {
  const hash = window.location.hash || "#/";
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "intel") return { name: "detail", id: parts[1] };
  if (parts[0] === "source-status") return { name: "settings" };
  if (parts[0] === "competitor") return { name: "daily" };
  return { name: parts[0] || "overview" };
}

function render() {
  const current = route();
  document.getElementById("page-title").textContent = routeTitles[current.name] || "舆情焦点";
  document.getElementById("generated-at").textContent = state.overview.generated_at_label;
  const health = document.getElementById("health-pill");
  const sampleMode = isSampleMode();
  health.textContent = sampleMode ? "Sample data" : state.overview.health === "normal" ? "Data healthy" : state.overview.health;
  health.className = `status-pill ${sampleMode ? "sample" : state.overview.health}`;
  document.querySelectorAll(".nav-list a").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === current.name || (current.name === "detail" && link.dataset.route === "daily"));
  });

  const content = document.getElementById("content");
  if (current.name === "all") content.innerHTML = allIntelligencePage();
  else if (current.name === "daily") content.innerHTML = dailyPage();
  else if (current.name === "fermentation") content.innerHTML = fermentationPage();
  else if (current.name === "settings") content.innerHTML = settingsPage();
  else if (current.name === "detail") renderDetail(current.id);
  else content.innerHTML = overviewPage();
  bindPageEvents();
}

function overviewPage() {
  const archive = state.dailyArchive.length ? state.dailyArchive : [state.daily];
  const latest = archive[0] || state.daily;
  const latestMetrics = latest.metrics || state.overview.metrics;
  const allFeaturedCount = archive.reduce((sum, daily) => sum + featuredItemsForDaily(daily, false).length, 0);
  const visibleGroups = archive.map((daily) => ({
    daily,
    items: featuredItemsForDaily(daily, true),
  })).filter((group) => group.items.length);
  return `
    ${pageHero({
      eyebrow: "舆情雷达",
      title: "舆情焦点",
      subtitle: `${formatDateLong(latest.date)} · AI 自动识别需要优先关注的 Joybuy / 竞品舆情`,
      stats: [
        [allFeaturedCount, "焦点舆情"],
        [topIps(latest), "最高 IPS"],
        [formatApiUsage(latest.collection_status), "API 消耗"],
      ],
    })}
    ${sampleDataNotice(latest)}
    <div class="featured-status-row">
      <span>Joybuy 有效 ${escapeHtml(String(latestMetrics.joybuy_volume || 0))}</span>
      <span>高风险 ${escapeHtml(String(latestMetrics.high_risk || 0))}</span>
      <span>Temu 基线 ${escapeHtml(String(latestMetrics.temu_volume || 0))}</span>
      <span>${escapeHtml(latest.window_label || "Past 24 hours")}</span>
    </div>
    ${featuredFilterBar()}
    <section class="featured-feed">
      ${visibleGroups.length ? visibleGroups.map(featuredDateGroup).join("") : empty("暂无匹配焦点舆情，请调整筛选条件。")}
    </section>
  `;
}

function pageHero({ eyebrow, subtitle, stats }) {
  return `
    <section class="page-hero">
      <div>
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <p class="muted">${escapeHtml(subtitle)}</p>
      </div>
      <div class="page-hero-stats">
        ${stats.map(([value, label]) => `<span><strong>${escapeHtml(String(value))}</strong><em>${escapeHtml(label)}</em></span>`).join("")}
      </div>
    </section>
  `;
}

function featuredFilterBar() {
  const filters = [
    ["all", "全部"],
    ["risk", "风险"],
    ["opportunity", "机会"],
    ["competitor", "竞品"],
    ["watch", "高潜传播"],
  ];
  return `
    <section class="filter-panel compact">
      <div>
        <div class="toolbar-label">视图</div>
        <div class="filter-chip-row">
          ${filters
            .map(
              ([value, label]) => `
                <button class="filter-chip ${state.featuredFilter === value ? "active" : ""}" type="button" data-featured-filter="${value}">
                  ${escapeHtml(label)}
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function featuredDateGroup(group) {
  const daily = group.daily;
  const items = group.items;
  const open = state.featuredExpandedDates.has(daily.date);
  return `
    <article class="featured-date-group">
      ${timelineDateButton(daily.date, `${items.length} 条焦点`, open, "featured")}
      ${open ? featuredTimeline(daily, items) : ""}
    </article>
  `;
}

function featuredTimeline(daily, items) {
  if (!items.length) {
    return `<div class="featured-empty">${escapeHtml(daily.summary_only ? "该日为摘要级归档，暂无原帖级焦点卡片。" : "该日暂无达到焦点阈值的舆情。")}</div>`;
  }
  return `
    <div class="publish-timeline featured-timeline">
      ${items.sort(compareEvents).map(featuredTimelineCard).join("")}
    </div>
  `;
}

function featuredTimelineCard(item) {
  const translation = chineseSignalText(item);
  const media = item.media || [];
  const sourceCount = Number(item.source_count || 1);
  return `
    <div class="publish-item featured-item">
      <div class="publish-time">${escapeHtml(item.timeLabel || formatEventTime(item.time))}</div>
      <div class="publish-line"><span></span></div>
      <article class="opinion-card featured-card ${scoreClass(item)}">
        <div class="featured-card-top">
          <div class="source-identity">
            ${avatarNode(item)}
            <div>
              <div class="source-line">
                <span>${escapeHtml(item.author_name || item.source_name || "Unknown source")}</span>
                ${item.author_handle ? `<em>@${escapeHtml(item.author_handle)}</em>` : ""}
                <strong>${escapeHtml(item.brand === "temu" ? "竞品" : "焦点")}</strong>
              </div>
              <div class="source-subline">${escapeHtml(sourceTypeLabel(item))}${item.author_followers ? ` · ${escapeHtml(formatCompactNumber(item.author_followers))} followers` : ""}</div>
            </div>
          </div>
          <div class="featured-score">
            <span>${escapeHtml(String(item.score_value ?? "n/a"))}</span>
            <em>${escapeHtml(item.score_label || "IPS")}</em>
          </div>
        </div>
        <section class="x-signal-block">
          <div class="block-heading">
            <span>X 原帖内容</span>
            ${translationStateBadge(item)}
            <em>${escapeHtml(sourceCount > 1 ? `${sourceCount} 条相关原帖` : "1 条原帖")}</em>
          </div>
          ${translation ? `<p class="featured-translation">${escapeHtml(translation)}</p>` : ""}
          ${media.length ? `<div class="featured-media-grid">${media.map(mediaNode).join("")}</div>` : ""}
          <div class="metric-inline card-metrics">
            ${metricInline("赞", item.post_metrics?.likes ?? item.metrics?.total_likes)}
            ${metricInline("评", item.post_metrics?.replies ?? item.metrics?.total_replies)}
            ${metricInline("转", item.post_metrics?.reposts ?? item.metrics?.total_reposts)}
            ${metricInline("引", item.post_metrics?.quotes ?? item.metrics?.total_quotes)}
            ${metricInline("浏览", item.post_metrics?.views ?? item.metrics?.total_views)}
          </div>
          <div class="tag-row">${(item.tags || []).slice(0, 8).map((tag) => `<span class="plain-tag">#${escapeHtml(tag)}</span>`).join("")}</div>
          <div class="reason-line">关注原因：${escapeHtml(item.selected_reason || item.reason || "该舆情达到焦点阈值，建议结合原帖证据持续观察。")}</div>
          ${item.related_sources ? `<div class="source-count-line">另有 ${escapeHtml(String(item.related_sources))} 条相关原帖可在详情页溯源</div>` : ""}
        </section>
        <div class="featured-card-bottom">
          ${cardFootnote(item.brand === "temu" ? "竞品基线信号" : "Joybuy / JD 相关舆情", item)}
          <div class="button-row">
            ${item.href ? `<a class="text-button primary" href="${escapeHtml(item.href)}">详情</a>` : ""}
            ${cardExternalAction(item.external_href, item)}
          </div>
        </div>
      </article>
    </div>
  `;
}

function featuredItemsForDaily(daily, applyFilter = true) {
  const dailySample = isDailySample(daily);
  const nativeItems = daily.featured_items?.length ? daily.featured_items.map((item) => ({ ...normalizeFeaturedItem(item), is_sample: dailySample })) : fallbackFeaturedItems(daily).map((item) => ({ ...item, is_sample: dailySample }));
  const filtered = applyFilter ? nativeItems.filter(itemMatchesFeaturedFilter) : nativeItems;
  return filtered.sort(compareEvents);
}

function normalizeFeaturedItem(item) {
  return {
    ...item,
    time: item.created_at,
    scoreValue: item.score_value,
    scoreLabel: item.score_label || "IPS",
    source: item.source_name || item.source_type || "X 舆情",
    summary: item.translation_zh || item.summary_zh || item.original_text || "",
    reason: item.selected_reason,
  };
}

function chineseSignalText(item) {
  return item.translation_zh || item.summary_zh || item.original_text || item.summary || "";
}

function translationStatusKind(item) {
  const status = String(item?.translation_status || "").toLowerCase();
  if (["missing", "error"].includes(status)) return "fallback";
  if (["translated", "sample_dictionary", "provider_supplied"].includes(status)) return "translated";
  if (status === "source_chinese") return "source";
  return "";
}

function translationStateLabel(item) {
  const kind = translationStatusKind(item);
  if (kind === "fallback") return "原文展示";
  if (kind === "translated") return "中文译文";
  if (kind === "source") return "中文原帖";
  return "";
}

function translationStateBadge(item) {
  const label = translationStateLabel(item);
  if (!label) return "";
  return `<span class="translation-state ${escapeHtml(translationStatusKind(item))}">${escapeHtml(label)}</span>`;
}

function translationStateInline(item) {
  const badge = translationStateBadge(item);
  return badge ? ` · ${badge}` : "";
}

function detailBodyLabel(item, language) {
  if (language === "original") return "正文 · 原文";
  if (translationStatusKind(item) === "fallback") return "正文 · 原文展示";
  if (translationStatusKind(item) === "source") return "正文 · 中文原帖";
  return "正文 · 中文译文";
}

function localizedTitle(title, fallback, defaultText = "舆情信号") {
  const value = String(title || "").trim();
  if (value && /[\u3400-\u9fff]/.test(value)) return value;
  const next = String(fallback || "").trim();
  if (next) return truncateText(next, 42);
  return value || defaultText;
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function sourceTypeLabel(item) {
  const raw = String(item.source_type || item.source_name || "X 舆情");
  if (raw.includes("摘要级归档")) return "历史摘要";
  return raw;
}

function isSampleMode(daily = state.selectedDaily || state.daily) {
  const providers = [
    ...(daily?.source_status?.providers || []),
    ...(state.sourceStatus?.providers || []),
    ...(state.overview?.source_status?.providers || []),
  ];
  return daily?.collection_status?.status === "sample" || providers.includes("sample");
}

function isDailySample(daily) {
  const providers = daily?.source_status?.providers || [];
  return daily?.collection_status?.status === "sample" || providers.includes("sample");
}

function sampleDataNotice(daily = state.selectedDaily || state.daily) {
  if (!isDailySample(daily)) return "";
  return `
    <section class="sample-data-notice">
      <strong>当前为样例数据预览</strong>
      <span>这些内容用于验证页面结构和交互，不代表真实 X 舆情；样例内容会以状态标签标识，原帖入口不会跳转至 X。</span>
    </section>
  `;
}

function externalLinkButton(href, label, className = "", options = {}) {
  if (options.isSample) {
    return `<span class="text-button disabled ${escapeHtml(className)}" title="样例数据不提供真实 X 跳转">${escapeHtml(label)}已隐藏</span>`;
  }
  const url = safeExternalUrl(href);
  if (!url) return `<span class="text-button disabled ${escapeHtml(className)}">原帖不可用</span>`;
  return `<a class="text-button ${escapeHtml(className)}" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function cardFootnote(text, item) {
  return `
    <span class="card-footnote">
      <span>${escapeHtml(text)}</span>
      ${sampleInlineBadge(item)}
    </span>
  `;
}

function sampleInlineBadge(item) {
  if (!item?.is_sample) return "";
  return `<em class="sample-inline-badge">样例数据</em>`;
}

function cardExternalAction(href, item, label = "原帖") {
  if (!href || item?.is_sample) return "";
  const url = safeExternalUrl(href);
  if (!url) return "";
  return `<a class="text-button" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function safeExternalUrl(href) {
  const value = String(href || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.href;
  } catch (error) {
    return "";
  }
}

function fallbackFeaturedItems(daily) {
  const clusterItems = (daily.clusters || [])
    .filter((cluster) => daily.summary_only || isFeaturedClusterFallback(cluster))
    .map((cluster) => {
      const score = cluster.score || {};
      return normalizeFeaturedItem({
        id: `fallback-${cluster.cluster_id}`,
        brand: "joybuy",
        cluster_id: cluster.cluster_id,
        source_type: daily.summary_only ? "摘要级归档" : "X 舆情",
        source_name: "Joybuy / JD",
        author_name: "Joybuy Radar",
        author_handle: "",
        post_url: "",
        created_at: cluster.first_seen_at || cluster.last_seen_at,
        title: cluster.title,
        display_title: cluster.summary_zh || cluster.title,
        original_text: cluster.summary || "",
        translation_zh: cluster.summary_zh || cluster.summary || "",
        summary_zh: cluster.summary_zh || "",
        media: [],
        score,
        score_value: score.ips ?? "n/a",
        score_label: "IPS",
        tags: [...(cluster.risk_types || []), ...(cluster.opportunity_types || []), cluster.topic].filter(Boolean),
        metrics: cluster.metrics || {},
        post_metrics: {},
        source_count: cluster.post_count || 1,
        related_sources: Math.max(0, Number(cluster.post_count || 1) - 1),
        selected_reason: score.explanation || cluster.tracking_reason || "摘要级归档保留了当日主题和指标，原帖级焦点舆情将在完整日报中展示。",
        recommended_action: score.recommended_action || "持续监测",
        href: cluster.cluster_id && !String(cluster.cluster_id).startsWith("archive-") ? `#/intel/${cluster.cluster_id}` : "",
        external_href: "",
        sentiment: score.sentiment || "neutral",
        level: score.level || "low",
      });
    });
  const competitorItems = buildCompetitorEvents(daily)
    .filter((event) => event.brand === "temu")
    .map((event, index) =>
      normalizeFeaturedItem({
        id: `fallback-temu-${daily.date}-${index}`,
        brand: "temu",
        source_type: "竞品基线",
        source_name: event.source,
        author_name: "Temu Radar",
        created_at: event.time,
        timeLabel: event.timeLabel,
        title: event.title,
        original_text: event.title,
        translation_zh: event.summary,
        summary_zh: event.summary,
        media: [],
        score_value: event.scoreValue,
        score_label: event.scoreLabel,
        tags: event.tags || ["竞品"],
        metrics: {},
        post_metrics: {},
        source_count: 1,
        related_sources: 0,
        selected_reason: event.reason,
        recommended_action: "纳入竞品基线观察",
        href: "",
        external_href: event.href || "",
        sentiment: "neutral",
        level: "low",
      })
    );
  return [...clusterItems, ...competitorItems];
}

function isFeaturedClusterFallback(cluster) {
  const score = cluster.score || {};
  return (
    Number(score.ips || 0) >= 70 ||
    ["urgent", "high"].includes(score.level) ||
    Number(score.future_potential || 0) >= 75 ||
    Number(score.current_impact || 0) >= 70 ||
    Number(cluster.metrics?.max_author_followers || 0) >= 20000
  );
}

function itemMatchesFeaturedFilter(item) {
  if (state.featuredFilter === "all") return true;
  if (state.featuredFilter === "competitor") return item.brand === "temu";
  if (state.featuredFilter === "opportunity") return item.sentiment === "positive" || (item.tags || []).some((tag) => String(tag).includes("opportunity") || String(tag).includes("机会"));
  if (state.featuredFilter === "watch") return Number(item.score?.future_potential || 0) >= 75 || (item.tags || []).includes("高潜传播");
  if (state.featuredFilter === "risk") return item.brand !== "temu" && item.sentiment !== "positive";
  return true;
}

function needsChineseTranslation(item) {
  const language = String(item.language || "").toLowerCase();
  const original = item.original_text || "";
  if (["zh", "zh-cn", "zh-hans", "zh-tw", "zh-hant"].includes(language)) return false;
  if (language && language !== "und") return true;
  return original && !/[\u3400-\u9fff]/.test(original);
}

function avatarNode(item) {
  const avatarUrl = safeExternalUrl(item.author_avatar_url);
  if (avatarUrl) {
    return `<img class="source-avatar" src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" />`;
  }
  return `<span class="source-avatar fallback">${escapeHtml(initials(item.author_name || item.author_handle || item.source_name || "JX"))}</span>`;
}

function initials(value) {
  const text = String(value || "").trim();
  if (!text) return "JX";
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return text.slice(0, 2).toUpperCase();
}

function mediaNode(item) {
  const url = typeof item === "string" ? item : item?.url || item?.media_url_https || item?.media_url || item?.preview_image_url || "";
  const safeUrl = safeExternalUrl(url);
  if (!safeUrl) return "";
  return `<img src="${escapeHtml(safeUrl)}" alt="" loading="lazy" />`;
}

function metricInline(label, value) {
  if (value == null || value === "") return "";
  return `<span>${escapeHtml(label)} ${escapeHtml(formatCompactNumber(value))}</span>`;
}

function formatCompactNumber(value) {
  const number = Number(value || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 10000) return `${(number / 10000).toFixed(1)}万`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}k`;
  return String(number);
}

function scoreClass(item) {
  const level = item.level || item.score?.level || "low";
  if (["urgent", "high"].includes(level)) return "score-hot";
  if (level === "medium") return "score-warm";
  if (item.sentiment === "positive") return "score-good";
  return "score-calm";
}

function allIntelligencePage() {
  const archive = state.dailyArchive.length ? state.dailyArchive : [state.daily];
  const rawGroups = archive.map((daily) => ({
    daily,
    items: allItemsForDaily(daily),
  }));
  const allItems = rawGroups.flatMap((group) => group.items);
  const filteredGroups = rawGroups.map((group) => ({
    daily: group.daily,
    items: group.items.filter(itemMatchesAllFilters).sort(compareEvents),
  }));
  const filteredItems = filteredGroups.flatMap((group) => group.items);
  const metrics = allPageMetrics(allItems, filteredItems);
  return `
    ${pageHero({
      eyebrow: "舆情雷达",
      title: "全部舆情",
      subtitle: `${formatDateLong(archive[0]?.date)} · Joybuy / JD 与 Temu 竞品舆情全量信息流`,
      stats: [
        [metrics.filtered, "当前结果"],
        [metrics.total, "归档总量"],
        [metrics.risk, "风险舆情"],
        [metrics.archiveDays, "归档天数"],
      ],
    })}
    ${sampleDataNotice(archive[0])}
    <section class="filter-panel">
      <div>
        <div class="toolbar-label">来源</div>
        <div class="filter-chip-row">
          ${allSourceFilterButton("all", "全部")}
          ${allSourceFilterButton("joybuy", "Joybuy / JD")}
          ${allSourceFilterButton("temu", "Temu")}
          ${allSourceFilterButton("x", "原帖级")}
          ${allSourceFilterButton("archive", "摘要归档")}
        </div>
      </div>
      <form class="all-search-row" id="all-search-form">
        <label>
          <span>类型</span>
          <select id="all-type-filter" aria-label="类型筛选">
            <option value="all" ${state.allTypeFilter === "all" ? "selected" : ""}>全部</option>
            <option value="risk" ${state.allTypeFilter === "risk" ? "selected" : ""}>风险</option>
            <option value="opportunity" ${state.allTypeFilter === "opportunity" ? "selected" : ""}>机会</option>
            <option value="competitor" ${state.allTypeFilter === "competitor" ? "selected" : ""}>竞品</option>
            <option value="tracking" ${state.allTypeFilter === "tracking" ? "selected" : ""}>发酵追踪</option>
            <option value="summary" ${state.allTypeFilter === "summary" ? "selected" : ""}>摘要归档</option>
          </select>
        </label>
        <label class="all-search-field">
          <span>搜索</span>
          <input id="all-search-input" type="search" value="${escapeHtml(state.allSearchQuery)}" placeholder="搜索标题、中文正文、标签、作者…" />
        </label>
        <button class="text-button primary" type="submit">搜索</button>
      </form>
    </section>
    <section class="all-feed">
      <div class="section-header">
        <div>
          <h2>信息流</h2>
          <p class="muted">按日期与发布时间倒序排列。Joybuy 舆情进入详情页，X 原帖保留明确原文入口。</p>
        </div>
        <span class="tag">${filteredItems.length} 条</span>
      </div>
      ${filteredItems.length ? filteredGroups.filter((group) => group.items.length).map(allDateGroup).join("") : empty("暂无匹配舆情，请调整来源、类型或搜索词。")}
    </section>
  `;
}

function allSourceFilterButton(value, label) {
  return `
    <button class="filter-chip ${state.allBrandFilter === value ? "active" : ""}" type="button" data-all-source-filter="${escapeHtml(value)}">
      ${escapeHtml(label)}
    </button>
  `;
}

function allPageMetrics(allItems, filteredItems) {
  return {
    total: allItems.length,
    filtered: filteredItems.length,
    risk: filteredItems.filter((item) => item.kind === "risk" || ["urgent", "high", "medium"].includes(item.level)).length,
    archiveDays: state.dailyArchive.length || 1,
  };
}

function allDateGroup(group) {
  const open = state.allExpandedDates.has(group.daily.date);
  const countLabel = group.daily.summary_only ? `${group.items.length} 条摘要` : `${group.items.length} 条`;
  return `
    <article class="all-date-group">
      ${timelineDateButton(group.daily.date, countLabel, open, "all")}
      ${open ? allTimeline(group) : ""}
    </article>
  `;
}

function timelineDateButton(date, countLabel, open, scope) {
  const attr = scope === "all" ? "data-all-date" : "data-featured-date";
  return `
    <button class="timeline-date-button" type="button" ${attr}="${escapeHtml(date)}">
      <span>${escapeHtml(formatDateShort(date))}</span>
      <em>${open ? "⌄" : "›"}</em>
      <strong>${escapeHtml(weekdayLabel(date))} · ${escapeHtml(countLabel)}</strong>
    </button>
  `;
}

function allTimeline(group) {
  if (!group.items.length) {
    return `<div class="featured-empty">${escapeHtml(group.daily.summary_only ? "该日摘要归档暂无匹配结果。" : "该日暂无匹配舆情。")}</div>`;
  }
  return `
    <div class="publish-timeline all-timeline">
      ${group.items.map(allTimelineCard).join("")}
    </div>
  `;
}

function allTimelineCard(item) {
  const body = allBodyText(item);
  return `
    <div class="publish-item all-feed-item">
      <div class="publish-time">${escapeHtml(item.timeLabel || formatEventTime(item.time))}</div>
      <div class="publish-line"><span></span></div>
      <article class="opinion-card all-card ${scoreClass(item)}">
        <div class="all-card-top">
          <div class="source-identity">
            ${avatarNode(item)}
            <div>
              <div class="source-line">
                <span>${escapeHtml(item.author_name || item.source_name || "Unknown source")}</span>
                ${item.author_handle ? `<em>@${escapeHtml(item.author_handle)}</em>` : ""}
                <strong>${escapeHtml(item.badge)}</strong>
              </div>
              <div class="source-subline">${escapeHtml(item.source_subline)}${translationStateInline(item)}${item.author_followers ? ` · ${escapeHtml(formatCompactNumber(item.author_followers))} followers` : ""}</div>
            </div>
          </div>
          <div class="all-score" aria-label="${escapeHtml(item.score_label)} ${escapeHtml(String(item.score_value ?? "n/a"))}">
            <span>${escapeHtml(String(item.score_value ?? "n/a"))}</span>
            <em>${escapeHtml(item.score_label)}</em>
          </div>
        </div>
        <div class="all-card-body">
          ${allTitleNode(item)}
          <p>${escapeHtml(body)}</p>
          ${item.media?.length ? `<div class="featured-media-grid">${item.media.map(mediaNode).join("")}</div>` : ""}
          <div class="metric-inline card-metrics">
            ${metricInline("赞", item.post_metrics?.likes ?? item.metrics?.total_likes)}
            ${metricInline("评", item.post_metrics?.replies ?? item.metrics?.total_replies)}
            ${metricInline("转", item.post_metrics?.reposts ?? item.metrics?.total_reposts)}
            ${metricInline("引", item.post_metrics?.quotes ?? item.metrics?.total_quotes)}
            ${metricInline("收藏", item.post_metrics?.bookmarks ?? item.metrics?.total_bookmarks)}
            ${metricInline("浏览", item.post_metrics?.views ?? item.metrics?.total_views)}
          </div>
        </div>
        <div class="tag-row">${(item.tags || []).slice(0, 8).map((tag) => `<span class="plain-tag">#${escapeHtml(tag)}</span>`).join("")}</div>
        ${item.reason ? `<div class="reason-line compact">关注原因：${escapeHtml(item.reason)}</div>` : ""}
        <div class="all-card-bottom">
          ${cardFootnote(item.source_count_label, item)}
          <div class="button-row">
            ${item.href ? `<a class="text-button primary" href="${escapeHtml(item.href)}">详情</a>` : ""}
            ${allExternalLinkButton(item)}
          </div>
        </div>
      </article>
    </div>
  `;
}

function allTitleNode(item) {
  const title = allDisplayTitle(item);
  if (item.href) return `<h3><a href="${escapeHtml(item.href)}">${escapeHtml(title)}</a></h3>`;
  const externalUrl = item.is_sample ? "" : safeExternalUrl(item.external_href);
  if (externalUrl) return `<h3><a href="${escapeHtml(externalUrl)}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a></h3>`;
  return `<h3>${escapeHtml(title)}</h3>`;
}

function allBodyText(item) {
  const body = String(item.body_zh || item.summary || "").trim();
  const title = allDisplayTitle(item);
  if (body && !sameDisplayText(body, title)) return body;
  const fallback = String(item.summary || "").trim();
  if (fallback && !sameDisplayText(fallback, title)) return fallback;
  return "暂无中文摘要";
}

function allDisplayTitle(item) {
  const rawTitle = String(item.title || "").trim();
  const body = String(item.body_zh || item.summary || "").trim();
  if (rawTitle && /[\u3400-\u9fff]/.test(rawTitle) && !sameDisplayText(rawTitle, body)) {
    return truncateText(rawTitle, 54);
  }
  return generatedOpinionTitle(item);
}

function sameDisplayText(a, b) {
  const normalize = (value) => String(value || "").replace(/\s+/g, "").replace(/[，。,.!?！？:：；;]/g, "").toLowerCase();
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  return left === right || left.startsWith(right) || right.startsWith(left);
}

function generatedOpinionTitle(item) {
  const topic = opinionTopicLabel(item);
  if (item.type === "summary" || item.channel === "archive") {
    return item.brand === "temu" ? `Temu ${topic}摘要` : `Joybuy / JD ${topic}摘要`;
  }
  if (item.brand === "temu") return `Temu ${topic}竞品舆情`;
  if (item.kind === "opportunity") return `Joybuy / JD ${topic}机会信号`;
  if (item.tracking_eligible) return `Joybuy / JD ${topic}发酵追踪`;
  return `Joybuy / JD ${topic}舆情`;
}

function opinionTopicLabel(item) {
  const labels = {
    refund: "退款",
    payment: "支付",
    customer_service: "客服",
    delivery: "物流",
    shipping: "物流",
    order: "订单",
    fake: "虚假折扣",
    price: "价格",
    pricing: "价格",
    discount: "折扣",
    product: "商品",
    quality: "质量",
    positive: "正向",
    negative: "负面",
    neutral: "常规",
  };
  const tags = (item.tags || []).map((tag) => String(tag).toLowerCase()).filter(Boolean);
  const topicTags = tags.filter((tag) => !["竞品", "positive", "negative", "neutral", "发酵追踪"].includes(tag));
  const matched = topicTags.map((tag) => labels[tag]).find(Boolean);
  if (matched) return matched;
  const text = `${item.title || ""} ${item.body_zh || ""} ${item.summary || ""}`.toLowerCase();
  if (/客服|customer service|support|响应/.test(text)) return "客服";
  if (/物流|配送|包裹|delivery|shipping|parcel/.test(text)) return "物流";
  if (/退款|退货|refund|return/.test(text)) return "退款";
  if (/支付|付款|payment|pay/.test(text)) return "支付";
  if (/折扣|优惠|discount|coupon/.test(text)) return "折扣";
  if (/价格|price|pricing/.test(text)) return "价格";
  if (/质量|损坏|quality|damaged/.test(text)) return "质量";
  if (item.sentiment === "positive") return "正向";
  if (item.sentiment === "negative") return "负面";
  return item.brand === "temu" ? "讨论" : "常规";
}

function allExternalLinkButton(item) {
  return cardExternalAction(item.external_href, item);
}

function allItemsForDaily(daily) {
  return [...allJoybuyItemsForDaily(daily), ...allCompetitorItemsForDaily(daily)].sort(compareEvents);
}

function allJoybuyItemsForDaily(daily) {
  return (daily.clusters || []).map((cluster) => allItemFromCluster(cluster, daily));
}

function allCompetitorItemsForDaily(daily) {
  const posts = daily.competitor?.top_posts || [];
  if (!posts.length && daily.competitor?.volume) {
    return [
      {
        id: `all-temu-summary-${daily.date}`,
        brand: "temu",
        channel: "archive",
        type: "summary",
        kind: "competitor",
        badge: "竞品",
        source_name: "Temu 竞品基线",
        author_name: "Temu Radar",
        author_handle: "",
        source_subline: "摘要级归档",
        timeLabel: "汇总",
        title: `Temu 当日有效声量 ${daily.competitor.volume}`,
        body_zh: "该日仅保留 Temu 声量与情绪摘要，原帖级竞品内容从完整日报归档后开始展示。",
        summary: "Temu competitor baseline summary",
        score_label: "声量",
        score_value: daily.competitor.volume,
        score: {},
        metrics: {},
        post_metrics: {},
        tags: sentimentTags(daily.competitor.sentiment),
        reason: "用于对照 Joybuy 当日声量和风险语境。",
        source_count_label: "Temu 竞品摘要",
        is_sample: isDailySample(daily),
      },
    ];
  }
  return posts.map((post) => allItemFromCompetitorPost(post, daily));
}

function allItemFromCluster(cluster, daily) {
  const score = cluster.score || {};
  const metrics = cluster.metrics || {};
  const count = Number(cluster.post_count || 1);
  const summaryOnly = Boolean(daily.summary_only);
  return {
    id: `all-${daily.date}-${cluster.cluster_id}`,
    brand: "joybuy",
    channel: summaryOnly ? "archive" : "x",
    type: summaryOnly ? "summary" : score.sentiment === "positive" ? "opportunity" : "risk",
    kind: score.sentiment === "positive" ? "opportunity" : "risk",
    badge: summaryOnly ? "摘要" : "Joybuy",
    source_name: "Joybuy / JD",
    author_name: "Joybuy / JD",
    author_handle: "",
    source_subline: summaryOnly ? "历史摘要" : "X 舆情",
    time: cluster.first_seen_at || cluster.last_seen_at,
    title: cluster.title,
    body_zh: cluster.summary_zh || cluster.summary || "",
    summary: cluster.summary || "",
    score,
    score_label: "IPS",
    score_value: score.ips ?? "n/a",
    metrics,
    post_metrics: {},
    tags: [...(cluster.risk_types || []), ...(cluster.opportunity_types || []), cluster.topic, ...(cluster.tracking_eligible ? ["发酵追踪"] : [])].filter(Boolean),
    reason: score.explanation || cluster.tracking_reason || "进入当日情报归档。",
    href: cluster.cluster_id && !String(cluster.cluster_id).startsWith("archive-") ? `#/intel/${cluster.cluster_id}` : "",
    external_href: "",
    source_count: count,
    source_count_label: count > 1 ? `${count} 条相关原帖` : "1 条相关原帖",
    is_sample: isDailySample(daily),
    level: score.level || "low",
    sentiment: score.sentiment || "neutral",
    tracking_eligible: cluster.tracking_eligible,
  };
}

function allItemFromCompetitorPost(post, daily) {
  const metrics = post.metrics || {};
  const interactions = Number(metrics.likes || 0) + Number(metrics.reposts || 0) + Number(metrics.replies || 0) + Number(metrics.quotes || 0);
  return {
    id: `all-temu-${daily.date}-${post.post_id || post.url || post.created_at}`,
    brand: "temu",
    channel: "x",
    type: "competitor",
    kind: "competitor",
    badge: "竞品",
    source_name: "Temu 竞品",
    author_name: post.author_name || "Temu Source",
    author_handle: post.author_handle || "",
    author_avatar_url: post.author_avatar_url || "",
    source_subline: "X 原帖",
    time: post.created_at,
    title: "",
    body_zh: post.translation_zh || post.summary_zh || post.text || "",
    translation_status: post.translation_status || "unknown",
    translation_provider: post.translation_provider || "none",
    summary: post.text || "",
    score: { level: "low", sentiment: post.sentiment || "neutral" },
    score_label: "互动",
    score_value: interactions,
    metrics: {},
    post_metrics: metrics,
    media: post.media || [],
    tags: ["竞品", post.sentiment, ...(post.matched_terms || [])].filter(Boolean),
    reason: "竞品基线内容，用于观察 Temu 当日讨论主题和互动强度。",
    href: "",
    external_href: post.url || "",
    source_count: 1,
    source_count_label: "Temu 竞品原帖",
    is_sample: isDailySample(daily),
    level: "low",
    sentiment: post.sentiment || "neutral",
  };
}

function itemMatchesAllFilters(item) {
  if (state.allBrandFilter === "joybuy" && item.brand !== "joybuy") return false;
  if (state.allBrandFilter === "temu" && item.brand !== "temu") return false;
  if (state.allBrandFilter === "x" && item.channel !== "x") return false;
  if (state.allBrandFilter === "archive" && item.channel !== "archive") return false;
  if (state.allTypeFilter === "risk" && item.kind !== "risk") return false;
  if (state.allTypeFilter === "opportunity" && item.kind !== "opportunity") return false;
  if (state.allTypeFilter === "competitor" && item.kind !== "competitor") return false;
  if (state.allTypeFilter === "tracking" && !item.tracking_eligible) return false;
  if (state.allTypeFilter === "summary" && item.type !== "summary") return false;
  const query = String(state.allSearchQuery || "").trim().toLowerCase();
  if (!query) return true;
  const haystack = [
    item.title,
    item.body_zh,
    item.summary,
    item.author_name,
    item.author_handle,
    item.source_name,
    item.source_subline,
    ...(item.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function dailyPage() {
  const daily = state.selectedDaily || state.daily;
  const metrics = daily.metrics || state.overview.metrics;
  const source = daily.source_status || state.sourceStatus;
  const collection = daily.collection_status || {};
  const joybuyEvents = buildJoybuyEvents(daily);
  const competitorEvents = buildCompetitorEvents(daily);
  const trackingEvents = buildTrackingEvents(daily);
  const storyCount = joybuyEvents.length + competitorEvents.length + trackingEvents.length;
  return `
    <div class="daily-layout report-layout daily-newspaper-layout">
      ${historyRail()}
      <article class="daily-report daily-paper">
        <header class="daily-masthead">
          <div class="daily-rule"></div>
          <div class="daily-kicker">
            <span>VOL.${escapeHtml(String(daily.date || "").replace(/-/g, "."))}</span>
            <span>${escapeHtml(String(storyCount))} STORIES</span>
            <span>JOYBUY OPINION DAILY</span>
          </div>
          <h2><span>Joybuy</span> 舆情日报</h2>
          <p>${escapeHtml(formatDateLong(daily.date))} · 每早八时更新</p>
          <div class="daily-masthead-stats">
            <span><strong>${escapeHtml(String(metrics.joybuy_volume || 0))}</strong><em>Joybuy 有效</em></span>
            <span><strong>${escapeHtml(String(metrics.temu_volume || 0))}</strong><em>Temu 基线</em></span>
            <span><strong>${escapeHtml(String(metrics.high_risk || 0))}</strong><em>高风险</em></span>
            <span><strong>${escapeHtml(formatApiUsage(collection))}</strong><em>API 消耗</em></span>
          </div>
        </header>
        ${sampleDataNotice(daily)}
        ${daily.summary_only ? `<div class="notice">该日报为摘要级归档：可查看当日指标与主题，原帖级详情从历史归档功能上线后开始保留。</div>` : ""}
        <nav class="daily-toc" aria-label="今日看点">
          <div class="daily-toc-head">
            <div>
              <strong>今日看点</strong>
              <span>${escapeHtml(String(storyCount))} 条舆情 · ${escapeHtml(daily.window_label || "Past 24 hours")}</span>
            </div>
          </div>
          <div class="report-toc">
            ${reportTocItem("01", "Joybuy / JD 舆情", dailyIssueSummary(daily), joybuyEvents.length)}
            ${reportTocItem("02", "Temu 竞品雷达", "Temu 当日声量、情绪和高互动内容。", competitorEvents.length)}
            ${reportTocItem("03", "发酵追踪", "历史舆情是否出现二次传播或升温。", trackingEvents.length)}
          </div>
        </nav>
        ${dailyReportSection("01", "Joybuy / JD 舆情", "Brand Radar", `${brandBreakdown(source, "joybuy_effective", metrics.joybuy_volume)} 条有效内容，${metrics.high_risk || 0} 个高风险。`, "joybuy-radar", joybuyEvents, "该日暂无 Joybuy 有效舆情")}
        ${dailyReportSection("02", "Temu 竞品雷达", "Competitor", `当前竞品：Temu。${brandBreakdown(source, "temu_effective", metrics.temu_volume)} 条有效内容。`, "competitor-radar", competitorEvents, "该日暂无 Temu 竞品内容", competitorSummary(daily.competitor || state.competitor))}
        ${dailyReportSection("03", "发酵追踪", "Fermentation", "跨日观察历史舆情是否被高影响力账号二次传播。", "tracking-radar", trackingEvents, "该日暂无需要高频追踪的发酵事件")}
      </article>
    </div>
  `;
}

function dailyReportSection(index, title, englishLabel, subtitle, id, events, emptyText, extra = "") {
  return `
    <section id="${escapeHtml(id)}" class="daily-section report-section">
      <header class="daily-section-head">
        <span>${escapeHtml(index)}</span>
        <div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(englishLabel)} · ${escapeHtml(subtitle)}</p>
        </div>
        <strong>${escapeHtml(String(events.length))}</strong>
      </header>
      ${extra}
      ${dailyStoryList(events, emptyText)}
    </section>
  `;
}

function dailyStoryList(events, emptyText) {
  const sorted = [...events].sort(compareEvents);
  if (!sorted.length) return empty(emptyText);
  return `<div class="daily-story-list">${sorted.map(dailyStoryCard).join("")}</div>`;
}

function dailyStoryCard(event) {
  const title = localizedTitle(event.title, event.summary, event.brand === "temu" ? "Temu 竞品原帖" : "Joybuy 舆情信号");
  const metrics = event.metrics || {};
  const likes = metrics.likes ?? metrics.total_likes;
  const replies = metrics.replies ?? metrics.total_replies;
  const reposts = metrics.reposts ?? metrics.total_reposts;
  const quotes = metrics.quotes ?? metrics.total_quotes;
  const views = metrics.views ?? metrics.total_views;
  const hasMetrics = [likes, replies, reposts, quotes, views].some((value) => value != null);
  return `
    <article class="daily-story-card">
      <div class="daily-story-top">
        <div class="daily-story-meta">
          <span>${escapeHtml(event.source)}</span>
          <span>${escapeHtml(event.timeLabel || formatEventTime(event.time))}</span>
        </div>
        ${event.scoreValue !== "n/a" ? `<div class="daily-story-score"><strong>${escapeHtml(String(event.scoreValue))}</strong><em>${escapeHtml(event.scoreLabel)}</em></div>` : ""}
      </div>
      <h3>${storyTitleLink(event, title)}</h3>
      <p>${escapeHtml(event.summary)}</p>
      ${hasMetrics ? `<div class="metric-inline card-metrics">
        ${metricInline("赞", likes)}
        ${metricInline("评", replies)}
        ${metricInline("转", reposts)}
        ${metricInline("引", quotes)}
        ${metricInline("浏览", views)}
      </div>` : ""}
      <div class="tag-row">${(event.tags || []).slice(0, 6).map((tag) => `<span class="plain-tag">#${escapeHtml(tag)}</span>`).join("")}</div>
      ${event.reason ? `<div class="reason-line compact">关注原因：${escapeHtml(String(event.reason))}</div>` : ""}
    </article>
  `;
}

function storyTitleLink(event, title = event.title) {
  if (!event.href || (event.external && event.is_sample)) return escapeHtml(title);
  if (event.external) {
    const url = safeExternalUrl(event.href);
    return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a>` : escapeHtml(title);
  }
  return `<a href="${escapeHtml(event.href)}">${escapeHtml(title)}</a>`;
}

function historyRail() {
  const history = state.dailyIndex?.items || [];
  return `
    <aside class="daily-history">
      <nav class="report-type-tabs" aria-label="切换日报、周报、月报">
        <span class="active">日报</span>
        <span class="disabled" aria-disabled="true">周报</span>
        <span class="disabled" aria-disabled="true">月报</span>
      </nav>
      <div class="daily-history-current">
        <span>${escapeHtml(formatDateMonth((state.selectedDaily || state.daily).date))}</span>
        <strong>${escapeHtml(formatDateDay((state.selectedDaily || state.daily).date))}</strong>
      </div>
      <div class="daily-history-head">
        <h2>日报历史</h2>
        <span class="tag">${history.length} 天</span>
      </div>
      <div class="daily-history-list">
        ${history.map(dailyHistoryItem).join("") || empty("暂无历史日报")}
      </div>
    </aside>
  `;
}

function dailyHistoryItem(item) {
  const active = item.date === (state.selectedDaily || state.daily).date;
  return `
    <button class="daily-history-item ${active ? "active" : ""}" data-daily-date="${escapeHtml(item.date)}">
      <span class="daily-date">${formatDateDay(item.date)} 日</span>
      <span class="daily-title">${escapeHtml(dailyHistoryTitle(item))}</span>
      <span class="daily-meta">
        Joybuy ${escapeHtml(String(item.joybuy_effective ?? 0))}
        · Temu ${escapeHtml(String(item.temu_effective ?? 0))}
        · ${escapeHtml(item.collection_status || "unknown")}
      </span>
      ${item.summary_only ? `<span class="tag">摘要</span>` : ""}
    </button>
  `;
}

function fermentationPage() {
  const items = fermentationActiveItems();
  const metrics = fermentationPageMetrics(items);
  return `
    ${pageHero({
      eyebrow: "舆情雷达",
      subtitle: `${formatDateLong(state.daily.date)} · 追踪低热舆情是否出现二次传播、引用增加或高影响力账号介入`,
      stats: [
        [metrics.tracking, "追踪中"],
        [metrics.hot, "发酵/升温"],
        [metrics.topIps, "最高 IPS"],
        [metrics.newRelated, "24h 新增相关帖"],
      ],
    })}
    ${sampleDataNotice(state.daily)}
    <div class="featured-status-row">
      <span>最近检查 ${escapeHtml(metrics.lastChecked)}</span>
      <span>累计相关原帖 ${escapeHtml(String(metrics.postCount))}</span>
      <span>24h 引用 ${escapeHtml(formatCompactNumber(metrics.quotes24h))}</span>
      <span>归档日报 ${escapeHtml(String(state.dailyIndex?.items?.length || 0))} 天</span>
    </div>
    <section class="tracking-layout">
      <div class="tracking-main">
        <div class="section-header tracking-head">
          <div>
            <h2>发酵追踪流</h2>
            <p class="muted">按最近检查时间倒序排列，只展示仍需观察的 Joybuy / JD 舆情。</p>
          </div>
          <span class="tag">${escapeHtml(String(items.length))} 条</span>
        </div>
        ${fermentationTimeline(items)}
      </div>
      <aside class="tracking-side">
        <section class="side-panel">
          <div class="side-panel-title">当前判断</div>
          <p>${escapeHtml(fermentationInsight(items))}</p>
        </section>
        <section class="side-panel">
          <div class="side-panel-title">进入追踪的条件</div>
          <div class="rule-list">
            <span>未来传播潜力较高</span>
            <span>出现高影响力账号参与</span>
            <span>退款、物流、客服等敏感链路</span>
            <span>引用或相似内容在 24h 内增加</span>
          </div>
        </section>
      </aside>
    </section>
  `;
}

function settingsPage() {
  const source = state.sourceStatus || {};
  const collection = state.daily?.collection_status || {};
  const brand = source.brand_breakdown || {};
  const providers = source.providers || [];
  return `
    ${pageHero({
      eyebrow: "系统状态",
      subtitle: "数据源、自动化、监控范围与安全预算边界",
      stats: [
        [sourceModeLabel(source.status), "数据模式"],
        [providers.join(", ") || "未配置", "Provider"],
        [formatApiUsage(collection), "API 消耗"],
        [`$${formatCost(source.estimated_cost_usd)}`, "估算成本"],
      ],
    })}
    ${sampleDataNotice(state.daily)}
    <section class="settings-layout">
      <div class="settings-main">
        <section class="settings-card">
          <div class="settings-card-head">
            <div>
              <h2>采集运行</h2>
              <p class="muted">最近一次日报任务和自动化节奏。</p>
            </div>
            <span class="status-pill ${escapeHtml(source.status || "neutral")}">${escapeHtml(sourceModeLabel(source.status))}</span>
          </div>
          <div class="status-table">
            ${statusRow("最近生成", state.overview.generated_at_label || formatDateTime(state.overview.generated_at))}
            ${statusRow("采集窗口", state.overview.window_label || state.daily.window_label || "Past 24 hours")}
            ${statusRow("日报自动化", "Mac 本机 · 每日 08:00 BJT 生成，GitHub 仅部署")}
            ${statusRow("发酵追踪", "随日报生成刷新，观察 7-14 天内的二次传播信号")}
            ${statusRow("运行状态", collection.status || state.overview.health || "unknown")}
          </div>
        </section>
        <section class="settings-card">
          <div class="settings-card-head">
            <div>
              <h2>数据质量</h2>
              <p class="muted">本次进入清洗、去重、翻译和评分链路的数据量。</p>
            </div>
          </div>
          <div class="quality-grid">
            ${qualityTile("原始采集", source.raw_posts_collected ?? 0, "接口返回内容")}
            ${qualityTile("有效内容", source.effective_posts ?? 0, "过滤误匹配后")}
            ${qualityTile("Joybuy / JD", `${brand.joybuy_candidates ?? 0} → ${brand.joybuy_effective ?? 0}`, "候选到有效")}
            ${qualityTile("Temu", `${brand.temu_candidates ?? 0} → ${brand.temu_effective ?? 0}`, "竞品基线")}
          </div>
        </section>
      </div>
      <aside class="settings-side">
        <section class="settings-card">
          <div class="settings-card-head">
            <div>
              <h2>监控范围</h2>
              <p class="muted">MVP 当前配置。</p>
            </div>
          </div>
          <div class="scope-list">
            ${scopeRow("平台", "X")}
            ${scopeRow("品牌词", "Joybuy、JD、京东")}
            ${scopeRow("站点", "英国、荷兰、法国、卢森堡、德国、比利时")}
            ${scopeRow("竞品", "Temu")}
          </div>
        </section>
        <section class="settings-card">
          <div class="settings-card-head">
            <div>
              <h2>安全与预算</h2>
              <p class="muted">这里展示的是边界，不展示任何 Key。</p>
            </div>
          </div>
          <div class="rule-list">
            <span>采集 Key 与公司 GPT Key 均保存在本机 Keychain，不进入 GitHub</span>
            <span>前端与公开仓库不写入任何密钥</span>
            <span>单次任务请求上限：${escapeHtml(String(collection.max_api_requests ?? collection.limits?.max_api_requests ?? "未设置"))}</span>
            ${(source.notes || []).map((note) => `<span>${escapeHtml(settingsNoteText(note))}</span>`).join("")}
          </div>
        </section>
      </aside>
    </section>
  `;
}

function fermentationActiveItems() {
  return (state.fermentation?.items || []).filter((item) => {
    const status = item.fermentation?.status || "";
    return item.tracking_eligible || (status && status !== "不追踪");
  });
}

function fermentationPageMetrics(items) {
  const hotStatuses = new Set(["发酵中", "升温中"]);
  const timestamps = items
    .map((item) => item.fermentation?.last_checked_at || item.last_seen_at || item.first_seen_at)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return {
    tracking: items.length,
    hot: items.filter((item) => hotStatuses.has(item.fermentation?.status)).length,
    topIps: Math.max(0, ...items.map((item) => Number(item.score?.ips || 0))),
    newRelated: items.reduce((sum, item) => sum + Number(item.fermentation?.growth?.new_related_posts_24h || 0), 0),
    quotes24h: items.reduce((sum, item) => sum + Number(item.fermentation?.growth?.quotes_24h || 0), 0),
    postCount: items.reduce((sum, item) => sum + Number(item.post_count || 0), 0),
    lastChecked: timestamps[0] ? formatDateTime(timestamps[0]) : "--",
  };
}

function fermentationTimeline(items) {
  const sorted = [...items].sort((a, b) => {
    const aTime = new Date(a.fermentation?.last_checked_at || a.last_seen_at || a.first_seen_at || 0).getTime();
    const bTime = new Date(b.fermentation?.last_checked_at || b.last_seen_at || b.first_seen_at || 0).getTime();
    return bTime - aTime;
  });
  if (!sorted.length) return empty("暂无需要高频追踪的舆情。");
  return `
    <div class="publish-timeline tracking-timeline">
      ${sorted.map(fermentationTimelineCard).join("")}
    </div>
  `;
}

function fermentationTimelineCard(item) {
  const status = item.fermentation?.status || "观察中";
  const metrics = item.metrics || {};
  const growth = item.fermentation?.growth || {};
  const title = fermentationTitle(item);
  const tags = [...(item.risk_types || []), ...(item.opportunity_types || []), item.topic].filter(Boolean);
  const href = item.cluster_id && !String(item.cluster_id).startsWith("archive-") ? `#/intel/${item.cluster_id}` : "";
  return `
    <div class="publish-item tracking-item">
      <div class="publish-time">${escapeHtml(formatEventTime(item.fermentation?.last_checked_at || item.last_seen_at || item.first_seen_at))}</div>
      <div class="publish-line"><span></span></div>
      <article class="opinion-card tracking-card ${scoreClass(item)}">
        <div class="tracking-card-top">
          <div class="source-identity">
            ${avatarNode({ source_name: "Joybuy Radar" })}
            <div>
              <div class="source-line">
                <span>Joybuy / JD</span>
                <strong class="${escapeHtml(fermentationStatusClass(status))}">${escapeHtml(status)}</strong>
              </div>
              <div class="source-subline">${escapeHtml(fermentationTimeLabel(item))}</div>
            </div>
          </div>
          <div class="featured-score">
            <span>${escapeHtml(String(item.score?.ips ?? "n/a"))}</span>
            <em>IPS</em>
          </div>
        </div>
        <section class="x-signal-block">
          <div class="block-heading">
            <span>舆情内容</span>
            <em>${escapeHtml(String(item.post_count || 0))} 条相关原帖</em>
          </div>
          <h3>${escapeHtml(title)}</h3>
          <p class="featured-translation">${escapeHtml(item.summary_zh || item.summary || "暂无摘要")}</p>
          <div class="metric-inline card-metrics">
            ${metricInline("赞", metrics.total_likes)}
            ${metricInline("评", metrics.total_replies)}
            ${metricInline("转", metrics.total_reposts)}
            ${metricInline("引", metrics.total_quotes)}
            ${metricInline("收藏", metrics.total_bookmarks)}
            ${metricInline("浏览", metrics.total_views)}
          </div>
          <div class="tracking-growth-row">
            ${growthMetric("24h 互动", growth.public_interactions_24h)}
            ${growthMetric("24h 引用", growth.quotes_24h)}
            ${growthMetric("新增相关帖", growth.new_related_posts_24h)}
            ${growthMetric("风险变化", riskChangeLabel(item.fermentation?.risk_change))}
          </div>
          <div class="tag-row">${tags.slice(0, 8).map((tag) => `<span class="plain-tag">#${escapeHtml(tag)}</span>`).join("")}</div>
          <div class="tracking-signal-list">
            ${(item.fermentation?.signals || []).length
              ? item.fermentation.signals.map((signal) => `<span>${escapeHtml(signal)}</span>`).join("")
              : `<span>暂无明显升温信号，保留观察</span>`}
          </div>
          <div class="reason-line compact">关注原因：${escapeHtml(trackingReasonText(item))}</div>
        </section>
        <div class="featured-card-bottom">
          ${cardFootnote(item.score?.recommended_action || "持续观察", { is_sample: isDailySample(state.daily) })}
          <div class="button-row">
            ${href ? `<a class="text-button primary" href="${escapeHtml(href)}">详情</a>` : ""}
          </div>
        </div>
      </article>
    </div>
  `;
}

function fermentationTitle(item) {
  const topic = topicDisplayName(item.topic);
  const status = item.fermentation?.status || "观察中";
  if (item.score?.sentiment === "positive") return `${topic}出现传播机会`;
  if (["发酵中", "升温中"].includes(status)) return `${topic}讨论${status}`;
  return `${topic}讨论需持续观察`;
}

function topicDisplayName(topic) {
  const labels = {
    refund: "退款与支付",
    delivery: "物流与包裹追踪",
    customer_service: "客服与售后",
    price_opportunity: "价格与配送优势",
    general: "品牌认知",
  };
  return labels[topic] || String(topic || "Joybuy / JD");
}

function fermentationTimeLabel(item) {
  const trackingDays = Number(item.fermentation?.tracking_days || 0);
  const checked = item.fermentation?.last_checked_at ? `最近检查 ${formatDateTime(item.fermentation.last_checked_at)}` : "等待检查";
  return trackingDays ? `${checked} · 追踪 ${trackingDays} 天` : checked;
}

function fermentationStatusClass(status) {
  if (status === "发酵中") return "tracking-status hot";
  if (status === "升温中") return "tracking-status warm";
  if (status === "观察中") return "tracking-status watch";
  return "tracking-status calm";
}

function growthMetric(label, value) {
  const display = typeof value === "number" || /^\d+$/.test(String(value || "")) ? formatCompactNumber(value) : String(value ?? "--");
  return `<span><em>${escapeHtml(label)}</em><strong>${escapeHtml(display)}</strong></span>`;
}

function riskChangeLabel(value) {
  if (value === "up") return "上行";
  if (value === "down") return "下降";
  if (value === "flat") return "平稳";
  return value || "--";
}

function trackingReasonText(item) {
  const reasonMap = {
    high_future_potential: "未来传播潜力高",
    high_influence_account: "高影响力账号参与",
    high_risk: "风险等级较高",
    ips_top_candidate: "当日优先级靠前",
    refund_issue: "退款/支付链路敏感",
    delivery_issue: "物流体验敏感",
    customer_service_issue: "客服售后体验敏感",
  };
  const reasons = (item.tracking_reason || []).map((reason) => reasonMap[reason] || reason).filter(Boolean);
  if (reasons.length) return reasons.join(" · ");
  return item.score?.explanation || "该舆情仍可能产生后续传播，保留观察。";
}

function fermentationInsight(items) {
  if (!items.length) return "当前没有需要高频追踪的 Joybuy / JD 舆情，建议保持日报监测节奏。";
  const hot = items.filter((item) => ["发酵中", "升温中"].includes(item.fermentation?.status));
  const top = [...items].sort((a, b) => Number(b.score?.ips || 0) - Number(a.score?.ips || 0))[0];
  if (hot.length) {
    return `${hot.length} 条舆情出现发酵或升温信号，最高优先级来自${topicDisplayName(top.topic)}，建议优先进入详情页核对原帖证据。`;
  }
  return `当前以观察为主，最高 IPS ${top?.score?.ips ?? "n/a"}，建议等待下一次日报刷新后复盘是否出现引用或相似内容增加。`;
}

function sourceModeLabel(status) {
  if (status === "sample") return "样例";
  if (status === "complete") return "真实";
  if (status === "partial") return "部分";
  if (status === "ok") return "正常";
  return status || "未知";
}

function formatCost(value) {
  const number = Number(value || 0);
  if (!number) return "0";
  return number.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function statusRow(label, value) {
  return `<div class="status-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value ?? "--"))}</strong></div>`;
}

function qualityTile(label, value, note) {
  return `
    <div class="quality-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <em>${escapeHtml(note)}</em>
    </div>
  `;
}

function scopeRow(label, value) {
  return `<div class="scope-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function settingsNoteText(note) {
  const text = String(note || "");
  if (text.includes("Sample provider")) return "样例数据模式开启时，仅用于页面结构与交互预览";
  if (text.includes("Bookmarks")) return "收藏数仅在数据源提供时展示";
  if (text.includes("Quote")) return "引用数作为公开传播信号纳入发酵判断";
  return text;
}

async function renderDetail(clusterId) {
  const content = document.getElementById("content");
  content.innerHTML = `<section class="section">${empty("正在加载舆情详情")}</section>`;
  try {
    const detail = await loadJson(`./dashboard-data/clusters/${clusterId}.json`);
    document.getElementById("page-title").textContent = "舆情详情";
    content.innerHTML = detailPage(detail);
    bindPageEvents(detail);
  } catch (error) {
    content.innerHTML = `<section class="section">${empty("未找到舆情详情")}</section>`;
  }
}

function detailPage(detail) {
  const detailSample = isDetailSample(detail);
  const leadPost = representativeDetailPost(detail);
  const leadItem = itemFromDetailPost(leadPost, "X 舆情");
  const title = localizedTitle(detail.title, detail.summary_zh, "舆情事件");
  const posts = detail.posts || [];
  const tags = [...(detail.risk_types || []), ...(detail.opportunity_types || []), detail.topic].filter(Boolean);
  return `
    <article class="detail-page read-detail">
      ${sampleDataNotice()}
      <section class="readtop">
        <div class="readtop-main">
          <div class="source-identity">
            ${avatarNode(leadItem)}
            <div>
              <div class="source-line">
                <span>${escapeHtml(leadItem.author_name || "X Source")}</span>
                ${leadItem.author_handle ? `<em>@${escapeHtml(leadItem.author_handle)}</em>` : ""}
                <strong>${escapeHtml(levelText(detail.score))}</strong>
              </div>
              <div class="source-subline">X 舆情${translationStateInline(leadItem)}${leadItem.author_followers ? ` · ${escapeHtml(formatCompactNumber(leadItem.author_followers))} followers` : ""}</div>
            </div>
          </div>
          <div class="readtop-meta">
            <span>${escapeHtml(formatDateTime(leadPost?.created_at || detail.first_seen_at))}</span>
            <span>${escapeHtml(relativeMonitorLabel(detail))}</span>
          </div>
          <div class="readtop-link-row">
            ${externalLinkButton(leadPost?.url, "在 X 看原帖", "", { isSample: detailSample })}
            <span class="muted">· ${escapeHtml(sourceHostLabel(leadPost?.url || "x.com"))}</span>
          </div>
        </div>
        <div class="readtop-actions">
          <span class="read-badge">${escapeHtml(detail.score.recommended_action || "持续监测")}</span>
          <div class="read-score"><span>${escapeHtml(String(detail.score.ips))}</span><em>IPS</em></div>
        </div>
      </section>

      <section class="read-card">
        <div class="read-card-label">关注原因</div>
        <p>${escapeHtml(detail.score_explanation)}</p>
      </section>

      <section class="read-card">
        <div class="read-card-label">舆情摘要</div>
        <p>${escapeHtml(detail.summary_zh || chineseSignalText(leadItem))}</p>
      </section>

      <section class="read-body">
        <div class="read-section-title">
          <span>${escapeHtml(detailBodyLabel(leadItem, state.detailLanguage))}</span>
          <div class="read-lang-toggle">
            <button class="${state.detailLanguage === "zh" ? "active" : ""}" type="button" data-detail-lang="zh">中文</button>
            <button class="${state.detailLanguage === "original" ? "active" : ""}" type="button" data-detail-lang="original">原文</button>
          </div>
        </div>
        ${detailPrimaryPostCard(leadPost, state.detailLanguage)}
        ${relatedPostStrip(detail, state.detailLanguage, detailSample)}
        <div class="read-tags">
          ${tags.slice(0, 8).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}
        </div>
        ${externalLinkButton(leadPost?.url, "在 X 查看原帖", "read-cta", { isSample: detailSample })}
      </section>

      <section class="read-card read-status-card">
        <div class="read-card-label">发酵状态</div>
        <div class="summary-stack compact">
          ${summaryLine("状态", detail.fermentation.status || "持续观察")}
          ${(detail.fermentation.signals || []).map((signal) => summaryLine("信号", signal)).join("") || empty("暂无升温信号")}
        </div>
      </section>

      <section class="read-card">
        <div class="read-card-label with-info">
          <span>评分拆解</span>
          <span class="info-dot" tabindex="0" aria-label="IPS 计算说明" data-tooltip="IPS = 各维度分 × 权重后求和，再叠加发酵加分">i</span>
        </div>
        ${scoreContributionPanel(detail)}
      </section>
    </article>
  `;
}

function isDetailSample(detail) {
  if (typeof detail?.is_sample === "boolean") return detail.is_sample;
  const clusterId = detail?.cluster_id;
  if (clusterId) {
    for (const daily of state.dailyArchive || []) {
      const matched = (daily.clusters || []).some((cluster) => cluster.cluster_id === clusterId);
      if (matched) return isDailySample(daily);
    }
  }
  return isDailySample(state.selectedDaily || state.daily);
}

function formatDateTime(iso) {
  if (!iso) return "--";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "--";
  return value.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  });
}

function relativeMonitorLabel(detail) {
  const count = Number(detail.post_count || detail.posts?.length || 0);
  const status = detail.fermentation?.status || "观察中";
  return `${count} 条相关原帖 · ${status}`;
}

function sourceHostLabel(url) {
  const safeUrl = safeExternalUrl(url);
  if (!safeUrl) return "原帖链接不可用";
  try {
    return new URL(safeUrl).host.replace(/^www\./, "");
  } catch (error) {
    return "原帖链接不可用";
  }
}

function representativeDetailPost(detail) {
  const posts = detail.posts || [];
  if (!posts.length) return null;
  return [...posts].sort((a, b) => publicInteractionScore(b.metrics) - publicInteractionScore(a.metrics))[0];
}

function itemFromDetailPost(post, fallbackSource) {
  const author = post?.author || {};
  return {
    author_name: author.name || post?.author_name || post?.author_handle || fallbackSource,
    author_handle: author.handle || post?.author_handle || "",
    author_avatar_url: author.avatar_url || post?.author_avatar_url || "",
    author_followers: author.followers || post?.author_followers || 0,
    translation_zh: post?.translation_zh || post?.summary_zh || "",
    translation_status: post?.translation_status || "unknown",
    translation_provider: post?.translation_provider || "none",
    original_text: post?.clean_text || post?.text || "",
  };
}

function publicInteractionScore(metrics = {}) {
  return Number(metrics.likes || 0) + Number(metrics.reposts || 0) + Number(metrics.replies || 0) + Number(metrics.quotes || 0);
}

function levelText(score = {}) {
  return { urgent: "紧急", high: "高风险", medium: "中风险", low: "低风险" }[score.level] || "监测";
}

function detailPrimaryPostCard(post, language = state.detailLanguage) {
  if (!post) return empty("暂无可展示原帖");
  const metrics = post.metrics || {};
  return `
    <article class="read-source-content">
      <p class="detail-source-text">${escapeHtml(postTextForLanguage(post, language))}</p>
      ${post.media?.length ? `<div class="featured-media-grid">${post.media.map(mediaNode).join("")}</div>` : ""}
      <div class="metric-inline read-metrics">
        ${metricInline("赞", metrics.likes)}
        ${metricInline("评", metrics.replies)}
        ${metricInline("转", metrics.reposts)}
        ${metricInline("引", metrics.quotes)}
        ${metricInline("收藏", metrics.bookmarks)}
        ${metricInline("浏览", metrics.views)}
      </div>
    </article>
  `;
}

function relatedPostStrip(detail, language = state.detailLanguage, isSample = isDetailSample(detail)) {
  const posts = (detail.posts || []).slice(0, 8);
  const labelsByPost = evidenceLabelsByPost(detail);
  const related = posts.slice(0, 6);
  if (!related.length) return "";
  return `
    <div class="related-source-strip">
      <div class="block-heading"><span>相关原帖</span><em>${escapeHtml(String(related.length))} 条展示</em></div>
      <div class="related-source-list">
        ${related.map((post) => relatedPostChip(post, labelsByPost[post.post_id || post.id] || [], language, isSample)).join("")}
      </div>
    </div>
  `;
}

function relatedPostChip(post, labels = [], language = state.detailLanguage, isSample = false) {
  const item = itemFromDetailPost(post, "X Source");
  const metrics = post.metrics || {};
  const text = postTextForLanguage(post, language);
  const content = `
    <div class="related-source-head">
      <div>
        <span>${escapeHtml(item.author_handle ? `@${item.author_handle}` : item.author_name)}</span>
        <em>${escapeHtml(formatDateTime(post.created_at))}</em>
      </div>
      <div class="related-source-actions">
        ${sourceLabelBadges(labels)}
        ${relatedPostLink(post.url, isSample)}
      </div>
    </div>
    <p class="related-source-text">${escapeHtml(text || "暂无正文")}</p>
    <div class="related-source-metrics">
      ${metricInline("赞", metrics.likes)}
      ${metricInline("评", metrics.replies)}
      ${metricInline("转", metrics.reposts)}
      ${metricInline("引", metrics.quotes)}
      ${metricInline("收藏", metrics.bookmarks)}
      ${metricInline("浏览", metrics.views)}
    </div>
  `;
  return `<article class="related-source-chip ${isSample ? "disabled" : ""}">${content}</article>`;
}

function relatedPostLink(href, isSample = false) {
  if (isSample) {
    return `<span class="related-source-link disabled" title="样例数据不提供真实 X 跳转">样本不跳转</span>`;
  }
  const url = safeExternalUrl(href);
  if (!url) {
    return `<span class="related-source-link disabled">无原帖链接</span>`;
  }
  return `<a class="related-source-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">在 X 查看</a>`;
}

function postTextForLanguage(post, language = state.detailLanguage) {
  const item = itemFromDetailPost(post, "X Source");
  if (language === "original") return item.original_text || item.translation_zh || "";
  return item.translation_zh || item.original_text || "";
}

function evidenceLabelsByPost(detail) {
  const labels = {};
  const labelOrder = {
    origin: "热源",
    stakeholders: "当事人",
    popular: "热门",
    amplifiers: "扩散源",
    latest: "最新",
  };
  Object.entries(labelOrder).forEach(([key, label]) => {
    (detail.evidence_chain?.[key] || []).forEach((item) => {
      if (!item.post_id) return;
      labels[item.post_id] ||= [];
      if (!labels[item.post_id].includes(label)) labels[item.post_id].push(label);
    });
  });
  return labels;
}

function sourceLabelBadges(labels) {
  if (!labels.length) return "";
  return `<div class="source-labels">${labels.slice(0, 3).map((label) => `<span>${escapeHtml(label)}</span>`).join("")}</div>`;
}

function buildDailyEvents(daily) {
  return [...buildJoybuyEvents(daily), ...buildCompetitorEvents(daily)].sort(compareEvents);
}

function buildJoybuyEvents(daily) {
  const dailySample = isDailySample(daily);
  return (daily.clusters || []).map((cluster) => clusterToEvent(cluster, "joybuy", "Joybuy / JD", dailySample));
}

function buildCompetitorEvents(daily) {
  const competitor = daily.competitor || state.competitor || {};
  const posts = competitor.top_posts || [];
  const dailySample = isDailySample(daily);
  if (!posts.length && competitor.volume) {
    return [
      {
        brand: "temu",
        source: "Temu 竞品基线",
        title: `Temu 当日有效声量 ${competitor.volume}`,
        summary: "摘要级归档仅保留当日声量与情绪分布，原帖级竞品内容从历史归档功能上线后开始保留。",
        scoreLabel: "声量",
        scoreValue: competitor.volume,
        timeLabel: "汇总",
        tags: sentimentTags(competitor.sentiment),
        reason: "用于对照 Joybuy 当日声量和风险语境。",
        is_sample: dailySample,
      },
    ];
  }
  return posts.map((post) => {
    const interactions = Number(post.metrics?.likes || 0) + Number(post.metrics?.reposts || 0) + Number(post.metrics?.replies || 0) + Number(post.metrics?.quotes || 0);
    return {
      brand: "temu",
      source: `Temu · @${post.author_handle || "unknown"}`,
      title: post.translation_zh || post.summary_zh || post.text || "Temu 竞品原帖",
      summary: post.summary_zh || post.text || "",
      scoreLabel: "互动",
      scoreValue: interactions,
      time: post.created_at,
      tags: [post.sentiment, ...(post.matched_terms || [])].filter(Boolean),
      href: post.url,
      external: true,
      reason: "竞品基线内容，用于观察 Temu 当日讨论主题和互动强度。",
      metrics: post.metrics,
      is_sample: dailySample,
    };
  });
}

function buildTrackingEvents(daily) {
  return (daily.clusters || [])
    .filter((cluster) => cluster.tracking_eligible || ["升温中", "发酵中"].includes(cluster.fermentation?.status))
    .map((cluster) => clusterToEvent(cluster, "joybuy", "发酵追踪", isDailySample(daily)));
}

function clusterToEvent(cluster, brand, source, isSample = false) {
  return {
    brand,
    source,
    title: cluster.title,
    summary: cluster.summary_zh || cluster.summary,
    scoreLabel: "IPS",
    scoreValue: cluster.score?.ips ?? "n/a",
    time: cluster.first_seen_at || cluster.last_seen_at,
    tags: [...(cluster.risk_types || []), ...(cluster.opportunity_types || []), cluster.topic].filter(Boolean),
    href: cluster.cluster_id && !String(cluster.cluster_id).startsWith("archive-") ? `#/intel/${cluster.cluster_id}` : "",
    reason: cluster.score?.explanation || cluster.tracking_reason || "进入当日情报归档。",
    score: cluster.score,
    fermentation: cluster.fermentation,
    postCount: cluster.post_count,
    metrics: cluster.metrics,
    is_sample: isSample,
  };
}

function compareEvents(a, b) {
  const aTime = a.time ? new Date(a.time).getTime() : 0;
  const bTime = b.time ? new Date(b.time).getTime() : 0;
  return bTime - aTime;
}

function publishTimeline(date, events, emptyText) {
  const sorted = [...events].sort(compareEvents);
  if (!sorted.length) return empty(emptyText);
  return `
    <div class="timeline-date-heading">
      <h3>${formatDateShort(date)}</h3>
      <span class="muted">${weekdayLabel(date)} · ${sorted.length} 条</span>
    </div>
    <div class="publish-timeline">
      ${sorted.map(timelineCard).join("")}
    </div>
  `;
}

function timelineCard(event) {
  return `
    <div class="publish-item">
      <div class="publish-time">${escapeHtml(event.timeLabel || formatEventTime(event.time))}</div>
      <div class="publish-line"><span></span></div>
      <article class="publish-card">
        <div class="publish-source">
          <span>${escapeHtml(event.source)}</span>
          ${event.scoreValue !== "n/a" ? `<span class="tag">${escapeHtml(event.scoreLabel)} ${escapeHtml(String(event.scoreValue))}</span>` : ""}
        </div>
        <h3>${escapeHtml(event.title)}</h3>
        <p class="muted">${escapeHtml(event.summary)}</p>
        <div class="tag-row">${(event.tags || []).slice(0, 6).map((tag) => `<span class="plain-tag">#${escapeHtml(tag)}</span>`).join("")}</div>
        ${event.reason ? `<div class="reason-line">关注原因：${escapeHtml(String(event.reason))}</div>` : ""}
        ${event.href ? `<div class="button-row">${event.external ? externalLinkButton(event.href, "查看原帖", "primary", { isSample: event.is_sample }) : `<a class="text-button primary" href="${escapeHtml(event.href)}">查看详情</a>`}</div>` : ""}
      </article>
    </div>
  `;
}

function featureCard(event) {
  return `
    <article class="intel-card">
      <div class="card-top">
        <div class="card-title">
          <div class="publish-source"><span>${escapeHtml(event.source)}</span></div>
          <h3>${escapeHtml(event.title)}</h3>
          <p class="muted">${escapeHtml(event.summary)}</p>
        </div>
        <div class="score-badge"><div class="score-number">${escapeHtml(String(event.scoreValue))}</div><div class="score-label">${escapeHtml(event.scoreLabel)}</div></div>
      </div>
      <div class="tag-row">${(event.tags || []).slice(0, 5).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </article>
  `;
}

function reportTocItem(index, title, summary, count) {
  const target = index === "01" ? "joybuy-radar" : index === "02" ? "competitor-radar" : "tracking-radar";
  return `
    <button class="toc-card" type="button" data-scroll-target="${target}">
      <span>${escapeHtml(index)}</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(summary)}</p>
      <em>${escapeHtml(String(count))}</em>
    </button>
  `;
}

function competitorSummary(competitor) {
  const sentiment = competitor?.sentiment || {};
  return `
    <div class="metric-grid compact three">
      ${metric("Temu 声量", competitor?.volume || 0, "竞品有效内容")}
      ${metric("负面", sentiment.negative || 0, "轻量情绪判断")}
      ${metric("正面", sentiment.positive || 0, "轻量情绪判断")}
    </div>
  `;
}

function dailyIssueSummary(daily) {
  const metrics = daily.metrics || {};
  const highRisk = Number(metrics.high_risk || 0);
  const needsReview = Number(metrics.needs_review || 0);
  const topIpsValue = topIps(daily);
  if (highRisk > 0) return `当日识别 ${highRisk} 条高风险舆情，最高 IPS ${topIpsValue}，建议优先复盘详情与原帖证据。`;
  if (needsReview > 0) return `当日有 ${needsReview} 条舆情需要人工复核，建议关注真实性和潜在扩散。`;
  const joybuyVolume = Number(metrics.joybuy_volume || 0);
  if (joybuyVolume > 0) return `当日 Joybuy/JD 有效舆情 ${joybuyVolume} 条，整体以常规监测和历史归档为主。`;
  return "当日暂未发现达到有效阈值的 Joybuy/JD 舆情。";
}

function dailyHistoryTitle(item) {
  const highRisk = Number(item.high_risk || 0);
  const needsReview = Number(item.needs_review || 0);
  const joybuy = Number(item.joybuy_effective || 0);
  const ips = item.ips ? `，最高 IPS ${item.ips}` : "";
  if (highRisk > 0) return `高风险 ${highRisk} 条${ips}`;
  if (needsReview > 0) return `待复核 ${needsReview} 条${ips}`;
  if (joybuy > 0) return `Joybuy 有效舆情 ${joybuy} 条${ips}`;
  return "当日暂无有效 Joybuy 舆情";
}

function sentimentTags(sentiment = {}) {
  return Object.entries(sentiment)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}:${value}`);
}

function topIps(daily) {
  const scores = (daily.clusters || []).map((cluster) => Number(cluster.score?.ips || 0));
  return Math.max(0, ...scores);
}

function formatDailyTitle(daily) {
  if (!daily?.date) return "过去 24 小时情报";
  return `${daily.date} 日报`;
}

function formatDateShort(date) {
  if (!date) return "--";
  const parts = String(date).split("-");
  if (parts.length !== 3) return date;
  return `${Number(parts[1])}月${Number(parts[2])}日`;
}

function formatDateMonth(date) {
  if (!date) return "--";
  const parts = String(date).split("-");
  if (parts.length !== 3) return date;
  return `${parts[0]} 年 ${Number(parts[1])} 月`;
}

function formatDateDay(date) {
  if (!date) return "--";
  const parts = String(date).split("-");
  if (parts.length !== 3) return date;
  return String(Number(parts[2]));
}

function formatDateLong(date) {
  if (!date) return "今日";
  const parts = String(date).split("-");
  if (parts.length !== 3) return date;
  return `${parts[0]}年${Number(parts[1])}月${Number(parts[2])}日${weekdayLabel(date) ? ` ${weekdayLabel(date)}` : ""}`;
}

function weekdayLabel(date) {
  if (!date) return "";
  const value = new Date(`${date}T00:00:00+08:00`);
  if (Number.isNaN(value.getTime())) return "";
  return value.toLocaleDateString("zh-CN", { weekday: "long", timeZone: "Asia/Shanghai" });
}

function formatEventTime(iso) {
  if (!iso) return "--:--";
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return "--:--";
  return value.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Shanghai" });
}

function brandBreakdown(source, key, fallback = 0) {
  return source?.brand_breakdown?.[key] ?? fallback ?? 0;
}

function formatApiUsage(collection) {
  if (!collection || collection.api_requests_used == null) return "n/a";
  if (collection.max_api_requests == null) return String(collection.api_requests_used);
  return `${collection.api_requests_used}/${collection.max_api_requests}`;
}

async function selectDaily(date) {
  try {
    state.selectedDaily = await loadJson(`./dashboard-data/daily/${date}.json`);
  } catch (error) {
    state.selectedDaily = state.daily;
  }
  render();
}

function dailyArchiveClusterCount() {
  return (state.dailyIndex?.items || []).reduce((sum, item) => sum + Number(item.cluster_count || 0), 0);
}

function metric(label, value, note) {
  return `<div class="metric"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(String(value))}</div><div class="metric-note">${escapeHtml(note)}</div></div>`;
}

function summaryLine(label, text) {
  return `<div class="summary-line"><span class="meta">${escapeHtml(label)}</span><p>${escapeHtml(text)}</p></div>`;
}

function scoreBadge(score) {
  return `<div class="score-badge"><div class="score-number">${escapeHtml(String(score.ips))}</div><div class="score-label">IPS</div></div>`;
}

function levelPill(score) {
  const levelText = { urgent: "紧急", high: "高风险", medium: "中风险", low: "低风险" }[score.level] || score.level;
  const cls = score.sentiment === "positive" ? "positive" : score.level;
  return `<span class="level ${cls}">${levelText}</span>`;
}

function scoreContributionPanel(detail) {
  const score = detail.score || {};
  const rows = scoreContributionRows(score);
  const weighted = rows.reduce((sum, row) => sum + row.contribution, 0);
  const boost = scoreBoost(detail, weighted);
  return `
    <div class="score-explain-head">
      <div>
        <strong>${escapeHtml(String(score.ips ?? "n/a"))}</strong>
        <span>IPS</span>
      </div>
    </div>
    <div class="score-contribution-list">
      ${rows.map(scoreContributionRow).join("")}
      ${boost ? `<div class="score-contribution-row boost"><span>议题发酵加分</span><em>退款/物流且未来潜力高</em><strong>+${escapeHtml(String(boost))}</strong></div>` : ""}
    </div>
  `;
}

function scoreContributionRows(score) {
  const rows = [
    ["品牌相关度", score.brand_relevance, 0.2, "是否明确指向 Joybuy/JD/京东"],
    ["风险/机会强度", score.risk_or_opportunity_intensity, 0.18, "退款、物流、客服等议题的风险强度"],
    ["当前影响力", score.current_impact, 0.16, "互动量、浏览量和作者影响力"],
    ["未来发酵潜力", score.future_potential, 0.15, "引用、账号影响力、相似原帖密度"],
    ["可信度", score.credibility, 0.13, "多帖佐证、上下文证据和高影响力账号"],
    ["业务影响面", score.business_impact, 0.1, "对支付、履约、售后等业务链路的影响"],
    ["处置紧迫性", score.urgency, 0.08, "是否需要快速同步或处理"],
  ];
  return rows.map(([label, value, weight, note]) => ({
    label,
    value: Number(value || 0),
    weight,
    note,
    contribution: Number(value || 0) * weight,
  }));
}

function scoreContributionRow(row) {
  return `
    <div class="score-contribution-row">
      <span>${escapeHtml(row.label)}</span>
      <em>${escapeHtml(row.note)}</em>
      <strong>${escapeHtml(String(row.value))} × ${escapeHtml(String(Math.round(row.weight * 100)))}% = ${escapeHtml(row.contribution.toFixed(1))}</strong>
    </div>
  `;
}

function scoreBoost(detail, weighted) {
  const score = detail.score || {};
  if (["refund", "delivery"].includes(detail.topic) && Number(score.future_potential || 0) >= 80) return 3;
  return Math.max(0, Math.round(Number(score.ips || 0) - weighted));
}

function scoreBars(score) {
  const rows = [
    ["品牌相关度", score.brand_relevance, "green"],
    ["风险/机会强度", score.risk_or_opportunity_intensity, "red"],
    ["当前影响力", score.current_impact, "orange"],
    ["未来潜力", score.future_potential, "orange"],
    ["可信度", score.credibility, ""],
    ["业务影响面", score.business_impact, "red"],
    ["处置紧迫性", score.urgency, "red"],
  ];
  return rows.map(([label, value, color]) => bar(label, value, 100, color)).join("");
}

function bar(label, value, max, color = "") {
  const width = Math.max(4, Math.min(100, (Number(value) / Math.max(1, Number(max))) * 100));
  return `
    <div class="bar-line">
      <span>${escapeHtml(label)}</span>
      <div class="bar-track"><div class="bar-fill ${color}" style="--value:${width}%"></div></div>
      <span class="meta">${escapeHtml(String(value))}</span>
    </div>
  `;
}

function evidenceTabs(detail) {
  const labels = {
    origin: "热源",
    stakeholders: "当事人",
    popular: "热门",
    amplifiers: "扩散源",
    latest: "最新",
    supporting_evidence: "佐证",
    contradicting_evidence: "反证/存疑",
  };
  return `<div class="evidence-tabs">${Object.entries(labels)
    .map(([key, label]) => `<button class="evidence-tab ${key === state.currentEvidenceTab ? "active" : ""}" data-evidence="${key}" data-cluster="${detail.cluster_id}">${label} ${detail.evidence_counts[key] || 0}</button>`)
    .join("")}</div>`;
}

function evidenceList(detail, key) {
  const items = detail.evidence_chain[key] || [];
  if (!items.length) return empty("暂无对应证据");
  const detailSample = isDetailSample(detail);
  return `<div class="source-list">${items.map((item) => evidenceCard(item, detailSample)).join("")}</div>`;
}

function evidenceCard(item, isSample = false) {
  if (item.post_id) {
    const postItem = itemFromDetailPost(item, "X Source");
    const metrics = item.metrics || {};
    return `
      <article class="post-card evidence-post-card">
        <div class="source-identity">
          ${avatarNode(postItem)}
          <div>
            <div class="source-line">
              <span>${escapeHtml(postItem.author_name)}</span>
              ${postItem.author_handle ? `<em>@${escapeHtml(postItem.author_handle)}</em>` : ""}
              <strong>${escapeHtml(item.label)}</strong>
            </div>
            <div class="source-subline">${escapeHtml(formatEventTime(item.created_at))}${translationStateInline(postItem)}${postItem.author_followers ? ` · ${escapeHtml(formatCompactNumber(postItem.author_followers))} followers` : ""}</div>
          </div>
        </div>
        <p class="detail-source-text">${escapeHtml(item.translation_zh || item.summary_zh || item.text)}</p>
        ${item.media?.length ? `<div class="featured-media-grid">${item.media.map(mediaNode).join("")}</div>` : ""}
        <div class="card-meta">
          <span>赞 ${escapeHtml(formatCompactNumber(metrics.likes))}</span>
          <span>评 ${escapeHtml(formatCompactNumber(metrics.replies))}</span>
          <span>转 ${escapeHtml(formatCompactNumber(metrics.reposts))}</span>
          <span>引 ${escapeHtml(formatCompactNumber(metrics.quotes))}</span>
          <span>浏览 ${escapeHtml(formatCompactNumber(metrics.views))}</span>
        </div>
        ${externalLinkButton(item.url, "在 X 查看原帖", "primary", { isSample })}
      </article>
    `;
  }
  return `
    <article class="post-card">
      <div class="card-meta"><span class="tag">${escapeHtml(item.relationship || "source")}</span><span>${escapeHtml(item.source || "Source")}</span></div>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="muted">${escapeHtml(item.summary)}</p>
    </article>
  `;
}

function empty(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function bindPageEvents(detail = null) {
  document.querySelectorAll("[data-featured-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const date = button.dataset.featuredDate;
      if (state.featuredExpandedDates.has(date)) state.featuredExpandedDates.delete(date);
      else state.featuredExpandedDates.add(date);
      render();
    });
  });

  document.querySelectorAll("[data-featured-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.featuredFilter = button.dataset.featuredFilter;
      render();
    });
  });

  document.querySelectorAll("[data-all-source-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.allBrandFilter = button.dataset.allSourceFilter;
      render();
    });
  });

  const allTypeFilter = document.getElementById("all-type-filter");
  if (allTypeFilter) {
    allTypeFilter.addEventListener("change", () => {
      state.allTypeFilter = allTypeFilter.value;
      render();
    });
  }

  const allSearchForm = document.getElementById("all-search-form");
  if (allSearchForm) {
    allSearchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      state.allSearchQuery = document.getElementById("all-search-input")?.value || "";
      render();
    });
  }

  document.querySelectorAll("[data-all-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const date = button.dataset.allDate;
      if (state.allExpandedDates.has(date)) state.allExpandedDates.delete(date);
      else state.allExpandedDates.add(date);
      render();
    });
  });

  document.querySelectorAll("[data-daily-date]").forEach((button) => {
    button.addEventListener("click", () => selectDaily(button.dataset.dailyDate));
  });

  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.scrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll("[data-detail-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!detail) return;
      state.detailLanguage = button.dataset.detailLang;
      document.getElementById("content").innerHTML = detailPage(detail);
      bindPageEvents(detail);
    });
  });

  document.querySelectorAll("[data-evidence]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.currentEvidenceTab = button.dataset.evidence;
      const clusterId = button.dataset.cluster;
      const nextDetail = detail || (await loadJson(`./dashboard-data/clusters/${clusterId}.json`));
      document.getElementById("evidence-list").innerHTML = evidenceList(nextDetail, state.currentEvidenceTab);
      document.querySelectorAll("[data-evidence]").forEach((item) => item.classList.toggle("active", item.dataset.evidence === state.currentEvidenceTab));
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

init().catch((error) => {
  document.getElementById("content").innerHTML = `<section class="section">${empty(error.message)}</section>`;
});
