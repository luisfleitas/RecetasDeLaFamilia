# Recipe Save QA Handoff

## Current State
- Feature branch created from `pre-main`: `codex/feature/recipe-save-qa`.
- Luis approved pushing the branch and retrying against the Vercel-hosted app.
- Branch was pushed and hosted staging validation passed.
- Follow-up fix for branch previews falling back to SQLite on Vercel is complete.
- Current healthy branch preview: `https://recetas-7957yea43-luisfleitas-1188s-projects.vercel.app`.
- Local fix is complete for Vercel `FUNCTION_PAYLOAD_TOO_LARGE` failures when saving recipes with multiple images: create/edit forms now save recipe metadata separately, then upload one image per request with a 4MB per-image cap.
- OCR upload strategy is implemented for handwritten import: hosted UI stages handwritten images in Vercel Blob via client multipart uploads, then parses ordered staged source-document ids instead of sending raw OCR images through the parse request.
- Recipe import document upload now supports selecting multiple image files; multi-image selections are routed into the existing handwritten OCR batch flow.

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
- Added `POST /api/recipes/[id]/images` for one-image-per-request uploads.
- Updated create/edit forms to submit recipe metadata first and upload selected images through the image-specific endpoint.
- Added shared recipe image upload constraints with a 4MB per-image cap and updated English/Spanish validation copy.
- Trimmed recipe detail image responses to UI-safe refs so `GET /api/recipes/[id]?includeImages=true` does not expose storage keys or large/internal image metadata.
- Confirmed hosted image uploads use the existing `VercelBlobStorageProvider` when `IMAGE_STORAGE_DRIVER=vercel-blob` or `blob`; README and image-upload plan now document the Vercel Blob provider instead of the older future-S3 wording.
- Added authenticated handwritten source-image staging endpoints:
  - `POST /api/recipes/import/source-images/upload` for Vercel Blob client upload tokens and upload-completed callbacks.
  - `GET /api/recipes/import/source-images?uploadBatchId=...` for ordered staged source lookup.
  - `POST /api/recipes/import/source-images` as the one-image-at-a-time local/server fallback.
- Updated handwritten parse to accept ordered staged source document ids and attach those staged docs to the created import session without re-uploading bytes during parse.
- Added OCR-specific limits separate from saved recipe photos: max 6 images, max 10MB per OCR source image, max 20MB combined OCR batch, accepted JPG/PNG/WEBP/TIFF/BMP.
- Added cleanup coverage in the source-document cleanup path for expired unclaimed handwritten staging rows.
- Added a document-upload selection resolver so one document still parses as a document, while multiple selected images move into the handwritten batch parser and mixed multi-file selections show a clear error.

## In Progress
- Hosted preview redeploy and manual browser confirmation are complete for the split image-upload and OCR Blob staging fixes.

## Next Action
- Open a PR from `codex/feature/recipe-save-qa` into `pre-main`, wait for required checks, then merge to `pre-main`.

## Known Issues
- Local smoke scripts that call the dev server may need elevated sandbox permission for loopback HTTP.
- Manual UI carousel clicking still needs browser confirmation after API smoke passes.
- Earlier branch preview deployments `https://recetas-a0s3xps91-luisfleitas-1188s-projects.vercel.app` and `https://recetas-irwy39ube-luisfleitas-1188s-projects.vercel.app` deployed successfully, but `/api/health` reported degraded database connectivity and `/api/auth/login` returned `500`; this is fixed in the current branch preview.
- The old hosted preview error was triggered by Vercel's 4.5MB function payload limit. The app now caps individual recipe image uploads at 4MB and avoids batching multiple image files in one create/edit request.
- Handwritten OCR images intentionally do not use the 4MB saved-recipe-photo cap; they stage through Blob with OCR-specific 10MB per-image and 20MB combined limits to protect recognition quality.

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
- `npx vercel curl /api/health --deployment https://recetas-7957yea43-luisfleitas-1188s-projects.vercel.app -- --silent --show-error --include` returned HTTP `200` with healthy app, database, and Blob checks after the final feature-preview redeploy.
- `npx vercel curl /api/auth/login --deployment https://recetas-7957yea43-luisfleitas-1188s-projects.vercel.app -- --silent --show-error --include --request POST --header 'Content-Type: application/json' --data '{"username_or_email":"alice","password":"Password123!"}'` returned HTTP `200` after the final feature-preview redeploy.
- Luis manually confirmed the hosted multiple-image OCR import issue is fixed on the feature preview.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/recipe-image-upload-route.test.ts` passed after adding the one-image upload route.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/import-source-image-display.test.ts` passed after trimming detail image responses.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/phase0-image-service.test.ts scripts/phase1-use-cases.test.ts scripts/recipe-image-upload-route.test.ts scripts/import-source-image-display.test.ts` passed.
- `git diff --check` passed.
- `npm run build` passed.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/phase0-image-service.test.ts` passed after adding provider-selection coverage for the `blob` alias and Vercel Blob prefix/public-URL behavior.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/import-source-image-upload-route.test.ts` passed after adding Blob upload-token and upload-completion coverage.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/import-routes.integration.test.ts` passed after adding staged handwritten parse coverage.
- `npm run test:import` passed after adding OCR source-image staging.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/phase0-image-service.test.ts scripts/phase1-use-cases.test.ts scripts/recipe-image-upload-route.test.ts scripts/import-source-image-display.test.ts` passed after the OCR staging changes.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/import-file-selection.test.ts` passed after adding document-upload multi-image selection coverage.
- `npm run test:import` passed after routing multi-image document selections to the handwritten batch parser.
- `git diff --check` passed after the multi-image selection fix.
- `npm run build` passed after the multi-image selection fix.

## Manual Testing Status
- API-backed create/edit save behavior is verified locally.
- API-backed handwritten OCR staging and parsing behavior is verified locally.
- Hosted manual UI review confirmed the multiple-image handwritten OCR import flag and branch preview login path are working on `https://recetas-7957yea43-luisfleitas-1188s-projects.vercel.app`.
- Hosted API checks confirmed healthy database/Blob status and seeded `alice` login on `https://recetas-7957yea43-luisfleitas-1188s-projects.vercel.app`.
- Manual home carousel controls are still not separately recorded in this handoff, but the user approved promotion after hosted OCR validation.

## Decisions Already Approved
- Push the feature branch for hosted validation, but do not push to production.
- Generate 3 recipe-related images per create/edit test pass.
