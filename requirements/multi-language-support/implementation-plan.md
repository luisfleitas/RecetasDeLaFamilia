# Multi-Language Support Implementation Plan

## Status
- Workflow phase: Phase 7 implementation in progress
- Design approval status: Approved
- Plan approval status: Approved on 2026-04-21
- Approved design direction: Option A with modified header locale dropdown
- Progress snapshot updated on 2026-04-24 from the current branch worktree
- Completed implementation slices: Slice 0 foundations, Slice 1 data model and recipe-language support, Slice 2 root locale and shared chrome, Slice 3 auth proof scope, Slice 4 recipe proof scope
- In progress: Slice 5 family proof scope, Slice 6 polish and hardening
- Not yet complete: mobile QA for longer Spanish copy, invite accept/decline rendered-page localization pass

## Inputs Received
- [plan.md](/Users/luisfleitas/Personal%20Projects/Recetas/requirements/multi-language-support/plan.md)
- [research-pack.md](/Users/luisfleitas/Personal%20Projects/Recetas/requirements/multi-language-support/research-pack.md)
- [design-options.md](/Users/luisfleitas/Personal%20Projects/Recetas/requirements/multi-language-support/design-options.md)
- Existing implementation patterns in the current codebase.

## Assumptions
- Approved design direction:
  - Option A header locale dropdown with flag plus text label
  - Add Family Recipe, locale dropdown, and signed-in pill share one desktop action row
  - Add Family Recipe remains single-line in desktop review
  - recipe-language control in Basic info and import review
  - recipe-language pill on detail page
- Launch locale set is `en` and `es`.
- Recipe language set is `en` and `es`.
- No locale-prefixed routes in v1.

## Deliverables
### Architecture Decisions
#### Locale architecture
- Read active locale from cookie on the server.
- Expose a small locale helper for server and client code.
- Use typed dictionaries by domain:
  - `common`
  - `home`
  - `auth`
  - `recipes`
  - `families`

#### Message architecture
- Stop relying on raw English messages as the UI contract.
- Touched APIs return stable `code` values.
- UI maps `code` to localized strings.
- Validation helpers move from raw English text to typed validation errors or code-bearing errors where needed.

#### Recipe language architecture
- Add a recipe-level `language` field to persisted recipe data.
- Carry the field through:
  - create
  - update
  - import session handoff
  - read/detail response
- Treat missing value on legacy recipes as:
  - schema default for new writes
  - safe fallback display behavior for existing records

### Touched File Map
#### Data and domain
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `lib/domain/recipe.ts`
- `lib/application/recipes/validation.ts`

#### Locale and formatting foundation
- `lib/i18n/*` or equivalent new modules under `lib/`
- shared formatting helpers under `lib/`
- [app/layout.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/layout.tsx)

#### Shared UI chrome
- [app/page.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/page.tsx)
- [app/_components/recipe-visibility-tabs.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/_components/recipe-visibility-tabs.tsx)
- any shared button/header utilities if required

#### Auth proof scope
- [app/login/page.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/login/page.tsx)
- `app/register/page.tsx`
- `app/account/change-password/*`
- `app/api/auth/login/route.ts`
- `app/api/auth/register/route.ts`
- [lib/application/auth/validation.ts](/Users/luisfleitas/Personal%20Projects/Recetas/lib/application/auth/validation.ts)

#### Recipe proof scope
- [app/recipes/new/new-recipe-form.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/recipes/new/new-recipe-form.tsx)
- `app/recipes/[id]/edit/edit-recipe-form.tsx`
- [app/recipes/[id]/page.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/recipes/[id]/page.tsx)
- [app/recipes/import/import-recipe-form.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/recipes/import/import-recipe-form.tsx)
- `app/api/recipes/route.ts`
- `app/api/recipes/[id]/route.ts`

#### Family proof scope
- `app/account/families/*`
- `app/invite/family/[token]/*`
- `app/api/family-invites/[token]/*`
- `app/api/families/[familyId]/invite-links/*`
- `lib/application/families/validation.ts`

### Slice Plan
#### Slice 0: foundations
Status: Completed on the current branch.

- Add locale config, supported locale list, cookie key, and normalization helpers.
- Add dictionary structure for `en` and `es`.
- Add shared date/datetime formatting helpers.
- Introduce stable message codes for touched auth and recipe routes first.
- Refactor `app/api/recipes/route.ts` so error-status classification no longer depends on English substring matching.

Completed work:
- Added locale config and normalization helpers under `lib/i18n/config.ts`.
- Added typed message dictionaries in `lib/i18n/messages.ts` and server helpers in `lib/i18n/server.ts`.
- Added shared formatting helpers in `lib/i18n/format.ts`.
- Added locale context plumbing in `app/_components/locale-provider.tsx`.
- Added locale persistence endpoint in `app/api/locale/route.ts`.
- Added auth message-code infrastructure in `lib/application/auth/errors.ts`.

Remaining follow-up:
- Recipe route error handling still needs the planned refactor away from English substring matching.

#### Slice 1: data model and recipe-language support
Status: Completed on the current branch.

- Add `language` field to recipe persistence layer.
- Add migration and backfill strategy for existing recipes.
- Extend create/update validation and domain types.
- Ensure recipe reads include language metadata.

