const state = {
  overview: null,
  daily: null,
  fermentation: null,
  competitor: null,
  sourceStatus: null,
  currentEvidenceTab: "origin",
};

const routeTitles = {
  overview: "总览",
  daily: "今日日报",
  fermentation: "发酵雷达",
  competitor: "Temu 雷达",
  "source-status": "数据源状态",
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
  return { name: parts[0] || "overview" };
}

function render() {
  const current = route();
  document.getElementById("page-title").textContent = routeTitles[current.name] || "总览";
  document.getElementById("generated-at").textContent = state.overview.generated_at_label;
  const health = document.getElementById("health-pill");
  health.textContent = state.overview.health === "normal" ? "Data healthy" : state.overview.health;
  health.className = `status-pill ${state.overview.health}`;
  document.querySelectorAll(".nav-list a").forEach((link) => {
    link.classList.toggle("active", link.dataset.route === current.name || (current.name === "detail" && link.dataset.route === "daily"));
  });

  const content = document.getElementById("content");
  if (current.name === "daily") content.innerHTML = dailyPage();
  else if (current.name === "fermentation") content.innerHTML = fermentationPage();
  else if (current.name === "competitor") content.innerHTML = competitorPage();
  else if (current.name === "source-status") content.innerHTML = sourceStatusPage();
  else if (current.name === "detail") renderDetail(current.id);
  else content.innerHTML = overviewPage();
  bindPageEvents();
}

function overviewPage() {
  const metrics = state.overview.metrics;
  return `
    <div class="metric-grid">
      ${metric("有效情报", metrics.effective_intelligence, "清洗聚类后的 Joybuy 情报簇")}
      ${metric("高风险", metrics.high_risk, "需优先核查或回应")}
      ${metric("发酵中", metrics.fermenting, "进入升温或发酵状态")}
      ${metric("需核查", metrics.needs_review, "建议人工介入")}
      ${metric("Joybuy 声量", metrics.joybuy_volume, "样例原始帖")}
      ${metric("Temu 声量", metrics.temu_volume, "轻量竞品基线")}
      ${metric("负面占比", `${metrics.negative_share}%`, "按情报簇统计")}
      ${metric("数据成本", "$0", "当前为样例数据")}
    </div>
    <div class="grid-two">
      <section class="section">
        <div class="section-header"><h2>AI 执行摘要</h2><span class="tag">Past 24h</span></div>
        <div class="summary-stack">
          ${summaryLine("今日重点", state.overview.executive_summary.headline)}
          ${summaryLine("风险判断", state.overview.executive_summary.risk)}
          ${summaryLine("建议动作", state.overview.executive_summary.action)}
        </div>
      </section>
      <section class="section">
        <div class="section-header"><h2>发酵雷达快照</h2><a class="text-button primary" href="#/fermentation">查看全部</a></div>
        <div class="intel-list">
          ${state.overview.fermentation_snapshot.slice(0, 3).map(compactFermentation).join("") || empty("暂无升温事件")}
        </div>
      </section>
    </div>
    <section class="section">
      <div class="section-header"><h2>高优先级情报 Top 10</h2><a class="text-button primary" href="#/daily">进入日报</a></div>
      <div class="intel-list">${state.overview.top_intelligence.map(intelCard).join("")}</div>
    </section>
    <section class="section">
      <div class="section-header"><h2>Joybuy vs Temu 基线</h2><a class="text-button primary" href="#/competitor">查看竞品雷达</a></div>
      ${competitorBaseline()}
    </section>
  `;
}

function dailyPage() {
  return `
    <section class="section">
      <div class="section-header">
        <h2>过去 24 小时情报</h2>
        <span class="tag">${state.daily.clusters.length} clusters</span>
      </div>
      <div class="filter-row">
        <label>排序 <select id="daily-sort">
          <option value="ips">IPS</option>
          <option value="current_impact">当前影响力</option>
          <option value="future_potential">未来潜力</option>
          <option value="credibility">可信度</option>
        </select></label>
        <label>风险 <select id="daily-filter">
          <option value="all">全部</option>
          <option value="urgent">紧急</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="positive">正面机会</option>
        </select></label>
      </div>
      <div id="daily-list" class="intel-list">${state.daily.clusters.map(intelCard).join("")}</div>
    </section>
  `;
}

