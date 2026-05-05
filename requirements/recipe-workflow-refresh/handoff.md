# Recipe Workflow Refresh Handoff

## Current State

Design direction and implementation plan are approved for the unified Add Recipe workflow. The feature branch is `codex/feature/recipe-workflow-refresh`, and draft PR #26 is open back into `pre-main`. Slice 10 promotion readiness is locally verified with final automated checks plus desktop/mobile browser smoke on `http://127.0.0.1:3100`. Post-PR CI failures have been fixed locally: phase0 by aligning older script fixtures with updated media/repository contracts, and phase1 by injecting the source-document primary marker into recipe use cases so unit tests do not hit the Prisma-backed helper. Description and steps editor requirements have been removed from this phase and deferred to a separate future phase.

## Completed

- Started planning from `pre-main`.
- Created feature branch `codex/feature/recipe-workflow-refresh`.
- Explored the existing recipe creation/import/source-image code paths.
- Generated and iterated the branded visual mockup.
- Approved guided Option A with adaptive wizard paths and combined media handling.
- Wrote the requirements brief.
- Added recipe-workflow branding guidance for app chrome, forms, and create/edit/modify processes.
- Wrote `requirements/recipe-workflow-refresh/implementation-plan.md` for review.
- Revised the implementation plan after review to add Slice 0, define the import-session handoff, and make landing app chrome an explicit implementation slice.
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
- Removed description and steps editor UX requirements from this phase and deferred editor selection, toolbar behavior, source/preview behavior, formatting controls, and any storage-model decisions to a separate future phase.
- Added edit hydration and payload helper coverage in `scripts/recipe-details-draft.test.ts` for existing recipe images, source documents, family visibility, new image uploads, and primary media references.
- Extended `lib/application/recipes/recipe-details-draft.ts` with edit-specific draft hydration, validation, and update payload building so edit business rules stay outside JSX-heavy form code.
- Extended `RecipeDetailsForm` and `RecipeMediaSection` so the edit flow can reuse the shared form language, grouped media UI, existing image removal controls, and source-page visibility badges.
- Updated `/recipes/{id}/edit` to fetch recipe source documents, pass prepared edit draft props into the shared form, keep Save Changes copy, and submit `primaryMediaReference` for existing recipe-image or source-document primary choices.
- Verified Slice 9 with helper tests, media tests, phase tests, lint, build, diff check, and authenticated local smoke for `/recipes/42/edit`.
- Added repeatable Slice 10 Playwright smoke coverage in `output/playwright/recipe-workflow-refresh/slice10-final-smoke.mjs`.
- Fixed the reusable media modal keyboard handling so Escape, ArrowLeft, and ArrowRight work when focus is inside the dialog rather than being swallowed by the dialog-level keydown guard.
- Verified Slice 10 final checks: import/phase suites, home-navigation helper coverage for no-media carousel omission, lint, build, diff check, and desktop/mobile browser smoke for `/`, `/recipes/add`, `/recipes/new`, `/recipes/import`, `/recipes/42`, and `/recipes/42/edit`.
- Updated the implementation plan, QA checklist, and test cases with Slice 10 verification evidence.
- Opened draft PR #26 (`https://github.com/luisfleitas/RecetasDeLaFamilia/pull/26`) from `codex/feature/recipe-workflow-refresh` into `pre-main`.
- Fixed the PR quality-gate phase0 TypeScript failure by updating older test fixtures for `IngredientUnitSuggestionSource`, visible source-image refs, repository `clearPrimaryImage`, and import-session source refs.
- Fixed the PR quality-gate phase1 unit-test failure by adding an injectable source-document primary marker dependency to `makeRecipeUseCases` and using a no-op marker in phase1/phase2 unit tests.

## In Progress

- PR #26 CI repair is locally verified. Push the source-document primary marker dependency fix and re-check PR CI plus Vercel preview status.

## Next Action

Commit and push the PR quality-gate dependency-boundary fix, then re-check PR #26 CI and Vercel preview status.

## Known Issues

