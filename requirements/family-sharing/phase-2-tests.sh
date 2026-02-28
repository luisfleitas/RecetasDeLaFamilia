#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ALICE_USERNAME="${ALICE_USERNAME:-alice}"
ALICE_PASSWORD="${ALICE_PASSWORD:-Password123!}"
BOB_USERNAME="${BOB_USERNAME:-bob}"
BOB_PASSWORD="${BOB_PASSWORD:-Password123!}"
CHARLIE_PASSWORD="${CHARLIE_PASSWORD:-Password123!}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1"; exit 1; }
}
need_cmd curl
need_cmd jq

TMP_DIR="$(mktemp -d /tmp/recetas-family-phase2.XXXXXX)"
ALICE_COOKIE="$(mktemp /tmp/recetas-alice-cookie.XXXXXX)"
BOB_COOKIE="$(mktemp /tmp/recetas-bob-cookie.XXXXXX)"
CHARLIE_COOKIE="$(mktemp /tmp/recetas-charlie-cookie.XXXXXX)"
trap 'rm -rf "$TMP_DIR"; rm -f "$ALICE_COOKIE" "$BOB_COOKIE" "$CHARLIE_COOKIE"' EXIT

request() {
  local method="$1"; local url="$2"; local body_file="$3"; shift 3
  local code
  code="$(curl -sS -X "$method" -o "$body_file" -w "%{http_code}" "$url" "$@")"
  echo "$code"
}

expect_code() {
  local got="$1"; local want="$2"; local label="$3"; local body_file="$4"
  if [[ "$got" != "$want" ]]; then
    echo "FAIL [$label]: expected $want, got $got"
    cat "$body_file"; echo
    exit 1
  fi
  echo "PASS [$label]: HTTP $got"
}

login_user() {
  local username="$1"; local password="$2"; local cookie_file="$3"; local label="$4"
  local out="$TMP_DIR/login-$label.json"
  local code
  code="$(request POST "$BASE_URL/api/auth/login" "$out" \
    -c "$cookie_file" -H "Content-Type: application/json" \
    -d "{\"username_or_email\":\"$username\",\"password\":\"$password\"}")"
  expect_code "$code" "200" "login-$label" "$out"
}

echo "== Phase 2 API Checklist =="

# 1) Login alice and bob
login_user "$ALICE_USERNAME" "$ALICE_PASSWORD" "$ALICE_COOKIE" "alice"
login_user "$BOB_USERNAME" "$BOB_PASSWORD" "$BOB_COOKIE" "bob"

# 2) Register charlie (non-member actor) and login
SUFFIX="$(date +%s)"
CHARLIE_USERNAME="phase2_charlie_${SUFFIX}"
CHARLIE_EMAIL="${CHARLIE_USERNAME}@example.com"
CHARLIE_REGISTER="$TMP_DIR/register-charlie.json"
CHARLIE_REGISTER_CODE="$(request POST "$BASE_URL/api/auth/register" "$CHARLIE_REGISTER" \
  -c "$CHARLIE_COOKIE" -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Charlie\",\"last_name\":\"Phase2\",\"email\":\"$CHARLIE_EMAIL\",\"username\":\"$CHARLIE_USERNAME\",\"password\":\"$CHARLIE_PASSWORD\"}")"
expect_code "$CHARLIE_REGISTER_CODE" "201" "register-charlie" "$CHARLIE_REGISTER"

# 3) Alice creates a family
CREATE_FAMILY="$TMP_DIR/create-family.json"
CREATE_FAMILY_CODE="$(request POST "$BASE_URL/api/families" "$CREATE_FAMILY" \
  -b "$ALICE_COOKIE" -H "Content-Type: application/json" \
  -d '{"name":"Phase2 Sharing Family","description":"family for phase2 checks"}')"
expect_code "$CREATE_FAMILY_CODE" "201" "create-family" "$CREATE_FAMILY"
FAMILY_ID="$(jq -r '.family.id' "$CREATE_FAMILY")"

