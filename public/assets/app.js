const state = {
  overview: null,
  daily: null,
  dailyIndex: null,
  selectedDaily: null,
  fermentation: null,
  competitor: null,
  sourceStatus: null,
  currentEvidenceTab: "origin",
  allBrandFilter: "all",
};

const routeTitles = {
  overview: "今日精选",
  all: "全部情报",
  daily: "日报中心",
  fermentation: "发酵追踪",
  settings: "设置",
  detail: "情报详情",
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
  state.selectedDaily = state.daily;
  state.fermentation = await loadJson("./dashboard-data/fermentation.json");
  state.competitor = await loadJson("./dashboard-data/competitor.json");
  state.sourceStatus = await loadJson("./dashboard-data/source-status.json");
  window.addEventListener("hashchange", render);
  render();
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
  document.getElementById("page-title").textContent = routeTitles[current.name] || "今日精选";
  document.getElementById("generated-at").textContent = state.overview.generated_at_label;
  const health = document.getElementById("health-pill");
  health.textContent = state.overview.health === "normal" ? "Data healthy" : state.overview.health;
  health.className = `status-pill ${state.overview.health}`;
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
  const daily = state.daily;
  const metrics = daily.metrics || state.overview.metrics;
  const highlights = buildJoybuyEvents(daily).slice(0, 3);
  const competitorEvents = buildCompetitorEvents(daily).slice(0, 2);
  return `
    <section class="brief-hero">
      <div>
        <p class="eyebrow">DAILY COMMAND BRIEF</p>
        <h2>${escapeHtml(daily.executive_summary?.headline || "No meaningful Joybuy signal detected.")}</h2>
        <p class="muted">${escapeHtml(daily.window_label || "Past 24 hours")}</p>
      </div>
      <div class="brief-action">
        <span class="score-badge"><span class="score-number">${escapeHtml(String(topIps(daily)))}</span><span class="score-label">Top IPS</span></span>
        <a class="text-button primary" href="#/daily">进入日报</a>
      </div>
    </section>
    <div class="metric-grid">
      ${metric("Joybuy 有效", metrics.joybuy_volume, "进入分析的品牌情报")}
      ${metric("高风险", metrics.high_risk || 0, "需优先核查或回应")}
      ${metric("Temu 基线", metrics.temu_volume, "当日竞品有效声量")}
      ${metric("API 请求", formatApiUsage(daily.collection_status), "本次采集消耗")}
    </div>
    <div class="grid-two">
      <section class="section">
        <div class="section-header"><h2>今日精选</h2><span class="tag">${highlights.length} Joybuy</span></div>
        <div class="intel-list">${highlights.map(featureCard).join("") || empty("暂无 Joybuy 有效情报")}</div>
      </section>
      <section class="section">
        <div class="section-header"><h2>竞品快照</h2><span class="tag">Temu</span></div>
        <div class="intel-list">${competitorEvents.map(featureCard).join("") || empty("暂无 Temu 竞品内容")}</div>
      </section>
    </div>
    <section class="section">
      <div class="section-header"><h2>今日建议</h2><a class="text-button primary" href="#/fermentation">查看发酵追踪</a></div>
      <div class="summary-stack">
        ${summaryLine("风险判断", daily.executive_summary?.risk || "Low")}
        ${summaryLine("建议动作", daily.executive_summary?.action || "Continue monitoring.")}
      </div>
    </section>
  `;
}

