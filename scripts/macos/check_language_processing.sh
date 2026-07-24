#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/macos/local_env.sh"

cleanup() {
  unset JDCLOUD_GPT_API_KEY
}
trap cleanup EXIT

command -v security >/dev/null 2>&1 || {
  printf 'ERROR: macOS security command is not available.\n' >&2
  exit 1
}

JDCLOUD_GPT_API_KEY="$(brand_radar_keychain_value JDCLOUD_GPT_API_KEY || true)"
if [[ -z "$JDCLOUD_GPT_API_KEY" ]]; then
  printf 'ERROR: Language processing credential is missing from local secure storage.\n' >&2
  exit 1
fi

export JDCLOUD_GPT_API_KEY
cd "$ROOT"

python3 scripts/smoke_translation_joybuilder.py
