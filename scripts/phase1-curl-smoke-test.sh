#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
USERNAME="${USERNAME:-alice}"
PASSWORD="${PASSWORD:-Password123!}"
IMG1="${IMG1:-}"
IMG2="${IMG2:-}"
IMG3="${IMG3:-}"
GENERATED_IMG_DIR=""

COOKIE_JAR="$(mktemp /tmp/recetas-cookies.XXXXXX)"
TMP_DIR="$(mktemp -d /tmp/recetas-phase1.XXXXXX)"
trap 'rm -f "$COOKIE_JAR"; rm -rf "$TMP_DIR"; [[ -n "$GENERATED_IMG_DIR" ]] && rm -rf "$GENERATED_IMG_DIR"' EXIT

generate_sample_images() {
  GENERATED_IMG_DIR="$(mktemp -d /tmp/recetas-phase1-images.XXXXXX)"

  node -e '
    const sharp = require("sharp");
    const path = require("path");

    const outDir = process.argv[1];

    async function run() {
      await sharp({
        create: {
          width: 1400,
          height: 900,
          channels: 3,
          background: { r: 205, g: 120, b: 65 },
        },
      }).jpeg({ quality: 88 }).toFile(path.join(outDir, "sample-1.jpg"));

      await sharp({
        create: {
          width: 1280,
          height: 960,
          channels: 3,
          background: { r: 95, g: 140, b: 190 },
        },
      }).png().toFile(path.join(outDir, "sample-2.png"));

      await sharp({
        create: {
          width: 1200,
          height: 1200,
          channels: 3,
          background: { r: 120, g: 180, b: 110 },
        },
      }).webp({ quality: 85 }).toFile(path.join(outDir, "sample-3.webp"));
    }

    run().catch((error) => {
      console.error(error.message || error);
      process.exit(1);
    });
  ' "$GENERATED_IMG_DIR" || {
    echo "ERROR: failed to generate sample images automatically."
    echo "Install/enable sharp, or provide IMG1 IMG2 IMG3 paths manually."
    exit 1
  }

  IMG1="$GENERATED_IMG_DIR/sample-1.jpg"
  IMG2="$GENERATED_IMG_DIR/sample-2.png"
  IMG3="$GENERATED_IMG_DIR/sample-3.webp"
}

if [[ -z "$IMG1" || -z "$IMG2" || -z "$IMG3" ]]; then
  echo "IMG1/IMG2/IMG3 not provided. Generating sample images..."
  generate_sample_images
fi

for f in "$IMG1" "$IMG2" "$IMG3"; do
  if [[ ! -f "$f" ]]; then
    echo "ERROR: file not found: $f"
    exit 1
  fi
done

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
      if (cur == null || !(part in cur)) { process.exit(2); }
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
    if [[ -n "${LAST_RESPONSE_FILE:-}" && -f "${LAST_RESPONSE_FILE:-}" ]]; then
      echo "Response body:"
      cat "$LAST_RESPONSE_FILE"
      echo
    fi
    exit 1
  fi
  echo "PASS [$label]: HTTP $actual"
}

echo "== Phase 1 Curl Smoke Test =="
echo "BASE_URL=$BASE_URL"

# 1) Login
LOGIN_BODY="$TMP_DIR/login.json"
LOGIN_CODE="$(request POST "$BASE_URL/api/auth/login" "$LOGIN_BODY" \
  -c "$COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{\"username_or_email\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")"
expect_code "$LOGIN_CODE" "200" "login"

# 2) Create recipe with images
CREATE_BODY="$TMP_DIR/create.json"
CREATE_CODE="$(request POST "$BASE_URL/api/recipes" "$CREATE_BODY" \
  -b "$COOKIE_JAR" \
  -F "title=Phase1 Curl Recipe" \
  -F "description=Smoke test" \
  -F "stepsMarkdown=Step 1" \
  -F 'ingredients=[{"name":"Salt","qty":1,"unit":"tsp","notes":"","position":1}]' \
  -F "primaryImageIndex=0" \
  -F "images=@$IMG1;type=image/jpeg" \
  -F "images=@$IMG2;type=image/png")"
