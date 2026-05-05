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
| Start choice selection | Not Started | Not Started | Verified | Not Started | Reducer covers path selection; browser smoke still pending. |
| Manual path | Not Started | Not Started | Verified | Not Started | Reducer covers Start -> Recipe details; shared Recipe Details form is wired for `/recipes/add` and `/recipes/new`. Browser smoke still pending. |
| Import source empty state | Not Started | Not Started | Verified | Not Started | `/recipes/add` now embeds the real import controls with Paste, Document, and Handwritten tabs; browser smoke still pending. |
| Import source processing state | Not Started | Not Started | Verified | Not Started | Embedded import exposes `add-recipe-import-processing` and disables parse controls while parsing. |
| Import source error state | Not Started | Not Started | Verified | Not Started | Embedded import exposes `add-recipe-import-error`; selected text/files stay in local import state where practical. |
| Import success state | Not Started | Not Started | Verified | Not Started | Successful parse/session callback advances `/recipes/add` to Recipe details without a browser redirect. |
| Imported recipe details loaded state | Not Started | Not Started | Verified | Not Started | Draft helper covers imported title, ingredients, description, steps, language, source refs, metadata, and import-complete state. |
| Recipe details validation errors | Not Started | Not Started | Verified | Not Started | Draft helper covers required title, required steps, invalid ingredient, family selection, and primary-image validation. Errors render through the shared form. |
| Ingredient unit autocomplete | Not Started | Not Started | Verified | Not Started | Helper covers canonical suggestions, case-insensitive dedupe, current-recipe custom units, typed filtering, and freeform custom values. Browser smoke still pending. |
| Description rich text editing | Not Started | Not Started | Verified | Not Started | Rich text helper covers plain text, existing Markdown compatibility, deterministic toolbar output, empty content, and safe link handling. |
| Steps rich text editing | Not Started | Not Started | Verified | Not Started | Shared create form and edit form now use `SimpleRichTextEditor` over existing `stepsMarkdown` storage. Browser smoke still pending. |
| Rich text source/preview editor | Verified | Verified | Verified | Verified | Slice 5B keeps the app-owned Markdown editor and adds Source/Preview tabs for description and steps. Preview uses the same formatted rendering normalization as public recipe detail; desktop and 390px browser smoke passed. |
| Public formatted recipe content | Not Started | Not Started | Verified | Not Started | Public recipe detail renders description and steps through `FormattedRecipeContent` after unsafe link normalization. |
| Media empty state | Not Started | Not Started | Verified | Not Started | One combined Media section now renders grouped empty states. Browser smoke still pending. |
| Media with recipe images only | Not Started | Not Started | Verified | Not Started | Media helper and view render the Recipe images group. Browser smoke still pending. |
| Media with source images only | Not Started | Not Started | Verified | Not Started | Media helper and Add Recipe view render Imported source pages from import-session source refs. Browser smoke still pending. |
| Media with both groups | Not Started | Not Started | Verified | Not Started | Media helper supports recipe images plus imported source pages with typed primary refs. Browser smoke still pending. |
| Public recipe gallery with grouped media | Verified | Verified | Verified | Verified | Recipe detail now renders grouped Recipe photos and Imported source pages; desktop and 390px modal smoke passed. |
| Home card with media action | Verified | Not Started | Verified | Verified | Current Slice 7 behavior used a separate media action. Slice 8A supersedes this by making the recipe-card image itself open the viewer modal while title/copy remains the detail route. |
| Home card without media action | Verified | Not Started | Verified | Verified | Current Slice 7 behavior kept image/title navigation to detail. Slice 8A should preserve title/copy navigation but move image clicks to the modal. |
| Landing featured carousel restored | Verified | Verified | Verified | Verified | Slice 8A restores the compact featured carousel above recipe groups when visible recipes have real media. |
| Landing featured carousel image opens modal | Verified | Verified | Verified | Verified | Desktop and 390px Playwright smoke confirmed featured image clicks open the reusable media modal. |
| Landing recipe-card image opens modal | Verified | Verified | Verified | Verified | Desktop and 390px Playwright smoke confirmed recipe-card image clicks open the reusable media modal. |
| Landing title/copy navigation | Verified | Verified | Verified | Verified | Desktop smoke confirmed recipe title links remain `/recipes/{id}` after image clicks became modal triggers. |
| Landing carousel no-media state | Verified | Not Started | Verified | Verified | `buildFeaturedRecipeSlides` now returns no slides for visible recipes without real image/source media, so no `home-featured-carousel` shell renders. |
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
| Slice 5: Add Rich Text Editing | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/rich-text.test.ts`; `npm run test:phase1`; `npm run test:phase2`; `npm run lint`; `npm run build` | Not Started | Markdown-compatible storage only for v1; no persisted HTML, JSON, or schema change introduced. |
| Slice 5B: Improve Rich Text Box Editing Experience | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/rich-text.test.ts`; `npm run test:phase1`; `npm run test:phase2`; `npm run lint`; `npm run build`; desktop/mobile browser smoke | Verified | Chose the custom Recetas-owned editor path after inventorying installed editor options. Description and steps now expose Source/Preview tabs, preserve Markdown-compatible storage, sanitize unsafe preview links, and pass desktop plus 390px smoke on `/recipes/add` and `/recipes/42/edit`. |
| Slice 6: Build Grouped Media And Source Image Rules | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts`; `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-details-draft.test.ts`; `npm run test:import`; `npm run test:phase1`; `npm run test:phase2`; `npm run lint`; `npm run build`; `git diff --check` | Not Started | Added typed media refs, grouped media section, source-document primary metadata, staged source-image file preview route, and create/update parsing for source primary selection. |
| Slice 7: Reusable Modal Carousel | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts`; `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts`; `npm run test:phase4`; `npm run lint`; `npm run build`; `git diff --check` | Verified | Added reusable body-portal modal carousel, grouped recipe detail gallery, and separate home-card media actions while preserving recipe navigation. Lint passes with existing `<img>` and older test-stub warnings. |
| Slice 8: Landing App Chrome And Route Navigation | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts`; `npm run lint`; `npm run build`; signed-in Chromium smoke at 1440px and 390px | Verified | Route model sends the left-menu Add Recipe action to `/recipes/add`; `/recipes/new` and `/recipes/import` remain direct compatibility routes. Exact responsive smoke caught and fixed drawer stacking over home media actions, then passed at both widths. |
| Slice 8A: Restore Landing Featured Carousel And Image-Click Viewer | Verified | `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts`; `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-media-groups.test.ts`; `npm run test:phase4`; `npm run lint`; `npm run build`; `git diff --check` | Verified | Restored the compact featured carousel, made landing featured/card image clicks open the reusable modal, kept title/copy links for detail navigation, prioritized image-backed visible recipes, and omitted the carousel shell when no media exists. |
| Slice 9: Align Edit Flow With Shared Form Language | Not Started | Not Started | Not Started | Save semantics remain Save. |
| Slice 10: Promotion Readiness | Not Started | Not Started | Not Started | Final local and manual verification. |

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
