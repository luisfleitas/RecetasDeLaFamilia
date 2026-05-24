# Multi-Image Picker UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible native recipe image file input with a clear Recetas-styled picker that makes multi-image upload and add-more behavior obvious.

**Architecture:** Keep all upload state, validation, and persistence in the existing add/create/edit recipe containers. Update the shared `RecipeMediaSection` visual surface so all recipe detail flows get the same picker panel, preview grid, count, add-more affordance, and accessible hidden file input without changing API contracts.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript, Tailwind utility classes, Node test runner with `--experimental-strip-types`, existing Recetas i18n message bundle.

---

## Approved Design Input

- Wireframe: `requirements/image-upload/multi-image-picker-wireframe.html`
- User approval: wireframe direction approved in chat after browser review.
- Scope: recipe detail media picker only.
- Out of scope: API changes, storage changes, drag-and-drop, crop editor, upload progress per file, reordering images.

## File Responsibility Map

- Modify `app/recipes/_components/recipe-media-section.tsx`
  - Owns the shared visible media UI for add recipe, create recipe, and edit recipe forms.
  - Will hide the native file input visually, trigger it from Recetas-styled buttons, show empty/selected states, show all image cards, and add a persistent add-more tile.
- Modify `lib/i18n/messages.ts`
  - Adds English and Spanish UI copy for the picker title, helper text, add buttons, count label, remaining slots, limits, and one-photo hint.
- Create `scripts/recipe-media-picker-ui.test.ts`
  - Adds lightweight source and i18n contract coverage for the new UI affordances and stable IDs. This repo does not currently have a browser component test harness; source-level tests match existing script patterns that inspect files directly.
- Modify `package.json`
  - Adds a focused `test:recipe-media-picker` script so this UI contract can be rerun without the full build.
- No changes to `app/recipes/add/_components/add-recipe-details-screen.tsx`, `app/recipes/new/new-recipe-form.tsx`, or `app/recipes/[id]/edit/edit-recipe-form.tsx` unless implementation discovers that the file input needs an explicit disabled prop or panel-scoped error prop. Current validation and append behavior already lives in those containers.

## Implementation Precondition

- Work from a feature branch created from `pre-main`, for example:

```bash
git fetch origin
git switch pre-main
git pull --ff-only
git switch -c codex/feature/recipe-multi-image-picker
```

If execution starts from an isolated worktree, create or verify the worktree from `pre-main` before editing.

---

### Task 1: Add Picker Copy And I18n Contract Test

**Files:**
- Create: `scripts/recipe-media-picker-ui.test.ts`
- Modify: `lib/i18n/messages.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing i18n/source contract test**

Create `scripts/recipe-media-picker-ui.test.ts`:

```ts
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
```

- [ ] **Step 2: Add the focused test script**

Patch `package.json` scripts:

```json
"test:recipe-media-picker": "node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-picker-ui.test.ts"
```

Keep the existing script ordering stable and place this near the other `test:*` scripts.

- [ ] **Step 3: Run the focused test and confirm it fails**

Run:

```bash
npm run test:recipe-media-picker
```

Expected: FAIL because the new i18n keys and source affordances do not exist yet.

- [ ] **Step 4: Add English recipe messages**

In `lib/i18n/messages.ts`, add these keys to the English `recipe` object near the existing media/image copy:

```ts
recipePhotosPickerTitle: "Recipe photos",
recipePhotosPickerEmptyHelp: "Select multiple photos at once, or add more after the first photo.",
recipePhotosPickerSelectedHelp: "These photos will be saved with the recipe. Choose one primary photo.",
addPhotos: "Add photos",
addMorePhotos: "Add more photos",
photoUploadLimits: "JPEG, PNG, or WEBP. 4 MB per photo.",
photoCount: "{count} of {max} photos",
photoRemaining: "Up to {count} more.",
onePhotoHint: "You can add up to {count} more photos.",
```

- [ ] **Step 5: Add Spanish recipe messages**

In the Spanish `recipe` object, add the matching keys near the existing media/image copy:

```ts
recipePhotosPickerTitle: "Fotos de la receta",
recipePhotosPickerEmptyHelp: "Selecciona varias fotos a la vez o agrega más después de la primera foto.",
recipePhotosPickerSelectedHelp: "Estas fotos se guardarán con la receta. Elige una foto principal.",
addPhotos: "Agregar fotos",
addMorePhotos: "Agregar más fotos",
photoUploadLimits: "JPEG, PNG o WEBP. 4 MB por foto.",
photoCount: "{count} de {max} fotos",
photoRemaining: "Hasta {count} más.",
onePhotoHint: "Puedes agregar hasta {count} fotos más.",
```

- [ ] **Step 6: Run the focused test again**

Run:

```bash
npm run test:recipe-media-picker
```

Expected: still FAIL because `RecipeMediaSection` has not yet been updated.

- [ ] **Step 7: Commit Task 1**

Only commit if the branch is clean except for intended files from this task:

```bash
git add package.json lib/i18n/messages.ts scripts/recipe-media-picker-ui.test.ts
git commit -m "test: cover recipe media picker copy"
```

---

### Task 2: Replace Visible File Input With Picker Panel

**Files:**
- Modify: `app/recipes/_components/recipe-media-section.tsx`
- Test: `scripts/recipe-media-picker-ui.test.ts`

- [ ] **Step 1: Add the React ref import**

Change the top of `app/recipes/_components/recipe-media-section.tsx`:

```ts
"use client";

