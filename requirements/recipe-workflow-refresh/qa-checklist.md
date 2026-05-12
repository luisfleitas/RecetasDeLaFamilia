# Recipe Workflow Refresh QA Checklist

## Purpose

Track implementation and QA for the approved unified Add Recipe workflow. Update this checklist after every verified slice so the handoff stays current and future agents can resume from live evidence.

## Status Legend

- Not Started
- In Progress
- Verified
- Blocked

## Baseline State Coverage

| State | Desktop | Mobile | Automated Coverage | Manual Coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| Start choice selection | Verified | Verified | Verified | Verified | Reducer covers path selection; Slice 10 browser smoke confirms manual and import choices at 1440px and 390px. |
| Manual path | Verified | Verified | Verified | Verified | Reducer covers Start -> Recipe details; Slice 10 browser smoke confirms the shared Recipe Details form renders from `/recipes/add` at 1440px and 390px. |
| Import source empty state | Verified | Verified | Verified | Verified | `/recipes/add` embeds the real import controls with Paste, Document, and Handwritten tabs; Slice 10 browser smoke confirms the import screen and tabs at 1440px and 390px. |
| Import source processing state | Not Started | Not Started | Verified | Not Started | Embedded import exposes `add-recipe-import-processing` and disables parse controls while parsing. |
| Import source error state | Verified | Verified | Verified | Verified | Embedded import exposes `add-recipe-import-error`; Slice 10 pasted-text smoke confirms error recovery at 1440px and 390px. |
| Import success state | Verified | Verified | Verified | Verified | Successful parse/session callback advances `/recipes/add` to Recipe details without a browser redirect; Slice 10 pasted-text smoke confirms the transition. |
| Imported recipe details loaded state | Verified | Verified | Verified | Verified | Draft helper covers imported title, ingredients, description, steps, language, source refs, metadata, and import-complete state; Slice 10 pasted-text smoke confirms title hydration. |
| Recipe details validation errors | Not Started | Not Started | Verified | Not Started | Draft helper covers required title, required steps, invalid ingredient, family selection, and primary-image validation. Errors render through the shared form. |
| Ingredient unit autocomplete | Not Started | Not Started | Verified | Not Started | Helper covers canonical suggestions, case-insensitive dedupe, current-recipe custom units, typed filtering, and freeform custom values. Browser smoke still pending. |
| Media empty state | Verified | Verified | Verified | Verified | One combined Media section renders grouped empty states; Slice 10 browser smoke confirms the create form Media section at both widths. |
| Media with recipe images only | Verified | Verified | Verified | Verified | Media helper and view render the Recipe images group; Slice 10 browser smoke confirms public detail and edit media rendering with seeded media. |
| Media with source images only | Not Started | Not Started | Verified | Not Started | Media helper and Add Recipe view render Imported source pages from import-session source refs; browser source-page-only dataset smoke remains a future hardening option. |
| Media with both groups | Verified | Verified | Verified | Verified | Media helper supports recipe images plus imported source pages with typed primary refs; Slice 10 confirms seeded detail/edit media surfaces and prior Slice 8A confirms mixed media modal items. |
| Public recipe gallery with grouped media | Verified | Verified | Verified | Verified | Recipe detail now renders grouped Recipe photos and Imported source pages; desktop and 390px modal smoke passed. |
| Home card with media action | Verified | Not Started | Verified | Verified | Current Slice 7 behavior used a separate media action. Slice 8A supersedes this by making the recipe-card image itself open the viewer modal while title/copy remains the detail route. |
| Home card without media action | Verified | Not Started | Verified | Verified | Current Slice 7 behavior kept image/title navigation to detail. Slice 8A should preserve title/copy navigation but move image clicks to the modal. |
| Landing featured carousel restored | Verified | Verified | Verified | Verified | Slice 8A restores the compact featured carousel above recipe groups when visible recipes have real media. |
| Landing featured carousel image opens modal | Verified | Verified | Verified | Verified | Desktop and 390px Playwright smoke confirmed featured image clicks open the reusable media modal. |
| Landing recipe-card image opens modal | Verified | Verified | Verified | Verified | Desktop and 390px Playwright smoke confirmed recipe-card image clicks open the reusable media modal. |
| Landing title/copy navigation | Verified | Verified | Verified | Verified | Desktop smoke confirmed recipe title links remain `/recipes/{id}` after image clicks became modal triggers. |
| Landing carousel no-media state | Verified | Verified | Verified | Verified | `buildFeaturedRecipeSlides` returns no slides for visible recipes without real image/source media; Slice 10 reran the helper coverage because the seeded browser dataset includes media. |
| Landing page top bar and left-menu desktop layout | Verified | Not Started | Verified | Verified | Signed-in Chromium smoke at 1440px confirmed the top bar, right-side actions, compact rail, task-first recipe tabs/grid, foreground drawer stacking, and `/recipes/add` drawer target. Screenshot: `output/playwright/recipe-workflow-refresh/slice8-landing-1440-drawer.png`. |
| Landing page top bar and left-menu mobile layout | Not Started | Verified | Verified | Verified | Signed-in Chromium smoke at 390px confirmed stacked top bar/actions, compact rail, scrollable foreground drawer, task-first recipe tabs/grid, no horizontal overflow, and `/recipes/add` drawer target. Screenshot: `output/playwright/recipe-workflow-refresh/slice8-landing-390-drawer.png`. |
| Full-size modal carousel open/next/previous/close | Verified | Verified | Verified | Verified | Modal has stable controls, body-level portal stacking, next/close click smoke, keyboard handlers, and 390px detail smoke. |

## Slice Verification Log

