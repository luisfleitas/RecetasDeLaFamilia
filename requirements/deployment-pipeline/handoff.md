# Deployment Pipeline Handoff

## Current State

- Feature branch created: `codex/feature/deployment-pipeline`.
- Requirements folder created: `requirements/deployment-pipeline/`.
- Initial deployment pipeline plan created.
- Initial implementation tracker created.
- Phase 1 completed: GitHub Actions quality gate.
- Phase 2 ready to start: Neon Postgres migration.
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

## In Progress

- Phase 2 kickoff: Neon Postgres migration strategy decision.

## Next Action

Decide and document the Phase 2 database strategy: keep SQLite for local/fast CI while adding a separate Postgres/Neon validation path, or move all environments to Postgres now.

## Known Issues

- Current app uses SQLite with `@prisma/adapter-better-sqlite3`; production deployment requires Neon Postgres migration work.
- `lib/prisma.ts` and `prisma/seed.mjs` both directly construct the Better SQLite adapter.
- Existing SQLite migration files include SQLite-specific SQL and PRAGMA statements, so Neon should use a fresh Postgres baseline migration rather than replaying the current SQLite migration history unchanged.
- Current storage provider is local filesystem only; production deployment requires Vercel Blob provider work.
- Preview environment isolation needs a concrete Neon and Blob strategy during implementation.
- Production import/OCR requires OpenAI API keys and cost controls.

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
- GitHub Actions `CI / quality-gate` passed on commit `3b586fc`.
- GitHub Actions `CI / auth-smoke` passed on commit `3b586fc`.
- GitHub `pre-main` branch protection confirmed with required checks `CI / quality-gate` and `CI / auth-smoke`.
- Phase 2 inventory completed across `prisma/schema.prisma`, `prisma.config.ts`, `prisma/seed.mjs`, `lib/prisma.ts`, migrations, and Prisma database call sites.
- `BASE_URL='http://127.0.0.1:3100' ./scripts/auth-smoke-test.sh` passed.
- `BASE_URL='http://127.0.0.1:3100' ./scripts/route-guards-smoke-test.sh` passed.
- `BASE_URL='http://127.0.0.1:3100' ./scripts/logout-smoke-test.sh` passed.

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
