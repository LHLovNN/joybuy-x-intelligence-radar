#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
source "$ROOT/scripts/macos/local_env.sh"

for label in "$BRAND_RADAR_LAUNCHD_LABEL" "$BRAND_RADAR_LEGACY_LAUNCHD_LABEL"; do
  plist="$HOME/Library/LaunchAgents/$label.plist"
  launchctl unload "$plist" >/dev/null 2>&1 || true
  rm -f "$plist"
  printf 'Uninstalled %s.\n' "$label"
done
