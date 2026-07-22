#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LABEL="com.joybuy-radar.daily"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG_DIR="$ROOT/data/logs/macos"
RUNNER="$ROOT/scripts/macos/run_local_daily.sh"

mkdir -p "$HOME/Library/LaunchAgents" "$LOG_DIR"

if [[ ! -x "$RUNNER" ]]; then
  chmod 700 "$RUNNER"
fi

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$RUNNER</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$ROOT</string>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>8</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/daily.out.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/daily.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
PLIST

launchctl unload "$PLIST" >/dev/null 2>&1 || true
launchctl load -w "$PLIST"

printf 'Installed %s.\n' "$PLIST"
printf 'Joybuy Radar local daily run is scheduled for 08:00 local time.\n'
printf 'Keep the Mac awake and network/VPN available at that time. Lock screen is fine; sleep is not.\n'
