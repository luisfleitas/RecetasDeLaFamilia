# Deployment Pipeline Handoff

## Current State

- Feature branch created: `codex/feature/deployment-pipeline`.
- Requirements folder created: `requirements/deployment-pipeline/`.
- Initial deployment pipeline plan created.
- Initial implementation tracker created.
- Phase 1 completed: GitHub Actions quality gate.
- Phase 2 blocked on provisioned Neon staging/production resources.
- Phase 3 local/provider slice completed: Vercel Blob storage provider added behind the existing abstraction.
- Phase 4 completed: `/api/health` and health smoke coverage.
- Phase 5 in progress: Vercel project setup, GitHub repository connection, custom domains, and environment-variable configuration are complete; live resource deployment/validation remains.
- Phase 6/7 operational readiness is documented in `requirements/deployment-pipeline/operations-runbook.md` while Phase 5 waits on live secrets/resources.
- Vercel project `recetas` is linked locally through `.vercel/project.json` and connected to `https://github.com/luisfleitas/RecetasDeLaFamilia`.
- Draft PR opened from `codex/feature/deployment-pipeline` into `pre-main`: https://github.com/luisfleitas/RecetasDeLaFamilia/pull/16.
- First Vercel deployment is ready at `https://recetas-erdd5x663-luisfleitas-1188s-projects.vercel.app`, with assigned alias `https://recetas-rose.vercel.app`.
- Custom domains are attached to the Vercel project:
  - `recetasfamilia.app` is verified and assigned as the production custom domain.
  - `staging.recetasfamilia.app` is verified and explicitly bound to the `pre-main` git branch.
- `.github/workflows/ci-auth.yml` renamed to workflow `CI` and now includes a `quality-gate` job for lint, build, import tests, and phase tests.
- Phase 1 local verification passed.
- GitHub Actions run `25141760199` passed for `CI / quality-gate` and `CI / auth-smoke` on commit `3b586fc`.
- `pre-main` branch protection now requires `CI / quality-gate` and `CI / auth-smoke`.

## Completed

- Confirmed this is a new feature effort.
- Confirmed Vercel GitHub Integration as deployment mechanism.
- Confirmed GitHub Actions should run checks only.
- Confirmed branch mapping:
  - PRs/feature branches use Vercel preview URLs.
  - `pre-main` deploys staging.
  - `main` deploys production.
- Confirmed production domain: `recetasfamilia.app`.
- Confirmed staging domain: `staging.recetasfamilia.app`.
- Confirmed Neon Postgres for durable database.
- Confirmed Vercel Blob for durable upload/source-document storage.
- Confirmed fully separated production/staging/preview environments.
- Confirmed production starts with a clean database.
- Confirmed staging/previews use seed/sample data.
- Confirmed manual GitHub-visible approval before promoting to production.
- Confirmed runtime logs and rollback runbook are in v1 scope.
- Confirmed paid uptime/alerts are not in v1 scope.
- Confirmed `/api/health` should check app, database, and Blob config only.
- Confirmed standard and handwritten import should be enabled in production.
- Confirmed preview OpenAI usage should be disabled by default with opt-in path.
- Treated `requirements/deployment-pipeline/plan.md` as approved for Phase 1 execution.
- Converted the approved plan into Phase 1 implementation tasks.
- Preserved the existing auth, route guard, and logout smoke CI coverage as the `auth-smoke` job.
- Fixed stale TypeScript test fixtures that were missing `language`, `thumbnailUrl`, and `fullUrl` fields required by the current domain contracts.
- Ran the full Phase 1 local verification bundle successfully.
- Fixed the initial GitHub CI failure by running CI on Node 24, matching the repo's native TypeScript test-script requirements.
- Pushed `3b586fc` and confirmed both GitHub Actions jobs passed.
- Configured `pre-main` branch protection with strict required status checks for `CI / quality-gate` and `CI / auth-smoke`.
- Authenticated Vercel CLI, linked the local repo to Vercel project `recetas`, and connected the GitHub repository.
- Created the first ready Vercel deployment: `dpl_sBUGUvXx94Ltrzekmwd3opKBz3xi`.
- Attached `recetasfamilia.app` and `staging.recetasfamilia.app` to the Vercel project.
- Updated `staging.recetasfamilia.app` to target the `pre-main` branch.
- Added the deployment operations runbook with live resource setup, Vercel environment variables, staging acceptance, manual production approval, log review, post-deploy validation, and rollback steps.
- Added provider-aware Prisma generation/runtime support so deployed Neon environments use Postgres while local development keeps SQLite.
- Added the missing fixed Vercel environment variables, including `DATABASE_PROVIDER=postgres`, for production and the `pre-main` preview environment.
- Committed and pushed deployment runtime readiness changes in `5e5b102`.
- Opened draft PR #16 into `pre-main`; GitHub Actions and Vercel checks were in progress at handoff update time.
- Fixed the first PR #16 quality-gate failure by making provider-specific database URLs ignore incompatible `DATABASE_URL` values, covering CI's SQLite `DATABASE_URL` during the Postgres schema check.
- Refreshed PR #16 checks are passing for Vercel, `auth-smoke`, and `quality-gate` on commit `6e840b1`.

