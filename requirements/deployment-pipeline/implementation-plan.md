# Deployment Pipeline Implementation Plan

## Status

Phase 1 completed on `codex/feature/deployment-pipeline`; Phase 4 local health endpoint and smoke coverage are complete. The Vercel project is linked, the GitHub repository is connected, the production/staging custom domains are attached, and Vercel environment variables now exist. The runtime has been updated to generate/use a Postgres Prisma Client for deployed Neon environments while preserving local SQLite. Staging database, health, homepage, recipe API, and image upload/read/delete lifecycle validation now pass on the `pre-main` staging deployment after the image file route cache fix in `bd5c6f8`.

## Current Phase

Phase 5: Vercel Project, Environments, And Domains. Staging validation is complete for the API/health/image-upload lifecycle; release PR #28 is open from `pre-main` to `main`; explicit production approval, merge, and production validation remain.

## Phase 1 Tasks

- [x] Treat `requirements/deployment-pipeline/plan.md` as approved for Phase 1 execution.
- [x] Add a GitHub Actions quality-gate job for lint, build, import tests, and phase test scripts.
- [x] Preserve existing auth, route guard, and logout smoke coverage in CI.
- [x] Run the Phase 1 verification commands locally.
- [x] Fix CI-gate failures found by local verification.
- [x] Document the required `pre-main` branch protection checks once the workflow names are final.
- [x] Push the branch and confirm GitHub Actions runs the new checks.
- [x] Configure `CI / quality-gate` and `CI / auth-smoke` as required checks on `pre-main`.

## Phase 2 Tasks

- [x] Inventory current Prisma schema/config, SQLite adapter usage, migrations, seed data, and database call sites that assume SQLite.
- [x] Decide whether local development stays on SQLite for now or moves to Postgres in this phase.
- [x] Add Postgres-compatible Prisma schema/config support without breaking local development.
- [x] Create and validate the Postgres migration path for the current schema.
- [x] Add a Postgres compatibility/migration check to CI.
- [x] Define the Neon production, staging, and preview isolation strategy.
- [x] Document the clean production database and seed/sample data process for staging/previews.
- [ ] Validate the generated baseline SQL against an actual Neon staging database once Neon resources exist.
- [x] Update runtime/seed commands for Neon staging and production after database credentials are available.

## Phase 3 Tasks

- [x] Inventory current local image/source-document storage abstraction and serving routes.
- [x] Add a Vercel Blob storage provider behind the existing image storage abstraction.
- [x] Preserve local storage as the default local development provider.
- [x] Preserve backend-agnostic storage keys and app file-serving routes.
- [x] Add environment-driven Blob access and prefix configuration for staging/preview isolation.
- [ ] Configure production Blob storage once the Vercel project exists.
- [x] Configure staging Blob storage once the Vercel project exists.
- [x] Validate Blob writes/reads/deletes against a real staging Blob store once credentials exist.
- [ ] Finalize automated preview Blob cleanup after PR close.

## Phase 3 Decision

- `IMAGE_STORAGE_DRIVER=vercel-blob` selects the Vercel Blob provider.
- Local development stays on `IMAGE_STORAGE_DRIVER=local`.
- Blob objects default to private access because source documents and recipe images share the storage abstraction and app routes own access control.
- `IMAGE_STORAGE_BLOB_PREFIX` isolates staging or preview object paths without changing logical recipe storage keys in the database.
- Live Blob operation validation is deferred until `BLOB_READ_WRITE_TOKEN` exists for a staging Blob store.

## Phase 4 Tasks

- [x] Add `/api/health`.
- [x] Check app availability.
- [x] Check database connectivity with a minimal safe query.
- [x] Check required Blob configuration is present when Blob storage is selected.
- [x] Return environment-safe status data without secrets.
- [x] Add post-deploy smoke check coverage for `/api/health`.

## Phase 4 Decision

- `/api/health` returns `200` when app runtime, database connectivity, and selected storage configuration are healthy.
- `/api/health` returns `503` when the database check fails or Blob storage is selected without `BLOB_READ_WRITE_TOKEN`.
- The health response includes status and check names only; it does not expose secrets or live credential values.
- Live Blob read/write/delete validation stays deferred until staging Blob credentials exist.

