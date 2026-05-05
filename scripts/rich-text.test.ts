import assert from "node:assert/strict";
import test from "node:test";
import {
  applyRichTextMarkdownFormat,
  normalizeFormattedRecipeContent,
  normalizeRichTextMarkdown,
  sanitizeMarkdownLinkUrl,
} from "../lib/application/recipes/rich-text";

test("preserves plain text as markdown-compatible content", () => {
  assert.equal(normalizeRichTextMarkdown("  Simmer until tender.  "), "Simmer until tender.");
});

test("keeps existing markdown formatting compatible", () => {
  const content = "## Prep\n\n- Chop onions\n- **Toast** spices\n\n1. Simmer";

  assert.equal(normalizeRichTextMarkdown(content), content);
});

test("applies allowed rich text controls as deterministic markdown", () => {
  assert.equal(
    applyRichTextMarkdownFormat({
      content: "Toast spices",
      format: "bold",
      selectionStart: 0,
      selectionEnd: 5,
    }),
    "**Toast** spices",
  );
  assert.equal(
    applyRichTextMarkdownFormat({
      content: "Simmer gently",
      format: "italic",
      selectionStart: 7,
      selectionEnd: 13,
    }),
    "Simmer *gently*",
  );
  assert.equal(
    applyRichTextMarkdownFormat({
      content: "Prep",
      format: "heading",
      selectionStart: 0,
      selectionEnd: 4,
    }),
    "## Prep",
  );
  assert.equal(
    applyRichTextMarkdownFormat({
      content: "Chop onions\nToast spices",
      format: "bulleted-list",
      selectionStart: 0,
      selectionEnd: 24,
    }),
    "- Chop onions\n- Toast spices",
  );
});

test("sanitizes markdown link URLs before storage or rendering", () => {
  assert.equal(sanitizeMarkdownLinkUrl("https://example.com/recipe"), "https://example.com/recipe");
  assert.equal(sanitizeMarkdownLinkUrl("mailto:cook@example.com"), "mailto:cook@example.com");
  assert.equal(sanitizeMarkdownLinkUrl("javascript:alert(1)"), "");
  assert.equal(sanitizeMarkdownLinkUrl("data:text/html,boom"), "");

  assert.equal(
    applyRichTextMarkdownFormat({
      content: "Source",
      format: "link",
      linkUrl: "javascript:alert(1)",
      selectionStart: 0,
      selectionEnd: 6,
    }),
    "Source",
  );
});

test("normalizes empty public rendering input to null", () => {
  assert.equal(normalizeFormattedRecipeContent("   "), null);
  assert.equal(normalizeFormattedRecipeContent(null), null);
});

test("strips unsafe markdown links from public rendering input", () => {
  assert.equal(
    normalizeFormattedRecipeContent("Use [bad link](javascript:alert(1)) and [good](https://example.com)."),
    "Use bad link and [good](https://example.com).",
  );
});
