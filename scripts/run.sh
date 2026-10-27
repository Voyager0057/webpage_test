#!/usr/bin/env bash
# Foreground mode, suitable for a terminal or service manager.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"
JAR="$PROJECT_ROOT/backend/finance-api/target/finance-api-1.0.0.jar"
if [[ ! -f "$JAR" || ! -f "$PROJECT_ROOT/frontend/dist/index.html" ]]; then
  echo "Build missing. Run ./scripts/bootstrap.sh && ./scripts/build.sh" >&2
  exit 1
fi
mkdir -p "$PROJECT_ROOT/.runtime"
JAVA_BIN="${JAVA_HOME:+$JAVA_HOME/bin/}java"
if [[ -f "$PROJECT_ROOT/.runtime/app.pid" ]]; then
  RECORDED_PID="$(cat "$PROJECT_ROOT/.runtime/app.pid")"
  if [[ "$RECORDED_PID" != "$$" ]] && kill -0 "$RECORDED_PID" 2>/dev/null; then
    echo "Homewise already running (PID $RECORDED_PID). Use ./scripts/stop.sh before restarting." >&2
    exit 1
  fi
fi
# Run a snapshot so rebuilding target/ cannot corrupt the live JVM's lazy JAR loading.
RUNNING_JAR="$PROJECT_ROOT/.runtime/homewise.jar"
cp "$JAR" "$RUNNING_JAR.next"
mv "$RUNNING_JAR.next" "$RUNNING_JAR"
echo "$$" > "$PROJECT_ROOT/.runtime/app.pid"
echo "Homewise: http://localhost:${PORT:-8080} (Ctrl+C to stop)"
exec "$JAVA_BIN" -jar "$RUNNING_JAR" \
  "--server.port=${PORT:-8080}" \
  --server.address=0.0.0.0 \
  "--spring.web.resources.static-locations=file:$PROJECT_ROOT/frontend/dist/"