| Slice | Status | Verification Run | Manual Testing | Notes |
| --- | --- | --- | --- | --- |
| Slice 0: QA Baseline And App Chrome Contract | Verified | Documentation only | Not Started | QA docs and app chrome contract captured before implementation. |
| Slice 1: Lock Add Recipe Routing And Workflow State | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/add-workflow-state.test.ts`; `npm run lint`; `npm run build` | In Progress | `/recipes/add` route, reducer, wizard, Start screen, placeholder Import source, and placeholder Recipe details shell added. Unauthenticated route smoke redirected to `/login`; signed-in desktop/mobile smoke pending. |
| Slice 2: Extract Recipe Details Draft Logic | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts`; `npm run test:phase1`; `npm run lint`; `npm run build` | Not Started | Draft conversion and create-payload helpers moved to `recipe-details-draft.ts`; `/recipes/new` and `/recipes/add` compose the shared form. |
| Slice 3: Add Ingredient Unit Autocomplete | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/ingredient-unit-suggestions.test.ts`; `npm run test:phase1`; `npm run lint`; `npm run build` | Not Started | Unit suggestions are derived from the canonical list plus the current ingredient draft only; the shared ingredient editor now renders `IngredientUnitCombobox` while preserving existing unit input ids and labels. |
| Slice 4: Integrate Import Source | Verified | `npm run test:import`; `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts`; `npm run lint`; `npm run build` | Not Started | `/recipes/add` embeds the real import form, keeps `/recipes/import` compatibility redirect behavior, advances successful import sessions without browser redirect, and defaults unified handwritten source visibility to public. |
| Slice 5: Description And Steps Editor UX | Deferred | Not Required | Not Required | Removed from this phase per user scope change; editor package choice, toolbar behavior, and source/preview behavior belong in a separate future phase. |
| Slice 6: Build Grouped Media And Source Image Rules | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts`; `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts`; `npm run test:import`; `npm run test:phase1`; `npm run test:phase2`; `npm run lint`; `npm run build`; `git diff --check` | Not Started | Added typed media refs, grouped media section, source-document primary metadata, staged source-image file preview route, and create/update parsing for source primary selection. |
| Slice 7: Reusable Modal Carousel | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts`; `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts`; `npm run test:phase4`; `npm run lint`; `npm run build`; `git diff --check` | Verified | Added reusable body-portal modal carousel, grouped recipe detail gallery, and separate home-card media actions while preserving recipe navigation. Lint passes with existing `<img>` and older test-stub warnings. |
| Slice 8: Landing App Chrome And Route Navigation | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts`; `npm run lint`; `npm run build`; signed-in Chromium smoke at 1440px and 390px | Verified | Route model sends the left-menu Add Recipe action to `/recipes/add`; `/recipes/new` and `/recipes/import` remain direct compatibility routes. Exact responsive smoke caught and fixed drawer stacking over home media actions, then passed at both widths. |
| Slice 8A: Restore Landing Featured Carousel And Image-Click Viewer | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts`; `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts`; `npm run test:phase4`; `npm run lint`; `npm run build`; `git diff --check` | Verified | Restored the compact featured carousel, made landing featured/card image clicks open the reusable modal, kept title/copy links for detail navigation, prioritized image-backed visible recipes, and omitted the carousel shell when no media exists. |
| Slice 9: Align Edit Flow With Shared Form Language | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts`; `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts`; `npm run test:phase1`; `npm run test:phase2`; `npm run lint`; `npm run build`; `git diff --check`; authenticated curl smoke for `/recipes/42/edit` | Verified | Edit now hydrates through the application draft helper, renders through the shared Recipe Details form, keeps Save Changes semantics, preserves existing image removal, and supports existing recipe image/source-page primary media references. |
| Slice 10: Promotion Readiness | Verified | `npm run test:import`; `npm run test:phase1`; `npm run test:phase2`; `npm run test:phase4`; `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts`; `npm run lint`; `npm run build`; `git diff --check`; `node output/playwright/recipe-workflow-refresh/slice10-final-smoke.mjs` | Verified | Final local and desktop/mobile browser verification passed on `http://127.0.0.1:3100`; lint still reports existing warnings only. |
| Branding follow-up: Recipe Workspace Frame | Verified | `node scripts/recipe-workspace-frame-smoke.mjs`; scoped `npx eslint` over touched files; `npm run lint`; `npm run build`; `git diff --check` | Verified | `/recipes/add`, `/recipes/new`, `/recipes/import`, authenticated `/recipes/42`, and `/recipes/42/edit` now render the refreshed top bar and left navigation workspace frame. Generated `.vercel/**` output is ignored so full lint can run cleanly again. |
| Staging deployment hardening | Verified | `npm run lint`; `npm run build`; `git diff --check`; `BASE_URL=http://127.0.0.1:3100 node scripts/recipe-workspace-frame-smoke.mjs`; Vercel-authenticated `curl` for `/api/health`, `/`, and `/recipes/6` | Verified | PR #29 fixed deployed protocol fallback, then PR #30 removed protected-deployment internal self-fetches from recipe detail/edit pages. Latest `pre-main` deployment `dpl_8JdRbZhvicrZkmUx74xicdwHe7B7` is Ready and aliased to `https://staging.recetasfamilia.app`; `/recipes/6` now returns 200 and renders the expected recipe detail. |

## Required Final Verification

- `npm run test:import`
- `npm run test:phase1`
- `npm run test:phase2`
- `npm run test:phase4`
- `npm run lint`
- `npm run build`
- `git diff --check`

## Required Manual Smoke Routes

- `/`
- `/recipes/add`
- `/recipes/new`
- `/recipes/import`
- `/recipes/{id}`
- `/recipes/{id}/edit`
- `/` restored featured carousel image click
- `/` recipe-card image click
- `/` recipe title/copy navigation
- `/` no-media featured carousel omission
