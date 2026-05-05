# Recipe Workflow Refresh Handoff

## Current State

Design direction and implementation plan are approved for the unified Add Recipe workflow. The feature branch is `codex/feature/recipe-workflow-refresh`, Slice 5B is verified with the app-owned Markdown editor upgraded to Source/Preview modes for description and steps on create/add and edit flows.

## Completed

- Started planning from `pre-main`.
- Created feature branch `codex/feature/recipe-workflow-refresh`.
- Explored the existing recipe creation/import/source-image code paths.
- Generated and iterated the branded visual mockup.
- Approved guided Option A with adaptive wizard paths and combined media handling.
- Wrote the requirements brief.
- Added recipe-workflow branding guidance for app chrome, forms, and create/edit/modify processes.
- Wrote `requirements/recipe-workflow-refresh/implementation-plan.md` for review.
- Revised the implementation plan after review to add Slice 0, define the import-session handoff, define the rich-text v1 storage contract, and make landing app chrome an explicit implementation slice.
- Created baseline `requirements/recipe-workflow-refresh/qa-checklist.md`.
- Created baseline `requirements/recipe-workflow-refresh/test-cases.md`.
- Approved the revised implementation plan by moving into implementation after user requested the next step.
- Added `lib/application/recipes/add-workflow-state.ts` with workflow path, step, completed-step, import-success, and start-over behavior.
- Added reducer coverage in `scripts/add-workflow-state.test.ts`.
- Added `/recipes/add` with a thin authenticated page, client workflow shell, Start screen, wizard bar, placeholder Import source screen, placeholder Recipe details screen, and Start over control.
- Added English and Spanish copy for the Slice 1 workflow shell.
- Added `scripts/recipe-details-draft.test.ts` and confirmed the expected missing-module failure before implementation.
- Added `lib/application/recipes/recipe-details-draft.ts` for empty manual drafts, import hydration, ingredient normalization, create payload building, image upload metadata, and validation codes.
- Added `app/recipes/_components/recipe-details-form.tsx` as the shared recipe details view.
- Updated `/recipes/new` to compose the extracted helper and shared view.
- Updated `/recipes/add` Recipe Details to render the shared form for the manual path and support import-session hydration when the workflow reaches that state.
- Added `scripts/ingredient-unit-suggestions.test.ts` and confirmed the expected missing-module failure before implementation.
- Added `lib/application/recipes/ingredient-unit-suggestions.ts` with the approved canonical unit list, case-insensitive dedupe, typed filtering, and current-recipe custom-unit suggestions.
- Added `app/recipes/_components/ingredient-unit-combobox.tsx`.
- Updated the shared ingredient editor to use `IngredientUnitCombobox` while preserving the existing unit input ids and labels.
- Added a Slice 4 recipe-details draft test covering imported source refs, metadata, public source visibility, and import-complete state.
- Extended `lib/application/recipes/recipe-details-draft.ts` so imported source metadata can hydrate the unified details draft.
- Refactored `app/recipes/import/import-recipe-form.tsx` to support standalone compatibility mode and embedded `/recipes/add` mode through reusable success callbacks.
- Replaced the placeholder Add Recipe import source screen with the real import controls and a success callback that advances to Recipe details without a browser redirect.
- Wired Add Recipe imported details to read session source refs/metadata and show imported source file visibility context.
- Kept `/recipes/import` as the standalone flow that continues to `/recipes/new?importSession=...`.
- Added `scripts/rich-text.test.ts` and confirmed the expected missing-module failure before implementation.
- Added `lib/application/recipes/rich-text.ts` with Markdown-compatible normalization, deterministic toolbar formatting, and safe link handling.
- Added `app/recipes/_components/simple-rich-text-editor.tsx` with stable toolbar/input ids for description and steps fields.
- Added `app/recipes/_components/formatted-recipe-content.tsx` and wired public recipe detail description/steps rendering through it.
- Wired the shared create form and existing edit form to use `SimpleRichTextEditor` while preserving existing `description` and `stepsMarkdown` storage fields.
- Added English and Spanish rich-text toolbar labels.
- Added `scripts/recipe-media-groups.test.ts` for grouped recipe/source media, owner-private source visibility, source primary selection, and typed media reference serialization.
- Added `lib/application/recipes/recipe-media-groups.ts` for typed recipe-image/source-document media references and grouped media view models.
- Extended recipe details draft payloads so imported source pages can be selected as primary without marking new uploaded images primary.
- Added `app/recipes/_components/recipe-media-section.tsx` and replaced the old create-form image-only section with grouped `Recipe images` and `Imported source pages` media groups.
- Added an authenticated staged source-image preview route at `/api/recipes/import/source-images/[sourceImageId]/file`.
- Extended create/update API form parsing to accept `primaryMediaReference`, and source-document metadata now records `isPrimary` without copying source images into `RecipeImage`.
- Extended media group view models with reusable carousel items for recipe images and imported source pages.
- Added `app/recipes/_components/recipe-media-carousel.tsx` with stable modal/control ids, body-level portal stacking, next/previous/close controls, and Escape/arrow-key handlers.
- Updated public recipe detail to render grouped `Recipe photos` and `Imported source pages` gallery sections and open the reusable full-size modal.
- Updated home recipe cards to use a separate `home-recipe-media-action-{id}` control while preserving normal image/title navigation to recipe detail.
- Verified Slice 8 landing app chrome at 1440px and 390px with signed-in Chromium smoke.
- Raised the left-navigation drawer stacking above home media actions so the drawer stays foreground when open.
- Incorporated the approved landing carousel reinsert plan into the live planning docs as Slice 8A.
- Restored `HomeFeaturedCarousel` above the recipe groups with media-backed slides only.
- Extended home navigation helpers so featured slides and home cards share media item construction, primary-image fallback, source-page item mapping, and no-media omission rules outside JSX-heavy view files.
- Extended the reusable media carousel trigger API so featured images and recipe-card images can open the same modal directly while title/copy links continue to route to recipe detail.
- Replaced the separate home-card media action with stable image trigger ids `home-recipe-carousel-image-button-{id}`.
- Verified Slice 8A with helper tests, media tests, phase 4 tests, lint, build, diff check, and desktop/mobile Playwright smoke.
- Added Slice 5B to the implementation plan, QA checklist, and manual test cases so the rich text editor is not considered complete while it still feels like a temporary toolbar/textarea box.
- Completed the Slice 5B build-vs-existing-component decision: keep improving the custom Recetas-owned editor now because `react-markdown` already supplies the public-rendering preview path and no full editor framework is installed.
- Added Source and Preview tabs to the shared rich text editor, preserving the existing Markdown value/onChange contract and the `description` / `stepsMarkdown` storage fields.
- Reused `FormattedRecipeContent` and the rich-text normalization helper for editor previews so unsafe links are sanitized the same way before public rendering.
- Verified Slice 5B with rich-text contract tests, phase tests, lint, build, and desktop/mobile browser smoke for `/recipes/add` and `/recipes/42/edit`.

