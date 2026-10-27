#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$PROJECT_ROOT/.runtime"
PID_FILE="$PROJECT_ROOT/.runtime/app.pid"
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Homewise process already running (PID $(cat "$PID_FILE")). http://localhost:${PORT:-8080}"
  exit 0
fi
if curl --noproxy '*' -fsS "http://localhost:${PORT:-8080}/api/health" >/dev/null 2>&1; then
  echo "Homewise is already serving http://localhost:${PORT:-8080}"
  exit 0
fi
nohup "$PROJECT_ROOT/scripts/run.sh" >"$PROJECT_ROOT/.runtime/app.log" 2>&1 </dev/null &
APP_PID=$!
echo "$APP_PID" >"$PID_FILE"
for ((i=0; i<60; i++)); do
  if ! kill -0 "$APP_PID" 2>/dev/null; then
    echo "Startup failed. See $PROJECT_ROOT/.runtime/app.log" >&2
    tail -n 30 "$PROJECT_ROOT/.runtime/app.log"
    rm -f "$PID_FILE"
    exit 1
  fi
  if curl --noproxy '*' -fsS "http://localhost:${PORT:-8080}/api/health" >/dev/null 2>&1; then
    echo "Ready: http://localhost:${PORT:-8080}"
    echo "Stop: ./scripts/stop.sh | Log: .runtime/app.log"
    exit 0
  fi
  sleep 1
done
echo "Startup health check timed out. Inspect .runtime/app.log; PID $APP_PID." >&2
exit 1
