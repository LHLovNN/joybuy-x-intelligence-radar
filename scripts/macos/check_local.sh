#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/macos/local_env.sh"
MISSING=0

check_secret() {
  local name="$1"
  local label="$2"

  if [[ -n "$(brand_radar_keychain_value "$name" || true)" ]]; then
    printf '%s: present\n' "$label"
  else
    printf '%s: missing\n' "$label"
    MISSING=1
  fi
}

command -v security >/dev/null 2>&1 || {
  printf 'ERROR: macOS security command is not available.\n' >&2
  exit 1
}

check_secret TWITTERAPI_IO_KEY "Source connector credential"
check_secret JDCLOUD_GPT_API_KEY "Language processing credential"

exit "$MISSING"
