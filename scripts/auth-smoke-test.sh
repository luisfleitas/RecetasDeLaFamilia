#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ALICE_PASSWORD="${ALICE_PASSWORD:-Password123!}"
BOB_PASSWORD="${BOB_PASSWORD:-Password123!}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1"
    exit 1
  }
}

need_cmd curl
need_cmd jq

echo "[1/8] Register auto-login creates session cookie"
SUFFIX=$(date +%s)
REG_USERNAME="autouser_${SUFFIX}"
REG_EMAIL="${REG_USERNAME}@example.com"
REG_PASSWORD="Password123!"
REG_COOKIE_JAR=$(mktemp)

REGISTER_CODE=$(curl -s -o /dev/null -w "%{http_code}" -c "$REG_COOKIE_JAR" -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Auto\",\"last_name\":\"User\",\"email\":\"$REG_EMAIL\",\"username\":\"$REG_USERNAME\",\"password\":\"$REG_PASSWORD\"}")

if [[ "$REGISTER_CODE" != "201" ]]; then
  echo "Expected register 201, got $REGISTER_CODE"
  rm -f "$REG_COOKIE_JAR"
  exit 1
fi

CREATE_WITH_COOKIE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$REG_COOKIE_JAR" -X POST "$BASE_URL/api/recipes" \
  -H "Content-Type: application/json" \
  -d '{"title":"Auto-login recipe","description":"cookie-auth check","stepsMarkdown":"1. test","ingredients":[{"name":"salt","qty":1,"unit":"tsp","notes":"","position":1}]}' )

rm -f "$REG_COOKIE_JAR"

if [[ "$CREATE_WITH_COOKIE_CODE" != "201" ]]; then
  echo "Expected 201 creating recipe with register cookie, got $CREATE_WITH_COOKIE_CODE"
  exit 1
fi

echo "[2/8] Login as bob"
BOB_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"bob\",\"password\":\"$BOB_PASSWORD\"}" | jq -r '.access_token')

if [[ -z "$BOB_TOKEN" || "$BOB_TOKEN" == "null" ]]; then
  echo "Bob login failed"
  exit 1
fi

echo "[3/8] Create bob-owned recipe"
BOB_RECIPE_ID=$(curl -s -X POST "$BASE_URL/api/recipes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d '{"title":"Bob Smoke Recipe","description":"owned by bob","stepsMarkdown":"1. test","ingredients":[{"name":"salt","qty":1,"unit":"tsp","notes":"","position":1}]}' \
  | jq -r '.recipe.id')

if [[ -z "$BOB_RECIPE_ID" || "$BOB_RECIPE_ID" == "null" ]]; then
  echo "Failed to create bob recipe"
  exit 1
fi

echo "[4/11] Assert unauthenticated recipe detail hides Edit/Delete"
UNAUTH_HTML=$(curl -s "$BASE_URL/recipes/$BOB_RECIPE_ID")
if [[ "$UNAUTH_HTML" == *">Edit<"* || "$UNAUTH_HTML" == *">Delete<"* ]]; then
  echo "Expected recipe detail to hide Edit/Delete for unauthenticated user"
  exit 1
fi

echo "[5/11] Login as alice"
ALICE_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"alice\",\"password\":\"$ALICE_PASSWORD\"}" | jq -r '.access_token')

if [[ -z "$ALICE_TOKEN" || "$ALICE_TOKEN" == "null" ]]; then
  echo "Alice login failed"
  exit 1
fi

ALICE_COOKIE_JAR=$(mktemp)
ALICE_LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -c "$ALICE_COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"alice\",\"password\":\"$ALICE_PASSWORD\"}")
if [[ "$ALICE_LOGIN_CODE" != "200" ]]; then
  echo "Alice cookie login failed"
  rm -f "$ALICE_COOKIE_JAR"
  exit 1
fi

echo "[6/11] Assert non-owner recipe detail hides Edit/Delete"
ALICE_HTML=$(curl -s -b "$ALICE_COOKIE_JAR" "$BASE_URL/recipes/$BOB_RECIPE_ID")
rm -f "$ALICE_COOKIE_JAR"
if [[ "$ALICE_HTML" == *">Edit<"* || "$ALICE_HTML" == *">Delete<"* ]]; then
  echo "Expected recipe detail to hide Edit/Delete for non-owner"
  exit 1
fi

BOB_COOKIE_JAR=$(mktemp)
BOB_LOGIN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -c "$BOB_COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"bob\",\"password\":\"$BOB_PASSWORD\"}")
if [[ "$BOB_LOGIN_CODE" != "200" ]]; then
  echo "Bob cookie login failed"
  rm -f "$BOB_COOKIE_JAR"
  exit 1
fi

echo "[7/11] Assert owner recipe detail shows Edit/Delete"
BOB_HTML=$(curl -s -b "$BOB_COOKIE_JAR" "$BASE_URL/recipes/$BOB_RECIPE_ID")
rm -f "$BOB_COOKIE_JAR"
if [[ "$BOB_HTML" != *">Edit<"* || "$BOB_HTML" != *">Delete<"* ]]; then
  echo "Expected recipe detail to show Edit/Delete for owner"
  exit 1
fi

echo "[8/11] Assert public GET works without auth"
GET_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/recipes")
[[ "$GET_CODE" == "200" ]] || { echo "Expected 200 for GET /api/recipes, got $GET_CODE"; exit 1; }

echo "[9/11] Assert protected POST fails without auth"
POST401_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/recipes" \
  -H "Content-Type: application/json" \
  -d '{"title":"unauth","description":"x","stepsMarkdown":"1. x","ingredients":[{"name":"x","qty":1,"unit":"u","notes":"","position":1}]}')
[[ "$POST401_CODE" == "401" ]] || { echo "Expected 401 for unauth POST /api/recipes, got $POST401_CODE"; exit 1; }

echo "[10/11] Assert alice cannot edit bob recipe (403)"
PUT403_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/recipes/$BOB_RECIPE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"title":"forbidden","description":"x","stepsMarkdown":"1. x","ingredients":[{"name":"x","qty":1,"unit":"u","notes":"","position":1}]}')
[[ "$PUT403_CODE" == "403" ]] || { echo "Expected 403 for alice editing bob recipe, got $PUT403_CODE"; exit 1; }

echo "[11/11] Assert alice cannot delete bob recipe (403)"
DEL403_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/recipes/$BOB_RECIPE_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN")
[[ "$DEL403_CODE" == "403" ]] || { echo "Expected 403 for alice deleting bob recipe, got $DEL403_CODE"; exit 1; }

echo "All smoke checks passed."