import { useRef } from "react";
import { buttonClassName } from "@/app/_components/ui/button-styles";
```

- [ ] **Step 2: Add derived picker state inside `RecipeMediaSection`**

Add after the `sourcePagesGroup` constant:

```ts
  const imageInputRef = useRef<HTMLInputElement>(null);
  const totalRecipeImageCount = existingImages.length + newImages.length;
  const remainingImageSlots = Math.max(maxImages - totalRecipeImageCount, 0);
  const hasRecipeImages = Boolean(recipeImagesGroup && recipeImagesGroup.items.length > 0);
  const imageCountLabel = messages.recipe.photoCount
    .replace("{count}", String(totalRecipeImageCount))
    .replace("{max}", String(maxImages));
  const remainingImageLabel = messages.recipe.photoRemaining.replace(
    "{count}",
    String(remainingImageSlots),
  );
  const onePhotoHint = messages.recipe.onePhotoHint.replace(
    "{count}",
    String(remainingImageSlots),
  );

  function openImagePicker() {
    imageInputRef.current?.click();
  }
```

- [ ] **Step 3: Replace the media count text**

Change the existing media count span body from:

```tsx
{existingImages.length + newImages.length}/{maxImages}
```

to:

```tsx
{imageCountLabel}
```

- [ ] **Step 4: Hide the native file input but keep it accessible**

Replace the current file input with:

```tsx
        <input
          id={`${baseId}-images-input`}
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-describedby={`${baseId}-images-input-help`}
          onChange={(event) => {
            onImageSelection(event.target.files);
            event.currentTarget.value = "";
          }}
          className="sr-only"
        />
```

This preserves browser file-picker semantics and allows selecting the same file again after removal.

- [ ] **Step 5: Add the visible picker panel above the recipe image group**

Insert this after the hidden input and before `<section id={`${baseId}-recipe-images-group`}>`:

```tsx
        <div
          id={`${baseId}-images-picker-panel`}
          className={`rounded-[var(--radius-sm)] border p-4 ${
            hasRecipeImages
              ? "border-[var(--color-border)] bg-[var(--color-surface-soft)]"
              : "border-dashed border-[var(--color-border)] bg-[var(--color-surface)]"
          }`}
        >
          <div
            id={`${baseId}-images-picker-main`}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div id={`${baseId}-images-picker-copy`} className="recipe-form-section-copy">
              <p id={`${baseId}-images-picker-title`} className="recipe-form-section-title">
                {messages.recipe.recipePhotosPickerTitle}
              </p>
              <p id={`${baseId}-images-picker-help`} className="recipe-form-section-description">
                {hasRecipeImages
                  ? messages.recipe.recipePhotosPickerSelectedHelp
                  : messages.recipe.recipePhotosPickerEmptyHelp}
              </p>
              <p id={`${baseId}-images-input-help`} className="text-xs text-[var(--color-text-muted)]">
                {messages.recipe.photoUploadLimits}
              </p>
            </div>

            <div id={`${baseId}-images-picker-actions`} className="flex flex-col gap-2 sm:items-end">
              <button
                id={hasRecipeImages ? `${baseId}-images-add-more-button` : `${baseId}-images-add-button`}
                type="button"
                onClick={openImagePicker}
                disabled={remainingImageSlots === 0}
                className={buttonClassName(hasRecipeImages ? "secondary" : "primary")}
              >
                {hasRecipeImages ? messages.recipe.addMorePhotos : messages.recipe.addPhotos}
              </button>
              {hasRecipeImages && remainingImageSlots > 0 ? (
                <span id={`${baseId}-images-remaining`} className="text-xs text-[var(--color-text-muted)]">
                  {remainingImageLabel}
                </span>
              ) : null}
            </div>
          </div>

          {totalRecipeImageCount === 1 && remainingImageSlots > 0 ? (
            <p
              id={`${baseId}-images-one-photo-hint`}
              className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-muted)]"
            >
              {onePhotoHint}
            </p>
          ) : null}
        </div>
