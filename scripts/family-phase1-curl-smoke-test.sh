#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ALICE_USERNAME="${ALICE_USERNAME:-alice}"
ALICE_PASSWORD="${ALICE_PASSWORD:-Password123!}"
BOB_USERNAME="${BOB_USERNAME:-bob}"
BOB_PASSWORD="${BOB_PASSWORD:-Password123!}"

TMP_DIR="$(mktemp -d /tmp/recetas-family-phase1.XXXXXX)"
ALICE_COOKIE="$(mktemp /tmp/recetas-alice-cookie.XXXXXX)"
BOB_COOKIE="$(mktemp /tmp/recetas-bob-cookie.XXXXXX)"
trap 'rm -rf "$TMP_DIR"; rm -f "$ALICE_COOKIE" "$BOB_COOKIE"' EXIT

LAST_RESPONSE_FILE=""

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1"
    exit 1
  }
}

need_cmd curl
need_cmd node

request() {
  local method="$1"
  local url="$2"
  local body_file="$3"
  shift 3

  local headers_file="$TMP_DIR/headers.txt"
  local response_file="$TMP_DIR/response.json"

  local code
  code="$(curl -sS -X "$method" -D "$headers_file" -o "$response_file" -w "%{http_code}" "$url" "$@")"

  cp "$response_file" "$body_file"
  LAST_RESPONSE_FILE="$body_file"
  echo "$code"
}

json_field() {
  local file="$1"
  local path="$2"

  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const path = process.argv[2].split(".");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    let cur = data;
    for (const part of path) {
      if (cur == null || !(part in cur)) process.exit(2);
      cur = cur[part];
    }
    if (typeof cur === "object") console.log(JSON.stringify(cur));
    else console.log(String(cur));
  ' "$file" "$path"
}

expect_code() {
  local actual="$1"
  local expected="$2"
  local label="$3"

  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL [$label]: expected HTTP $expected, got $actual"
    if [[ -n "$LAST_RESPONSE_FILE" && -f "$LAST_RESPONSE_FILE" ]]; then
      echo "Response body:"
      cat "$LAST_RESPONSE_FILE"
      echo
    fi
    exit 1
  fi

  echo "PASS [$label]: HTTP $actual"
}

login_user() {
  local username="$1"
  local password="$2"
  local cookie_file="$3"
  local label="$4"
  local out="$TMP_DIR/login-$label.json"

  local code
  code="$(request POST "$BASE_URL/api/auth/login" "$out" \
    -c "$cookie_file" \
    -H "Content-Type: application/json" \
    -d "{\"username_or_email\":\"$username\",\"password\":\"$password\"}")"
  expect_code "$code" "200" "login-$label"
}

echo "== Family Phase 1 Curl Smoke Test =="
echo "BASE_URL=$BASE_URL"

# 1) Login both users
login_user "$ALICE_USERNAME" "$ALICE_PASSWORD" "$ALICE_COOKIE" "alice"
login_user "$BOB_USERNAME" "$BOB_PASSWORD" "$BOB_COOKIE" "bob"

# Resolve authenticated user ids
ALICE_ME_BODY="$TMP_DIR/alice-me.json"
ALICE_ME_CODE="$(request GET "$BASE_URL/api/auth/me" "$ALICE_ME_BODY" -b "$ALICE_COOKIE")"
expect_code "$ALICE_ME_CODE" "200" "alice-auth-me"
ALICE_USER_ID="$(json_field "$ALICE_ME_BODY" "user.user_id")"

BOB_ME_BODY="$TMP_DIR/bob-me.json"
BOB_ME_CODE="$(request GET "$BASE_URL/api/auth/me" "$BOB_ME_BODY" -b "$BOB_COOKIE")"
expect_code "$BOB_ME_CODE" "200" "bob-auth-me"
BOB_USER_ID="$(json_field "$BOB_ME_BODY" "user.user_id")"

# 2) Create family with description + pictureStorageKey
CREATE_FAMILY_BODY="$TMP_DIR/create-family.json"
CREATE_FAMILY_CODE="$(request POST "$BASE_URL/api/families" "$CREATE_FAMILY_BODY" \
  -b "$ALICE_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Family API Smoke","description":"Family description for curl smoke test","pictureStorageKey":"families/smoke/pic.jpg"}')"
expect_code "$CREATE_FAMILY_CODE" "201" "create-family"

