#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$PROJECT_ROOT/.runtime/app.pid"
if [[ ! -f "$PID_FILE" ]]; then
  echo "No managed background process. Stop foreground run.sh with Ctrl+C."
  exit 0
fi
APP_PID="$(cat "$PID_FILE")"
APP_COMMAND="$(ps -p "$APP_PID" -o command= 2>/dev/null || true)"
if [[ "$APP_COMMAND" == *"$PROJECT_ROOT/.runtime/homewise.jar"* || "$APP_COMMAND" == *"$PROJECT_ROOT/backend/finance-api/target/finance-api-1.0.0.jar"* ]]; then
  kill "$APP_PID"
  # Wait for database and JVM shutdown before a following run replaces the runtime JAR.
  for ((i=0; i<120; i++)); do
    if ! kill -0 "$APP_PID" 2>/dev/null; then break; fi
    sleep 0.25
  done
  if kill -0 "$APP_PID" 2>/dev/null; then
    echo "Homewise is still shutting down. PID retained; wait before restarting." >&2
    exit 1
  fi
  echo "Stopped Homewise (PID $APP_PID)."
elif [[ -n "$APP_COMMAND" ]]; then
  echo "PID belongs to another process; no signal sent." >&2
fi
rm -f "$PID_FILE"
