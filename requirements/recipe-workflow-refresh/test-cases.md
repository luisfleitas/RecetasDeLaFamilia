# Recipe Workflow Refresh Test Cases

## Purpose

Define the manual test cases that should be expanded and checked as each implementation slice lands. These cases cover both desktop and mobile unless a case states otherwise.

## Viewports

- Desktop: around 1440px wide.
- Mobile: around 390px wide.

## Cases

### TC-01: Landing App Chrome

**Goal:** Confirm the landing page adopts the approved app frame without becoming a marketing page.

**Steps:**
- Open `/`.
- Confirm the top bar shows the brand lockup on the left.
- Confirm language and account actions are grouped on the right.
- Confirm the compact left rail/drawer is available.
- Confirm recipe browsing remains the primary surface.
- Repeat at desktop and mobile widths.

**Expected:** The app frame matches the approved warm cream/orange direction, and the recipe browsing flow remains task-first.

### TC-02: Start Screen Manual Path

**Goal:** Confirm manual recipe creation starts from the unified Add Recipe workflow.

**Steps:**
- Open `/recipes/add`.
- Choose Start manually.
- Confirm the wizard advances to Recipe details.
- Confirm future unavailable steps are visible but disabled.

**Expected:** Manual path is `Start -> Recipe details`, preserves state, and does not create a saved draft recipe.

**Slice 1 Status:** Automated workflow-state coverage added; desktop/mobile manual smoke pending.

### TC-03: Start Screen Import Path

**Goal:** Confirm import recipe creation starts from the unified Add Recipe workflow.

**Steps:**
- Open `/recipes/add`.
- Choose Import recipe.
- Confirm the wizard advances to Import source.
- Confirm completed Start is clickable.

**Expected:** Import path is `Start -> Import source -> Recipe details`.

**Slice 1 Status:** Automated workflow-state coverage added for path selection and completed-step navigation; real import controls land in Slice 4.

### TC-04: Text Import Success

**Goal:** Confirm pasted recipe text hydrates the unsaved Recipe details form.

**Steps:**
- Open `/recipes/add`.
- Choose Import recipe.
- Select Paste text.
- Submit valid recipe text.

**Expected:** Import success appears, the workflow advances to Recipe details, and title, ingredients, description, steps, language, and source metadata hydrate without a browser redirect.

### TC-05: Document Import Success

**Goal:** Confirm document/PDF import follows the same unified success path.

**Steps:**
- Open `/recipes/add`.
- Choose Import recipe.
- Select Upload document/PDF.
- Submit a valid document.

**Expected:** Import success appears, the workflow advances to Recipe details, and the recipe remains unsaved until Create Recipe.

### TC-06: Handwritten Import Success

**Goal:** Confirm handwritten image import hydrates source pages and recipe details.

**Steps:**
- Open `/recipes/add`.
- Choose Import recipe.
- Select Upload handwritten images.
- Submit valid handwritten image files.

**Expected:** Import success appears, source pages are grouped under Imported source pages, and handwritten page order is preserved.

**Slice 6 Status:** Automated media grouping and source-primary payload coverage added; desktop/mobile manual smoke pending.

### TC-07: Import Failure

**Goal:** Confirm import errors stay on Import source and preserve input where practical.

**Steps:**
- Open `/recipes/add`.
- Choose Import recipe.
- Submit invalid text or an invalid file.

**Expected:** Error messaging appears on Import source, controls recover cleanly, and selected text/files are preserved where practical.

### TC-08: Recipe Details Validation

**Goal:** Confirm validation is clear and field-local.

**Steps:**
- Open `/recipes/add`.
- Choose Start manually.
- Submit Recipe details with required values missing.

**Expected:** Validation errors appear near relevant fields and the recipe is not created.

### TC-09: Ingredient Unit Autocomplete

**Goal:** Confirm units use canonical and local custom suggestions.

**Steps:**
- Add ingredients with canonical units.
- Type a custom unit.
- Add another ingredient and check suggestions.

**Expected:** Canonical suggestions appear, custom units from the current recipe appear, and custom units are not global.

### TC-10: Rich Text Description And Steps

**Goal:** Confirm rich text controls store v1-compatible content and the editor lets users review both markup/source and formatted preview before saving.

