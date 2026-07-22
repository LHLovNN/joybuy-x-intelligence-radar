#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG_DIR="$ROOT/data/logs/macos"
LOCK_DIR="${TMPDIR:-/tmp}/joybuy-radar-daily.lock"
KEYCHAIN_ACCOUNT="${JOYBUY_RADAR_KEYCHAIN_ACCOUNT:-${USER:-$(id -un)}}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

mkdir -p "$LOG_DIR"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')" "$*"
}

fail() {
  log "ERROR: $*"
  exit 1
}

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  fail "Another Joybuy Radar daily run is already active."
fi
trap cleanup EXIT

keychain_value() {
  local name="$1"
  local service="joybuy-radar.$name"
  security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$service" -w 2>/dev/null || true
}

require_keychain_secret() {
  local name="$1"
  local value
  value="$(keychain_value "$name")"
  if [[ -z "$value" ]]; then
    fail "$name is missing in macOS Keychain service joybuy-radar.$name."
  fi
  printf '%s' "$value"
}

ensure_no_local_source_changes() {
  local untracked
  if ! git diff --quiet -- . \
    ':!public/dashboard-data/*.json' \
    ':!public/dashboard-data/daily/*.json' \
    ':!public/dashboard-data-bundle.js'; then
    fail "Local non-dashboard source changes exist. Commit or stash them before the scheduled run."
  fi

  untracked="$(
    git ls-files --others --exclude-standard \
      | grep -vE '^(public/dashboard-data/[^/]+\.json|public/dashboard-data/daily/[^/]+\.json|public/dashboard-data-bundle\.js)$' \
      || true
  )"
  if [[ -n "$untracked" ]]; then
    printf '%s\n' "$untracked" >&2
    fail "Untracked non-dashboard files exist. Commit, ignore or remove them before the scheduled run."
  fi
}

ensure_real_dashboard_data() {
  "$PYTHON_BIN" - <<'PY'
import json
import sys
from pathlib import Path

source_path = Path("public/dashboard-data/source-status.json")
if not source_path.exists():
    raise SystemExit("source-status.json is missing")

source = json.loads(source_path.read_text(encoding="utf-8"))
providers = set(source.get("providers", []))
if not providers or providers == {"sample"}:
    raise SystemExit("Local daily produced sample data; refusing to publish.")
if "twitterapi_io" not in providers:
    raise SystemExit(f"Expected twitterapi_io provider, got: {', '.join(sorted(providers)) or 'none'}")
PY
}

run_daily() {
  if command -v caffeinate >/dev/null 2>&1; then
    caffeinate -dimsu "$PYTHON_BIN" scripts/run_daily.py
  else
    "$PYTHON_BIN" scripts/run_daily.py
  fi
}

cd "$ROOT"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

command -v git >/dev/null 2>&1 || fail "git is not available."
command -v security >/dev/null 2>&1 || fail "macOS security command is not available."
command -v "$PYTHON_BIN" >/dev/null 2>&1 || fail "$PYTHON_BIN is not available."

log "Starting Joybuy Radar local daily run."
ensure_no_local_source_changes

log "Syncing repository."
git pull --ff-only origin main

export X_SOURCE_PROVIDER="${X_SOURCE_PROVIDER:-twitterapi_io}"
export X_DAILY_LIMIT="${X_DAILY_LIMIT:-60}"
export X_JOYBUY_DAILY_LIMIT="${X_JOYBUY_DAILY_LIMIT:-45}"
export X_TEMU_DAILY_LIMIT="${X_TEMU_DAILY_LIMIT:-15}"
export X_MAX_API_REQUESTS="${X_MAX_API_REQUESTS:-6}"
export TRANSLATION_PROVIDER="${TRANSLATION_PROVIDER:-joybuilder}"
export JDBUILDER_TRANSLATION_MODEL="${JDBUILDER_TRANSLATION_MODEL:-GPT-5.5}"
export JDBUILDER_TRANSLATION_TIMEOUT_SECONDS="${JDBUILDER_TRANSLATION_TIMEOUT_SECONDS:-90}"
export JDBUILDER_TRANSLATION_BATCH_SIZE="${JDBUILDER_TRANSLATION_BATCH_SIZE:-6}"
export JDBUILDER_TRANSLATION_RETRIES="${JDBUILDER_TRANSLATION_RETRIES:-1}"
export JDBUILDER_TRANSLATION_MAX_CHARS="${JDBUILDER_TRANSLATION_MAX_CHARS:-3500}"
export TWITTERAPI_IO_KEY
export JDCLOUD_GPT_API_KEY

TWITTERAPI_IO_KEY="$(require_keychain_secret TWITTERAPI_IO_KEY)"
JDCLOUD_GPT_API_KEY="$(require_keychain_secret JDCLOUD_GPT_API_KEY)"

log "Generating real daily dashboard data."
run_daily

log "Verifying generated dashboard data."
"$PYTHON_BIN" scripts/security_check.py
"$PYTHON_BIN" scripts/check_dashboard_data.py
"$PYTHON_BIN" scripts/verify_data.py
"$PYTHON_BIN" scripts/report_run_summary.py
ensure_real_dashboard_data

log "Staging public dashboard artifacts only."
git add public/dashboard-data/*.json public/dashboard-data/daily/*.json public/dashboard-data-bundle.js

if git diff --cached --quiet; then
  log "No dashboard data changes to commit."
else
  git commit -m "Archive local daily dashboard data $(date '+%Y-%m-%d')"
  git push
fi

log "Joybuy Radar local daily run finished."
