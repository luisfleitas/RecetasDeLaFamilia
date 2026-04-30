# Deployment Pipeline Plan

## Goal

Build a production-ready Vercel deployment pipeline for Recetas that keeps the existing solo-maintainer branch model, adds durable production infrastructure, and makes releases observable, reversible, and cost-aware.

## Approved Decisions

- Deployment platform: Vercel GitHub Integration.
- Deployment quality gate: GitHub Actions runs required checks; Vercel handles deployments.
- Branch mapping:
  - Feature branches and PRs: Vercel-generated preview URLs.
  - `pre-main`: staging deployment.
  - `main`: production deployment.
- Production domain: `recetasfamilia.app`.
- Staging domain: `staging.recetasfamilia.app`.
- Preview domains: Vercel-generated URLs.
- Future domains: keep domains configurable through Vercel project/domain settings and `NEXT_PUBLIC_SITE_URL`, not hard-coded in application logic.
- Database: Neon Postgres through the Vercel Marketplace.
- Upload/source-document storage: Vercel Blob.
- Environment isolation: production, staging, and preview must be fully separated.
- Production data: start with a clean database.
- Staging and previews: use seed/sample data.
- Production promotion: manual approval required before promoting from `pre-main` to `main`.
- Manual approval mechanism: GitHub-visible comment or label, followed by manual merge/promotion.
- Production features:
  - Recipe import enabled immediately.
  - Handwritten import enabled immediately.
  - Separate OpenAI API keys configured for staging and production.
  - Preview deployments do not use OpenAI-backed import/OCR by default, but can opt in when needed.
- Observability v1:
  - Include basic Vercel runtime log review.
  - Include build/deploy log review.
  - Include rollback runbook.
  - Leave paid uptime/alerting as a later optional phase.
- Health endpoint: add `/api/health`.
- Health endpoint v1 checks:
  - App is running.
  - Database connection works.
  - Blob storage configuration is present.
  - Do not perform Blob write/read/delete checks by default.

## Current Repo Findings

- App framework: Next.js 16 with React 19.
- Database today: Prisma with SQLite and `@prisma/adapter-better-sqlite3`.
- Storage today: local file storage through `IMAGE_STORAGE_DRIVER=local` and `IMAGE_STORAGE_LOCAL_ROOT`.
- Import/OCR config exists through environment variables in `.env.example`.
- Existing GitHub Actions workflow: `.github/workflows/ci-auth.yml` runs auth, route guard, and logout smoke checks against a SQLite CI database.
- No existing `vercel.json` or `.vercel/project.json` was found during planning.
- Current branch workflow uses `pre-main` as staging/release-candidate and `main` as production.

## Target Pipeline

```text
feature branch
  -> PR preview deployment on Vercel
  -> GitHub Actions required checks
  -> merge to pre-main
  -> staging deployment at staging.recetasfamilia.app
  -> manual staging review
  -> GitHub approval comment or label
  -> manual promotion/merge to main
  -> production deployment at recetasfamilia.app
  -> post-deploy health and smoke checks
```

## Required GitHub Checks

The first quality gate should require these commands before merging to `pre-main`:

- `npm run lint`
- `npm run build`
- `npm run test:import`
- `npm run test:phase0`
- `npm run test:phase1`
- `npm run test:phase2`
- `npm run test:phase3`
- Existing auth, route guard, and logout smoke coverage from `.github/workflows/ci-auth.yml`, either preserved as a named required workflow or converted into an npm script that branch protection can require.

CI should use a fast SQLite test database for the existing test suite at first. Add a separate Postgres compatibility and migration check as part of the Neon migration work.

## Environment Matrix