# 4) Alice creates invite, bob accepts (bob becomes member)
CREATE_INVITE="$TMP_DIR/create-invite.json"
CREATE_INVITE_CODE="$(request POST "$BASE_URL/api/families/$FAMILY_ID/invite-links" "$CREATE_INVITE" -b "$ALICE_COOKIE")"
expect_code "$CREATE_INVITE_CODE" "201" "create-invite" "$CREATE_INVITE"
INVITE_URL="$(jq -r '.invite.inviteUrl' "$CREATE_INVITE")"
TOKEN="${INVITE_URL##*/}"

BOB_OPEN_INVITE="$TMP_DIR/bob-open-invite.json"
BOB_OPEN_INVITE_CODE="$(request GET "$BASE_URL/api/family-invites/$TOKEN" "$BOB_OPEN_INVITE" -b "$BOB_COOKIE")"
expect_code "$BOB_OPEN_INVITE_CODE" "200" "bob-open-invite" "$BOB_OPEN_INVITE"

BOB_ACCEPT="$TMP_DIR/bob-accept.json"
BOB_ACCEPT_CODE="$(request POST "$BASE_URL/api/family-invites/$TOKEN/accept" "$BOB_ACCEPT" -b "$BOB_COOKIE")"
expect_code "$BOB_ACCEPT_CODE" "200" "bob-accept-invite" "$BOB_ACCEPT"

# 5) Alice creates private recipe
CREATE_PRIVATE="$TMP_DIR/create-private.json"
CREATE_PRIVATE_CODE="$(request POST "$BASE_URL/api/recipes" "$CREATE_PRIVATE" \
  -b "$ALICE_COOKIE" -H "Content-Type: application/json" \
  -d '{"title":"Phase2 Private Recipe","description":"private","stepsMarkdown":"1. private","visibility":"private","familyIds":[],"ingredients":[{"name":"salt","qty":1,"unit":"tsp","notes":"","position":1}]}' )"
expect_code "$CREATE_PRIVATE_CODE" "201" "create-private-recipe" "$CREATE_PRIVATE"
PRIVATE_RECIPE_ID="$(jq -r '.recipe.id' "$CREATE_PRIVATE")"

# 6) Alice creates family recipe linked to the family
CREATE_FAMILY_RECIPE="$TMP_DIR/create-family-recipe.json"
CREATE_FAMILY_RECIPE_CODE="$(request POST "$BASE_URL/api/recipes" "$CREATE_FAMILY_RECIPE" \
  -b "$ALICE_COOKIE" -H "Content-Type: application/json" \
  -d "{\"title\":\"Phase2 Family Recipe\",\"description\":\"family\",\"stepsMarkdown\":\"1. family\",\"visibility\":\"family\",\"familyIds\":[${FAMILY_ID}],\"ingredients\":[{\"name\":\"pepper\",\"qty\":1,\"unit\":\"tsp\",\"notes\":\"\",\"position\":1}]}" )"
expect_code "$CREATE_FAMILY_RECIPE_CODE" "201" "create-family-recipe" "$CREATE_FAMILY_RECIPE"
FAMILY_RECIPE_ID="$(jq -r '.recipe.id' "$CREATE_FAMILY_RECIPE")"

# 7) Validation: family visibility requires familyIds
CREATE_BAD_EMPTY="$TMP_DIR/create-bad-empty-family-ids.json"
CREATE_BAD_EMPTY_CODE="$(request POST "$BASE_URL/api/recipes" "$CREATE_BAD_EMPTY" \
  -b "$ALICE_COOKIE" -H "Content-Type: application/json" \
  -d '{"title":"Bad Family Recipe","description":"bad","stepsMarkdown":"1. bad","visibility":"family","familyIds":[],"ingredients":[{"name":"salt","qty":1,"unit":"tsp","notes":"","position":1}]}' )"
