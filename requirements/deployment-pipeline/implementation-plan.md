# Deployment Pipeline Implementation Plan

## Status

Phase 1 completed on `codex/feature/deployment-pipeline`; Phase 2 is ready to start.

## Current Phase

Phase 2: Neon Postgres Migration.

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
- [ ] Decide whether local development stays on SQLite for now or moves to Postgres in this phase.
- [ ] Add Postgres-compatible Prisma schema/config support without breaking local development.
- [ ] Create and validate the Postgres migration path for the current schema.
- [ ] Add a Postgres compatibility/migration check to CI.
- [ ] Define the Neon production, staging, and preview isolation strategy.
- [ ] Document the clean production database and seed/sample data process for staging/previews.

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
- [ ] Add Neon Postgres support and migration validation.
- [ ] Finalize preview Neon isolation strategy.
- [ ] Add Vercel Blob storage provider.
- [ ] Finalize preview Blob isolation and cleanup strategy.
- [ ] Implement `/api/health`.
- [ ] Configure Vercel project import and GitHub Integration.
- [ ] Configure custom production and staging domains.
- [ ] Configure Vercel environment variables.
- [x] Configure GitHub branch protection for `pre-main`.
- [ ] Validate staging deployment.
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

Decide and document the Phase 2 database strategy: keep SQLite for local/fast CI while adding a separate Postgres/Neon validation path, or move all environments to Postgres now.