| Environment | Branch/source | URL | Database | Blob storage | Import/OCR |
| --- | --- | --- | --- | --- | --- |
| Production | `main` | `https://recetasfamilia.app` | Neon production database | Production Blob store | Enabled, OpenAI enabled |
| Staging | `pre-main` | `https://staging.recetasfamilia.app` | Neon staging database | Staging Blob store | Enabled, OpenAI enabled |
| Preview | PR/feature branches | Vercel preview URL | Isolated preview Neon database or branch per preview | Isolated preview Blob store or preview-prefixed object keys with cleanup | Rule-based/local by default; OpenAI opt-in only |
| Local | developer machine | `http://localhost:3000` | SQLite `dev.db` unless changed | Local uploads | Developer-controlled |

Preview isolation must be decided before implementation begins. The approved strategy must specify how preview databases are created and cleaned up, how preview Blob objects are isolated from staging/production, and how OpenAI-backed validation is explicitly opted in for a preview.

## Environment Variables

### Shared production/staging variables

- `DATABASE_URL`: Neon connection string for the environment.
- `JWT_SECRET`: long random secret, unique per environment.
- `JWT_EXPIRES_IN`: expected default `7d`.
- `NEXT_PUBLIC_SITE_URL`: environment-specific public URL.
- `IMAGE_STORAGE_DRIVER`: switch to a Vercel Blob driver once implemented.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob read-write token for the environment.
- `OPENAI_API_KEY`: unique key per production/staging environment.
- `OPENAI_RECIPE_IMPORT_MODEL`: expected default `gpt-4.1`.
- `RECIPE_IMPORT_ENABLED`: `true`.
- `RECIPE_IMPORT_HANDWRITTEN_ENABLED`: `true`.
- `RECIPE_IMPORT_EXTRACTOR_DRIVER`: use OpenAI-backed extraction in production/staging when configured.
- `RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD`: expected default `0.8`.
- `RECIPE_IMPORT_OCR_OPENAI_MODEL`: expected default `gpt-4.1-mini`.
- `RECIPE_IMPORT_FORCE_OPENAI_OCR`: expected default `false`.
- `RECIPE_IMPORT_HANDWRITTEN_PRIMARY_OCR_PROVIDER`: `openai`.
- `RECIPE_IMPORT_HANDWRITTEN_MAX_IMAGE_COUNT`: expected default `6`.

### Preview defaults

- Use isolated preview environment resources.
- Keep `OPENAI_API_KEY` unset by default.
- Keep OpenAI-backed OCR/extraction disabled by default.
- Document an opt-in path for a specific preview deployment when OpenAI validation is needed.

## Implementation Phases

### Phase 1: GitHub Actions Quality Gate

- Update the existing `.github/workflows/ci-auth.yml` workflow or split it into a clearer CI workflow.
- Add lint, build, and test commands to the required CI gate.
- Preserve existing auth, route guard, and logout smoke coverage.
- Configure CI test environment variables for SQLite.
- Ensure build can run in CI without production secrets.
- Configure GitHub branch protection for `pre-main`.
- Require the check suite before merging to `pre-main`.
- Keep production promotion manual.

### Phase 2: Neon Postgres Migration

- Add Postgres support to Prisma schema/config.
- Decide whether local development stays on SQLite or moves to Postgres.
- Add Neon production and staging databases.
- Create a migration path from current Prisma SQLite schema to Postgres.
- Validate Prisma migrations against Neon.
- Add a Postgres compatibility/migration check to CI.
- Keep production launch database clean.
- Create seed/sample process for staging and previews.
- Finalize the preview Neon isolation strategy before any Vercel preview deployment is treated as production-like.

### Phase 3: Vercel Blob Storage

- Add a Vercel Blob storage provider behind the existing image storage abstraction.
- Preserve existing storage-key semantics so recipe images and source documents remain backend-agnostic.
- Configure production Blob storage.
- Configure staging Blob storage.
- Define the preview Blob isolation strategy before any Vercel preview deployment is treated as production-like.
- Update file-serving routes if Blob access requires signed/public URL handling changes.
- Keep local storage provider for local development.

### Phase 4: Health Endpoint And Smoke Checks