## In Progress

- Phase 2 Neon resource validation: baseline SQL still needs to be applied/validated against actual Neon staging/production resources.
- Phase 3 Blob resource validation: live staging Blob writes/reads/deletes still need to be checked after redeploy.
- Phase 5 Vercel setup: project import, GitHub connection, custom-domain attachment, environment variables, branch push, draft PR, and CI fixes are done; waiting on PR readiness/merge to `pre-main`, staging redeploy, and staging validation.
- Phase 6/7 docs: operational checklist and rollback runbook are ready for use once staging can be validated.

## Next Action

Mark PR #16 ready when appropriate, merge it to `pre-main`, and let Vercel redeploy staging. After `pre-main` redeploys staging, apply the generated Postgres baseline to the staging Neon database if it has not already been applied, seed staging sample data, and run the staging validation checklist at `https://staging.recetasfamilia.app`.

## Known Issues

- Runtime now supports Postgres for deployed Neon environments, but the generated baseline still needs live Neon validation.
- `lib/prisma.ts` and `prisma/seed.mjs` now select Postgres vs SQLite by `DATABASE_PROVIDER`/`DATABASE_URL`.
- Existing SQLite migration files include SQLite-specific SQL and PRAGMA statements, so Neon should use a fresh Postgres baseline migration rather than replaying the current SQLite migration history unchanged.
- Live Vercel Blob operations still need provisioned staging/production stores and `BLOB_READ_WRITE_TOKEN`.
- Preview environment isolation needs a concrete Neon and Blob strategy during implementation.
- Production import/OCR requires OpenAI API keys and cost controls.
- `npm run db:postgres:check` validates schema compatibility and generates `.tmp/postgres/baseline.sql`, but it does not connect to a real Neon database yet.
- `IMAGE_STORAGE_DRIVER=vercel-blob` now selects the Vercel Blob provider, but live Blob operations still need `BLOB_READ_WRITE_TOKEN`.
- `IMAGE_STORAGE_BLOB_PREFIX` isolates preview or staging object paths without changing logical recipe storage keys.
- Earlier `npx --yes vercel@latest env ls` reported no configured Vercel environment variables; current verification confirms Vercel env vars exist.
- Vercel deployment protection is `all_except_custom_domains`, so the custom domains can be used for smoke checks while generated deployment URLs may still require Vercel authentication.
- Existing custom-domain deployments still need a fresh deployment with the updated runtime/env configuration before health can be accepted.
- Added a Secret Intake Checklist and CLI Setup Sequence to `requirements/deployment-pipeline/operations-runbook.md` so the blocked environment-variable gate can resume once live Neon, Blob, JWT, and OpenAI values are available.

## Verification Already Run

