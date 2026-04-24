# Multi-Language Support Handoff

## Current State
- Branch: `codex/feature/multi-language-support`
- Workflow phase: Final verification and PR preparation
- The proof-scope multilingual implementation is largely in place across locale plumbing, shared chrome, auth, recipe language, recipe flows, and family dashboard localization.
- The branch is ready for final verification and PR preparation.

## Completed
- Added `AGENTS.md` new-chat handoff guidance.
- Added locale config, normalization, dictionaries, server helpers, formatting helpers, locale provider, locale switcher, and locale persistence endpoint.
- Localized home/shared chrome, visibility tabs, auth pages, recipe create/edit/import/detail/delete surfaces, ingredient editor copy, and family dashboard copy.
- Added stable auth error-code handling and localized UI mapping.
- Added persisted recipe `language` field, Prisma migration, domain types, validation, create/update/read persistence, and import handoff support.
- Added recipe-language controls to new recipe, edit recipe, and import review flows.
- Added recipe-language metadata pill to recipe detail.
- Localized the standalone family invite accept/decline page and mapped its API codes to localized UI copy.
- Completed mobile Spanish viewport QA for the remaining proof-scope pages and family dashboard manage tabs/actions.
- Completed rendered invite accept/decline/undo/accept localization QA outside the dashboard summary.
- Added stable `INTERNAL_ERROR` codes to generic family API 500 catch-all responses and covered them with a regression test.
- Added design and planning artifacts under `requirements/multi-language-support/` plus browser-reviewable wireframes under `design/`.

## In Progress
- PR preparation.

## Next Action
- Commit and push the verified branch, then open the PR back into `pre-main`.

## Known Issues
- Generic family API 500 responses now include stable `INTERNAL_ERROR` codes; the response `error` value still includes the diagnostic message for server troubleshooting, while touched UI clients continue to render localized fallback copy.
- Local QA created temporary families/invites in the local dev database while exercising invite flows.

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
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/i18n-family.test.ts scripts/i18n-auth.test.ts scripts/recipe-language.test.ts`
- `npm run build`
- Playwright mobile QA at 390x844 against `http://localhost:3100` for `/`, `/recipes/new`, `/recipes/37`, `/recipes/37/edit`, `/account/families`, and `/invite/family/[token]`.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/i18n-family.test.ts`
- Final verification on 2026-04-24:
  - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/i18n-auth.test.ts scripts/i18n-family.test.ts scripts/recipe-language.test.ts`
  - `npm run test:import`
  - `npm run test:phase1`
  - `npm run test:phase2`
  - `npm run test:phase3`
  - `npm run lint` with existing warnings only
  - `npm run build`
  - `BASE_URL='http://localhost:3000' ./scripts/auth-smoke-test.sh`
  - `BASE_URL='http://localhost:3000' ./scripts/route-guards-smoke-test.sh`
  - `BASE_URL='http://localhost:3000' ./scripts/family-phase1-curl-smoke-test.sh`

## Manual Testing Status
- Passed desktop/browser locale persistence across home, login, new recipe, recipe detail, edit recipe, import, and family dashboard routes.
- Passed browser checks for recipe-language control visibility in new/edit/import review and recipe-language metadata on detail.
- Passed mobile viewport QA for Spanish header wrapping, recipe forms, recipe metadata pills, and family dashboard manage tabs/actions.
- Passed rendered invite accept/decline/undo/accept localization pass.

## Decisions Already Approved
- Approved design direction: Option A with modified header locale dropdown.
- Locale switcher uses flag plus text label in the header action row.
- Add Family Recipe, locale dropdown, and signed-in pill share one desktop action row.
- Recipe language remains separate from UI locale.
- Recipe-language control lives in Basic info and import review.
- Recipe detail shows recipe language as a metadata pill.
- Home-card recipe-language display is deferred unless detail-page display proves insufficient.
