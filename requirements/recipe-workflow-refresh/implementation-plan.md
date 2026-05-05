# Recipe Workflow Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` when splitting work across agents, or `superpowers:executing-plans` when executing inline. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved unified Add Recipe workflow while preserving existing recipe creation/import behavior and gradually moving mixed UI/business logic into focused application helpers and reusable components.

**Architecture:** Keep route files thin and introduce a small workflow shell at the Add Recipe entry point. Extract reusable form state, import orchestration, ingredient unit suggestions, rich text editing, grouped media, source-image display rules, and carousel behavior behind focused helpers/components so create, edit, public detail, and home cards can share the same rules without duplicating JSX-heavy logic.

**Tech Stack:** Next.js App Router, React client components, Prisma, existing Node test runner with `scripts/alias-loader.mjs`, existing image/import APIs, existing Recetas CSS variables and component conventions.

---

## Source Documents

- `requirements/recipe-workflow-refresh/requirements-brief.md`
- `requirements/recipe-workflow-refresh/branding-guidelines.md`
- `requirements/recipe-workflow-refresh/handoff.md`
- `requirements/home-navigation-refresh/branding-guidelines.md`
- `.superpowers/brainstorm/97016-1777911368/content/option-a-branded-guided-steps.html`

## Current Code Owners

- `app/page.tsx`: home/landing route and recipe card grouping.
- `app/_components/home-left-navigation.tsx`: compact rail and drawer.
- `lib/application/home-navigation/view-model.ts`: home navigation/sidebar model, currently `recipeCreateHref: "/recipes/new"`.
- `app/recipes/new/page.tsx`: authenticated manual create page.
- `app/recipes/new/new-recipe-form.tsx`: current manual create UI, import-session hydration, family loading, ingredient state, image state, submit behavior.
- `app/recipes/import/page.tsx`: authenticated import page and import config prop preparation.
- `app/recipes/import/import-recipe-form.tsx`: current import UI and parsing/session orchestration.
- `app/recipes/_components/ingredient-editor.tsx`: current ingredient row view.
- `app/recipes/[id]/page.tsx`: public recipe detail view and current Markdown rendering.
- `app/recipes/[id]/edit/page.tsx` and `app/recipes/[id]/edit/edit-recipe-form.tsx`: existing edit flow that should converge on the same form language later in the plan.
- `app/api/recipes/route.ts`: create API, import-session validation, image parsing, source-document promotion.
- `app/api/recipes/[id]/route.ts`: update API and visible source-image response behavior.
- `lib/application/recipes/use-cases.ts`: recipe create/update image persistence and primary-image rules.
- `lib/application/recipes/source-documents.ts`: source-document staging, import-session attachment, promotion, metadata, cleanup.
- `lib/application/recipes/display-source-images.ts`: current source-image visibility-to-display mapping.
- `lib/domain/recipe.ts` and `lib/domain/recipe-repository.ts`: recipe/media domain contracts.
- `lib/infrastructure/recipes/prisma-recipe-repository.ts`: Prisma repository mapping and image primary handling.
- `lib/i18n/messages.ts`: English/Spanish copy for new workflow, rich text toolbar, media groups, carousel, and validations.
- `app/globals.css`: shared recipe form, secondary menu, wizard, media, modal, and app-frame styling.

## Proposed New Files