function fermentationPage() {
  const items = state.fermentation.items;
  return `
    <div class="metric-grid">
      ${metric("追踪中", items.length, "进入发酵追踪池")}
      ${metric("升温中", items.filter((item) => item.fermentation.status === "升温中").length, "互动或扩散增强")}
      ${metric("发酵中", items.filter((item) => item.fermentation.status === "发酵中").length, "需要重点关注")}
      ${metric("已归档", state.daily.clusters.length, "历史情报库总量")}
    </div>
    <section class="section">
      <div class="section-header"><h2>风险生命线</h2><span class="tag">7-14 day tracking</span></div>
      <div class="timeline">
        ${items.map(timelineItem).join("") || empty("暂无需要高频追踪的情报")}
      </div>
    </section>
    <section class="section">
      <div class="section-header"><h2>发酵事件</h2></div>
      <div class="intel-list">${items.map(intelCard).join("")}</div>
    </section>
  `;
}

function competitorPage() {
  const competitor = state.competitor;
  return `
    <div class="metric-grid">
      ${metric("Temu 声量", competitor.volume, "样例采集量")}
      ${metric("负面", competitor.sentiment.negative, "按关键词轻量判定")}
      ${metric("中性", competitor.sentiment.neutral, "非深度评分")}
      ${metric("正面", competitor.sentiment.positive, "体验或客服正向")}
    </div>
    <div class="grid-two">
      <section class="section">
        <div class="section-header"><h2>Temu Top 词</h2></div>
        <div class="bar-grid">
          ${competitor.top_terms.map((term) => bar(term.term, term.count, competitor.volume, "orange")).join("")}
        </div>
      </section>
      <section class="section">
        <div class="section-header"><h2>异常波动</h2></div>
        <div class="summary-stack">
          ${(competitor.anomalies || []).map((item) => summaryLine("Signal", item)).join("") || empty("暂无明显异常")}
        </div>
      </section>
    </div>
    <section class="section">
      <div class="section-header"><h2>Temu Top 内容</h2></div>
      <div class="intel-list">${competitor.top_posts.map(competitorPost).join("")}</div>
    </section>
  `;
}

