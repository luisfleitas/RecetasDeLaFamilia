import assert from "node:assert/strict";
import { test } from "node:test";
import {
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