- `requirements/recipe-workflow-refresh/qa-checklist.md`: living QA state tracker created before implementation and updated per slice.
- `requirements/recipe-workflow-refresh/test-cases.md`: desktop/mobile manual test cases created before implementation and expanded per slice.
- `app/recipes/add/page.tsx`: authenticated unified Add Recipe route. It prepares import config and renders the workflow shell.
- `app/recipes/add/add-recipe-workflow.tsx`: client workflow composition only; no business rules beyond event wiring.
- `app/recipes/add/_components/add-recipe-start-screen.tsx`: Start step choices.
- `app/recipes/add/_components/add-recipe-import-source-screen.tsx`: Import Source step composition.
- `app/recipes/add/_components/add-recipe-details-screen.tsx`: Recipe Details step composition.
- `app/recipes/add/_components/add-recipe-wizard-bar.tsx`: wizard progress view.
- `app/recipes/add/_components/add-recipe-start-over-dialog.tsx`: start-over confirmation.
- `lib/application/recipes/add-workflow-state.ts`: wizard path/state reducer, completed/future step rules, import success transition, start-over reset.
- `lib/application/recipes/recipe-details-draft.ts`: draft model, import-draft hydration, create/edit payload builders, local validation shape.
- `lib/application/recipes/ingredient-unit-suggestions.ts`: canonical unit suggestions and per-recipe custom-unit merging.
- `lib/application/recipes/recipe-media-groups.ts`: grouped media/source-image view models, primary selection model, public visibility defaults.
- `lib/application/recipes/rich-text.ts`: rich-text storage compatibility helpers and formatted-content normalization.
- `app/recipes/_components/recipe-details-form.tsx`: shared long-form view for create and later edit.
- `app/recipes/_components/recipe-media-section.tsx`: grouped recipe images and imported source pages.
- `app/recipes/_components/ingredient-unit-combobox.tsx`: unit autocomplete input.
- `app/recipes/_components/simple-rich-text-editor.tsx`: reusable toolbar and editor.
- `app/recipes/_components/formatted-recipe-content.tsx`: public rendering for stored formatted content with Markdown compatibility.
- `app/recipes/_components/recipe-media-carousel.tsx`: reusable modal carousel for recipe detail and home card media actions.
- `scripts/add-workflow-state.test.ts`: workflow reducer coverage.
- `scripts/ingredient-unit-suggestions.test.ts`: unit suggestion coverage.
- `scripts/recipe-details-draft.test.ts`: create payload and import hydration coverage.
- `scripts/recipe-media-groups.test.ts`: grouped media, source visibility, and primary selection coverage.
- `scripts/rich-text.test.ts`: rich-text compatibility coverage.

## Data And Compatibility Decisions

- Use `/recipes/add` as the new user-facing Add Recipe route. Keep `/recipes/new` and `/recipes/import` temporarily available as compatibility routes until the unified flow is verified.
- Update all navigation entry points to route to `/recipes/add` only after the route has passing smoke coverage.
- Keep v1 unsaved until Create Recipe. Do not add draft recipe rows.
- Preserve existing `description` and `stepsMarkdown` fields for v1 storage compatibility.
- Rich text v1 must round-trip through the current text fields as deterministic Markdown-compatible content. Do not persist sanitized HTML, structured JSON, or a new rich-text schema unless a separate migration decision is approved.
- The rich text editor may expose formatting controls, but the storage compatibility helper must normalize those controls into the approved Markdown-compatible subset and keep existing Markdown rendering compatible on public recipe pages.
- The unified import handoff uses the existing import-session seam. `/recipes/import` keeps redirecting to `/recipes/new?importSession=...`; `/recipes/add` receives the successful import session id, stores that id in workflow state, hydrates the recipe details draft through `recipe-details-draft.ts`, and advances to Recipe Details without a browser redirect.
- Import-session hydration must include imported title, ingredients, description, steps, language, and source media metadata, while keeping the recipe unsaved until Create Recipe.
- Use current `RecipeSourceDocument` rows for imported source pages. If source image primary selection cannot be represented safely with existing positive recipe image ids and negative source-image display ids, add an explicit domain-level primary media reference rather than overloading `primaryImageId`.
- Public recipes should make imported source images public by default from the unified Add Recipe flow. Existing import behavior can remain unchanged until routed through `/recipes/add`.
- Do not copy source images into `RecipeImage` storage when selected as primary.

## Implementation Slices

