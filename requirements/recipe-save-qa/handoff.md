# Recipe Save QA Handoff

## Current State
- Feature branch created from `pre-main`: `codex/feature/recipe-save-qa`.
- Luis approved pushing the branch and retrying against the Vercel-hosted app.
- Branch was pushed and hosted staging validation passed.
- Follow-up fix for branch previews falling back to SQLite on Vercel is complete.
- Current healthy branch preview: `https://recetas-2uyhk2wxt-luisfleitas-1188s-projects.vercel.app`.

## Completed
- Baseline local dev server launched at `http://localhost:3000`.
- Existing `phase1-curl-smoke-test.sh` passed locally against `http://127.0.0.1:3000`.
- Test plan documented in `requirements/recipe-save-qa/test-cases.md`.
- Added `scripts/recipe-save-qa-smoke-test.sh`.
- New recipe save QA smoke passed locally against `http://127.0.0.1:3000`.
- Targeted image/recipe use-case tests passed locally.
- Production build passed locally.
- Added hosted-deployment support to `scripts/recipe-save-qa-smoke-test.sh` through `VERCEL_DEPLOYMENT`.
- Vercel-hosted staging smoke passed against `https://staging.recetasfamilia.app`.
- Identified the branch preview failure as SQLite fallback: `DATABASE_URL`/`DATABASE_PROVIDER` were only scoped to `Preview (pre-main)`, while the Neon integration exposes `recetas_DATABASE_URL` to all preview branches.
- Updated Prisma provider detection to use Vercel Neon integration URLs when canonical `DATABASE_URL` is absent.
- Added branch-scoped Vercel preview env vars for `codex/feature/recipe-save-qa`: `JWT_SECRET`, `IMAGE_STORAGE_DRIVER=vercel-blob`, `IMAGE_STORAGE_BLOB_ACCESS=private`, `IMAGE_STORAGE_BLOB_PREFIX=preview/recipe-save-qa`, and `IMAGE_STORAGE_BLOB_PUBLIC_BASE_URL=/uploads`.
- Redeployed the feature preview after adding branch-scoped env vars; health and recipe-save QA now pass on the branch preview.

## In Progress
- Manual UI carousel clicking remains optional if Luis wants visual confirmation after the API-backed hosted smoke.

## Next Action
- Optional: open a PR from `codex/feature/recipe-save-qa` into `pre-main`.
- Optional: click through the home carousel on staging or a healthy branch preview to visually confirm the carousel controls after the API smoke-created data.

## Known Issues
- Local smoke scripts that call the dev server may need elevated sandbox permission for loopback HTTP.
- Manual UI carousel clicking still needs browser confirmation after API smoke passes.
- Earlier branch preview deployments `https://recetas-a0s3xps91-luisfleitas-1188s-projects.vercel.app` and `https://recetas-irwy39ube-luisfleitas-1188s-projects.vercel.app` deployed successfully, but `/api/health` reported degraded database connectivity and `/api/auth/login` returned `500`; this is fixed in the current branch preview.

## Verification Already Run
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/phase1-use-cases.test.ts` passed.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/phase0-image-service.test.ts` passed.
- `BASE_URL='http://127.0.0.1:3000' ./scripts/phase1-curl-smoke-test.sh` passed with local loopback permission.
- `BASE_URL='http://127.0.0.1:3000' ./scripts/recipe-save-qa-smoke-test.sh` passed with local loopback permission.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/phase1-use-cases.test.ts scripts/phase2-use-cases.test.ts scripts/phase0-image-service.test.ts` passed.
- `npm run build` passed.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed before branch publish.
- `git diff --check` passed before branch publish.
- `npm run build` passed before branch publish.
- `BASE_URL='https://staging.recetasfamilia.app' VERCEL_DEPLOYMENT='https://staging.recetasfamilia.app' ./scripts/recipe-save-qa-smoke-test.sh` passed against hosted staging.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/phase4-health.test.ts` failed before the fix with `sqlite` selected for a branch-preview env containing only `recetas_DATABASE_URL`.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/phase4-health.test.ts` passed after the provider fallback fix.
- `DATABASE_URL='' DATABASE_PROVIDER='' recetas_DATABASE_URL='postgresql://recetas:recetas@localhost:5432/branch_preview' node scripts/generate-prisma-client.mjs` generated the Prisma Client from `.tmp/postgres/schema.prisma`.
- `git diff --check` passed after the provider fallback fix.
- `npm run build` passed after the provider fallback fix.
- `npx --yes vercel@latest curl /api/health --deployment https://recetas-2uyhk2wxt-luisfleitas-1188s-projects.vercel.app -- --silent --show-error --include` returned HTTP `200` with healthy app, database, and Blob checks.
- `npx --yes vercel@latest curl /api/auth/login --deployment https://recetas-2uyhk2wxt-luisfleitas-1188s-projects.vercel.app -- --silent --show-error --include --request POST --header 'Content-Type: application/json' --data '{"username_or_email":"alice","password":"Password123!"}'` returned HTTP `200`.
- `BASE_URL='https://recetas-2uyhk2wxt-luisfleitas-1188s-projects.vercel.app' VERCEL_DEPLOYMENT='https://recetas-2uyhk2wxt-luisfleitas-1188s-projects.vercel.app' ./scripts/recipe-save-qa-smoke-test.sh` passed against the fixed branch preview.

## Manual Testing Status
- API-backed create/edit save behavior is verified locally.
- Pending manual UI review of the browser form path and home carousel controls before push/promotion.

## Decisions Already Approved
- Push the feature branch for hosted validation, but do not push to production.
- Generate 3 recipe-related images per create/edit test pass.
