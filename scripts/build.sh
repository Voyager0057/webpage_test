#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/toolchain.sh"
cd "$PROJECT_ROOT"
"$PNPM_BIN" --dir frontend install --frozen-lockfile --store-dir "$PROJECT_ROOT/.tools/pnpm-store"
"$PNPM_BIN" --dir frontend build
"$MAVEN_BIN" -B -f backend/pom.xml "-Dmaven.repo.local=$PROJECT_ROOT/.tools/m2" verify
echo "Build and Java tests passed. Run ./scripts/start.sh"
