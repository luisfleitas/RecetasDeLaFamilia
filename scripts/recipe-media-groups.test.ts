import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecipeMediaGroups,
  buildRecipeMediaCarouselItems,
  buildSourceDocumentPrimaryMetadata,
  parseRecipeMediaReference,
  serializeRecipeMediaReference,
  type RecipeMediaReference,
} from "../lib/application/recipes/recipe-media-groups";

const recipeImage = {
  id: 11,
  label: "front.jpg",
  thumbnailUrl: "/api/recipe-images/11/file?variant=thumb",
  fullUrl: "/api/recipe-images/11/file?variant=full",
  isPrimary: false,
};

const publicSourcePage = {
  id: 41,
  originalFilename: "card-front.jpg",
  thumbnailUrl: "/api/recipes/7/source-documents/41/file",
  fullUrl: "/api/recipes/7/source-documents/41/file",
  publiclyVisible: true,
};

const privateSourcePage = {
  id: 42,
  originalFilename: "card-back.jpg",
  thumbnailUrl: "/api/recipes/7/source-documents/42/file",
  fullUrl: "/api/recipes/7/source-documents/42/file",
  publiclyVisible: false,
};

test("groups recipe images and imported source pages with stable item references", () => {
  const media = buildRecipeMediaGroups({
    recipeImages: [{ ...recipeImage, isPrimary: true }],
    sourceDocuments: [publicSourcePage],
  });

  assert.deepEqual(media.groups.map((group) => group.id), [
    "recipe-images",
    "imported-source-pages",
  ]);
  assert.deepEqual(media.groups[0]?.items.map((item) => item.mediaReference), [
    { type: "recipe-image", id: 11 },
  ]);
  assert.deepEqual(media.groups[1]?.items.map((item) => item.mediaReference), [
    { type: "source-document", id: 41 },
  ]);
  assert.deepEqual(media.primaryMediaReference, { type: "recipe-image", id: 11 });
});

test("uses a source document as primary without copying it into the recipe image group", () => {
  const primarySource: RecipeMediaReference = { type: "source-document", id: 41 };
  const media = buildRecipeMediaGroups({
    recipeImages: [recipeImage],
    sourceDocuments: [publicSourcePage],
    primaryMediaReference: primarySource,
  });

  assert.deepEqual(media.primaryMediaReference, primarySource);
  assert.equal(media.groups[0]?.items[0]?.isPrimary, false);
  assert.equal(media.groups[1]?.items[0]?.isPrimary, true);
});

test("keeps owner-private source pages available to the form while flagging their visibility", () => {
  const media = buildRecipeMediaGroups({
    recipeImages: [],
    sourceDocuments: [privateSourcePage],
  });

  assert.equal(media.groups[1]?.items[0]?.visibility, "private");
  assert.deepEqual(media.primaryMediaReference, { type: "source-document", id: 42 });
});

test("serializes primary media references without negative source-image ids", () => {
  assert.equal(
    serializeRecipeMediaReference({ type: "recipe-image", id: 11 }),
    "recipe-image:11",
  );
  assert.equal(
    serializeRecipeMediaReference({ type: "source-document", id: 41 }),
    "source-document:41",
  );
  assert.deepEqual(parseRecipeMediaReference("source-document:41"), {
    type: "source-document",
    id: 41,
  });
  assert.throws(() => parseRecipeMediaReference("source-document:-41"), /positive id/);
  assert.throws(() => parseRecipeMediaReference("-41"), /media reference/);
});

test("builds metadata that marks only the selected source document primary", () => {
  assert.deepEqual(
    buildSourceDocumentPrimaryMetadata({
      sourceDocumentId: 41,
      primaryMediaReference: { type: "source-document", id: 41 },
      publiclyVisible: true,
      sourceImageVisibility: "public",
    }),
    {
      inputMode: "handwritten",
      publiclyVisible: true,
      sourceImageVisibility: "public",
      isPrimary: true,
    },
  );
  assert.equal(
    buildSourceDocumentPrimaryMetadata({
      sourceDocumentId: 42,
      primaryMediaReference: { type: "recipe-image", id: 11 },
      publiclyVisible: false,
      sourceImageVisibility: "private",
    }).isPrimary,
    false,
  );
});

test("builds ordered carousel items for recipe images and source documents", () => {
  const media = buildRecipeMediaGroups({
    recipeImages: [recipeImage],
    sourceDocuments: [publicSourcePage],
    primaryMediaReference: { type: "source-document", id: 41 },
  });

  assert.deepEqual(buildRecipeMediaCarouselItems(media.groups), [
    {
      id: "recipe-image-11",
      type: "recipe-image",
      label: "front.jpg",
      thumbnailUrl: "/api/recipe-images/11/file?variant=thumb",
      fullUrl: "/api/recipe-images/11/file?variant=full",
      accessibleLabel: "Open recipe image front.jpg",
      isPrimary: false,
    },
    {
      id: "source-document-41",
      type: "source-document",
      label: "card-front.jpg",
      thumbnailUrl: "/api/recipes/7/source-documents/41/file",
      fullUrl: "/api/recipes/7/source-documents/41/file",
      accessibleLabel: "Open imported source page card-front.jpg",
      isPrimary: true,
    },
  ]);
});
