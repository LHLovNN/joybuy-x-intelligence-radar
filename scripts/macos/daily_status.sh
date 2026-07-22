#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LABEL="com.joybuy-radar.daily"
LOG_DIR="$ROOT/data/logs/macos"

cd "$ROOT"

printf 'Joybuy Radar local automation status\n'
printf 'Project: %s\n' "$ROOT"
printf 'LaunchAgent: %s\n' "$LABEL"

if launchctl list | grep -F "$LABEL" >/dev/null 2>&1; then
  printf 'LaunchAgent loaded: yes\n'
else
  printf 'LaunchAgent loaded: no\n'
fi

printf '\nGit status:\n'
git status --short

if [[ -f "$LOG_DIR/daily.out.log" ]]; then
  printf '\nLast stdout log lines:\n'
  tail -n 80 "$LOG_DIR/daily.out.log"
fi

if [[ -f "$LOG_DIR/daily.err.log" ]]; then
  printf '\nLast stderr log lines:\n'
  tail -n 80 "$LOG_DIR/daily.err.log"
fi
