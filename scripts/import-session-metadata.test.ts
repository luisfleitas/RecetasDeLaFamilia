import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseImportMetadataJson,
  parseImportSourceRefsJson,
  parseImportWarningsJson,
} from "../lib/application/recipes/import-session-metadata";

test("parseImportWarningsJson returns warnings from valid json", () => {
  const warnings = parseImportWarningsJson(
    JSON.stringify([{ code: "DESCRIPTION_MISSING", field: "description", message: "Missing" }]),
  );

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0]?.code, "DESCRIPTION_MISSING");
});

test("parseImportSourceRefsJson returns source refs from valid json", () => {
  const refs = parseImportSourceRefsJson(
    JSON.stringify([
      {
        sourceType: "pdf",
        originalFilename: "recipe.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1234,
      },
    ]),
  );

  assert.equal(refs.length, 1);
  assert.equal(refs[0]?.sourceType, "pdf");
  assert.equal(refs[0]?.originalFilename, "recipe.pdf");
});

test("parseImportMetadataJson returns handwritten metadata from valid json", () => {
  const metadata = parseImportMetadataJson(
    JSON.stringify({
      inputMode: "handwritten",
      warnings: [
        { code: "TITLE_MISSING", field: "title", message: "Missing title" },
      ],
      sourceRefs: [
        {
          sourceType: "image",
          originalFilename: "card-1.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 2048,
        },
      ],
      providerName: "rule-based",
      providerModel: null,
      promptVersion: "v1",
      handwritten: {
        imageCount: 2,
        pageOrder: ["card-1.jpg", "card-2.jpg"],
        ocrProviderUsed: "local",
        ocrProvidersByImage: ["local", "local"],
        sourceImageVisibility: "public",
        reviewHints: ["Review carefully before continuing."],
        combinedInUploadOrder: true,
      },
    }),
  );

  assert.equal(metadata?.inputMode, "handwritten");
  assert.equal(metadata?.warnings.length, 1);
  assert.equal(metadata?.sourceRefs.length, 1);
  assert.equal(metadata?.providerName, "rule-based");
  assert.equal(metadata?.handwritten?.imageCount, 2);
  assert.deepEqual(metadata?.handwritten?.pageOrder, ["card-1.jpg", "card-2.jpg"]);
  assert.equal(metadata?.handwritten?.sourceImageVisibility, "public");
  assert.deepEqual(metadata?.handwritten?.ocrProvidersByImage, ["local", "local"]);
});

test("parseImportMetadataJson defaults handwritten visibility to private for invalid values", () => {
  const metadata = parseImportMetadataJson(
    JSON.stringify({
      inputMode: "handwritten",
      handwritten: {
        imageCount: 1,
        pageOrder: ["card-1.jpg"],
        ocrProviderUsed: null,
        ocrProvidersByImage: [],
        sourceImageVisibility: "friends-only",
        reviewHints: [],
        combinedInUploadOrder: false,
      },
    }),
  );

  assert.equal(metadata?.handwritten?.sourceImageVisibility, "private");
  assert.equal(metadata?.handwritten?.combinedInUploadOrder, false);
});
