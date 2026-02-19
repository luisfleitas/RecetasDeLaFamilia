#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ALICE_PASSWORD="${ALICE_PASSWORD:-Password123!}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1"
    exit 1
  }
}

need_cmd curl

assert_redirect_login() {
  local cookie_jar="$1"
  local path="$2"
  local headers_file
  headers_file=$(mktemp)

  local code
  code=$(curl -s -o /dev/null -D "$headers_file" -b "$cookie_jar" -w "%{http_code}" "$BASE_URL$path")

  local location
  location=$(awk 'BEGIN {IGNORECASE=1} /^location:/ {print $2}' "$headers_file" | tr -d '\r' | tail -n 1)
  rm -f "$headers_file"

  case "$code" in
    302|303|307|308) ;;
    *)
      echo "Expected redirect status for $path after logout, got $code"
      exit 1
      ;;
  esac

  if [[ "$location" != "/login" && "$location" != "$BASE_URL/login" && "$location" != *"/login"* ]]; then
    echo "Expected redirect to /login for $path after logout, got '$location'"
    exit 1
  fi
}

echo "[1/4] Login and capture session cookie"
COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"alice\",\"password\":\"$ALICE_PASSWORD\"}")

[[ "$LOGIN_CODE" == "200" ]] || { echo "Expected 200 from login, got $LOGIN_CODE"; exit 1; }

echo "[2/4] Confirm protected page is accessible before logout"
BEFORE_CODE=$(curl -s -o /dev/null -b "$COOKIE_JAR" -w "%{http_code}" "$BASE_URL/recipes/new")
[[ "$BEFORE_CODE" == "200" ]] || { echo "Expected 200 for /recipes/new before logout, got $BEFORE_CODE"; exit 1; }

echo "[3/4] Logout clears session"
LOGOUT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/logout")
[[ "$LOGOUT_CODE" == "200" ]] || { echo "Expected 200 from logout, got $LOGOUT_CODE"; exit 1; }

echo "[4/4] Confirm protected access is revoked after logout"
assert_redirect_login "$COOKIE_JAR" "/recipes/new"

POST_AFTER_LOGOUT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -X POST "$BASE_URL/api/recipes" \
  -H "Content-Type: application/json" \
  -d '{"title":"after-logout","description":"x","stepsMarkdown":"1. x","ingredients":[{"name":"x","qty":1,"unit":"u","notes":"","position":1}]}')
[[ "$POST_AFTER_LOGOUT_CODE" == "401" ]] || { echo "Expected 401 for API mutation after logout, got $POST_AFTER_LOGOUT_CODE"; exit 1; }

echo "Logout smoke checks passed."
