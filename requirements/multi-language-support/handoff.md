# Multi-Language Support Handoff

## Current State
- Branch: `codex/feature/multi-language-support`
- Workflow phase: Phase 7 implementation and QA hardening
- The proof-scope multilingual implementation is largely in place across locale plumbing, shared chrome, auth, recipe language, recipe flows, and family dashboard localization.
- The branch is not yet merge-ready until remaining mobile QA and invite accept/decline localization checks are resolved or explicitly deferred.

## Completed
- Added `AGENTS.md` new-chat handoff guidance.
- Added locale config, normalization, dictionaries, server helpers, formatting helpers, locale provider, locale switcher, and locale persistence endpoint.
- Localized home/shared chrome, visibility tabs, auth pages, recipe create/edit/import/detail/delete surfaces, ingredient editor copy, and family dashboard copy.
- Added stable auth error-code handling and localized UI mapping.
- Added persisted recipe `language` field, Prisma migration, domain types, validation, create/update/read persistence, and import handoff support.
- Added recipe-language controls to new recipe, edit recipe, and import review flows.
- Added recipe-language metadata pill to recipe detail.
- Added design and planning artifacts under `requirements/multi-language-support/` plus browser-reviewable wireframes under `design/`.

## In Progress
- Family proof-scope hardening outside the dashboard summary.
- Polish and QA hardening for longer Spanish copy on mobile.

## Next Action
- Run or complete mobile viewport QA for Spanish header wrapping, recipe forms, recipe metadata pills, and family dashboard tabs/actions.
- Run a rendered-page localization pass for invite accept/decline pages outside the dashboard pending-invites summary.
- Update `requirements/multi-language-support/qa-checklist.md` with those results.

## Known Issues
- Family API route audit may still find raw API English errors without stable `code` values.
- Invite accept/decline pages still need rendered localization verification.
- Mobile wrapping under longer Spanish labels still needs a focused pass.

## Verification Already Run
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/i18n-auth.test.ts scripts/i18n-family.test.ts scripts/recipe-language.test.ts`
- `npm run test:import`
- `npm run test:phase1`
- `npm run test:phase2`
- `npm run test:phase3`
- `npm run lint` with existing warnings only.
- `npm run build`
- `BASE_URL='http://localhost:3000' ./scripts/auth-smoke-test.sh`
- `BASE_URL='http://localhost:3000' ./scripts/route-guards-smoke-test.sh`
- `BASE_URL='http://localhost:3000' ./scripts/family-phase1-curl-smoke-test.sh`

## Manual Testing Status
- Passed desktop/browser locale persistence across home, login, new recipe, recipe detail, edit recipe, import, and family dashboard routes.
- Passed browser checks for recipe-language control visibility in new/edit/import review and recipe-language metadata on detail.
- Pending mobile viewport QA.
- Pending rendered invite accept/decline localization pass.

## Decisions Already Approved
- Approved design direction: Option A with modified header locale dropdown.
- Locale switcher uses flag plus text label in the header action row.
- Add Family Recipe, locale dropdown, and signed-in pill share one desktop action row.
- Recipe language remains separate from UI locale.
- Recipe-language control lives in Basic info and import review.
- Recipe detail shows recipe language as a metadata pill.
- Home-card recipe-language display is deferred unless detail-page display proves insufficient.