function allIntelligencePage() {
  const daily = state.selectedDaily || state.daily;
  let events = buildDailyEvents(daily);
  if (state.allBrandFilter !== "all") {
    events = events.filter((event) => event.brand === state.allBrandFilter);
  }
  return `
    <div class="daily-layout">
      ${historyRail()}
      <section class="section">
        <div class="section-header">
          <div>
            <h2>${formatDailyTitle(daily)} 全部情报</h2>
            <p class="muted">Joybuy 与竞品信息统一按发布时间排序，作为日报素材库。</p>
          </div>
          <span class="tag">${events.length} items</span>
        </div>
        <div class="filter-row">
          <label>品牌 <select id="all-brand-filter">
            <option value="all" ${state.allBrandFilter === "all" ? "selected" : ""}>全部</option>
            <option value="joybuy" ${state.allBrandFilter === "joybuy" ? "selected" : ""}>Joybuy</option>
            <option value="temu" ${state.allBrandFilter === "temu" ? "selected" : ""}>Temu</option>
          </select></label>
        </div>
        ${publishTimeline(daily.date, events, "该日暂无可展示情报")}
      </section>
    </div>
  `;
}

function dailyPage() {
  const daily = state.selectedDaily || state.daily;
  const metrics = daily.metrics || state.overview.metrics;
  const source = daily.source_status || state.sourceStatus;
  const collection = daily.collection_status || {};
  const joybuyEvents = buildJoybuyEvents(daily);
  const competitorEvents = buildCompetitorEvents(daily);
  const trackingEvents = buildTrackingEvents(daily);
  return `
    <div class="daily-layout report-layout">
      ${historyRail()}
      <article class="daily-report">
        <section class="report-hero">
          <div>
            <p class="eyebrow">VOL.${escapeHtml(String(daily.date || "").replace(/-/g, "."))} · X INTELLIGENCE DAILY</p>
            <h2>${formatDailyTitle(daily)}</h2>
            <p class="muted">${escapeHtml(daily.window_label || "Past 24 hours")}</p>
          </div>
          <div class="report-stat-row">
            <span><strong>${escapeHtml(String(metrics.joybuy_volume || 0))}</strong> Joybuy</span>
            <span><strong>${escapeHtml(String(metrics.temu_volume || 0))}</strong> Temu</span>
            <span><strong>${escapeHtml(String(metrics.high_risk || 0))}</strong> 高风险</span>
          </div>
        </section>
        ${daily.summary_only ? `<div class="notice">该日报为摘要级归档：可查看当日指标与主题，原帖级详情从历史归档功能上线后开始保留。</div>` : ""}
        <section class="section">
          <div class="section-header"><h2>今日看点</h2><span class="tag">${formatApiUsage(collection)} API</span></div>
          <div class="report-toc">
            ${reportTocItem("01", "Joybuy 雷达", daily.executive_summary?.headline || "No meaningful Joybuy signal detected.", joybuyEvents.length)}
            ${reportTocItem("02", "竞品雷达", "Temu 当日声量、情绪和高互动内容。", competitorEvents.length)}
            ${reportTocItem("03", "发酵追踪", "历史情报是否出现二次传播或升温。", trackingEvents.length)}
          </div>
        </section>
        <section id="joybuy-radar" class="section report-section">
          <div class="section-header">
            <div>
              <h2>01 Joybuy 雷达</h2>
              <p class="muted">${brandBreakdown(source, "joybuy_effective", metrics.joybuy_volume)} 条有效内容，${metrics.high_risk || 0} 个高风险情报。</p>
            </div>
            <span class="tag">IPS first</span>
          </div>
          ${publishTimeline(daily.date, joybuyEvents, "该日暂无 Joybuy 有效情报")}
        </section>
        <section id="competitor-radar" class="section report-section">
          <div class="section-header">
            <div>
              <h2>02 竞品雷达</h2>
              <p class="muted">当前竞品：Temu。MVP 阶段做轻量基线，后续可扩展更多竞品。</p>
            </div>
            <span class="tag">${brandBreakdown(source, "temu_effective", metrics.temu_volume)} effective</span>
          </div>
          ${competitorSummary(daily.competitor || state.competitor)}
          ${publishTimeline(daily.date, competitorEvents, "该日暂无 Temu 竞品内容")}
        </section>
        <section id="tracking-radar" class="section report-section">
          <div class="section-header">
            <div>
              <h2>03 发酵追踪</h2>
              <p class="muted">跨日观察历史情报是否被高影响力账号二次传播。</p>
            </div>
            <span class="tag">${trackingEvents.length} tracking</span>
          </div>
          ${publishTimeline(daily.date, trackingEvents, "该日暂无需要高频追踪的发酵事件")}
        </section>
      </article>
    </div>
  `;
}