## In Progress

- Slice 9 edit-flow alignment has not started.

## Next Action

Start Slice 9 from `requirements/recipe-workflow-refresh/implementation-plan.md`: align the edit flow with the shared form language while keeping Save semantics, permissions, image removal, and existing edit behavior intact.

## Known Issues

- `.superpowers/` contains temporary visual companion files and should remain untracked.
- The current implementation has separate `/recipes/new` and `/recipes/import` routes; the revised plan keeps them as compatibility routes while `/recipes/add` is introduced.
- The landing page uses the approved top bar, left hand menu app frame, compact featured carousel, and image-click media modal behavior on the signed-in desktop and mobile smoke paths.
- Current public source image visibility is handled for the unified Add Recipe import path.
- Source image primary selection is stored on `RecipeSourceDocument.metadataJson` through typed `source-document:<id>` primary media refs. Slice 7 now surfaces imported source pages through public recipe detail and home-card media actions; deeper source-primary edit-flow alignment is still part of later edit work.
- Rich text v1 now uses Markdown-compatible output through existing `description` and `stepsMarkdown` fields; no persisted HTML/JSON/new schema was introduced.
- Rich text Source/Preview modes are implemented for the shared create/add and edit surfaces. A future full editor package can still be swapped in behind the same app-owned Markdown value contract if needed.
- The unified import handoff now reuses the existing import-session seam and hydrates `/recipes/add` workflow state without a browser redirect. Manual signed-in browser smoke for the embedded import flow is still pending.
- Slice 6 added staged source-image previews for the Add Recipe form; signed-in browser verification of source thumbnails and primary selection is still pending.
- Slice 8 exact responsive smoke originally exposed drawer stacking over home media actions; `home-left-navigation-drawer` now uses a higher foreground stack and the rerun passed at 1440px and 390px.
- Slice 8A no-media carousel omission is covered by helper tests; a fully manual no-media dataset smoke is still pending.

## Verification Already Run