**Steps:**
- Open Add Recipe and reach Recipe details.
- Add formatted description and steps using bold, italic, underline, text size, lists, and link.
- Switch to the markup/source view and confirm the Markdown-compatible text is visible and editable.
- Switch to the formatted preview view and confirm the pretty version matches the recipe detail rendering style.
- Create or save the recipe.
- Open the public recipe page.

**Expected:** The editor provides clear markup/source and formatted preview modes, public page renders formatted content only, existing Markdown remains compatible, and no editor controls are exposed.

**Slice 5B Status:** Verified. The implementation keeps the custom Recetas-owned editor after the build-vs-existing-component comparison, preserves `description` and `stepsMarkdown` storage, and adds Source/Preview tabs for both fields.

### TC-11: Media Groups And Primary Recipe Image

**Goal:** Confirm normal recipe images remain grouped and selectable as primary.

**Steps:**
- Add recipe images in Recipe details.
- Reorder images.
- Select one recipe image as primary.
- Create the recipe.

**Expected:** Recipe images remain in the Recipe images group, order persists where supported, and the selected recipe image is primary.

**Slice 6 Status:** Automated grouped-media coverage added for recipe-image grouping and typed primary media refs; desktop/mobile manual smoke pending.

### TC-12: Source Image Primary

**Goal:** Confirm imported source pages can be primary without being copied.

**Steps:**
- Import a recipe with source pages.
- Select an imported source page as primary.
- Create the recipe.

**Expected:** The primary display references the source image, the source page remains in source-image storage, and it is not copied into Recipe images.

**Slice 6 Status:** Automated coverage confirms source-document primary selection uses `source-document:<id>` refs and source metadata, not copied recipe images. Browser smoke pending.

### TC-13: Public Gallery Grouped Media

**Goal:** Confirm public recipe detail shows grouped media.

**Steps:**
- Open a public recipe with recipe photos and imported source pages.

**Expected:** Gallery shows Recipe photos and Imported source pages groups with accessible thumbnails.

### TC-14: Landing Image Viewer From Featured Carousel And Cards

**Goal:** Confirm landing-page images open the reusable media modal while recipe navigation stays available through title/copy links.

**Steps:**
- Open `/`.
- Confirm the compact featured carousel appears above the recipe groups when visible recipes have media.
- Click a featured carousel image.
- Confirm the reusable media modal opens with all visible media for that recipe, including recipe photos and imported source pages.
- Close the modal.
- Find a recipe card with visible media/source pages.
- Click the recipe-card image.
- Confirm the reusable media modal opens for that recipe.
- Close the modal.
- Click the recipe title/copy link.
- Repeat at desktop and mobile widths.

**Expected:** Featured carousel images and recipe-card images open the media modal; recipe title/copy links still open recipe detail.

**Slice 8A Status:** Verified with desktop and 390px Playwright smoke on `http://127.0.0.1:3105/`.

### TC-15: Modal Carousel Controls

**Goal:** Confirm the reusable media modal supports expected controls.

**Steps:**
- Open the carousel from recipe detail or a home card.
- Use next, previous, close, Escape, ArrowLeft, and ArrowRight.

**Expected:** Controls work, focus behavior is accessible, and the modal closes cleanly.

### TC-16: Compatibility Routes

**Goal:** Confirm old direct routes remain functional during rollout.

**Steps:**
- Open `/recipes/new`.
- Open `/recipes/import`.
- Complete the existing happy-path behavior where practical.

**Expected:** Compatibility routes still work until unified flow verification is complete.

### TC-17: Edit Flow Shared Form Language

**Goal:** Confirm edit uses the shared Recipe details form language while preserving save semantics.

**Steps:**
- Open `/recipes/{id}/edit`.
- Edit basic info, sharing, ingredients, media, description, and steps.
- Save changes.

**Expected:** The form language matches create where practical, permissions remain intact, and the action is Save rather than Create Recipe.

### TC-18: Landing Featured Carousel No-Media State

**Goal:** Confirm the restored landing featured carousel does not render an empty or placeholder-only shell.

**Steps:**
- Open `/` with a dataset where visible recipes have no recipe photos or source-page media.
- Confirm the landing page still shows the app frame, greeting, left navigation, and recipe groups.
- Confirm no `home-featured-carousel` shell appears.
- Repeat at desktop and mobile widths.

**Expected:** The landing page remains task-first and usable, and the featured carousel is omitted when there is no real media to show.

**Slice 8A Status:** Automated no-media omission coverage is verified in `scripts/home-navigation-view-model.test.ts`; manual no-media dataset smoke remains pending.