FAMILY_ID="$(json_field "$CREATE_FAMILY_BODY" "family.id")"
if [[ -z "$FAMILY_ID" || "$FAMILY_ID" == "null" ]]; then
  echo "FAIL [create-family]: family.id missing"
  exit 1
fi
echo "Created family id: $FAMILY_ID"

# 3) List families for alice
LIST_FAMILIES_BODY="$TMP_DIR/list-families.json"
LIST_FAMILIES_CODE="$(request GET "$BASE_URL/api/families" "$LIST_FAMILIES_BODY" -b "$ALICE_COOKIE")"
expect_code "$LIST_FAMILIES_CODE" "200" "list-families"

# 4) Update family metadata (name, description, picture)
PATCH_FAMILY_BODY="$TMP_DIR/patch-family.json"
PATCH_FAMILY_CODE="$(request PATCH "$BASE_URL/api/families/$FAMILY_ID" "$PATCH_FAMILY_BODY" \
  -b "$ALICE_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name":"Family API Smoke Updated","description":"Updated family description","pictureStorageKey":"families/smoke/pic-updated.jpg"}')"
expect_code "$PATCH_FAMILY_CODE" "200" "patch-family"

# 5) Create invite link as alice
CREATE_INVITE_BODY="$TMP_DIR/create-invite.json"
CREATE_INVITE_CODE="$(request POST "$BASE_URL/api/families/$FAMILY_ID/invite-links" "$CREATE_INVITE_BODY" -b "$ALICE_COOKIE")"
expect_code "$CREATE_INVITE_CODE" "201" "create-invite-link"

INVITE_ID="$(json_field "$CREATE_INVITE_BODY" "invite.id")"
INVITE_URL="$(json_field "$CREATE_INVITE_BODY" "invite.inviteUrl")"
TOKEN="${INVITE_URL##*/}"
if [[ -z "$TOKEN" || "$TOKEN" == "$INVITE_URL" ]]; then
  echo "FAIL [create-invite-link]: could not parse token from invite URL"
  exit 1
fi
echo "Invite id: $INVITE_ID"

# 6) List invite links
LIST_INVITES_BODY="$TMP_DIR/list-invites.json"
LIST_INVITES_CODE="$(request GET "$BASE_URL/api/families/$FAMILY_ID/invite-links" "$LIST_INVITES_BODY" -b "$ALICE_COOKIE")"
expect_code "$LIST_INVITES_CODE" "200" "list-invite-links"

# 7) Bob resolves invite (creates pending claim/decision)
GET_INVITE_BOB_BODY="$TMP_DIR/get-invite-bob.json"
GET_INVITE_BOB_CODE="$(request GET "$BASE_URL/api/family-invites/$TOKEN" "$GET_INVITE_BOB_BODY" -b "$BOB_COOKIE")"
expect_code "$GET_INVITE_BOB_CODE" "200" "bob-open-invite"

# 8) Pending invites for bob should include the invite
PENDING_BOB_BODY="$TMP_DIR/pending-bob.json"
PENDING_BOB_CODE="$(request GET "$BASE_URL/api/me/family-invites?status=pending" "$PENDING_BOB_BODY" -b "$BOB_COOKIE")"
expect_code "$PENDING_BOB_CODE" "200" "bob-pending-invites"

# 9) Bob decline + undo + accept
DECLINE_BOB_BODY="$TMP_DIR/decline-bob.json"
DECLINE_BOB_CODE="$(request POST "$BASE_URL/api/family-invites/$TOKEN/decline" "$DECLINE_BOB_BODY" -b "$BOB_COOKIE")"
expect_code "$DECLINE_BOB_CODE" "200" "bob-decline-invite"

UNDO_BOB_BODY="$TMP_DIR/undo-bob.json"
UNDO_BOB_CODE="$(request POST "$BASE_URL/api/family-invites/$TOKEN/undo-decline" "$UNDO_BOB_BODY" -b "$BOB_COOKIE")"
expect_code "$UNDO_BOB_CODE" "200" "bob-undo-decline"

ACCEPT_BOB_BODY="$TMP_DIR/accept-bob.json"
ACCEPT_BOB_CODE="$(request POST "$BASE_URL/api/family-invites/$TOKEN/accept" "$ACCEPT_BOB_BODY" -b "$BOB_COOKIE")"
expect_code "$ACCEPT_BOB_CODE" "200" "bob-accept-invite"