```

- [ ] **Step 6: Keep the preview grid and add a visible add-more tile**

Inside the existing `recipeImagesGroup.items.length > 0` branch, keep the current image cards and append this `li` after the `.map(...)` block, before `</ul>`:

```tsx
              {remainingImageSlots > 0 ? (
                <li
                  id={`${baseId}-recipe-image-add-tile`}
                  className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-center"
                >
                  <button
                    id={`${baseId}-recipe-image-add-tile-button`}
                    type="button"
                    onClick={openImagePicker}
                    className={buttonClassName("secondary")}
                  >
                    {messages.recipe.addMorePhotos}
                  </button>
                  <span
                    id={`${baseId}-recipe-image-add-tile-remaining`}
                    className="text-xs text-[var(--color-text-muted)]"
                  >
                    {remainingImageLabel}
                  </span>
                </li>
              ) : null}
```

- [ ] **Step 7: Improve the empty image group copy**

Keep the empty image paragraph, but change the text to point back to the visible picker:

```tsx
{messages.recipe.recipePhotosPickerEmptyHelp}
```

This avoids the current weak empty state text after the picker panel already says what to do.

- [ ] **Step 8: Run the focused test**

Run:

```bash
npm run test:recipe-media-picker
```

Expected: PASS.

- [ ] **Step 9: Commit Task 2**

```bash
git add app/recipes/_components/recipe-media-section.tsx scripts/recipe-media-picker-ui.test.ts
git commit -m "feat: clarify recipe multi-image picker"
```

---

### Task 3: Verify Add, Create, And Edit Flow Coverage

**Files:**
- Review only unless issues are found:
  - `app/recipes/add/_components/add-recipe-details-screen.tsx`
  - `app/recipes/new/new-recipe-form.tsx`
  - `app/recipes/[id]/edit/edit-recipe-form.tsx`

- [ ] **Step 1: Confirm all three flows use the shared component**

Run:

```bash
rg -n "RecipeDetailsForm|RecipeMediaSection|onImageSelection" app/recipes/add/_components/add-recipe-details-screen.tsx app/recipes/new/new-recipe-form.tsx 'app/recipes/[id]/edit/edit-recipe-form.tsx' app/recipes/_components/recipe-details-form.tsx
```

Expected: all three recipe detail flows pass `onImageSelection` into `RecipeDetailsForm`, and `RecipeDetailsForm` renders `RecipeMediaSection` once.

- [ ] **Step 2: Confirm file validation remains container-owned**

Run:

```bash
rg -n "MAX_IMAGES|ALLOWED_MIME_TYPES|MAX_IMAGE_BYTES|setError\\(messages.recipe.errors" app/recipes/add/_components/add-recipe-details-screen.tsx app/recipes/new/new-recipe-form.tsx 'app/recipes/[id]/edit/edit-recipe-form.tsx'
```

Expected: validation remains in the containers. Do not duplicate type/size/count validation in `RecipeMediaSection`.

- [ ] **Step 3: Run existing draft and media grouping tests**

Run:

```bash
node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts scripts/recipe-media-groups.test.ts
```

Expected: PASS. These protect image draft upload mapping and media group construction.

- [ ] **Step 4: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3 if edits were needed**

If Step 1 or Step 2 revealed a needed add/create/edit flow adjustment, commit only those touched files:

```bash
git add app/recipes/add/_components/add-recipe-details-screen.tsx app/recipes/new/new-recipe-form.tsx 'app/recipes/[id]/edit/edit-recipe-form.tsx'
git commit -m "fix: keep recipe image picker wired across forms"
```

If no files changed in Task 3, do not create an empty commit.

---

### Task 4: Browser Smoke And Final Verification

**Files:**
- No planned edits.

- [ ] **Step 1: Start the local app**

Run:

```bash
npm run dev
```

Expected: Next.js starts successfully. Prefer the existing Recetas review port if one is already active; otherwise use the printed localhost URL.

- [ ] **Step 2: Smoke the add-recipe media section**

In the browser, open the add-recipe details flow that renders `RecipeMediaSection`.

Verify:
- Empty media section shows `0 of 8 photos`.
- Empty panel shows `Add photos`.
- Helper text says users can select multiple photos or add more after the first.
- Native file input is not the visible primary control.

- [ ] **Step 3: Smoke the one-image state**

Use the visible `Add photos` button to select one valid JPEG, PNG, or WEBP image.

Verify:
- Count changes to `1 of 8 photos`.
- The image preview card appears.
- The primary radio is selected when no imported source page is primary.
- `Add more photos` remains visible.
- The one-photo hint says `You can add up to 7 more photos.`

- [ ] **Step 4: Smoke the multi-image state**

Use `Add more photos` to add at least two more valid images.

Verify:
- Count changes to `3 of 8 photos`.
- All selected images show as separate preview cards.
- The add-more tile appears at the end of the grid.
- Remove works on a non-primary image.
- Changing the primary radio updates only the selected card.

- [ ] **Step 5: Smoke validation visibility**

Try selecting more than the remaining image slots.

Verify:
- Existing form-level error still appears with `You can upload up to 8 images.`
- Existing selected image cards remain visible.
- The picker still shows the add-more affordance when slots remain.

- [ ] **Step 6: Run final automated checks**

Run:

```bash
npm run test:recipe-media-picker
node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts scripts/recipe-media-groups.test.ts
npm run lint
npm run build
git diff --check
```

Expected: all pass.

- [ ] **Step 7: Update this plan with execution results**

Append a short completion note under this section with:
- commands run
- browser URL used
- manual smoke result
- any known issues

- [ ] **Step 8: Commit final verification note if the plan file changed**

```bash
git add requirements/image-upload/multi-image-picker-implementation-plan.md
git commit -m "docs: record recipe image picker verification"
```

**Execution Results:**

- Commands run:
  - `npm run test:recipe-media-picker`
  - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts scripts/recipe-media-groups.test.ts`
  - `npm run lint`
  - `npm run build`
  - `git diff --check`