- Add `/api/health`.
- Check app availability.
- Check database connectivity with a minimal safe query.
- Check required Blob configuration is present.
- Return environment-safe status data without secrets.
- Add post-deploy smoke checks for staging and production:
  - `/api/health`
  - homepage loads
  - login/register route loads
  - recipe list/home route loads
  - import route loads when authenticated

### Phase 5: Vercel Project And Domain Setup

- Import the GitHub repo into a new Vercel project after Postgres and Blob support are implemented enough for staging.
- Configure Vercel GitHub Integration.
- Configure production branch as `main`.
- Configure `pre-main` as the staging branch/deployment source.
- Assign `recetasfamilia.app` to production.
- Assign `staging.recetasfamilia.app` to staging.
- Keep preview deployments on Vercel-generated URLs.
- Confirm `NEXT_PUBLIC_SITE_URL` is environment-specific.
- Document how to change production and staging domains later.
- Confirm staging deployment uses Neon, Vercel Blob, and the approved preview isolation strategy before considering the Vercel setup complete.

### Phase 6: Manual Release Gate

- Define staging acceptance checklist.
- Require a GitHub comment or label before promoting to production.
- Manually merge/promote `pre-main` to `main`.
- Let Vercel deploy production from `main`.
- Run production post-deploy checks.

### Phase 7: Observability And Rollback

- Document where to inspect Vercel build logs.
- Document where to inspect Vercel runtime logs.
- Document how to inspect failing function requests.
- Add a rollback runbook for production.
- Keep paid uptime checks, Vercel Alerts, and Observability Plus as optional later observability enhancements.

## Cost-Control Checklist

- Use separate production/staging/preview resources so test data and usage are visible by environment.
- Keep OpenAI disabled by default for preview deployments.
- Use rule-based/local import paths in previews unless OpenAI is explicitly needed.
- Configure Vercel spend limits or budget notifications where available.
- Review Vercel Blob storage and bandwidth usage after staging validation.
- Review Neon compute/storage usage after staging validation.
- Review OpenAI usage during import/OCR testing.
- Avoid automatic production promotion.
- Prefer manual preview opt-in for expensive features.
- Revisit paid uptime monitoring and alerts only after the baseline deployment is stable.

## Rollback Runbook

### When to roll back

- Production health endpoint fails after deployment.
- Users cannot log in or create/read recipes.
- Import/OCR failures affect core production usage.
- Runtime logs show a production error spike after a deployment.
- A database or storage configuration mistake affects live traffic.

### Immediate rollback steps

1. Open the Vercel production deployment list for the Recetas project.
2. Identify the latest production deployment.
3. Use Vercel Instant Rollback to restore the previous known-good production deployment.
4. Confirm `https://recetasfamilia.app/api/health` returns healthy.
5. Confirm the homepage and login route load.
6. Inspect Vercel runtime logs for continuing errors.
7. Create a fix branch from `pre-main` or revert the problematic change on the release branch.

### Data caveat

Application rollback does not automatically roll back database migrations or Blob object changes. Any schema migration deployed to production must include a rollback or forward-fix plan before production promotion.

## Open Risks

- Prisma SQLite-to-Postgres migration may require schema adjustments and test updates.
- The current storage abstraction has a local provider only; Vercel Blob requires a new provider implementation.
- Preview environment isolation must be finalized before implementation so preview deployments do not share production or staging data by accident.
- OpenAI-backed production import/OCR needs cost and error visibility from day one.
- Health checks must avoid leaking secret or provider-specific details.
- Domain switching should be documented so future domains do not require code changes.

## Definition Of Ready For Implementation

- This plan is reviewed and approved.
- Vercel project ownership and GitHub repo access are confirmed.
- Neon and Vercel Blob account/project setup path is accepted.
- Preview Neon isolation strategy is accepted.
- Preview Blob isolation and cleanup strategy is accepted.
- Required GitHub branch protection rules are accepted.
- Environment variable matrix is accepted.
- Manual production gate behavior is accepted.