function historyRail() {
  const history = state.dailyIndex?.items || [];
  return `
    <aside class="section daily-history">
      <div class="section-header">
        <h2>历史日报</h2>
        <span class="tag">${history.length} days</span>
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
      <span class="daily-date">${formatDateShort(item.date)}</span>
      <span class="daily-title">${escapeHtml(item.title)}</span>
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
  const items = state.fermentation.items || [];
  const events = items.map((item) => clusterToEvent(item, "joybuy", "Joybuy 发酵池"));
  return `
    <div class="metric-grid">
      ${metric("追踪中", items.length, "进入发酵追踪池")}
      ${metric("升温中", items.filter((item) => item.fermentation.status === "升温中").length, "互动或扩散增强")}
      ${metric("发酵中", items.filter((item) => item.fermentation.status === "发酵中").length, "需要重点关注")}
      ${metric("已归档", dailyArchiveClusterCount(), "历史情报库总量")}
    </div>
    <section class="section">
      <div class="section-header"><h2>发酵时间线</h2><span class="tag">7-14 day tracking</span></div>
      ${publishTimeline(state.daily.date, events, "暂无需要高频追踪的情报")}
    </section>
  `;
}

function settingsPage() {
  const source = state.sourceStatus;
  return `
    <section class="section">
      <div class="section-header"><h2>数据源状态</h2><span class="status-pill ${source.status}">${source.status}</span></div>
      <div class="metric-grid">
        ${metric("原始采集", source.raw_posts_collected, "本次采集量")}
        ${metric("有效内容", source.effective_posts, "过滤后进入分析")}
        ${metric("数据源", source.providers.join(", "), "当前 provider")}
        ${metric("估算成本", `$${source.estimated_cost_usd}`, "本次采集估算")}
      </div>
    </section>
    <section class="section">
      <div class="section-header"><h2>运行说明</h2></div>
      <div class="source-list">
        ${source.notes.map((note) => `<div class="post-card">${escapeHtml(note)}</div>`).join("")}
      </div>
    </section>
  `;
}

async function renderDetail(clusterId) {
  const content = document.getElementById("content");
  content.innerHTML = `<section class="section">${empty("Loading detail")}</section>`;
  try {
    const detail = await loadJson(`./dashboard-data/clusters/${clusterId}.json`);
    document.getElementById("page-title").textContent = "情报详情";
    content.innerHTML = detailPage(detail);
    bindPageEvents(detail);
  } catch (error) {
    content.innerHTML = `<section class="section">${empty("未找到情报详情")}</section>`;
  }
}

function detailPage(detail) {
  return `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>${escapeHtml(detail.title)}</h2>
          <p class="muted">${escapeHtml(detail.summary_zh)}</p>
        </div>
        ${scoreBadge(detail.score)}
      </div>
      <div class="tag-row">
        ${levelPill(detail.score)}
        <span class="tag">建议：${escapeHtml(detail.score.recommended_action)}</span>
        <span class="tag">原帖 ${detail.post_count}</span>
        <span class="tag">${escapeHtml(detail.fermentation.status)}</span>
      </div>
    </section>
    <div class="grid-two">
      <section class="section">
        <div class="section-header"><h2>评分解释</h2></div>
        <p>${escapeHtml(detail.score_explanation)}</p>
        <div class="bar-grid" style="margin-top: 14px;">
          ${scoreBars(detail.score)}
        </div>
      </section>
      <section class="section">
        <div class="section-header"><h2>升温信号</h2></div>
        <div class="summary-stack">
          ${(detail.fermentation.signals || []).map((signal) => summaryLine("Signal", signal)).join("") || empty("暂无升温信号")}
        </div>
      </section>
    </div>
    <section class="section">
      <div class="section-header"><h2>原帖证据链</h2></div>
      ${evidenceTabs(detail)}
      <div id="evidence-list">${evidenceList(detail, state.currentEvidenceTab)}</div>
    </section>
  `;
}

function buildDailyEvents(daily) {
  return [...buildJoybuyEvents(daily), ...buildCompetitorEvents(daily)].sort(compareEvents);
}

function buildJoybuyEvents(daily) {
  return (daily.clusters || []).map((cluster) => clusterToEvent(cluster, "joybuy", "Joybuy / JD"));
}

function buildCompetitorEvents(daily) {
  const competitor = daily.competitor || state.competitor || {};
  const posts = competitor.top_posts || [];
  if (!posts.length && competitor.volume) {
    return [
      {
        brand: "temu",
        source: "Temu 竞品基线",
        title: `Temu 当日有效声量 ${competitor.volume}`,
        summary: "摘要级归档仅保留当日声量与情绪分布，原帖级竞品内容从历史归档功能上线后开始保留。",
        scoreLabel: "Volume",
        scoreValue: competitor.volume,
        timeLabel: "汇总",
        tags: sentimentTags(competitor.sentiment),
        reason: "用于对照 Joybuy 当日声量和风险语境。",
      },
    ];
  }
  return posts.map((post) => {
    const interactions = Number(post.metrics?.likes || 0) + Number(post.metrics?.reposts || 0) + Number(post.metrics?.replies || 0) + Number(post.metrics?.quotes || 0);
    return {
      brand: "temu",
      source: `Temu · @${post.author_handle || "unknown"}`,
      title: post.text || "Temu competitor signal",
      summary: post.summary_zh || post.text || "",
      scoreLabel: "Interactions",
      scoreValue: interactions,
      time: post.created_at,
      tags: [post.sentiment, ...(post.matched_terms || [])].filter(Boolean),
      href: post.url,
      external: true,
      reason: "竞品基线内容，用于观察 Temu 当日讨论主题和互动强度。",
    };
  });
}

function buildTrackingEvents(daily) {
  return (daily.clusters || [])
    .filter((cluster) => cluster.tracking_eligible || ["升温中", "发酵中"].includes(cluster.fermentation?.status))
    .map((cluster) => clusterToEvent(cluster, "joybuy", "发酵追踪"));
}

function clusterToEvent(cluster, brand, source) {
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
        ${event.reason ? `<div class="reason-line">推荐理由：${escapeHtml(String(event.reason))}</div>` : ""}
        ${event.href ? `<div class="button-row"><a class="text-button primary" href="${escapeHtml(event.href)}" ${event.external ? `target="_blank" rel="noreferrer"` : ""}>查看详情</a></div>` : ""}
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
  return `<div class="source-list">${items.map((item) => evidenceCard(item)).join("")}</div>`;
}

function evidenceCard(item) {
  if (item.post_id) {
    return `
      <article class="post-card">
        <div class="card-meta"><span class="tag">${escapeHtml(item.label)}</span><span>@${escapeHtml(item.author_handle)}</span><span>${item.author_followers} followers</span></div>
        <p>${escapeHtml(item.text)}</p>
        <p class="muted">${escapeHtml(item.summary_zh)}</p>
        <div class="card-meta">
          <span>Likes ${item.metrics.likes}</span><span>Reposts ${item.metrics.reposts}</span><span>Replies ${item.metrics.replies}</span><span>Quotes ${item.metrics.quotes}</span>
        </div>
        <a class="text-button primary" href="${item.url}" target="_blank" rel="noreferrer">Open on X</a>
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
  const allBrandFilter = document.getElementById("all-brand-filter");
  if (allBrandFilter) {
    allBrandFilter.addEventListener("change", () => {
      state.allBrandFilter = allBrandFilter.value;
      render();
    });
  }

  document.querySelectorAll("[data-daily-date]").forEach((button) => {
    button.addEventListener("click", () => selectDaily(button.dataset.dailyDate));
  });

  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById(button.dataset.scrollTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
