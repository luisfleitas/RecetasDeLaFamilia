# Family Pages Rebrand QA Checklist

## Status

- Status: Complete for draft PR to `pre-main`.
- Branch: `codex/feature/family-pages-rebrand`
- QA date: 2026-05-12
- Local QA URL: `http://127.0.0.1:3100`
- Local QA env note: dev server and build used SQLite overrides because `.env.local` contains hosted Postgres variables while local QA uses the SQLite Prisma schema.

## Automated Verification

- [x] Focused family feature tests:
  - Command: `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts scripts/family-page-access.test.ts scripts/family-workflow-state.test.ts scripts/family-image-upload.test.ts scripts/family-direct-invite.test.ts scripts/create-family-workflow.test.ts scripts/edit-family-workflow.test.ts scripts/manage-families-workspace.test.ts scripts/i18n-family.test.ts`
  - Result: Passed, 56 tests.
- [x] Phase 3 regression:
  - Command: `npm run test:phase3`
  - Result: Passed, 7 tests.
- [x] Lint:
  - Command: `npm run lint`
  - Result: Passed with 12 existing warnings.
- [x] Build:
  - Command: `env DATABASE_URL=file:./dev.db recetas_DATABASE_URL= recetas_POSTGRES_URL= recetas_POSTGRES_PRISMA_URL= POSTGRES_URL= POSTGRES_PRISMA_URL= npm run build`
  - Result: Passed outside sandbox after Turbopack hit a sandbox-only CSS worker permission failure.
- [x] Browser smoke:
  - Command: `node output/playwright/family-pages-rebrand/family-pages-smoke.mjs`
  - Result: Passed at 1440px and 390px.
- [x] Whitespace:
  - Command: `git diff --check`
  - Result: Passed.

## Browser Coverage

- [x] Create Family desktop at 1440px.
- [x] Create Family mobile at 390px.
- [x] Edit Family admin desktop at 1440px.
- [x] Edit Family admin mobile at 390px.
- [x] View Family member read-only desktop at 1440px.
- [x] View Family member read-only mobile at 390px.
- [x] Manage Families desktop at 1440px.
- [x] Manage Families mobile at 390px.
- [x] Left navigation create, edit, more, and mobile drawer family routes.
- [x] Recipe Add/Edit family visibility controls.
- [x] Duplicate `id` check on family workflow smoke surfaces.
- [x] Horizontal overflow check on family workflow smoke surfaces.

## Evidence

- `output/playwright/family-pages-rebrand/family-pages-smoke.mjs`
- `output/playwright/family-pages-rebrand/family-pages-smoke.json`
- `output/playwright/family-pages-rebrand/family-home-navigation-1440.png`
- `output/playwright/family-pages-rebrand/family-home-navigation-390.png`
- `output/playwright/family-pages-rebrand/family-create-1440.png`
- `output/playwright/family-pages-rebrand/family-create-390.png`
- `output/playwright/family-pages-rebrand/family-edit-admin-1440.png`
- `output/playwright/family-pages-rebrand/family-edit-admin-390.png`
- `output/playwright/family-pages-rebrand/family-view-member-1440.png`
- `output/playwright/family-pages-rebrand/family-view-member-390.png`
- `output/playwright/family-pages-rebrand/family-manage-1440.png`
- `output/playwright/family-pages-rebrand/family-manage-390.png`
- `output/playwright/family-pages-rebrand/family-recipe-visibility-1440.png`
- `output/playwright/family-pages-rebrand/family-recipe-visibility-390.png`

## Issues Found And Resolved

- [x] The new Playwright smoke could not run because `playwright` was not installed locally. Added it as a dev dependency so existing and new smoke scripts can import `playwright`.
- [x] The local dev server initially selected the hosted Postgres adapter from `.env.local` while the generated local Prisma client used SQLite. Restarted local QA with explicit SQLite overrides.
- [x] The non-admin member View route rendered the Invites step disabled, preventing read-only invite review. Added `buildMemberViewFamilyStepViewModels` and regression coverage so Details and Invites are both reachable.

## Residual Notes

- Existing unrelated untracked recipe-workflow evidence remains under `output/playwright/recipe-workflow-refresh/` and was intentionally left untouched.
- `npm install --save-dev playwright` reported audit findings after installation; dependency audit remediation is outside this family-pages release scope.
