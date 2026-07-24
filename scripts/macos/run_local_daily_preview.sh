#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCK_DIR="${TMPDIR:-/tmp}/joybuy-radar-daily-preview.lock"
KEYCHAIN_ACCOUNT="${JOYBUY_RADAR_KEYCHAIN_ACCOUNT:-${USER:-$(id -un)}}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
RESUME_FROM_CHECKPOINT="${BRAND_RADAR_RESUME_FROM_CHECKPOINT:-0}"

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
  fail "Another Joybuy Radar daily preview run is already active."
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

ensure_real_dashboard_data() {
  "$PYTHON_BIN" - <<'PY'
import json
from pathlib import Path

source_path = Path("public/dashboard-data/source-status.json")
if not source_path.exists():
    raise SystemExit("source-status.json is missing")

source = json.loads(source_path.read_text(encoding="utf-8"))
if source.get("status") == "sample":
    raise SystemExit("Local daily preview produced sample data; refusing to treat it as real data.")
if source.get("raw_posts_collected", 0) <= 0:
    raise SystemExit("Local daily preview produced no public source records; refusing to treat it as real data.")
PY
}

run_daily() {
  if command -v caffeinate >/dev/null 2>&1; then
    if [[ "$RESUME_FROM_CHECKPOINT" == "1" ]]; then
      caffeinate -dimsu "$PYTHON_BIN" scripts/run_daily.py --resume-from-checkpoint
    else
      caffeinate -dimsu "$PYTHON_BIN" scripts/run_daily.py
    fi
  elif [[ "$RESUME_FROM_CHECKPOINT" == "1" ]]; then
    "$PYTHON_BIN" scripts/run_daily.py --resume-from-checkpoint
  else
    "$PYTHON_BIN" scripts/run_daily.py
  fi
}

cd "$ROOT"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

command -v security >/dev/null 2>&1 || fail "macOS security command is not available."
command -v "$PYTHON_BIN" >/dev/null 2>&1 || fail "$PYTHON_BIN is not available."

log "Starting Joybuy Radar real daily preview run."
log "This preview will not run git pull, git commit, or git push."

export X_SOURCE_PROVIDER="${X_SOURCE_PROVIDER:-twitterapi_io}"
export X_DAILY_LIMIT="${X_DAILY_LIMIT:-240}"
export X_JOYBUY_DAILY_LIMIT="${X_JOYBUY_DAILY_LIMIT:-160}"
export X_TEMU_DAILY_LIMIT="${X_TEMU_DAILY_LIMIT:-80}"
export X_MAX_API_REQUESTS="${X_MAX_API_REQUESTS:-12}"
export TRANSLATION_PROVIDER="${TRANSLATION_PROVIDER:-joybuilder}"
export JDBUILDER_TRANSLATION_MODEL="${JDBUILDER_TRANSLATION_MODEL:-GPT-5.5}"
export JDBUILDER_TRANSLATION_TIMEOUT_SECONDS="${JDBUILDER_TRANSLATION_TIMEOUT_SECONDS:-90}"
export JDBUILDER_TRANSLATION_BATCH_SIZE="${JDBUILDER_TRANSLATION_BATCH_SIZE:-6}"
export JDBUILDER_TRANSLATION_RETRIES="${JDBUILDER_TRANSLATION_RETRIES:-1}"
export JDBUILDER_TRANSLATION_MAX_CHARS="${JDBUILDER_TRANSLATION_MAX_CHARS:-3500}"
export TWITTERAPI_IO_KEY
export JDCLOUD_GPT_API_KEY

if [[ "$RESUME_FROM_CHECKPOINT" == "1" ]]; then
  log "Resuming daily dashboard generation from local checkpoint without calling X."
else
  TWITTERAPI_IO_KEY="$(require_keychain_secret TWITTERAPI_IO_KEY)"
fi
JDCLOUD_GPT_API_KEY="$(require_keychain_secret JDCLOUD_GPT_API_KEY)"

log "Generating real daily dashboard data preview."
run_daily

log "Verifying generated dashboard data preview."
"$PYTHON_BIN" scripts/security_check.py
"$PYTHON_BIN" scripts/check_dashboard_data.py
"$PYTHON_BIN" scripts/verify_data.py
"$PYTHON_BIN" scripts/report_run_summary.py
ensure_real_dashboard_data

log "Preview finished. Public dashboard files were updated locally only."
