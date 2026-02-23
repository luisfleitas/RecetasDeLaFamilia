#!/usr/bin/env bash
set -euo pipefail

WORKDIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_DB="tmp-phase0-migrate.db"
TMP_OUT=".tmp/phase0-tests"

cd "$WORKDIR"

cleanup() {
  rm -f "$TMP_DB"
  rm -rf "$TMP_OUT"
  rmdir ".tmp" 2>/dev/null || true
}

trap cleanup EXIT

rm -f "$TMP_DB"
RUST_BACKTRACE=1 RUST_LOG=info DATABASE_URL="file:./$TMP_DB" npx prisma migrate deploy >/tmp/phase0-migrate.log 2>&1

npx prisma generate >/tmp/phase0-generate.log
npx tsc --noEmit

rm -rf "$TMP_OUT"
mkdir -p "$(dirname "$TMP_OUT")"
npx tsc \
  --outDir "$TMP_OUT" \
  --module commonjs \
  --moduleResolution node \
  --target es2020 \
  --esModuleInterop \
  --skipLibCheck \
  lib/infrastructure/images/image-storage-provider.ts \
  lib/infrastructure/images/local-file-storage-provider.ts \
  lib/infrastructure/images/storage-factory.ts \
  lib/infrastructure/images/image-service.ts \
  scripts/phase0-image-service.test.ts >/tmp/phase0-tests-compile.log

node --test "$TMP_OUT/scripts/phase0-image-service.test.js"
