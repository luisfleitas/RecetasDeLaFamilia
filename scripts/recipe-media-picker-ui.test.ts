import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { messages } from "../lib/i18n/messages";

const requiredRecipePickerMessageKeys = [
  "recipePhotosPickerTitle",
  "recipePhotosPickerEmptyHelp",
  "recipePhotosPickerSelectedHelp",
  "addPhotos",
  "addMorePhotos",
  "photoUploadLimits",
  "photoCount",
  "photoRemaining",
  "onePhotoHint",
] as const;

test("recipe media picker has localized copy for english and spanish", () => {
  for (const locale of ["en", "es"] as const) {
    const recipeMessages = messages[locale].recipe as Record<string, unknown>;

    for (const key of requiredRecipePickerMessageKeys) {
      assert.equal(typeof recipeMessages[key], "string", `${locale}.recipe.${key} is missing`);
      assert.notEqual(recipeMessages[key], "", `${locale}.recipe.${key} is empty`);
    }
  }
});

test("recipe media picker source keeps a hidden multiple file input and visible add controls", () => {
  const source = readFileSync("app/recipes/_components/recipe-media-section.tsx", "utf8");

  assert.match(source, /useRef<HTMLInputElement>/, "file input should be controlled by visible picker buttons");
  assert.match(source, /className="sr-only"/, "native file input should remain accessible but visually hidden");
  assert.match(source, /multiple/, "image input must still allow multiple files");
  assert.ok(source.includes("`${baseId}-images-add-button`"), "empty state needs a stable add button id");
  assert.ok(source.includes("`${baseId}-images-add-more-button`"), "selected state needs a stable add-more button id");
  assert.ok(source.includes("`${baseId}-recipe-image-add-tile`"), "preview grid needs a stable add-more tile id");
  assert.match(source, /event\.currentTarget\.value = ""/, "input value should reset so the same file can be selected again");
});
