#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
VERCEL_DEPLOYMENT="${VERCEL_DEPLOYMENT:-}"
USERNAME="${USERNAME:-alice}"
PASSWORD="${PASSWORD:-Password123!}"
FAMILY_USERNAME="${FAMILY_USERNAME:-bob}"
FAMILY_PASSWORD="${FAMILY_PASSWORD:-Password123!}"
GENERATED_IMG_DIR=""

ALICE_COOKIE_JAR="$(mktemp /tmp/recetas-save-qa-alice-cookies.XXXXXX)"
BOB_COOKIE_JAR="$(mktemp /tmp/recetas-save-qa-bob-cookies.XXXXXX)"
TMP_DIR="$(mktemp -d /tmp/recetas-save-qa.XXXXXX)"
trap 'rm -f "$ALICE_COOKIE_JAR" "$BOB_COOKIE_JAR"; rm -rf "$TMP_DIR"; [[ -n "$GENERATED_IMG_DIR" ]] && rm -rf "$GENERATED_IMG_DIR"' EXIT

request_path() {
  local url="$1"

  if [[ -n "$VERCEL_DEPLOYMENT" && "$url" == "$BASE_URL"* ]]; then
    local path="${url#"$BASE_URL"}"
    [[ -n "$path" ]] || path="/"
    printf '%s' "$path"
    return
  fi

  printf '%s' "$url"
}

run_curl() {
  local url="$1"
  shift

  if [[ -n "$VERCEL_DEPLOYMENT" ]]; then
    npx --yes vercel@latest curl "$(request_path "$url")" --deployment "$VERCEL_DEPLOYMENT" -- "$@"
    return
  fi

  curl "$@" "$url"
}

generate_recipe_images() {
  GENERATED_IMG_DIR="$(mktemp -d /tmp/recetas-save-qa-images.XXXXXX)"

  node -e '
    const sharp = require("sharp");
    const path = require("path");

    const outDir = process.argv[1];

    const images = [
      ["create-plated.jpg", "Citrus pasta plated", "#d97843", "#f8e1b6"],
      ["create-prep.png", "Ingredient prep", "#477da8", "#d9eef8"],
      ["create-serving.webp", "Family serving", "#5d944f", "#e3f3d9"],
      ["edit-plated.jpg", "Edited roast plated", "#9b4d35", "#f3cfbd"],
      ["edit-prep.png", "Edited prep bowls", "#6b73b7", "#e1e4fb"],
      ["edit-serving.webp", "Edited table share", "#3f8c78", "#d7f1ea"],
    ];

    async function makeImage([filename, label, bg, accent]) {
      const svg = `
        <svg width="1400" height="900" xmlns="http://www.w3.org/2000/svg">
          <rect width="1400" height="900" fill="${bg}"/>
          <circle cx="1080" cy="230" r="210" fill="${accent}" opacity="0.95"/>
          <ellipse cx="610" cy="520" rx="360" ry="220" fill="#fff8ef" opacity="0.96"/>
          <ellipse cx="610" cy="520" rx="260" ry="150" fill="${accent}" opacity="0.82"/>
          <text x="90" y="145" font-family="Arial, sans-serif" font-size="70" font-weight="700" fill="#241711">${label}</text>
          <text x="95" y="230" font-family="Arial, sans-serif" font-size="38" fill="#fff8ef">Recetas save QA image</text>
        </svg>`;

      const image = sharp(Buffer.from(svg));
      const outputPath = path.join(outDir, filename);
      if (filename.endsWith(".jpg")) {
        await image.jpeg({ quality: 88 }).toFile(outputPath);
      } else if (filename.endsWith(".png")) {
        await image.png().toFile(outputPath);
      } else {
        await image.webp({ quality: 86 }).toFile(outputPath);
      }
    }

    Promise.all(images.map(makeImage)).catch((error) => {
      console.error(error.message || error);
      process.exit(1);
    });
  ' "$GENERATED_IMG_DIR"
}

request() {
  local method="$1"
  local url="$2"
  local body_file="$3"
  shift 3

  local headers_file="$TMP_DIR/headers.txt"
  local response_file="$TMP_DIR/response.json"
  local code

  code="$(run_curl "$url" -sS -X "$method" -D "$headers_file" -o "$response_file" -w "%{http_code}" "$@")"
  cp "$response_file" "$body_file"
  LAST_RESPONSE_FILE="$body_file"
  echo "$code"
}