## Phase 2 Inventory Findings

- `prisma/schema.prisma` is locked to `provider = "sqlite"` and `prisma/migrations/migration_lock.toml` also records SQLite.
- `lib/prisma.ts` directly imports `@prisma/adapter-better-sqlite3` and always creates `PrismaClient` with a `PrismaBetterSqlite3` adapter.
- `prisma/seed.mjs` also imports `@prisma/adapter-better-sqlite3` and creates its own SQLite-backed `PrismaClient`.
- Several import integration tests create temporary SQLite databases and import `better-sqlite3` directly, so CI can keep fast SQLite coverage while a separate Postgres compatibility gate is added.
- Existing app code generally uses Prisma Client APIs rather than raw SQL, which lowers application-level migration risk.
- Existing migration files include SQLite-specific SQL and PRAGMA statements, so the Neon path should use a fresh Postgres baseline migration instead of replaying the current SQLite migration history unchanged.
- Useful local SQL snippets under `prisma/Usefull queries/` use SQLite `json_extract`; they are operational notes and not runtime dependencies, but should be translated or marked SQLite-only later.

## Phase 2 Recommended Direction

- Keep local and existing fast CI tests on SQLite during the first Neon migration pass to reduce developer setup cost.
- Add a separate Postgres schema/config and CI compatibility job for Neon-style validation before switching production/staging runtime.
- Treat production as a clean Postgres database with a new baseline migration, then keep staging/preview seed/sample data as explicit deploy/setup steps.

## Phase 2 Decision

- Local development and the existing fast CI suite stay on SQLite for now.
- Postgres validation runs through `npm run db:postgres:check`, which generates a temporary Postgres schema from `prisma/schema.prisma`, validates it, and generates an empty-database baseline SQL at `.tmp/postgres/baseline.sql`.
- Deployed Postgres builds run `scripts/generate-prisma-client.mjs`, which generates Prisma Client from the temporary Postgres schema when `DATABASE_PROVIDER=postgres` or `DATABASE_URL` is Postgres.
- Runtime and seed code use the existing Better SQLite adapter for local SQLite, and `@prisma/adapter-pg` for Neon Postgres because Prisma 7 requires a driver adapter at `PrismaClient` construction time.
- The Postgres compatibility check runs in `CI / quality-gate`.
- Production Neon starts clean with the baseline schema only.
- Staging and isolated preview resources receive schema plus seed/sample data.
- Preview database isolation should use one Neon branch or database per PR, with cleanup after PR close, before preview deployments are treated as production-like.

## Checklist

- [x] Capture branch and deployment model decisions.
- [x] Capture Vercel GitHub Integration decision.
- [x] Capture GitHub Actions checks-only decision.
- [x] Capture Neon Postgres decision.
- [x] Capture Vercel Blob decision.
- [x] Capture domain decisions.
- [x] Capture environment isolation decisions.
- [x] Capture production data and seed/sample data decisions.
- [x] Capture manual production promotion gate.
- [x] Capture runtime logs and rollback runbook scope.
- [x] Capture `/api/health` scope.
- [x] Incorporate plan review findings about CI, phase order, existing smoke coverage, and preview isolation.
- [x] Review and approve `requirements/deployment-pipeline/plan.md`.
- [x] Convert approved plan into implementation tasks.
- [x] Update existing `.github/workflows/ci-auth.yml` or create a consolidated CI workflow for required checks.
- [x] Preserve auth, route guard, and logout smoke coverage in branch protection.
- [x] Add Neon Postgres support and migration validation.
- [x] Finalize preview Neon isolation strategy.
- [x] Add Vercel Blob storage provider.
- [x] Finalize preview Blob isolation strategy.
- [x] Implement `/api/health`.
- [x] Configure Vercel project import and GitHub Integration.
- [x] Configure custom production and staging domains.
- [x] Configure Vercel environment variables.
- [x] Configure GitHub branch protection for `pre-main`.
- [x] Validate staging deployment.
- [x] Define staging acceptance checklist.
- [x] Document GitHub-visible manual production approval.
- [x] Document Vercel build/runtime log review.
- [x] Document production rollback runbook.
- [ ] Perform manual production approval.
- [ ] Promote/merge to `main`.
- [ ] Validate production deployment.