### Slice 0: QA Baseline And App Chrome Contract

**Files:**
- Create: `requirements/recipe-workflow-refresh/qa-checklist.md`
- Create: `requirements/recipe-workflow-refresh/test-cases.md`
- Modify: `requirements/recipe-workflow-refresh/handoff.md`

- [x] Create a QA checklist covering every state listed in the requirements brief before implementation starts.
- [x] Create baseline desktop and mobile test cases for Start, manual create, text import, document import, handwritten import, import failure, source-image primary, recipe-image primary, public gallery, home card carousel, edit flow, compatibility routes, and landing app chrome.
- [x] Record the app chrome contract for the landing page: top bar with brand lockup on the left, language/account actions grouped on the right, compact left rail/drawer, task-first recipe browsing preserved, and no marketing-page conversion.
- [x] Add implementation notes that landing desktop and mobile chrome must be verified alongside `/recipes/add`, not deferred to final cleanup.
- [x] Update `handoff.md` with the created QA docs and the next approved implementation action.

### Slice 1: Lock Add Recipe Routing And Workflow State

**Files:**
- Create: `lib/application/recipes/add-workflow-state.ts`
- Create: `scripts/add-workflow-state.test.ts`
- Create: `app/recipes/add/page.tsx`
- Create: `app/recipes/add/add-recipe-workflow.tsx`
- Create: `app/recipes/add/_components/add-recipe-wizard-bar.tsx`
- Create: `app/recipes/add/_components/add-recipe-start-screen.tsx`
- Modify: `lib/i18n/messages.ts`

- [x] Write reducer tests for manual path, import path, completed-step navigation, disabled future steps, import success auto-advance, and start-over reset.
- [x] Run `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/add-workflow-state.test.ts` and confirm the new tests fail because `add-workflow-state.ts` does not exist yet.
- [x] Implement `add-workflow-state.ts` with explicit types for `AddRecipePath`, `AddRecipeStep`, `AddWorkflowState`, and reducer events.
- [x] Run the same targeted test command and confirm it passes.
- [x] Add `/recipes/add` route and a thin client shell that renders Start, Wizard, and placeholder Recipe Details/Import Source panels.
- [x] Add stable ids: `add-recipe-workflow`, `add-recipe-wizard-bar`, `add-recipe-start-screen`, `add-recipe-import-choice`, `add-recipe-manual-choice`, `add-recipe-start-over`.
- [x] Run `npm run lint`.

### Slice 2: Extract Recipe Details Draft Logic From The Current Manual Form

**Files:**
- Create: `lib/application/recipes/recipe-details-draft.ts`
- Create: `scripts/recipe-details-draft.test.ts`
- Create: `app/recipes/_components/recipe-details-form.tsx`
- Modify: `app/recipes/new/new-recipe-form.tsx`
- Modify: `app/recipes/add/_components/add-recipe-details-screen.tsx`
- Modify: `lib/i18n/messages.ts`

- [x] Write tests for empty manual draft, import draft hydration, ingredient normalization, family visibility payload, image payload metadata, and validation errors.
- [x] Run `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts` and confirm the expected missing-module failure.
- [x] Move draft conversion helpers out of `new-recipe-form.tsx` into `recipe-details-draft.ts`.
- [x] Build `recipe-details-form.tsx` as a view component that receives draft state, callbacks, family options, validation errors, import-complete state, and media props.
- [x] Keep `new-recipe-form.tsx` working by composing the extracted helper and form view before wiring `/recipes/add` to it.
- [x] Wire `add-recipe-details-screen.tsx` to the shared form for the manual path.
- [x] Run the targeted draft test, `npm run test:phase1`, and `npm run lint`.

### Slice 3: Add Ingredient Unit Autocomplete