- `git status --short --branch`
- Code/documentation inspection only. No tests have been run for this planning pass.
- Reviewed current create/import/home/source-image code owners while writing the implementation plan.
- Documentation-only update after implementation-plan review feedback. No application tests were run.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/add-workflow-state.test.ts` failed first with the expected missing-module error, then passed after implementation.
- `npm run lint` passed with existing warnings only (`@next/next/no-img-element` and unused test stub variables in older files).
- `npm run build` passed and listed `/recipes/add` as a dynamic route.
- Local dev server started at `http://localhost:3105`; unauthenticated browser smoke for `/recipes/add` redirected to `/login` as expected.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts` failed first with the expected missing-module error, then passed after implementation.
- `npm run test:phase1` passed.
- `npm run lint` passed with warnings only (`@next/next/no-img-element` in existing image views plus the extracted preview view, and unused test stub variables in older scripts).
- `npm run build` passed and listed `/recipes/add` as a dynamic route.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/ingredient-unit-suggestions.test.ts` failed first with the expected missing-module error, then passed after implementation.
- `npm run test:phase1` passed.
- `npm run lint` passed with warnings only (`@next/next/no-img-element` in existing image views plus the extracted preview view, and unused test stub variables in older scripts).
- `npm run build` passed and listed `/recipes/add` as a dynamic route.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts` failed first with the expected missing metadata assertion, then passed after implementation.
- `npm run test:import` passed.
- `npm run lint` passed with existing warnings only (`@next/next/no-img-element` in existing image views plus unused test stub variables in older scripts).
- `npm run build` passed and listed `/recipes/add` as a dynamic route.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/rich-text.test.ts` failed first with the expected missing-module error, then passed after implementation.
- `npm run test:phase1` passed.
- `npm run test:phase2` passed.
- `npm run lint` passed with existing warnings only (`@next/next/no-img-element` in existing image views plus unused test stub variables in older scripts).
- `npm run build` passed and listed `/recipes/add` as a dynamic route.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts` failed first with the expected missing-module error, then passed after implementation.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts` passed after adding source-primary draft coverage.
- `npm run test:import` passed.
- `npm run test:phase1` passed.
- `npm run test:phase2` passed.
- `npm run lint` passed with warnings only (`@next/next/no-img-element` in existing image views plus the new media section, and unused test stub variables in older scripts).
- `npm run build` passed and listed the new `/api/recipes/import/source-images/[sourceImageId]/file` route.
- `git diff --check` passed.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts` failed first with the expected missing carousel-item export, then passed after adding the helper.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` failed first with the expected missing home media helper export, then passed after adding the helper.
- `npm run test:phase4` passed after Slice 7.
- `npm run lint` passed after Slice 7 with existing `<img>` and older unused test-stub warnings only.
- `npm run build` passed after Slice 7.
- `git diff --check` passed after Slice 7.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after changing the left-menu Add Recipe route to `/recipes/add`.
- `npm run lint` passed after Slice 8 with existing warnings only (`@next/next/no-img-element` in existing image/media views plus unused test-stub variables in older scripts).
- `npm run build` passed after Slice 8 and still lists `/recipes/add`, `/recipes/new`, and `/recipes/import`.
- Signed-in Chromium smoke at 1440px and 390px passed after the drawer stacking fix. Evidence files: `output/playwright/recipe-workflow-refresh/slice8-landing-smoke.json`, `slice8-landing-1440.png`, `slice8-landing-1440-drawer.png`, `slice8-landing-390.png`, and `slice8-landing-390-drawer.png`.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after the drawer stacking fix.
- `npm run lint` passed after the drawer stacking fix with existing warnings only (`@next/next/no-img-element` in existing image/media views plus unused test-stub variables in older scripts).
- `npm run build` passed after the drawer stacking fix and still lists `/recipes/add`, `/recipes/new`, and `/recipes/import`.
- Documentation-only planning update incorporated Slice 8A into `implementation-plan.md`, `handoff.md`, `qa-checklist.md`, and `test-cases.md`; `git diff --check` passed and no application tests were required for the doc-only change.
- Documentation-only planning update added Slice 5B for the rich text editor upgrade and build-vs-existing-component decision. No application tests were required for this doc-only change.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` failed first with the expected missing Slice 8A behavior, then passed with 9 tests after implementation.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts` passed after Slice 8A.
- `npm run test:phase4` passed after Slice 8A.
- `npm run lint` passed after Slice 8A with existing warnings only (`@next/next/no-img-element` in image/media views plus older unused test-stub variables).
- `npm run build` passed after Slice 8A and still lists `/recipes/add`, `/recipes/new`, and `/recipes/import`.
- `git diff --check` passed after Slice 8A.
- `npx tsc --noEmit --pretty false` was run as an extra non-gating check; it still reports older script type errors unrelated to Slice 8A after the new test fixture shape was fixed.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/rich-text.test.ts` failed first with the expected missing Slice 5B helper exports, then passed with 8 tests after implementation.
- `npm run test:phase1` passed after Slice 5B.
- `npm run test:phase2` passed after Slice 5B.
- `npm run lint` passed after Slice 5B with existing warnings only (`@next/next/no-img-element` in image/media views plus older unused test-stub variables).
- `npm run build` passed after Slice 5B and still lists `/recipes/add`, `/recipes/new`, `/recipes/import`, and `/recipes/[id]/edit`.
- Slice 5B browser smoke passed at 1440px and 390px on `http://127.0.0.1:3000`: `/recipes/add` and `/recipes/42/edit` both showed Source/Preview tabs for description and steps, preview content rendered expected Markdown, unsafe `javascript:` links were not exposed in preview text, and no horizontal overflow was detected. Evidence files: `output/playwright/recipe-workflow-refresh/slice5b-add-rich-text-1440.png`, `slice5b-edit-rich-text-1440.png`, `slice5b-add-rich-text-390.png`, and `slice5b-edit-rich-text-390.png`.

