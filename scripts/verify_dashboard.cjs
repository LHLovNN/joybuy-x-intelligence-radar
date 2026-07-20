const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");
const outDir = path.join(root, "data", "logs", "screenshots");
const localBrowserCandidates = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);

function localBrowserExecutable() {
  return localBrowserCandidates.find((candidate) => fs.existsSync(candidate));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(publicDir, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function buildDataMap() {
  const map = {
    "dashboard-data/latest.json": readJson("dashboard-data/latest.json"),
    "dashboard-data/daily/latest.json": readJson("dashboard-data/daily/latest.json"),
    "dashboard-data/daily/index.json": readJson("dashboard-data/daily/index.json"),
    "dashboard-data/fermentation.json": readJson("dashboard-data/fermentation.json"),
    "dashboard-data/competitor.json": readJson("dashboard-data/competitor.json"),
    "dashboard-data/source-status.json": readJson("dashboard-data/source-status.json"),
  };
  const dailyDir = path.join(publicDir, "dashboard-data", "daily");
  for (const file of fs.readdirSync(dailyDir)) {
    if (file.endsWith(".json") && file !== "latest.json" && file !== "index.json") {
      map[`dashboard-data/daily/${file}`] = JSON.parse(fs.readFileSync(path.join(dailyDir, file), "utf8"));
    }
  }
  const clustersDir = path.join(publicDir, "dashboard-data", "clusters");
  if (fs.existsSync(clustersDir)) {
    for (const file of fs.readdirSync(clustersDir)) {
      if (file.endsWith(".json")) {
        map[`dashboard-data/clusters/${file}`] = JSON.parse(fs.readFileSync(path.join(clustersDir, file), "utf8"));
      }
    }
  }
  return map;
}

function shellHtml() {
  const css = readText("assets/styles.css");
  const js = readText("assets/app.js");
  const dataMap = JSON.stringify(buildDataMap()).replace(/</g, "\\u003c");
  return `
    <style>${css}</style>
    <div id="app" class="app-shell">
      <aside class="sidebar" aria-label="Main navigation">
        <div class="brand-block">
          <div class="brand-mark">JX</div>
          <div>
            <div class="brand-title">Joybuy X</div>
            <div class="brand-subtitle">Intelligence Radar</div>
          </div>
        </div>
        <nav class="nav-list">
          <a href="#/" data-route="overview">今日精选</a>
          <a href="#/all" data-route="all">全部情报</a>
          <a href="#/daily" data-route="daily">日报中心</a>
          <a href="#/fermentation" data-route="fermentation">发酵追踪</a>
          <a href="#/settings" data-route="settings">设置</a>
        </nav>
      </aside>
      <main class="main-panel">
        <header class="topbar">
          <div>
            <p class="eyebrow">X PUBLIC INTELLIGENCE</p>
            <h1 id="page-title">今日精选</h1>
          </div>
          <div class="topbar-meta">
            <span id="generated-at">Loading</span>
            <span id="health-pill" class="status-pill neutral">Loading</span>
          </div>
        </header>
        <section id="content" class="content-area" aria-live="polite"></section>
      </main>
    </div>
    <script>
      const __dashboardData = ${dataMap};
      window.fetch = async function(input) {
        const raw = String(input);
        const key = raw.replace(/^\\.\\//, "");
        if (!__dashboardData[key]) {
          return new Response("{}", { status: 404 });
        }
        return new Response(JSON.stringify(__dashboardData[key]), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      };
    </script>
    <script>${js}</script>
  `;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const executablePath = localBrowserExecutable();
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.setContent(shellHtml(), { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".metric-grid", { timeout: 5000 });
  await page.screenshot({ path: path.join(outDir, "overview.png"), fullPage: true });

  await page.click('a[href="#/daily"]');
  await page.waitForSelector(".publish-timeline", { timeout: 5000 });
  await page.waitForSelector(".daily-history-item", { timeout: 5000 });
  await page.screenshot({ path: path.join(outDir, "daily.png"), fullPage: true });

  await page.click('a[href="#/all"]');
  await page.waitForSelector("#all-brand-filter", { timeout: 5000 });
  await page.selectOption("#all-brand-filter", "joybuy");

  await page.click('a[href="#/fermentation"]');
  await page.waitForSelector(".section", { timeout: 5000 });

  await page.click('a[href="#/daily"]');
  await page.waitForSelector(".publish-timeline", { timeout: 5000 });
  const detailLink = await page.$('.publish-timeline a[href^="#/intel/"]');
  if (detailLink) {
    const detailHref = await detailLink.evaluate((node) => node.getAttribute("href"));
    await page.click(`.publish-timeline a[href="${detailHref}"]`);
    await page.waitForSelector(".evidence-tabs", { timeout: 5000 });
    await page.click('[data-evidence="popular"]');
    await page.waitForSelector("#evidence-list", { timeout: 5000 });
    await page.screenshot({ path: path.join(outDir, "detail.png"), fullPage: true });
  }

  await browser.close();
  if (errors.length) {
    console.error(errors.join("\\n"));
    process.exit(1);
  }
  console.log("Dashboard browser verification passed.");
  console.log(`Screenshots: ${path.relative(root, outDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