expect_code "$CREATE_BAD_EMPTY_CODE" "400" "family-recipe-empty-familyIds" "$CREATE_BAD_EMPTY"

# 8) Validation: invalid visibility
CREATE_BAD_VIS="$TMP_DIR/create-bad-visibility.json"
CREATE_BAD_VIS_CODE="$(request POST "$BASE_URL/api/recipes" "$CREATE_BAD_VIS" \
  -b "$ALICE_COOKIE" -H "Content-Type: application/json" \
  -d '{"title":"Bad Visibility","description":"bad","stepsMarkdown":"1. bad","visibility":"org","familyIds":[],"ingredients":[{"name":"salt","qty":1,"unit":"tsp","notes":"","position":1}]}' )"
expect_code "$CREATE_BAD_VIS_CODE" "400" "invalid-visibility" "$CREATE_BAD_VIS"

# 9) Bob (member) list: sees family recipe, not private recipe
BOB_LIST="$TMP_DIR/bob-list.json"
BOB_LIST_CODE="$(request GET "$BASE_URL/api/recipes" "$BOB_LIST" -b "$BOB_COOKIE")"
expect_code "$BOB_LIST_CODE" "200" "bob-list" "$BOB_LIST"
jq -e --argjson familyId "$FAMILY_RECIPE_ID" '.recipes | any(.id == $familyId)' "$BOB_LIST" >/dev/null
jq -e --argjson privateId "$PRIVATE_RECIPE_ID" '.recipes | any(.id == $privateId) | not' "$BOB_LIST" >/dev/null
echo "PASS [bob-list-visibility-filter]"

# 10) Charlie (non-member) list: sees neither alice private nor alice family recipe
CHARLIE_LIST="$TMP_DIR/charlie-list.json"
CHARLIE_LIST_CODE="$(request GET "$BASE_URL/api/recipes" "$CHARLIE_LIST" -b "$CHARLIE_COOKIE")"
expect_code "$CHARLIE_LIST_CODE" "200" "charlie-list" "$CHARLIE_LIST"
jq -e --argjson familyId "$FAMILY_RECIPE_ID" '.recipes | any(.id == $familyId) | not' "$CHARLIE_LIST" >/dev/null
jq -e --argjson privateId "$PRIVATE_RECIPE_ID" '.recipes | any(.id == $privateId) | not' "$CHARLIE_LIST" >/dev/null
echo "PASS [charlie-list-visibility-filter]"

# 11) Bob detail: family=200, private=404
BOB_GET_FAMILY="$TMP_DIR/bob-get-family.json"
BOB_GET_FAMILY_CODE="$(request GET "$BASE_URL/api/recipes/$FAMILY_RECIPE_ID" "$BOB_GET_FAMILY" -b "$BOB_COOKIE")"
expect_code "$BOB_GET_FAMILY_CODE" "200" "bob-get-family-recipe" "$BOB_GET_FAMILY"

BOB_GET_PRIVATE="$TMP_DIR/bob-get-private.json"
BOB_GET_PRIVATE_CODE="$(request GET "$BASE_URL/api/recipes/$PRIVATE_RECIPE_ID" "$BOB_GET_PRIVATE" -b "$BOB_COOKIE")"
expect_code "$BOB_GET_PRIVATE_CODE" "404" "bob-get-private-recipe-denied" "$BOB_GET_PRIVATE"

# 12) Charlie detail: family=404, private=404
CHARLIE_GET_FAMILY="$TMP_DIR/charlie-get-family.json"
CHARLIE_GET_FAMILY_CODE="$(request GET "$BASE_URL/api/recipes/$FAMILY_RECIPE_ID" "$CHARLIE_GET_FAMILY" -b "$CHARLIE_COOKIE")"
expect_code "$CHARLIE_GET_FAMILY_CODE" "404" "charlie-get-family-recipe-denied" "$CHARLIE_GET_FAMILY"