**Files:**
- Create: `lib/application/recipes/ingredient-unit-suggestions.ts`
- Create: `scripts/ingredient-unit-suggestions.test.ts`
- Create: `app/recipes/_components/ingredient-unit-combobox.tsx`
- Modify: `app/recipes/_components/ingredient-editor.tsx`
- Modify: `app/recipes/_components/recipe-details-form.tsx`
- Modify: `lib/i18n/messages.ts`

- [x] Write tests for canonical suggestions, deduping, case-insensitive matching, custom units from the current recipe only, and preserving typed custom values.
- [x] Run `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/ingredient-unit-suggestions.test.ts` and confirm the expected missing-module failure.
- [x] Implement the suggestion helper with the canonical list from `requirements/recipe-workflow-refresh/requirements-brief.md`.
- [x] Replace the unit `<input>` in `ingredient-editor.tsx` with `IngredientUnitCombobox` while preserving the existing row ids and labels.
- [x] Verify custom units never persist globally by keeping suggestions derived from the current ingredient draft array only.
- [x] Run the targeted suggestion test, `npm run test:phase1`, and `npm run lint`.

### Slice 4: Integrate Import Source Into The Unified Workflow

**Files:**
- Create: `app/recipes/add/_components/add-recipe-import-source-screen.tsx`
- Modify: `app/recipes/import/import-recipe-form.tsx`
- Modify: `app/recipes/add/add-recipe-workflow.tsx`
- Modify: `app/recipes/add/page.tsx`
- Modify: `app/globals.css`
- Modify: `lib/i18n/messages.ts`

- [x] Extract import option state and successful parse/session callbacks from `import-recipe-form.tsx` into props that can be reused by `/recipes/add`.
- [x] Keep `/recipes/import` functional by passing callbacks that preserve the old redirect to `/recipes/new?importSession=...`.
- [x] In `/recipes/add`, pass a success callback that receives the import session id, stores it in workflow state, hydrates the recipe details draft through the shared draft helper, and advances to Recipe Details without a redirect.
- [x] Cover import-session hydration tests for imported title, ingredients, description, steps, language, source media metadata, and import-complete state.
- [x] Set default source image visibility to public when the in-progress Add Recipe draft visibility is public.
- [x] Style the import option selector using the Visibility Type secondary-menu pattern: horizontal list, active bottom border, subtle hover lift, warm active state.
- [x] Add stable ids: `add-recipe-import-source-screen`, `add-recipe-import-mode-tabs`, `add-recipe-import-paste-tab`, `add-recipe-import-document-tab`, `add-recipe-import-handwritten-tab`, `add-recipe-import-processing`, `add-recipe-import-error`, `add-recipe-import-success`.
- [x] Run `npm run test:import`, the recipe details draft test, and `npm run lint`.

### Slice 5: Add Rich Text Editing With Storage Compatibility

**Files:**
- Create: `lib/application/recipes/rich-text.ts`
- Create: `scripts/rich-text.test.ts`
- Create: `app/recipes/_components/simple-rich-text-editor.tsx`
- Create: `app/recipes/_components/formatted-recipe-content.tsx`
- Modify: `app/recipes/_components/recipe-details-form.tsx`
- Modify: `app/recipes/[id]/page.tsx`
- Modify: `app/recipes/[id]/edit/edit-recipe-form.tsx`
- Modify: `lib/i18n/messages.ts`

- [x] Write tests for plain text, existing Markdown compatibility, allowed formatting output, link sanitization, empty content handling, and public rendering input normalization.
- [x] Run `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/rich-text.test.ts` and confirm the expected missing-module failure.
- [x] Implement a small compatibility layer that lets existing Markdown continue rendering while new editor output is safe, deterministic, and Markdown-compatible.
- [x] Confirm no new persisted HTML, JSON, or rich-text schema is introduced in v1.
- [x] Build `SimpleRichTextEditor` with bold, italic, underline, text size, bulleted list, numbered list, and link controls.
- [x] Add stable ids for description and steps toolbars, such as `recipe-description-rich-text-toolbar` and `recipe-steps-rich-text-toolbar`.
- [x] Use `FormattedRecipeContent` on public recipe detail so stored content renders formatted output without exposing editor controls.
- [x] Run the targeted rich-text test, `npm run test:phase1`, `npm run test:phase2`, and `npm run lint`.