- `git status --short --branch`
- `git branch --list 'codex/feature/deployment-pipeline'`
- `rg --files` for existing Vercel/GitHub workflow/config files.
- `rg` for environment and storage/database references.
- Read `package.json`, `.env.example`, `prisma/schema.prisma`, `prisma.config.ts`, and `next.config.ts`.
- Read `requirements/deployment-pipeline/plan.md`.
- Read existing `.github/workflows/ci-auth.yml`.
- `npm run lint` passed with existing warnings only.
- `npm run build` passed.
- `npm run test:import` passed: 64 tests.
- `npm run test:phase0` passed: 5 tests.
- `npm run test:phase1` passed: 7 tests.
- `npm run test:phase2` passed: 9 tests.
- `npm run test:phase3` passed: 7 tests.
- Current re-check: `npx --yes vercel@latest env ls` returned no configured Vercel environment variables.
- Current re-check on 2026-05-01: `curl -s https://staging.recetasfamilia.app/api/health` returned degraded database status with Blob not applicable.
- Current re-check on 2026-05-01: `curl -s https://recetasfamilia.app/api/health` returned degraded database status with Blob not applicable.
- Current re-check: `npm run test:phase4` passed: 4 tests.
- Current re-check: `npm run db:postgres:check` passed and regenerated `.tmp/postgres/baseline.sql`.
- `DATABASE_PROVIDER=postgres node scripts/generate-prisma-client.mjs` passed and generated Prisma Client from `.tmp/postgres/schema.prisma`.
- Current publish check: `npm run lint` passed with existing warnings only.
- Current publish check: `npm run build` passed.
- Current publish check: `npm run db:postgres:check` passed and regenerated `.tmp/postgres/baseline.sql`.
- Current publish check: `npm run test:phase4` passed: 4 tests.
- Current publish check: `npm run test:phase0` passed: 7 tests.
- `git commit -m "Add deployment runtime readiness"` created `5e5b102`.
- `git push -u origin codex/feature/deployment-pipeline` pushed `5e5b102`.
- `gh pr create --base pre-main --head codex/feature/deployment-pipeline --draft ...` opened PR #16.
- `gh pr view 16 --json ...` confirmed PR #16 is open, draft, targets `pre-main`, and had GitHub Actions plus Vercel checks in progress.
- `gh pr checks 16 --watch` found Vercel and `auth-smoke` passing, with `quality-gate` failing on the Postgres schema compatibility step.
- `gh run view 25199427108 --job 73887103022 --log-failed` showed Prisma rejected CI's SQLite `DATABASE_URL=file:./ci-quality.db` for the generated Postgres schema.
- A refreshed PR run then failed in `test:phase0` because the new regression test used an env object that did not satisfy the repository's TypeScript `ProcessEnv` shape; the test was updated to use a `process.env`-shaped object.
- `DATABASE_URL='file:./ci-quality.db' npm run db:postgres:check` passed after the provider URL fix.
- `npm run test:phase4` passed: 5 tests.
- `npm run test:phase0` passed: 7 tests.
- `npm run lint` passed with existing warnings only.
- Final `gh pr checks 16 --watch` on commit `6e840b1` passed: Vercel, Vercel Preview Comments, two `auth-smoke` runs, and two `quality-gate` runs.
- `npx --yes vercel@latest env ls` confirmed production and `pre-main` preview environment variables exist, including `DATABASE_PROVIDER=postgres` and the fixed Blob/import configuration.
- `npm run build` passed after switching build/postinstall to `scripts/generate-prisma-client.mjs`.
- `npm run test:phase0` passed: 7 tests.
- `npm run test:phase4` passed: 4 tests.
- `npm run lint` passed with existing warnings only.
- `npx --yes vercel@latest deploy --yes` authenticated Vercel CLI, linked project `recetas`, connected the GitHub repository, and produced ready deployment `dpl_sBUGUvXx94Ltrzekmwd3opKBz3xi`.
- `npx --yes vercel@latest inspect recetas-erdd5x663-luisfleitas-1188s-projects.vercel.app` confirmed target `production`, status `Ready`, and aliases.
- `npx --yes vercel@latest env ls` confirmed no Vercel environment variables are configured yet.
- `curl -i -s https://recetas-erdd5x663-luisfleitas-1188s-projects.vercel.app/api/health` returned Vercel Authentication `401`.
- `npx --yes vercel@latest domains add recetasfamilia.app` succeeded.
- `npx --yes vercel@latest domains add staging.recetasfamilia.app` succeeded.
- `npx --yes vercel@latest api '/v9/projects/recetas/domains/staging.recetasfamilia.app?teamId=team_ks2SO1XHAK8W5B7XzsmtCvQh' -X PATCH -f gitBranch=pre-main` succeeded.
- `npx --yes vercel@latest api '/v10/projects/recetas/domains?teamId=team_ks2SO1XHAK8W5B7XzsmtCvQh' -X GET` confirmed `staging.recetasfamilia.app` has `gitBranch: "pre-main"` and both custom domains are verified.
- `npx --yes vercel@latest project protection` confirmed SSO protection applies to `all_except_custom_domains`.
- `curl -s https://recetasfamilia.app/api/health` returned `503` with app healthy, database degraded, and Blob not applicable.
- `curl -s https://staging.recetasfamilia.app/api/health` returned `503` with app healthy, database degraded, and Blob not applicable.
- `npm run test:phase4` passed: 4 tests.
- `npm run lint` passed with existing warnings only.
- `npm run build` passed.
- Direct `curl -i -s http://localhost:3100/api/health` returned `200` and healthy app/database with Blob not applicable.
- `BASE_URL=http://localhost:3100 ./scripts/health-smoke-test.sh` passed.
- Phase 3 Blob provider verification passed.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/phase0-image-service.test.ts` passed: 7 tests.
- `npm run test:phase0` passed: 7 storage/image-service tests after migration/type checks.
- `npm run test:phase1` passed: 7 tests.
- `npm run test:phase2` passed: 9 tests.
- `npm run test:import` passed: 64 tests.
- `npm run db:postgres:check` passed.
- `npm run lint` passed with existing warnings only.
- `npm run build` passed.
- GitHub Actions `CI / quality-gate` passed on commit `3b586fc`.
- GitHub Actions `CI / auth-smoke` passed on commit `3b586fc`.
- GitHub `pre-main` branch protection confirmed with required checks `CI / quality-gate` and `CI / auth-smoke`.
- Phase 2 inventory completed across `prisma/schema.prisma`, `prisma.config.ts`, `prisma/seed.mjs`, `lib/prisma.ts`, migrations, and Prisma database call sites.
- `BASE_URL='http://127.0.0.1:3100' ./scripts/auth-smoke-test.sh` passed.
- `BASE_URL='http://127.0.0.1:3100' ./scripts/route-guards-smoke-test.sh` passed.
- `BASE_URL='http://127.0.0.1:3100' ./scripts/logout-smoke-test.sh` passed.
- `npx prisma validate --schema prisma/schema.prisma` passed.
- Temporary generated Postgres schema validation passed.
- Temporary generated Postgres baseline SQL generation passed with `prisma migrate diff --from-empty --to-schema .tmp/schema.postgres.prisma --script`.
- `npm run db:postgres:check` passed.
- `npm run lint` passed with existing warnings only.
- `npm run build` passed.
- `npm run test:import` passed: 64 tests.
- `npm run test:phase0` passed: 5 tests.
- `npm run test:phase1` passed: 7 tests.
- `npm run test:phase2` passed: 9 tests.
- `npm run test:phase3` passed: 7 tests.

## Manual Testing Status

- Not started. Phase 1 is CI-only so far.

## Decisions Already Approved

- Use Vercel GitHub Integration for deployments.
- Use GitHub Actions for required checks only.
- Use Neon Postgres.
- Use Vercel Blob.
- Fully separate production, staging, and preview environments.
- Use custom domains now.
- Keep future domain changes easy through Vercel/domain/env configuration.
- Add basic runtime logs and rollback runbook now.
- Add a health endpoint.
- Include cost-control checklist.
