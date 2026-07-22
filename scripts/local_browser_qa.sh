#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SCREENSHOT_DIR="$ROOT/data/logs/screenshots-local"
mkdir -p "$SCREENSHOT_DIR"

echo "Joybuy local browser QA"
echo "Project: $ROOT"
echo "Screenshots: $SCREENSHOT_DIR"
echo

if node -e "require.resolve('playwright')" >/dev/null 2>&1; then
  echo "Trying Playwright browser QA..."
  if node scripts/verify_dashboard.cjs; then
    echo "Playwright browser QA passed."
    exit 0
  fi
  echo "Playwright browser QA failed or browser binary is unavailable; trying system browser screenshots."
  echo
else
  echo "Playwright package is not available in this Node environment; trying system browser screenshots."
  echo
fi

PUBLIC_URL="$(python3 - <<'PY'
from pathlib import Path
print((Path.cwd() / "public" / "index.html").as_uri())
PY
)"

DETAIL_ID="$(python3 - <<'PY'
import json
from pathlib import Path
daily = json.loads((Path.cwd() / "public" / "dashboard-data" / "daily" / "latest.json").read_text())
clusters = daily.get("clusters") or []
print(clusters[0]["cluster_id"] if clusters else "")
PY
)"

ROUTE_NAMES=("overview" "all" "daily" "fermentation" "settings")
ROUTE_HASHES=("#/" "#/all" "#/daily" "#/fermentation" "#/settings")
if [[ -n "$DETAIL_ID" ]]; then
  ROUTE_NAMES+=("detail")
  ROUTE_HASHES+=("#/intel/$DETAIL_ID")
fi

CHROME_BIN="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
FIREFOX_BIN="${FIREFOX_BIN:-/Applications/Firefox.app/Contents/MacOS/firefox}"

run_quiet() {
  python3 - "$@" <<'PY'
import subprocess
import sys

result = subprocess.run(sys.argv[1:], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
sys.exit(result.returncode)
PY
}

run_chrome() {
  [[ -x "$CHROME_BIN" ]] || return 1
  echo "Trying Google Chrome headless screenshots..."
  local index
  for index in "${!ROUTE_NAMES[@]}"; do
    local name="${ROUTE_NAMES[$index]}"
    local hash="${ROUTE_HASHES[$index]}"
    local profile
    profile="$(mktemp -d /tmp/joybuy-chrome-qa.XXXXXX)"
    if ! run_quiet "$CHROME_BIN" \
      --headless=new \
      --disable-gpu \
      --no-sandbox \
      --user-data-dir="$profile" \
      --window-size=1440,1100 \
      --virtual-time-budget=5000 \
      --screenshot="$SCREENSHOT_DIR/chrome-$name.png" \
      "$PUBLIC_URL$hash"; then
      echo "Chrome could not start from this terminal."
      return 1
    fi
    test -s "$SCREENSHOT_DIR/chrome-$name.png"
  done
}

run_firefox() {
  [[ -x "$FIREFOX_BIN" ]] || return 1
  echo "Trying Firefox headless screenshots..."
  local index
  for index in "${!ROUTE_NAMES[@]}"; do
    local name="${ROUTE_NAMES[$index]}"
    local hash="${ROUTE_HASHES[$index]}"
    local profile
    profile="$(mktemp -d /tmp/joybuy-firefox-qa.XXXXXX)"
    if ! run_quiet "$FIREFOX_BIN" \
      --headless \
      --profile "$profile" \
      --window-size 1440,1100 \
      --screenshot "$SCREENSHOT_DIR/firefox-$name.png" \
      "$PUBLIC_URL$hash"; then
      echo "Firefox could not start from this terminal."
      return 1
    fi
    test -s "$SCREENSHOT_DIR/firefox-$name.png"
  done
}

if run_chrome; then
  echo "Chrome screenshot QA completed."
  exit 0
fi

if run_firefox; then
  echo "Firefox screenshot QA completed."
  exit 0
fi

cat <<'TEXT'
Local browser QA could not start a real browser from this terminal.

Recommended local fix:
  npm install --no-save --no-package-lock playwright
  npx playwright install chromium
  node scripts/verify_dashboard.cjs

If Chrome or Firefox is installed in a non-standard path, run:
  CHROME_BIN="/path/to/Google Chrome" bash scripts/local_browser_qa.sh
or:
  FIREFOX_BIN="/path/to/firefox" bash scripts/local_browser_qa.sh
TEXT
exit 1