### Slice 6: Build Grouped Media And Source Image Rules

**Files:**
- Create: `lib/application/recipes/recipe-media-groups.ts`
- Create: `scripts/recipe-media-groups.test.ts`
- Create: `app/recipes/_components/recipe-media-section.tsx`
- Modify: `lib/application/recipes/display-source-images.ts`
- Modify: `lib/application/recipes/source-documents.ts`
- Modify: `lib/application/recipes/use-cases.ts`
- Modify: `lib/domain/recipe.ts`
- Modify: `lib/domain/recipe-repository.ts`
- Modify: `lib/infrastructure/recipes/prisma-recipe-repository.ts`
- Modify: `app/api/recipes/route.ts`
- Modify: `app/api/recipes/[id]/route.ts`
- Modify: `app/recipes/_components/recipe-details-form.tsx`
- Modify: `lib/i18n/messages.ts`

- [x] Write tests for grouped recipe images, grouped source pages, owner/private visibility, public visibility defaults, source image primary selection, image primary selection, removal, and reorder payloads.
- [x] Run `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts` and confirm the expected missing-module failure.
- [x] Add a media reference model that distinguishes recipe images from source documents without using negative ids in create/update payloads.
- [x] Extend create/update payload parsing to accept source-document primary selection and source-document order where supported.
- [x] Keep source images in `RecipeSourceDocument`; do not copy them into `RecipeImage`.
- [x] Make public-recipe source images public by default for the unified flow.
- [x] Render one Media section with `Recipe images` and `Imported source pages` groups and stable ids for group headers and controls.
- [x] Run targeted media tests, `npm run test:import`, `npm run test:phase1`, `npm run test:phase2`, and `npm run lint`.

### Slice 7: Reusable Modal Carousel For Recipe Detail And Home Cards

**Files:**
- Create: `app/recipes/_components/recipe-media-carousel.tsx`
- Modify: `app/recipes/[id]/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/_components/recipe-visibility-tabs.tsx`
- Modify: `lib/application/home-navigation/view-model.ts`
- Modify: `lib/application/recipes/recipe-media-groups.ts`
- Modify: `app/globals.css`
- Modify: `lib/i18n/messages.ts`

- [x] Extend media group view models with carousel items that include type, label, thumbnail URL, full URL, and accessible label.
- [x] Render public recipe detail Gallery with `Recipe photos` and `Imported source pages` groups.
- [x] Add a separate home recipe card media/source action that opens the carousel without changing normal card navigation.
- [x] Keep primary card/image click behavior routing to recipe detail.
- [x] Add keyboard handling for Escape, ArrowLeft, and ArrowRight.
- [x] Add stable ids: `recipe-media-carousel`, `recipe-media-carousel-close`, `recipe-media-carousel-prev`, `recipe-media-carousel-next`, `home-recipe-media-action-{id}`.
- [x] Run `npm run test:phase4`, media group tests, `npm run lint`, and browser smoke on desktop and mobile widths.

### Slice 8: Landing App Chrome And Route Navigation To The Unified Add Recipe Entry

**Files:**
- Modify: `app/page.tsx`
- Modify: `lib/application/home-navigation/view-model.ts`
- Modify: `app/_components/home-left-navigation.tsx`
- Modify: `app/recipes/new/page.tsx`
- Modify: `app/recipes/import/page.tsx`
- Modify: `lib/i18n/messages.ts`

