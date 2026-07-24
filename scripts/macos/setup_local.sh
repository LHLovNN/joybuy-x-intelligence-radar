#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/macos/local_env.sh"

store_secret() {
  local name="$1"
  local label="$2"
  local value=""

  if [[ "$BRAND_RADAR_USE_ENV_VALUES" == "1" ]]; then
    value="${!name:-}"
    if [[ -n "$value" ]]; then
      printf 'Using %s from current terminal environment (value hidden).\n' "$label"
    fi
  fi

  if [[ -z "$value" ]]; then
    printf 'Paste %s (input hidden; leave blank to skip): ' "$label"
    IFS= read -rs value
    printf '\n'
  fi

  if [[ -z "$value" ]]; then
    printf 'Skipped %s.\n' "$label"
    return
  fi

  brand_radar_store_keychain_value "$name" "$value"
  printf 'Stored %s in local secure storage.\n' "$label"
}

command -v security >/dev/null 2>&1 || {
  printf 'ERROR: macOS security command is not available.\n' >&2
  exit 1
}

store_secret TWITTERAPI_IO_KEY "source connector credential"
store_secret JDCLOUD_GPT_API_KEY "language processing credential"

printf 'Local setup finished. No values were printed or written to the repo.\n'