function sourceStatusPage() {
  const source = state.sourceStatus;
  return `
    <section class="section">
      <div class="section-header"><h2>数据源状态</h2><span class="status-pill ${source.status}">${source.status}</span></div>
      <div class="metric-grid">
        ${metric("原始采集", source.raw_posts_collected, "当前样例数据")}
        ${metric("有效内容", source.effective_posts, "过滤后进入分析")}
        ${metric("数据源", source.providers.join(", "), "当前 provider")}
        ${metric("估算成本", `$${source.estimated_cost_usd}`, "样例阶段")}
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

function metric(label, value, note) {
  return `<div class="metric"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(String(value))}</div><div class="metric-note">${escapeHtml(note)}</div></div>`;
}

function summaryLine(label, text) {
  return `<div class="summary-line"><span class="meta">${escapeHtml(label)}</span><p>${escapeHtml(text)}</p></div>`;
}

function intelCard(item) {
  return `
    <article class="intel-card">
      <div class="card-top">
        <div class="card-title">
          <h3>${escapeHtml(item.title)}</h3>
          <p class="muted">${escapeHtml(item.summary_zh || item.summary)}</p>
        </div>
        ${scoreBadge(item.score)}
      </div>
      <div class="tag-row">
        ${levelPill(item.score)}
        <span class="tag">${escapeHtml(item.score.sentiment)}</span>
        <span class="tag">原帖 ${item.post_count}</span>
        <span class="tag">${escapeHtml(item.fermentation?.status || "未追踪")}</span>
      </div>
      <div class="card-meta">
        <span>可信度 ${item.score.credibility}</span>
        <span>当前影响 ${item.score.current_impact}</span>
        <span>未来潜力 ${item.score.future_potential}</span>
        <span>建议 ${escapeHtml(item.score.recommended_action)}</span>
      </div>
      <div class="button-row">
        <a class="text-button primary" href="#/intel/${item.cluster_id}">查看详情</a>
      </div>
    </article>
  `;
}

function compactFermentation(item) {
  return `
    <article class="intel-card">
      <div class="card-top">
        <h3>${escapeHtml(item.title)}</h3>
        ${scoreBadge(item.score)}
      </div>
      <p class="muted">${escapeHtml((item.fermentation.signals || ["暂无信号"])[0])}</p>
      <a class="text-button primary" href="#/intel/${item.cluster_id}">查看</a>
    </article>
  `;
}

function competitorBaseline() {
  const joybuyVolume = state.overview.metrics.joybuy_volume;
  const temuVolume = state.overview.metrics.temu_volume;
  const max = Math.max(joybuyVolume, temuVolume, 1);
  return `
    <div class="bar-grid">
      ${bar("Joybuy 声量", joybuyVolume, max, "green")}
      ${bar("Temu 声量", temuVolume, max, "orange")}
      ${bar("Joybuy 负面占比", state.overview.metrics.negative_share, 100, "red")}
    </div>
  `;
}

function timelineItem(item) {
  return `
    <div class="timeline-item">
      <div class="timeline-dot">${escapeHtml(item.fermentation.status)}</div>
      <div class="intel-card">
        <div class="card-top">
          <h3>${escapeHtml(item.title)}</h3>
          ${scoreBadge(item.score)}
        </div>
        <p class="muted">${escapeHtml((item.fermentation.signals || ["暂无信号"]).join("；"))}</p>
        <a class="text-button primary" href="#/intel/${item.cluster_id}">查看时间线</a>
      </div>
    </div>
  `;
}

function competitorPost(post) {
  const interactions = post.metrics.likes + post.metrics.reposts + post.metrics.replies + post.metrics.quotes;
  return `
    <article class="intel-card">
      <div class="card-top">
        <div class="card-title">
          <h3>@${escapeHtml(post.author_handle)}</h3>
          <p class="muted">${escapeHtml(post.summary_zh)}</p>
        </div>
        <div class="score-badge"><div class="score-number">${interactions}</div><div class="score-label">Interactions</div></div>
      </div>
      <p>${escapeHtml(post.text)}</p>
      <div class="button-row"><a class="text-button primary" href="${post.url}" target="_blank" rel="noreferrer">Open on X</a></div>
    </article>
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

function scoreBadge(score) {
  return `<div class="score-badge"><div class="score-number">${score.ips}</div><div class="score-label">IPS</div></div>`;
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

function empty(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function bindPageEvents(detail = null) {
  const sort = document.getElementById("daily-sort");
  const filter = document.getElementById("daily-filter");
  if (sort && filter) {
    const update = () => {
      let clusters = [...state.daily.clusters];
      const filterValue = filter.value;
      if (filterValue !== "all") {
        clusters = clusters.filter((item) => {
          if (filterValue === "positive") return item.score.sentiment === "positive";
          return item.score.level === filterValue;
        });
      }
      clusters.sort((a, b) => {
        const key = sort.value;
        const aValue = key === "ips" ? a.score.ips : a.score[key];
        const bValue = key === "ips" ? b.score.ips : b.score[key];
        return bValue - aValue;
      });
      document.getElementById("daily-list").innerHTML = clusters.map(intelCard).join("") || empty("暂无匹配情报");
    };
    sort.addEventListener("change", update);
    filter.addEventListener("change", update);
  }

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