CHARLIE_GET_PRIVATE="$TMP_DIR/charlie-get-private.json"
CHARLIE_GET_PRIVATE_CODE="$(request GET "$BASE_URL/api/recipes/$PRIVATE_RECIPE_ID" "$CHARLIE_GET_PRIVATE" -b "$CHARLIE_COOKIE")"
expect_code "$CHARLIE_GET_PRIVATE_CODE" "404" "charlie-get-private-recipe-denied" "$CHARLIE_GET_PRIVATE"

# 13) Owner-only update/delete unchanged
CHARLIE_PUT="$TMP_DIR/charlie-put.json"
CHARLIE_PUT_CODE="$(request PUT "$BASE_URL/api/recipes/$FAMILY_RECIPE_ID" "$CHARLIE_PUT" \
  -b "$CHARLIE_COOKIE" -H "Content-Type: application/json" \
  -d "{\"title\":\"should fail\",\"description\":\"x\",\"stepsMarkdown\":\"1. x\",\"visibility\":\"family\",\"familyIds\":[${FAMILY_ID}],\"ingredients\":[{\"name\":\"salt\",\"qty\":1,\"unit\":\"tsp\",\"notes\":\"\",\"position\":1}]}" )"
expect_code "$CHARLIE_PUT_CODE" "403" "non-owner-update-forbidden" "$CHARLIE_PUT"

CHARLIE_DELETE="$TMP_DIR/charlie-delete.json"
CHARLIE_DELETE_CODE="$(request DELETE "$BASE_URL/api/recipes/$FAMILY_RECIPE_ID" "$CHARLIE_DELETE" -b "$CHARLIE_COOKIE")"
expect_code "$CHARLIE_DELETE_CODE" "403" "non-owner-delete-forbidden" "$CHARLIE_DELETE"

# 14) Owner forbidden family link on update
ALICE_BAD_LINK="$TMP_DIR/alice-bad-family-link.json"
ALICE_BAD_LINK_CODE="$(request PUT "$BASE_URL/api/recipes/$PRIVATE_RECIPE_ID" "$ALICE_BAD_LINK" \
  -b "$ALICE_COOKIE" -H "Content-Type: application/json" \
  -d '{"title":"Private Recipe Updated","description":"x","stepsMarkdown":"1. x","visibility":"family","familyIds":[999999],"ingredients":[{"name":"salt","qty":1,"unit":"tsp","notes":"","position":1}]}' )"
expect_code "$ALICE_BAD_LINK_CODE" "403" "owner-invalid-family-link-forbidden" "$ALICE_BAD_LINK"

# 15) Switch family recipe -> private and verify bob loses access
ALICE_FAMILY_TO_PRIVATE="$TMP_DIR/alice-family-to-private.json"
ALICE_FAMILY_TO_PRIVATE_CODE="$(request PUT "$BASE_URL/api/recipes/$FAMILY_RECIPE_ID" "$ALICE_FAMILY_TO_PRIVATE" \
  -b "$ALICE_COOKIE" -H "Content-Type: application/json" \
  -d '{"title":"Phase2 Family Recipe Private","description":"now private","stepsMarkdown":"1. private now","visibility":"private","familyIds":[],"ingredients":[{"name":"pepper","qty":1,"unit":"tsp","notes":"","position":1}]}' )"
expect_code "$ALICE_FAMILY_TO_PRIVATE_CODE" "200" "owner-family-to-private" "$ALICE_FAMILY_TO_PRIVATE"

BOB_GET_AFTER_PRIVATE="$TMP_DIR/bob-get-after-private.json"
BOB_GET_AFTER_PRIVATE_CODE="$(request GET "$BASE_URL/api/recipes/$FAMILY_RECIPE_ID" "$BOB_GET_AFTER_PRIVATE" -b "$BOB_COOKIE")"
expect_code "$BOB_GET_AFTER_PRIVATE_CODE" "404" "member-loses-access-after-private" "$BOB_GET_AFTER_PRIVATE"

echo
echo "Phase 2 API checklist passed."