# 10) Accept again should be idempotent already-member
ACCEPT_BOB_AGAIN_BODY="$TMP_DIR/accept-bob-again.json"
ACCEPT_BOB_AGAIN_CODE="$(request POST "$BASE_URL/api/family-invites/$TOKEN/accept" "$ACCEPT_BOB_AGAIN_BODY" -b "$BOB_COOKIE")"
expect_code "$ACCEPT_BOB_AGAIN_CODE" "200" "bob-accept-again"

ALREADY_MEMBER_CODE="$(json_field "$ACCEPT_BOB_AGAIN_BODY" "code" || true)"
if [[ "$ALREADY_MEMBER_CODE" != "ALREADY_MEMBER" ]]; then
  echo "FAIL [bob-accept-again]: expected response code ALREADY_MEMBER"
  cat "$ACCEPT_BOB_AGAIN_BODY"
  exit 1
fi
echo "PASS [bob-accept-again]: ALREADY_MEMBER"

# 11) Admin role changes: promote and demote bob
PROMOTE_BOB_BODY="$TMP_DIR/promote-bob.json"
PROMOTE_BOB_CODE="$(request PATCH "$BASE_URL/api/families/$FAMILY_ID/members/$BOB_USER_ID" "$PROMOTE_BOB_BODY" \
  -b "$ALICE_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}')"
expect_code "$PROMOTE_BOB_CODE" "200" "promote-bob"

DEMOTE_BOB_BODY="$TMP_DIR/demote-bob.json"
DEMOTE_BOB_CODE="$(request PATCH "$BASE_URL/api/families/$FAMILY_ID/members/$BOB_USER_ID" "$DEMOTE_BOB_BODY" \
  -b "$ALICE_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"role":"member"}')"
expect_code "$DEMOTE_BOB_CODE" "200" "demote-bob"

# 12) Remove bob as member
REMOVE_BOB_BODY="$TMP_DIR/remove-bob.json"
REMOVE_BOB_CODE="$(request DELETE "$BASE_URL/api/families/$FAMILY_ID/members/$BOB_USER_ID" "$REMOVE_BOB_BODY" -b "$ALICE_COOKIE")"
expect_code "$REMOVE_BOB_CODE" "200" "remove-bob"

# 13) Revoke invite idempotency check (first and second revoke)
REVOKE_INVITE_BODY="$TMP_DIR/revoke-invite.json"
REVOKE_INVITE_CODE="$(request DELETE "$BASE_URL/api/families/$FAMILY_ID/invite-links/$INVITE_ID" "$REVOKE_INVITE_BODY" -b "$ALICE_COOKIE")"
expect_code "$REVOKE_INVITE_CODE" "200" "revoke-invite"

REVOKE_INVITE_AGAIN_BODY="$TMP_DIR/revoke-invite-again.json"
REVOKE_INVITE_AGAIN_CODE="$(request DELETE "$BASE_URL/api/families/$FAMILY_ID/invite-links/$INVITE_ID" "$REVOKE_INVITE_AGAIN_BODY" -b "$ALICE_COOKIE")"
expect_code "$REVOKE_INVITE_AGAIN_CODE" "200" "revoke-invite-idempotent"

# 14) Sole-member leave requires confirmDelete, then deletes family
LEAVE_NO_CONFIRM_BODY="$TMP_DIR/leave-no-confirm.json"
LEAVE_NO_CONFIRM_CODE="$(request POST "$BASE_URL/api/families/$FAMILY_ID/leave" "$LEAVE_NO_CONFIRM_BODY" \
  -b "$ALICE_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{}')"
expect_code "$LEAVE_NO_CONFIRM_CODE" "400" "leave-sole-member-without-confirm"

LEAVE_CONFIRM_BODY="$TMP_DIR/leave-confirm.json"
LEAVE_CONFIRM_CODE="$(request POST "$BASE_URL/api/families/$FAMILY_ID/leave" "$LEAVE_CONFIRM_BODY" \
  -b "$ALICE_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"confirmDelete":true}')"
expect_code "$LEAVE_CONFIRM_CODE" "200" "leave-sole-member-with-confirm"

# 15) Family should no longer be fetchable by alice
GET_DELETED_BODY="$TMP_DIR/get-deleted-family.json"
GET_DELETED_CODE="$(request GET "$BASE_URL/api/families/$FAMILY_ID" "$GET_DELETED_BODY" -b "$ALICE_COOKIE")"
expect_code "$GET_DELETED_CODE" "403" "deleted-family-not-accessible"

echo
echo "All Family Phase 1 curl checks passed."
echo "Family tested: $FAMILY_ID"
echo "Invite tested: $INVITE_ID"