fetch_file() {
  local url="$1"
  local output_path="$2"
  run_curl "$url" -sS -o "$output_path" -w "%{http_code}"
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

assert_json() {
  local file="$1"
  local label="$2"
  local script="$3"
  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const label = process.argv[2];
    const script = process.argv[3];
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const ok = Function("data", `return (${script});`)(data);
    if (!ok) {
      console.error(`FAIL [${label}]`);
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }
    console.log(`PASS [${label}]`);
  ' "$file" "$label" "$script"
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

find_family_id() {
  local families_file="$1"
  node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const family = data.families?.[0];
    if (!family?.id) process.exit(1);
    console.log(family.id);
  ' "$families_file"
}

find_recipe_in_list() {
  local list_file="$1"
  local recipe_id="$2"
  node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const recipeId = Number(process.argv[2]);
    const recipe = data.recipes?.find((item) => item.id === recipeId);
    if (!recipe) process.exit(1);
    console.log(JSON.stringify(recipe));
  ' "$list_file" "$recipe_id"
}

echo "== Recipe Save QA Smoke Test =="
echo "BASE_URL=$BASE_URL"
if [[ -n "$VERCEL_DEPLOYMENT" ]]; then
  echo "VERCEL_DEPLOYMENT=$VERCEL_DEPLOYMENT"
fi

generate_recipe_images
CREATE_IMG1="$GENERATED_IMG_DIR/create-plated.jpg"
CREATE_IMG2="$GENERATED_IMG_DIR/create-prep.png"
CREATE_IMG3="$GENERATED_IMG_DIR/create-serving.webp"
EDIT_IMG1="$GENERATED_IMG_DIR/edit-plated.jpg"
EDIT_IMG2="$GENERATED_IMG_DIR/edit-prep.png"
EDIT_IMG3="$GENERATED_IMG_DIR/edit-serving.webp"

ALICE_LOGIN="$TMP_DIR/alice-login.json"
ALICE_LOGIN_CODE="$(request POST "$BASE_URL/api/auth/login" "$ALICE_LOGIN" \
  -c "$ALICE_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{\"username_or_email\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")"
expect_code "$ALICE_LOGIN_CODE" "200" "alice-login"

BOB_LOGIN="$TMP_DIR/bob-login.json"
BOB_LOGIN_CODE="$(request POST "$BASE_URL/api/auth/login" "$BOB_LOGIN" \
  -c "$BOB_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{\"username_or_email\":\"$FAMILY_USERNAME\",\"password\":\"$FAMILY_PASSWORD\"}")"
expect_code "$BOB_LOGIN_CODE" "200" "bob-login"

FAMILIES_BODY="$TMP_DIR/families.json"
FAMILIES_CODE="$(request GET "$BASE_URL/api/families" "$FAMILIES_BODY" -b "$ALICE_COOKIE_JAR")"
expect_code "$FAMILIES_CODE" "200" "list-families"
FAMILY_ID="$(find_family_id "$FAMILIES_BODY")"
echo "Using family id: $FAMILY_ID"

CREATE_BODY="$TMP_DIR/create.json"
CREATE_CODE="$(request POST "$BASE_URL/api/recipes" "$CREATE_BODY" \
  -b "$ALICE_COOKIE_JAR" \
  -F "title=Recipe Save QA Citrus Pasta" \
  -F "description=Create flow description saved locally" \
  -F "stepsMarkdown=1. Boil pasta\n2. Toss with citrus sauce\n3. Serve warm" \
  -F "language=en" \
  -F "visibility=public" \
  -F 'ingredients=[{"name":"Pasta","qty":12,"unit":"oz","notes":"dry","position":1}]' \
  -F "primaryImageIndex=1" \
  -F "images=@$CREATE_IMG1;type=image/jpeg" \
  -F "images=@$CREATE_IMG2;type=image/png" \
  -F "images=@$CREATE_IMG3;type=image/webp")"
expect_code "$CREATE_CODE" "201" "create-public-with-three-images"
RECIPE_ID="$(json_field "$CREATE_BODY" "recipe.id")"
CREATE_PRIMARY_ID="$(json_field "$CREATE_BODY" "recipe.primaryImage.id")"
CREATE_SECOND_IMAGE_ID="$(json_field "$CREATE_BODY" "recipe.images.1.id")"
if [[ "$CREATE_PRIMARY_ID" != "$CREATE_SECOND_IMAGE_ID" ]]; then
  echo "FAIL [create-primary-image]: expected image 2 to be primary"
  exit 1
fi
echo "Created recipe id: $RECIPE_ID"

assert_json "$CREATE_BODY" "create-text-visibility-images" \
  'data.recipe.title === "Recipe Save QA Citrus Pasta" &&
   data.recipe.description === "Create flow description saved locally" &&
   data.recipe.stepsMarkdown.includes("Toss with citrus sauce") &&
   data.recipe.visibility === "public" &&
   data.recipe.images.length === 3'

ANON_PUBLIC_BODY="$TMP_DIR/anon-public-get.json"
ANON_PUBLIC_CODE="$(request GET "$BASE_URL/api/recipes/$RECIPE_ID?includePrimaryImage=true&includeImages=true" "$ANON_PUBLIC_BODY")"
expect_code "$ANON_PUBLIC_CODE" "200" "anonymous-can-read-public"

for index in 0 1 2; do
  image_id="$(json_field "$CREATE_BODY" "recipe.images.$index.id")"
  FULL_CODE="$(fetch_file "$BASE_URL/api/recipe-images/$image_id/file?variant=full" "$TMP_DIR/create-$image_id-full.jpg")"
  expect_code "$FULL_CODE" "200" "create-image-$index-full"
  THUMB_CODE="$(fetch_file "$BASE_URL/api/recipe-images/$image_id/file?variant=thumb" "$TMP_DIR/create-$image_id-thumb.jpg")"
  expect_code "$THUMB_CODE" "200" "create-image-$index-thumb"
done

LIST_AFTER_CREATE="$TMP_DIR/list-after-create.json"
LIST_AFTER_CREATE_CODE="$(request GET "$BASE_URL/api/recipes?includePrimaryImage=true&includeImages=true" "$LIST_AFTER_CREATE" -b "$ALICE_COOKIE_JAR")"
expect_code "$LIST_AFTER_CREATE_CODE" "200" "list-carousel-after-create"
LIST_RECIPE_JSON="$(find_recipe_in_list "$LIST_AFTER_CREATE" "$RECIPE_ID")"
echo "$LIST_RECIPE_JSON" > "$TMP_DIR/list-recipe-after-create.json"
assert_json "$TMP_DIR/list-recipe-after-create.json" "carousel-data-after-create" \
  'data.visibility === "public" && data.images.length === 3 && data.primaryImage.id === data.images[1].id'

UPDATE_FAMILY_BODY="$TMP_DIR/update-family.json"
UPDATE_FAMILY_CODE="$(request PUT "$BASE_URL/api/recipes/$RECIPE_ID" "$UPDATE_FAMILY_BODY" \
  -b "$ALICE_COOKIE_JAR" \
  -F "title=Recipe Save QA Family Roast" \
  -F "description=Edit flow description saved locally" \
  -F "stepsMarkdown=1. Season roast\n2. Roast until tender\n3. Rest and slice" \
  -F "language=en" \
  -F "visibility=family" \
  -F "familyIds=$FAMILY_ID" \
  -F 'ingredients=[{"name":"Roast","qty":3,"unit":"lb","notes":"trimmed","position":1}]' \
  -F "primaryImageIndex=2" \
  -F "newImages=@$EDIT_IMG1;type=image/jpeg" \
  -F "newImages=@$EDIT_IMG2;type=image/png" \
  -F "newImages=@$EDIT_IMG3;type=image/webp")"
expect_code "$UPDATE_FAMILY_CODE" "200" "edit-to-family-with-three-new-images"
assert_json "$UPDATE_FAMILY_BODY" "family-edit-text-visibility-images" \
  'data.recipe.title === "Recipe Save QA Family Roast" &&
   data.recipe.description === "Edit flow description saved locally" &&
   data.recipe.stepsMarkdown.includes("Rest and slice") &&
   data.recipe.visibility === "family" &&
   data.recipe.families.some((family) => family.id > 0) &&
   data.recipe.images.length === 6 &&
   data.recipe.primaryImage.id === data.recipe.images[5].id'

BOB_FAMILY_BODY="$TMP_DIR/bob-family-get.json"
BOB_FAMILY_CODE="$(request GET "$BASE_URL/api/recipes/$RECIPE_ID?includePrimaryImage=true&includeImages=true" "$BOB_FAMILY_BODY" -b "$BOB_COOKIE_JAR")"
expect_code "$BOB_FAMILY_CODE" "200" "family-member-can-read-family-recipe"
assert_json "$BOB_FAMILY_BODY" "family-member-sees-updated-text-and-images" \
  'data.recipe.visibility === "family" && data.recipe.title === "Recipe Save QA Family Roast" && data.recipe.images.length === 6'

ANON_FAMILY_BODY="$TMP_DIR/anon-family-get.json"
ANON_FAMILY_CODE="$(request GET "$BASE_URL/api/recipes/$RECIPE_ID?includePrimaryImage=true&includeImages=true" "$ANON_FAMILY_BODY")"
expect_code "$ANON_FAMILY_CODE" "404" "anonymous-cannot-read-family"

LIST_AFTER_FAMILY="$TMP_DIR/list-after-family.json"
LIST_AFTER_FAMILY_CODE="$(request GET "$BASE_URL/api/recipes?includePrimaryImage=true&includeImages=true" "$LIST_AFTER_FAMILY" -b "$ALICE_COOKIE_JAR")"
expect_code "$LIST_AFTER_FAMILY_CODE" "200" "list-carousel-after-family-edit"
LIST_FAMILY_RECIPE_JSON="$(find_recipe_in_list "$LIST_AFTER_FAMILY" "$RECIPE_ID")"
echo "$LIST_FAMILY_RECIPE_JSON" > "$TMP_DIR/list-recipe-after-family.json"
assert_json "$TMP_DIR/list-recipe-after-family.json" "carousel-data-after-family-edit" \
  'data.visibility === "family" && data.images.length === 6 && data.primaryImage.id === data.images[5].id'

UPDATE_PRIVATE_BODY="$TMP_DIR/update-private.json"
UPDATE_PRIVATE_CODE="$(request PUT "$BASE_URL/api/recipes/$RECIPE_ID" "$UPDATE_PRIVATE_BODY" \
  -b "$ALICE_COOKIE_JAR" \
  -F "title=Recipe Save QA Private Notes" \
  -F "description=Private edit description saved locally" \
  -F "stepsMarkdown=1. Rewrite private prep\n2. Confirm owner-only notes" \
  -F "language=en" \
  -F "visibility=private" \
  -F 'ingredients=[{"name":"Private spice","qty":2,"unit":"tsp","notes":"owner only","position":1}]')"
expect_code "$UPDATE_PRIVATE_CODE" "200" "edit-to-private"
assert_json "$UPDATE_PRIVATE_BODY" "private-edit-text-visibility-family-cleared" \
  'data.recipe.title === "Recipe Save QA Private Notes" &&
   data.recipe.description === "Private edit description saved locally" &&
   data.recipe.stepsMarkdown.includes("owner-only") &&
   data.recipe.visibility === "private" &&
   data.recipe.families.length === 0 &&
   data.recipe.images.length === 6'

OWNER_PRIVATE_BODY="$TMP_DIR/owner-private-get.json"
OWNER_PRIVATE_CODE="$(request GET "$BASE_URL/api/recipes/$RECIPE_ID?includePrimaryImage=true&includeImages=true" "$OWNER_PRIVATE_BODY" -b "$ALICE_COOKIE_JAR")"
expect_code "$OWNER_PRIVATE_CODE" "200" "owner-can-read-private"
assert_json "$OWNER_PRIVATE_BODY" "owner-private-text-images" \
  'data.recipe.visibility === "private" && data.recipe.title === "Recipe Save QA Private Notes" && data.recipe.images.length === 6'

BOB_PRIVATE_BODY="$TMP_DIR/bob-private-get.json"
BOB_PRIVATE_CODE="$(request GET "$BASE_URL/api/recipes/$RECIPE_ID?includePrimaryImage=true&includeImages=true" "$BOB_PRIVATE_BODY" -b "$BOB_COOKIE_JAR")"
expect_code "$BOB_PRIVATE_CODE" "404" "family-member-cannot-read-private"

ANON_PRIVATE_BODY="$TMP_DIR/anon-private-get.json"
ANON_PRIVATE_CODE="$(request GET "$BASE_URL/api/recipes/$RECIPE_ID?includePrimaryImage=true&includeImages=true" "$ANON_PRIVATE_BODY")"
expect_code "$ANON_PRIVATE_CODE" "404" "anonymous-cannot-read-private"

echo
echo "All recipe save QA checks passed."
echo "Recipe created and edited: $RECIPE_ID"
echo "Generated image directory was: $GENERATED_IMG_DIR"
