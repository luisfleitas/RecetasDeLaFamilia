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

echo "[1/7] Login as bob"
BOB_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"bob\",\"password\":\"$BOB_PASSWORD\"}" | jq -r '.access_token')

if [[ -z "$BOB_TOKEN" || "$BOB_TOKEN" == "null" ]]; then
  echo "Bob login failed"
  exit 1
fi

echo "[2/7] Create bob-owned recipe"
BOB_RECIPE_ID=$(curl -s -X POST "$BASE_URL/api/recipes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d '{"title":"Bob Smoke Recipe","description":"owned by bob","stepsMarkdown":"1. test","ingredients":[{"name":"salt","qty":1,"unit":"tsp","notes":"","position":1}]}' \
  | jq -r '.recipe.id')

if [[ -z "$BOB_RECIPE_ID" || "$BOB_RECIPE_ID" == "null" ]]; then
  echo "Failed to create bob recipe"
  exit 1
fi

echo "[3/7] Login as alice"
ALICE_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"alice\",\"password\":\"$ALICE_PASSWORD\"}" | jq -r '.access_token')

if [[ -z "$ALICE_TOKEN" || "$ALICE_TOKEN" == "null" ]]; then
  echo "Alice login failed"
  exit 1
fi

echo "[4/7] Assert public GET works without auth"
GET_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/recipes")
[[ "$GET_CODE" == "200" ]] || { echo "Expected 200 for GET /api/recipes, got $GET_CODE"; exit 1; }

echo "[5/7] Assert protected POST fails without auth"
POST401_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/recipes" \
  -H "Content-Type: application/json" \
  -d '{"title":"unauth","description":"x","stepsMarkdown":"1. x","ingredients":[{"name":"x","qty":1,"unit":"u","notes":"","position":1}]}')
[[ "$POST401_CODE" == "401" ]] || { echo "Expected 401 for unauth POST /api/recipes, got $POST401_CODE"; exit 1; }

echo "[6/7] Assert alice cannot edit bob recipe (403)"
PUT403_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/recipes/$BOB_RECIPE_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"title":"forbidden","description":"x","stepsMarkdown":"1. x","ingredients":[{"name":"x","qty":1,"unit":"u","notes":"","position":1}]}')
[[ "$PUT403_CODE" == "403" ]] || { echo "Expected 403 for alice editing bob recipe, got $PUT403_CODE"; exit 1; }

echo "[7/7] Assert alice cannot delete bob recipe (403)"
DEL403_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/recipes/$BOB_RECIPE_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN")
[[ "$DEL403_CODE" == "403" ]] || { echo "Expected 403 for alice deleting bob recipe, got $DEL403_CODE"; exit 1; }

echo "All smoke checks passed."