- [x] Align the landing page with the approved app chrome: top bar brand lockup on the left, language/account actions grouped on the right, compact rail/drawer on the left, and task-first recipe browsing preserved.
- [x] Update `buildHomeNavigationViewModel` so `recipeCreateHref` becomes `/recipes/add`.
- [x] Update any hard-coded Add Recipe links to `/recipes/add`.
- [x] Keep `/recipes/new` and `/recipes/import` as direct compatibility routes until the PR has passed local and hosted smoke.
- [ ] Add visible copy in compatibility routes only if needed to prevent duplicated entry choices; avoid adding new marketing or explainer surfaces.
- [ ] Verify landing top bar and left-menu behavior at desktop width around 1440px and mobile width around 390px.
- [x] Run `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts`, `npm run lint`, and `npm run build`.

### Slice 9: Align Edit Flow With The Shared Form Language

**Files:**
- Modify: `app/recipes/[id]/edit/edit-recipe-form.tsx`
- Modify: `app/recipes/[id]/edit/page.tsx`
- Modify: `app/recipes/_components/recipe-details-form.tsx`
- Modify: `app/recipes/_components/recipe-media-section.tsx`
- Modify: `lib/application/recipes/recipe-details-draft.ts`
- Modify: `lib/application/recipes/recipe-media-groups.ts`
- Modify: `app/api/recipes/[id]/route.ts`
- Modify: `lib/i18n/messages.ts`

- [ ] Add draft helper tests for edit hydration, edit submit payload, existing media grouping, image deletion, source-page visibility messaging, and primary-media changes.
- [ ] Refactor `edit-recipe-form.tsx` to pass prepared edit draft props into the shared `RecipeDetailsForm`.
- [ ] Preserve existing edit permissions and route behavior in `page.tsx`.
- [ ] Keep edit save semantics as Save action, not Create Recipe.
- [ ] Run `npm run test:phase1`, `npm run test:phase2`, media group tests, and `npm run lint`.

### Slice 10: QA Checklist, Manual Test Cases, And Promotion Readiness

**Files:**
- Modify: `requirements/recipe-workflow-refresh/qa-checklist.md`
- Modify: `requirements/recipe-workflow-refresh/test-cases.md`
- Modify: `requirements/recipe-workflow-refresh/handoff.md`

- [ ] Finalize the QA checklist with per-slice results for every state listed in the requirements brief.
- [ ] Finalize desktop and mobile test cases for Start, manual create, text import, document import, handwritten import, import failure, source-image primary, recipe-image primary, public gallery, home card carousel, edit flow, compatibility routes, and landing app chrome.
- [ ] Run local verification:
  - `npm run test:import`
  - `npm run test:phase1`
  - `npm run test:phase2`
  - `npm run test:phase4`
  - `npm run lint`
  - `npm run build`
- [ ] Start local server with `PORT=3100 npm run dev` and manually smoke:
  - `/`
  - `/recipes/add`
  - `/recipes/new`
  - `/recipes/import`
  - `/recipes/{id}`
  - `/recipes/{id}/edit`
- [ ] Verify desktop width around 1440px and mobile width around 390px.
- [ ] Update handoff with completed slices, verification output, manual testing status, known issues, and next action.

## Risk Register

- Rich text storage can become a migration trap. Keep v1 compatible with `description` and `stepsMarkdown` until the storage format is deliberately approved.
- Source image primary selection likely needs a domain/API contract instead of relying on current negative display ids.
- Import source forms currently own a lot of client orchestration. Extract callbacks incrementally to avoid breaking `/recipes/import` while `/recipes/add` is built.
- The manual create form mixes view, draft state, validation, family fetching, image state, and submit behavior. Extract only the logic needed for the touched slice and avoid a broad rewrite.
- Public source image defaults must be covered by tests because existing import defaults are private.
- Home card carousel action must not hijack card navigation.

## Approval Gate

Do not start Slice 1 implementation until this plan is reviewed and approved. After approval, execute one slice at a time, update this checklist as work completes, and refresh `handoff.md` after every verified checkpoint.
