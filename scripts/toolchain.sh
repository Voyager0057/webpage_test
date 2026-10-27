#!/usr/bin/env bash
# Source this file; all downloaded tools stay inside the checkout.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$PROJECT_ROOT/.runtime" "$PROJECT_ROOT/.tools"
if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  echo "Please install Node.js 22 LTS or newer (nodejs.org), then retry." >&2
  exit 1
fi
export PATH="$(dirname "$NODE_BIN"):$PATH"
if command -v pnpm >/dev/null 2>&1; then
  PNPM_BIN="$(command -v pnpm)"
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm" ]]; then
  PNPM_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm"
else
  echo "Please install pnpm: npm install -g pnpm@11.25.0" >&2
  exit 1
fi
if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]]; then
  JAVA_BIN="$JAVA_HOME/bin/java"
elif command -v java >/dev/null 2>&1; then
  JAVA_BIN="$(command -v java)"
else
  echo "Please install JDK 21 or newer (adoptium.net)." >&2
  exit 1
fi
if [[ -x "$PROJECT_ROOT/.tools/apache-maven-3.9.9/bin/mvn" ]]; then
  MAVEN_BIN="$PROJECT_ROOT/.tools/apache-maven-3.9.9/bin/mvn"
elif command -v mvn >/dev/null 2>&1; then
  MAVEN_BIN="$(command -v mvn)"
else
  echo "Maven missing. Run ./scripts/bootstrap.sh first." >&2
  exit 1
fi