## Manual Testing Status

- Visual mockup reviewed in the in-app browser.
- Design approved by the user.
- Unauthenticated route smoke was run for `/recipes/add` and confirmed the auth redirect. Signed-in Add Recipe workflow smoke and exact-width landing chrome smoke are still pending.
- Desktop browser smoke on existing local dev server `http://localhost:3105/` confirmed the home card `2 media` action opens the modal, next/close controls work, and normal recipe card links remain visible.
- Desktop browser smoke on `http://localhost:3105/recipes/42` confirmed the grouped detail gallery renders and opens the reusable modal.
- 390px Playwright browser smoke on `http://localhost:3105/recipes/42` confirmed the detail gallery modal fits the mobile viewport with close/prev/next controls visible.
- Signed-in in-app browser smoke on `http://localhost:3105/` with existing `alice` session confirmed the top bar, account actions, compact left rail, recipe tabs, task-first recipe browsing, and drawer Add Recipe link targeting `/recipes/add` on the available desktop/tablet viewport.
- Exact signed-in Chromium smoke on `http://127.0.0.1:3105/` passed at 1440px and 390px after the drawer stacking fix. Desktop and mobile screenshots confirm the top bar, account actions, left rail/drawer, task-first recipe tabs/grid, no horizontal overflow, and drawer Add Recipe link targeting `/recipes/add`.
- Slice 8A Playwright smoke on `http://127.0.0.1:3105/` passed at desktop width: `home-featured-carousel` rendered, featured image `home-featured-carousel-image-44` opened the modal, next/close worked, recipe-card image `home-recipe-carousel-image-button-42` opened the modal, Escape closed it, and the first title link still pointed to `/recipes/42`.
- Slice 8A Playwright smoke on `http://127.0.0.1:3105/` passed at 390px: no horizontal overflow, featured image opened the modal, Escape closed it, recipe-card image opened the modal, and close worked.
- Slice 5B Playwright smoke on `http://127.0.0.1:3000/recipes/add` and `/recipes/42/edit` passed at 1440px and 390px. It confirmed description and steps Source/Preview tabs, formatted preview rendering, unsafe-link preview sanitization, and no horizontal overflow.

## Decisions Already Approved

- Left menu routes to Add Recipe.
- Import path: Start -> Import source -> Recipe details.
- Manual path: Start -> Recipe details.
- Completed wizard steps are clickable and preserve information.
- Future steps are visible but disabled.
- Path switching after Start should use a start-over action.
- Successful import automatically advances to Recipe details.
- No Review import step in v1.
- Recipe details remains unsaved until Create Recipe.
- One long Recipe details form.
- Ingredient units use autocomplete with local custom suggestions per recipe.
- Description and steps use a simple rich text toolbar.
- Description and steps should be upgraded beyond the temporary toolbar/textarea box before feature completion; users should be able to see markup/source text and a polished formatted preview.
- Slice 5B decision: keep the custom Recetas-owned rich text editor for now, add Source/Preview tabs, and continue isolating the editor behind the shared Markdown value/onChange contract rather than adding a third-party editor package in this slice.
- Combined Media section with Recipe images and Imported source pages groups.
- Source images can be primary without being copied.
- Public recipe gallery uses grouped media.
- Source thumbnails open a reusable full-size modal carousel.
- Modal carousel is also available from home/landing recipe cards through a separate media action.
- Landing featured carousel should be restored above the recipe groups as a compact, image-backed feature band.
- Landing featured carousel images and recipe-card images should open the reusable media modal directly.
- Landing image viewer modal should include all visible media for that recipe: recipe photos plus imported source pages.
- Recipe navigation from the landing page should remain available through recipe title/copy links.
- Do not render the restored landing featured carousel when no visible recipe has real media.
- Landing page should use the new top bar and left hand menu layout.
- Branding guidance should cover form details plus create, edit, and modify processes.