## Required Checks

- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:import`
- [x] `npm run test:phase0`
- [x] `npm run test:phase1`
- [x] `npm run test:phase2`
- [x] `npm run test:phase3`
- [x] Existing auth, route guard, and logout smoke checks from `.github/workflows/ci-auth.yml`

## Branch Protection Checks

Require these GitHub Actions checks before merging to `pre-main`:

- `CI / quality-gate`
- `CI / auth-smoke`

Keep production promotion manual after `pre-main` staging validation.

## Next Action

Review and explicitly approve PR #28 for production promotion, then merge `pre-main` to `main` and run production post-deploy validation.

## Phase 5 Progress

- Vercel CLI authenticated and linked the local repo to project `recetas`.
- Local `.vercel/project.json` was created for `projectId` `prj_IxLQjn9KZdwbtkX0PVQ77WaKMLbV` in org/team `team_ks2SO1XHAK8W5B7XzsmtCvQh`; `.vercel` is ignored by git.
- GitHub repository connection was created for `https://github.com/luisfleitas/RecetasDeLaFamilia`.
- First Vercel deployment completed with status `Ready`: `https://recetas-erdd5x663-luisfleitas-1188s-projects.vercel.app`.
- Vercel assigned aliases: `https://recetas-rose.vercel.app`, `https://recetas-luisfleitas-1188s-projects.vercel.app`, and `https://recetas-luisfleitas-1188-luisfleitas-1188s-projects.vercel.app`.
- Earlier `npx --yes vercel@latest env ls` reported no configured Vercel environment variables.
- Direct `curl` to `/api/health` returned Vercel Authentication `401`, so app-level staging health validation is blocked until deployment protection/bypass and environment variables are configured.
- `recetasfamilia.app` was added to the project and is verified with Vercel nameservers.
- `staging.recetasfamilia.app` was added to the project, verified, and updated through the Vercel project domains API to target git branch `pre-main`.
- Vercel deployment protection is `all_except_custom_domains`; custom-domain smoke checks are reachable, while generated deployment URLs may still require Vercel authentication.
- `https://recetasfamilia.app/api/health` and `https://staging.recetasfamilia.app/api/health` returned `503` with app healthy, database degraded, and Blob not applicable before the fixed env values and runtime Postgres generation path were added.
- Current `npx --yes vercel@latest env ls` confirms production and `pre-main` preview configuration exists, including `DATABASE_PROVIDER=postgres` and the fixed Blob/import variables; encrypted secret values are not printed.
- Runtime now selects Postgres for `DATABASE_PROVIDER=postgres`/Postgres URLs and local SQLite otherwise.
- Added the runbook Secret Intake Checklist and CLI Setup Sequence for the blocked environment-variable setup gate.
- Committed deployment runtime readiness changes in `5e5b102` and pushed `codex/feature/deployment-pipeline`.
- Opened draft PR #16 into `pre-main`: https://github.com/luisfleitas/RecetasDeLaFamilia/pull/16.
- PR #16 checks and Vercel preview deployment passed on commit `6e840b1`.
- Fixed the first PR #16 quality-gate failure where CI's SQLite `DATABASE_URL` leaked into the generated Postgres schema compatibility check.
- Merged PR #16 into `pre-main`; Vercel automatically deployed `staging.recetasfamilia.app` as deployment `dpl_C1DTetfoRjMSHJPvAHrCrmfX2wAy`.
- Staging `/api/recipes` failed with Prisma's `Using engine type "client" requires either "adapter" or "accelerateUrl"` error, so the follow-up fix adds the Postgres driver adapter to runtime and seed creation.
- Merged PR #17 into `pre-main`; Vercel deployed the adapter fix as `dpl_6ni3fnA5Bjd9DkaFEe8qhmLkzD7d`.
- Staging then failed because the live Neon database had no baseline tables; `DATABASE_URL` for `pre-main` preview was aligned to the Neon integration URL, `.tmp/postgres/baseline.sql` was applied, staging sample data was seeded, and staging redeployed as `dpl_4Egfoqjx3ra8SMUm7dMiCM9pVzMx`.
- `/api/health` is healthy and `/api/recipes?includePrimaryImage=true&includeImages=true` returns seeded recipes on the current staging deployment.
- The homepage still failed because the server component self-fetched the protected deployment's `/api/recipes`; PR #18 fixed homepage recipe loading through the application use case and deployed staging as `dpl_ARY1Asm6Xu4TsN7nAd6MERJvHA3k`.
- Staging homepage, `/api/health`, and `/api/recipes?includePrimaryImage=true&includeImages=true` now pass Vercel-authenticated smoke checks on deployment `dpl_ARY1Asm6Xu4TsN7nAd6MERJvHA3k`.
- The image file route cache fix from `bd5c6f8` was first deployed to staging as `dpl_ooAoTw7u3pXAaaFbgHJ7KXEk1rwN` / `https://recetas-g5dzscz7g-luisfleitas-1188s-projects.vercel.app`.
- Direct unauthenticated curl to `https://staging.recetasfamilia.app` returns Vercel Authentication `401`; staging smoke checks should use `npx --yes vercel@latest curl ... --deployment <staging-deployment-url>`.
- `scripts/phase1-curl-smoke-test.sh` now supports protected Vercel staging checks with `VERCEL_DEPLOYMENT=...` and optional temporary account registration with `REGISTER_TEST_USER=1`.
- The staging image upload/read/delete smoke passed on `dpl_ooAoTw7u3pXAaaFbgHJ7KXEk1rwN`: temporary account registration, recipe creation with images, list/detail image reads, update with a new image, full/thumb file fetches, unsupported upload rejection, unauthorized update rejection, image delete, and deleted image file `404`.
- `npx --yes vercel@latest curl /api/health --deployment https://recetas-g5dzscz7g-luisfleitas-1188s-projects.vercel.app` returned healthy app/database/blob checks.
- The later tracker-only deployment `dpl_5ivXtiyqZXUBaVNjPaMjpy2qNmmh` / `https://recetas-b8i4hkf47-luisfleitas-1188s-projects.vercel.app` also reached Ready with alias `https://staging.recetasfamilia.app`.
- Final post-tracker staging checks on `https://recetas-b8i4hkf47-luisfleitas-1188s-projects.vercel.app` passed for `/api/health` and the full image upload/read/delete smoke, including deleted image file `404`.
- `curl -i -s https://recetasfamilia.app/api/health` still returns `503` on the current production deployment with database degraded and Blob not applicable; production has not yet been promoted to the staging-ready build.
- Production preflight on 2026-05-05 confirmed current production deployment `dpl_Ar6AGb6ZCxjqM2Xc23rwFWgcg9To` is still running older SQLite-path code from commit `7fa6729`: `/api/health` returns degraded database status and `/api/recipes` returns `Cannot open database because the directory does not exist`.
- Release PR #28 opened from `pre-main` to `main`: https://github.com/luisfleitas/RecetasDeLaFamilia/pull/28.
- PR #28 initially reported `DIRTY`; `pre-main` was reconciled with `origin/main` using `git merge -s ours origin/main -m "chore: reconcile main history into pre-main"`, preserving the `pre-main` tree while making `main` an ancestor.
- PR #28 checks passed after reconciliation: Vercel, Vercel Preview Comments, `CI / auth-smoke`, and `CI / quality-gate`.

## Phase 6/7 Progress

- Added `requirements/deployment-pipeline/operations-runbook.md`.
- Documented live resource setup for production, staging, and preview environments.
- Documented the Vercel environment variable matrix without secret values.
- Documented the staging validation checklist.
- Documented the GitHub-visible manual production approval gate.
- Documented production post-deploy validation.
- Documented Vercel build/runtime log review.
- Documented the production rollback procedure and data caveat.
