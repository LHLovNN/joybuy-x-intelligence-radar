#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
KEYCHAIN_ACCOUNT="${JOYBUY_RADAR_KEYCHAIN_ACCOUNT:-${USER:-$(id -un)}}"
SERVICE="joybuy-radar.JDCLOUD_GPT_API_KEY"

cleanup() {
  unset JDCLOUD_GPT_API_KEY
}
trap cleanup EXIT

command -v security >/dev/null 2>&1 || {
  printf 'ERROR: macOS security command is not available.\n' >&2
  exit 1
}

JDCLOUD_GPT_API_KEY="$(security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$SERVICE" -w 2>/dev/null || true)"
if [[ -z "$JDCLOUD_GPT_API_KEY" ]]; then
  printf 'ERROR: JDCLOUD_GPT_API_KEY is missing in macOS Keychain service %s.\n' "$SERVICE" >&2
  exit 1
fi

export JDCLOUD_GPT_API_KEY
cd "$ROOT"

python3 scripts/smoke_translation_joybuilder.py
