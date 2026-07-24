#!/usr/bin/env bash
set -euo pipefail

KEYCHAIN_ACCOUNT="${JOYBUY_RADAR_KEYCHAIN_ACCOUNT:-${USER:-$(id -un)}}"
MISSING=0

check_secret() {
  local name="$1"
  local service="joybuy-radar.$name"

  if security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$service" >/dev/null 2>&1; then
    printf '%s: present\n' "$name"
  else
    printf '%s: missing\n' "$name"
    MISSING=1
  fi
}

command -v security >/dev/null 2>&1 || {
  printf 'ERROR: macOS security command is not available.\n' >&2
  exit 1
}

check_secret TWITTERAPI_IO_KEY
check_secret JDCLOUD_GPT_API_KEY

exit "$MISSING"