- `.superpowers/` contains temporary visual companion files and should remain untracked.
- The current implementation has separate `/recipes/new` and `/recipes/import` routes; the revised plan keeps them as compatibility routes while `/recipes/add` is introduced.
- The landing page uses the approved top bar, left hand menu app frame, compact featured carousel, and image-click media modal behavior on the signed-in desktop and mobile smoke paths.
- Current public source image visibility is handled for the unified Add Recipe import path.
- Source image primary selection is stored on `RecipeSourceDocument.metadataJson` through typed `source-document:<id>` primary media refs. Slice 9 aligned edit payloads with that typed primary-media path.
- Description and steps editor UX is no longer part of this phase's acceptance criteria. Keep the existing `description` and `stepsMarkdown` storage shape compatible and handle editor decisions in a later phase.
- The unified import handoff now reuses the existing import-session seam and hydrates `/recipes/add` workflow state without a browser redirect. Manual signed-in browser smoke for the embedded import flow is still pending.
- Slice 6 added staged source-image previews for the Add Recipe form; signed-in browser verification of source thumbnails and primary selection is still pending.
- Slice 8 exact responsive smoke originally exposed drawer stacking over home media actions; `home-left-navigation-drawer` now uses a higher foreground stack and the rerun passed at 1440px and 390px.
- Slice 8A/Slice 10 no-media carousel omission is covered by helper tests; the local seeded browser dataset includes visible media, so no separate no-media seeded browser run was created.
- Slice 10 browser smoke covers pasted text import success and error recovery. Document/PDF and handwritten success remain covered by automated import route/session tests rather than live file uploads in the final browser smoke.
- The local seeded browser dataset includes visible media, so the no-media featured-carousel omission was verified through `scripts/home-navigation-view-model.test.ts` instead of a separate no-media seeded browser run.

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
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` failed first with the expected missing Slice 8A behavior, then passed with 9 tests after implementation.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts` passed after Slice 8A.
- `npm run test:phase4` passed after Slice 8A.
- `npm run lint` passed after Slice 8A with existing warnings only (`@next/next/no-img-element` in image/media views plus older unused test-stub variables).
- `npm run build` passed after Slice 8A and still lists `/recipes/add`, `/recipes/new`, and `/recipes/import`.
- `git diff --check` passed after Slice 8A.
- `npx tsc --noEmit --pretty false` was run as an extra non-gating check; it still reports older script type errors unrelated to Slice 8A after the new test fixture shape was fixed.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts` failed first with the expected missing Slice 9 edit helper exports, then passed with 11 tests after implementation.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts` passed after Slice 9.
- `npm run test:phase1` passed after Slice 9.
- `npm run test:phase2` passed after Slice 9.
- `npm run lint` passed after Slice 9 with existing warnings only (`@next/next/no-img-element` in image/media views plus older unused test-stub variables).
- `npm run build` passed after Slice 9 and still lists `/recipes/[id]/edit`.
- `git diff --check` passed after Slice 9.
- Authenticated local curl smoke on `http://127.0.0.1:3106/recipes/42/edit` passed after Slice 9, confirming `edit-recipe-form`, `edit-recipe-media-section`, and Save Changes edit semantics rendered from the signed-in page.
- `npm run test:import` passed for Slice 10 with 76 tests.
- `npm run test:phase1` passed for Slice 10 with 9 tests.
- `npm run test:phase2` passed for Slice 10 with 9 tests.
- `npm run test:phase4` passed for Slice 10 with 7 tests.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed for Slice 10 with 9 tests, including no-media featured-carousel omission.
- `npm run lint` passed for Slice 10 with existing warnings only (`@next/next/no-img-element` in image/media views plus older unused test-stub variables).
- `npm run build` passed for Slice 10 and still lists `/recipes/add`, `/recipes/new`, `/recipes/import`, and `/recipes/[id]/edit`.
- `git diff --check` passed for Slice 10.
- `node output/playwright/recipe-workflow-refresh/slice10-final-smoke.mjs` passed for Slice 10 on `http://127.0.0.1:3100` at 1440px and 390px. Evidence: `slice10-final-smoke.json`, `slice10-landing-1440.png`, `slice10-landing-390.png`, `slice10-add-manual-1440.png`, `slice10-add-manual-390.png`, `slice10-add-import-1440.png`, `slice10-add-import-390.png`, `slice10-recipes-new-1440.png`, `slice10-recipes-new-390.png`, `slice10-recipes-import-1440.png`, `slice10-recipes-import-390.png`, `slice10-recipe-detail-1440.png`, `slice10-recipe-detail-390.png`, `slice10-recipe-edit-1440.png`, and `slice10-recipe-edit-390.png`.
- `gh pr create --base pre-main --head codex/feature/recipe-workflow-refresh --draft` opened PR #26.
- Fresh PR auth-smoke passed on GitHub run `25380088423`.
- Fresh PR quality-gate failed at `npm run test:phase0` because the full TypeScript check caught stale older script fixtures after the recipe media/repository contract changes.
- `npm run test:phase0` passed after fixture alignment.
- `npm run test:phase1` passed after fixture alignment.
- `npm run test:phase2` passed after fixture alignment.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/ingredient-unit-suggestions.test.ts scripts/recipe-details-draft.test.ts scripts/page-recipe-list-loader.test.ts` passed after fixture alignment.
- `git diff --check` passed after fixture alignment.
- Follow-up PR quality-gate failed at `npm run test:phase1` because `updateRecipeWithImages` called the Prisma-backed source-document primary helper from a unit test database that had no `RecipeSourceDocument` table.
- `npm run test:phase0` passed after adding the source-document primary marker dependency boundary.
- `npm run test:phase1` passed after adding the source-document primary marker dependency boundary.
- `npm run test:phase2` passed after adding the source-document primary marker dependency boundary.

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
- Slice 9 authenticated local curl smoke on `http://127.0.0.1:3106/recipes/42/edit` confirmed the shared edit form, grouped media section, and Save Changes button render for seeded `alice`.
- Slice 10 Playwright smoke on `http://127.0.0.1:3100` passed at 1440px and 390px with seeded `alice`. It confirmed landing app chrome, featured image modal, recipe-card image modal, title/copy detail links, modal next/previous/close/Escape/arrow-key controls, `/recipes/add` manual path, pasted import error recovery, pasted import success hydration, `/recipes/new`, `/recipes/import`, `/recipes/42`, and `/recipes/42/edit`, with no horizontal overflow.

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
- Description and steps editor UX is deferred to a separate phase; no editor toolbar, source/preview, formatting-control, or package-selection requirement remains in this phase.
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
