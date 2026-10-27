#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$PROJECT_ROOT/.tools"
if ! command -v mvn >/dev/null 2>&1 && [[ ! -x "$PROJECT_ROOT/.tools/apache-maven-3.9.9/bin/mvn" ]]; then
  MAVEN_VERSION=3.9.9
  MAVEN_URL="https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$MAVEN_VERSION/apache-maven-$MAVEN_VERSION-bin.tar.gz"
  MAVEN_ARCHIVE="$PROJECT_ROOT/.tools/apache-maven-$MAVEN_VERSION-bin.tar.gz"
  curl -fL --retry 2 "$MAVEN_URL" -o "$MAVEN_ARCHIVE"
  curl -fL --retry 2 "$MAVEN_URL.sha512" -o "$MAVEN_ARCHIVE.sha512"
  if command -v shasum >/dev/null 2>&1; then
    ACTUAL_HASH="$(shasum -a 512 "$MAVEN_ARCHIVE" | awk '{print $1}')"
  else
    ACTUAL_HASH="$(sha512sum "$MAVEN_ARCHIVE" | awk '{print $1}')"
  fi
  EXPECTED_HASH="$(awk '{print $1}' "$MAVEN_ARCHIVE.sha512")"
  [[ "$ACTUAL_HASH" == "$EXPECTED_HASH" ]] || { echo "Maven checksum mismatch"; exit 1; }
  tar -xzf "$MAVEN_ARCHIVE" -C "$PROJECT_ROOT/.tools"
fi
source "$PROJECT_ROOT/scripts/toolchain.sh"
"$NODE_BIN" --version
"$JAVA_BIN" -version
"$MAVEN_BIN" --version
echo "Toolchain ready. Run ./scripts/build.sh"