expect_code "$CREATE_CODE" "201" "create-with-images"

RECIPE_ID="$(json_field "$CREATE_BODY" "recipe.id")"
if [[ -z "$RECIPE_ID" ]]; then
  echo "FAIL [create-with-images]: recipe.id missing"
  exit 1
fi
echo "Created recipe id: $RECIPE_ID"

# 3) List recipes includePrimaryImage=true
LIST_BODY="$TMP_DIR/list.json"
LIST_CODE="$(request GET "$BASE_URL/api/recipes?includePrimaryImage=true" "$LIST_BODY")"
expect_code "$LIST_CODE" "200" "list-include-primary"

# 4) Get recipe include images + primary
GET_BODY="$TMP_DIR/get.json"
GET_CODE="$(request GET "$BASE_URL/api/recipes/$RECIPE_ID?includePrimaryImage=true&includeImages=true" "$GET_BODY")"
expect_code "$GET_CODE" "200" "get-include-images"

IMAGE_ID="$(json_field "$GET_BODY" "recipe.images.0.id")"
if [[ -z "$IMAGE_ID" ]]; then
  echo "FAIL [get-include-images]: recipe.images[0].id missing"
  exit 1
fi
echo "Primary candidate image id: $IMAGE_ID"

# 5) Update recipe with new image + set primaryImageId
UPDATE_BODY="$TMP_DIR/update.json"
UPDATE_CODE="$(request PUT "$BASE_URL/api/recipes/$RECIPE_ID" "$UPDATE_BODY" \
  -b "$COOKIE_JAR" \
  -F "title=Phase1 Curl Recipe Updated" \
  -F "description=Smoke test updated" \
  -F "stepsMarkdown=Step 1 updated" \
  -F 'ingredients=[{"name":"Salt","qty":2,"unit":"tsp","notes":"","position":1}]' \
  -F "primaryImageId=$IMAGE_ID" \
  -F "newImages=@$IMG3;type=image/webp")"
expect_code "$UPDATE_CODE" "200" "update-with-new-image"

# 6) Fetch full + thumb files
FULL_PATH="$TMP_DIR/full.jpg"
FULL_CODE="$(curl -sS -o "$FULL_PATH" -w "%{http_code}" "$BASE_URL/api/recipe-images/$IMAGE_ID/file?variant=full")"
expect_code "$FULL_CODE" "200" "fetch-full"

THUMB_PATH="$TMP_DIR/thumb.jpg"
THUMB_CODE="$(curl -sS -o "$THUMB_PATH" -w "%{http_code}" "$BASE_URL/api/recipe-images/$IMAGE_ID/file?variant=thumb")"
expect_code "$THUMB_CODE" "200" "fetch-thumb"

# 7) Unsupported type should fail with 400
BAD_FILE="$TMP_DIR/not-image.txt"
echo "not-an-image" > "$BAD_FILE"
BAD_BODY="$TMP_DIR/bad-type.json"
BAD_CODE="$(request POST "$BASE_URL/api/recipes" "$BAD_BODY" \
  -b "$COOKIE_JAR" \
  -F "title=Bad Type" \
  -F "description=Should fail" \
  -F "stepsMarkdown=Step 1" \
  -F 'ingredients=[{"name":"Salt","qty":1,"unit":"tsp","notes":"","position":1}]' \
  -F "images=@$BAD_FILE;type=text/plain")"
expect_code "$BAD_CODE" "400" "reject-unsupported-type"

# 8) Unauthorized update should fail with 401
UNAUTH_BODY="$TMP_DIR/unauth.json"
UNAUTH_CODE="$(request PUT "$BASE_URL/api/recipes/$RECIPE_ID" "$UNAUTH_BODY" \
  -H "Content-Type: application/json" \
  -d '{"title":"No Auth","description":"","stepsMarkdown":"Step","ingredients":[{"name":"Salt","qty":1,"unit":"tsp","notes":"","position":1}]}')"
expect_code "$UNAUTH_CODE" "401" "unauthorized-update"

echo
echo "All Phase 1 curl checks passed."
echo "Recipe created: $RECIPE_ID"
echo "Image checked: $IMAGE_ID"