- Browser URL used: `http://localhost:3107/recipes/new`
- Manual smoke result: passed with local auth cookie for seeded `alice`. Verified empty state (`0 of 8 photos`, `Add photos`, multi-image helper), one-image state (`1 of 8 photos`, preview card, primary radio, `Add more photos`, one-photo hint), multi-image state (`3 of 8 photos`, three preview cards, add-more tile), and too-many-images validation (`You can upload up to 8 images.` while preserving the existing three selected cards).
- Known issues:
  - `npx prisma migrate deploy --config prisma.config.ts` and `npx prisma db push --config prisma.config.ts` both failed in this worktree with a bare `Schema engine error`. For browser smoke only, the local SQLite DB was initialized by applying checked-in SQLite migration SQL with `better-sqlite3`, then running `env DATABASE_URL=file:./dev.db npx prisma db seed --config prisma.config.ts`.
  - `npm run lint` passed with existing warnings, including pre-existing `<img>` warnings in recipe media surfaces and unused-variable warnings in existing files.

---

## Acceptance Criteria

- The visible media picker states clearly that multiple photos can be selected.
- After one photo is selected, users still see an obvious `Add more photos` action.
- All selected recipe images render as preview cards in the recipe images grid.
- The image count uses a human-readable label such as `3 of 8 photos`.
- The native file input remains in the DOM, accepts JPEG/PNG/WEBP, supports `multiple`, and is accessible to screen readers.
- Add/create/edit recipe flows keep their current image validation and upload behavior.
- Existing imported source page behavior remains intact.
- Focused tests, draft/media grouping tests, lint, build, and browser smoke pass.

## Self-Review

- Spec coverage: covered empty, one-image, multi-image, remaining slots, previews, add-more action, primary selection, remove action, validation errors, desktop/mobile-friendly layout, and add/edit shared component reuse.
- Placeholder scan: no placeholder tasks remain.
- Type consistency: new i18n keys are listed once and reused consistently by the component plan and test plan.
