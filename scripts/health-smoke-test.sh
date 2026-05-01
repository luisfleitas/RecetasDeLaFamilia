#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1"
    exit 1
  }
}

need_cmd curl
need_cmd jq

echo "[1/1] /api/health reports application, database, and Blob config checks"
RESPONSE_FILE=$(mktemp)
trap 'rm -f "$RESPONSE_FILE"' EXIT

CODE=$(curl -s -o "$RESPONSE_FILE" -w "%{http_code}" "$BASE_URL/api/health")

if [[ "$CODE" != "200" ]]; then
  echo "Expected 200 from /api/health, got $CODE"
  cat "$RESPONSE_FILE"
  exit 1
fi

STATUS=$(jq -r '.status' "$RESPONSE_FILE")
APP_STATUS=$(jq -r '.checks.app.status' "$RESPONSE_FILE")
DATABASE_STATUS=$(jq -r '.checks.database.status' "$RESPONSE_FILE")
BLOB_STATUS=$(jq -r '.checks.blob.status' "$RESPONSE_FILE")

if [[ "$STATUS" != "healthy" || "$APP_STATUS" != "healthy" || "$DATABASE_STATUS" != "healthy" ]]; then
  echo "Expected healthy app and database checks"
  cat "$RESPONSE_FILE"
  exit 1
fi

case "$BLOB_STATUS" in
  healthy|not_applicable) ;;
  *)
    echo "Expected Blob check to be healthy or not_applicable, got $BLOB_STATUS"
    cat "$RESPONSE_FILE"
    exit 1
    ;;
esac

if jq -e '.. | strings | select(test("TOKEN|SECRET|PASSWORD|vercel_blob_rw"; "i"))' "$RESPONSE_FILE" >/dev/null; then
  echo "Health response exposed secret-like content"
  cat "$RESPONSE_FILE"
  exit 1
fi

echo "Health smoke check passed."
