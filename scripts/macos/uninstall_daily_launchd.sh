#!/usr/bin/env bash
set -euo pipefail

LABEL="com.joybuy-radar.daily"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl unload "$PLIST" >/dev/null 2>&1 || true
rm -f "$PLIST"

printf 'Uninstalled %s.\n' "$LABEL"