Completed work:
- Added `Recipe.language` with an `en` default in `prisma/schema.prisma` and the corresponding migration.
- Extended recipe domain and validation types so create and update payloads carry a typed recipe language.
- Updated Prisma recipe persistence so create, update, and read flows store and return recipe language.
- Extended imported-draft handling so import parsing, handwritten fallback drafts, OpenAI extraction payloads, and import-session edits preserve recipe language through the handoff to recipe creation.
- Preserved recipe language through the current create and edit forms even before the dedicated recipe-language UI control is added in the recipe proof scope.

#### Slice 2: root locale and shared chrome
Status: Completed on the current branch.

- Make root layout locale-aware and set `<html lang>`.
- Add header locale dropdown in the action row.
- Style the dropdown trigger and menu so they still fit the current Recetas control language.
- Persist locale change and refresh active UI.
- Localize home page shared chrome and visibility tab copy.

Completed work:
- `app/layout.tsx` now resolves the active locale on the server and sets `<html lang>`.
- The approved header locale dropdown is implemented in `app/_components/locale-switcher.tsx`.
- Locale changes persist through `app/api/locale/route.ts` and refresh the current route.
- `app/page.tsx`, `app/_components/recipe-visibility-tabs.tsx`, and `app/_components/logout-button.tsx` now consume localized messages.
- Shared styling for the locale switcher/menu has been added in `app/globals.css`.

#### Slice 3: auth proof scope
Status: Completed on the current branch.

- Localize login/register/change-password UI.
- Convert touched auth endpoints to stable codes plus localized UI rendering.
- Verify submit, success, error, and redirect behavior.

Completed work:
- Localized auth screens are in place for login, register, and change-password flows.
- Touched auth endpoints now return stable `errorCode` values instead of raw user-facing English strings.
- Auth validation and use-case layers now raise typed auth message codes.

Verification:
- Auth dictionary coverage is covered by `scripts/i18n-auth.test.ts`.
- Auth route guards are covered by `scripts/route-guards-smoke-test.sh`.

#### Slice 4: recipe proof scope
Status: Completed on the current branch.

- Add recipe-language control to new recipe Basic info.
- Add recipe-language control to edit recipe Basic info.
- Add recipe-language control to import review before continue.
- Add language metadata pill to recipe detail header.
- Localize recipe form and detail copy in touched flows.
- Introduce localized validation and operational messages in these flows.

Completed work:
- Added `RecipeLanguageControl` and wired it into new recipe, edit recipe, and import review flows.
- Added recipe-language persistence through create, edit, import parse, import hydration, import continue, and recipe detail read paths.
- Added the recipe-language metadata pill to recipe detail.
- Localized touched recipe form, import, detail, delete, ingredient, validation, and operational copy through the recipe dictionary.
- Added `scripts/recipe-language.test.ts` and import-route assertions for recipe-language persistence.

#### Slice 5: family proof scope
Status: In progress.

- Localize dashboard and invite UI copy.
- Localize touched API-driven error/success states via codes.
- Replace direct API error-string rendering in touched family screens.

Completed work:
- `app/account/families/families-dashboard.tsx` has been brought onto the locale context and now includes the locale switcher.
- Family dashboard visible copy, loading/empty states, action labels, invite/deletion labels, localized date formatting, and fallback UI errors now read from the `family` dictionary.
- Added `scripts/i18n-family.test.ts` to require `en`/`es` family dashboard message coverage.

Remaining follow-up:
- Family API route audit is still needed for any remaining raw error responses without stable `code` values.
- Invite acceptance/decline page localization remains pending outside the dashboard pending-invites summary.
- Manual QA is still needed for longer Spanish family labels on mobile.

#### Slice 6: polish and hardening
Status: In progress.

- Sweep remaining touched strings.
- Verify mobile layout under Spanish copy.
- Add or update tests.
- Finalize QA checklist execution.

### Rollout Notes
- Do not attempt full-app localization in the first implementation pass.
- Defer home-card recipe language display unless the detail-page pill proves insufficient.
- Keep the recipe-language field separate from OCR source-language handling and UI locale.

### Testing Strategy
- Unit coverage for locale normalization and formatting helpers.
- Validation tests for recipe language acceptance and fallback behavior.
- Integration checks for recipe create/update carrying `language`.
- Manual verification for locale persistence, detail-page metadata, and form controls.

Current verification status:
- Family dashboard dictionary coverage verified with `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/i18n-family.test.ts scripts/i18n-auth.test.ts`.
- Build verified with `npm run build`.
- Recipe-language validation and import-language coverage verified with `scripts/recipe-language.test.ts` and `scripts/import-routes.integration.test.ts`.
- QA checklist execution is partially complete; mobile viewport and invite accept/decline rendered-page checks remain pending.

## Open Risks
- Schema changes for recipe language may require decisions about legacy nulls vs defaults.
- Family flows are still the most likely area to leak English because of direct API error consumption.
- Import flow may need a future parser enhancement if auto-detecting recipe language becomes a requirement later.
- Starting coding before design approval would violate the Recetas UI workflow and risks ad hoc hybrid UI decisions.
- The approved dropdown introduces a small pattern deviation from the stronger tab reference, so implementation should keep its styling restrained and aligned with existing controls.

## Next Agent Should Do
- Treat this document as the active implementation tracker rather than only the Approval Gate 2 artifact.
- Run the remaining mobile viewport QA for Spanish header wrapping, recipe forms, recipe metadata pills, and family dashboard tabs/actions.
- Run a rendered-page localization pass for invite accept/decline pages outside the dashboard pending-invites summary.
- Do not mark the feature ready for merge until the remaining QA follow-ups are resolved or explicitly deferred.
