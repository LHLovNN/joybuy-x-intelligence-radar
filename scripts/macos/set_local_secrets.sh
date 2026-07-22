#!/usr/bin/env bash
set -euo pipefail

KEYCHAIN_ACCOUNT="${JOYBUY_RADAR_KEYCHAIN_ACCOUNT:-${USER:-$(id -un)}}"

store_secret() {
  local name="$1"
  local service="joybuy-radar.$name"
  local value="${!name:-}"

  if [[ -z "$value" ]]; then
    printf 'Paste %s (input hidden; leave blank to skip): ' "$name"
    IFS= read -rs value
    printf '\n'
  fi

  if [[ -z "$value" ]]; then
    printf 'Skipped %s.\n' "$name"
    return
  fi

  security add-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$service" -w "$value" -U >/dev/null
  printf 'Stored %s in macOS Keychain service %s.\n' "$name" "$service"
}

command -v security >/dev/null 2>&1 || {
  printf 'ERROR: macOS security command is not available.\n' >&2
  exit 1
}

store_secret TWITTERAPI_IO_KEY
store_secret JDCLOUD_GPT_API_KEY

printf 'Local secrets setup finished. No secret values were printed or written to the repo.\n'
