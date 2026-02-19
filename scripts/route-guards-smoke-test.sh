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
need_cmd jq

assert_redirect_to_login() {
  local path="$1"
  local headers_file
  headers_file=$(mktemp)

  local code
  code=$(curl -s -o /dev/null -D "$headers_file" -w "%{http_code}" "$BASE_URL$path")

  local location
  location=$(awk 'BEGIN {IGNORECASE=1} /^location:/ {print $2}' "$headers_file" | tr -d '\r' | tail -n 1)
  rm -f "$headers_file"

  case "$code" in
    302|303|307|308) ;;
    *)
      echo "Expected redirect status for $path, got $code"
      exit 1
      ;;
  esac

  if [[ "$location" != "/login" && "$location" != "$BASE_URL/login" && "$location" != *"/login"* ]]; then
    echo "Expected redirect location to /login for $path, got '${location}'"
    exit 1
  fi
}

assert_ok_with_cookie() {
  local cookie_jar="$1"
  local path="$2"
  local code
  code=$(curl -s -o /dev/null -b "$cookie_jar" -w "%{http_code}" "$BASE_URL$path")

  if [[ "$code" != "200" ]]; then
    echo "Expected 200 for $path with auth cookie, got $code"
    exit 1
  fi
}

assert_home_shows_auth_links() {
  local html
  html=$(curl -s "$BASE_URL/")

  if [[ "$html" != *"href=\"/register\""* || "$html" != *"href=\"/login\""* ]]; then
    echo "Expected unauthenticated home to show /register and /login links"
    exit 1
  fi

  if [[ "$html" == *"Signed in as"* ]]; then
    echo "Expected unauthenticated home to not show signed-in label"
    exit 1
  fi
}

assert_home_authenticated_header() {
  local cookie_jar="$1"
  local html
  html=$(curl -s -b "$cookie_jar" "$BASE_URL/")

  if [[ "$html" == *"href=\"/register\""* || "$html" == *"href=\"/login\""* ]]; then
    echo "Expected authenticated home to hide /register and /login links"
    exit 1
  fi

  if [[ "$html" != *"Logout"* ]]; then
    echo "Expected authenticated home to show Logout button"
    exit 1
  fi

  if [[ "$html" != *"Signed in as"* ]]; then
    echo "Expected authenticated home to show signed-in label"
    exit 1
  fi
}

echo "[1/10] Unauthenticated home shows Register/Login links"
assert_home_shows_auth_links

echo "[2/10] /api/auth/me returns 401 when unauthenticated"
ME_401_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/auth/me")
[[ "$ME_401_CODE" == "401" ]] || { echo "Expected 401 for unauthenticated /api/auth/me, got $ME_401_CODE"; exit 1; }

echo "[3/10] Get sample recipe id"
RECIPE_ID=$(curl -s "$BASE_URL/api/recipes" | jq -r '.recipes[0].id')
if [[ -z "$RECIPE_ID" || "$RECIPE_ID" == "null" ]]; then
  echo "Could not resolve recipe id"
  exit 1
fi

echo "[4/10] Unauthenticated users are redirected from protected pages"
assert_redirect_to_login "/recipes/new"
assert_redirect_to_login "/account/change-password"
assert_redirect_to_login "/recipes/$RECIPE_ID/edit"

echo "[5/10] Login as alice and capture cookie"
COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"alice\",\"password\":\"$ALICE_PASSWORD\"}")

if [[ "$LOGIN_CODE" != "200" ]]; then
  echo "Expected login 200, got $LOGIN_CODE"
  exit 1
fi

echo "[6/10] /api/auth/me returns current user for authenticated session"
ME_RESPONSE=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/auth/me")
ME_USERNAME=$(printf '%s' "$ME_RESPONSE" | jq -r '.user.username')
if [[ "$ME_USERNAME" != "alice" ]]; then
  echo "Expected /api/auth/me username alice, got $ME_USERNAME"
  exit 1
fi

echo "[7/10] Authenticated home hides Register/Login links and shows identity"
assert_home_authenticated_header "$COOKIE_JAR"

echo "[8/10] Authenticated user can open /recipes/new"
assert_ok_with_cookie "$COOKIE_JAR" "/recipes/new"

echo "[9/10] Authenticated user can open /account/change-password"
assert_ok_with_cookie "$COOKIE_JAR" "/account/change-password"

echo "[10/10] Authenticated user can open /recipes/{id}/edit"
assert_ok_with_cookie "$COOKIE_JAR" "/recipes/$RECIPE_ID/edit"

echo "Route guard smoke checks passed."
