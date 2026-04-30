# Deployment Pipeline Implementation Plan

## Status

Phase 1 implementation started on `codex/feature/deployment-pipeline`.

## Current Phase

Phase 1: GitHub Actions Quality Gate.

## Phase 1 Tasks

- [x] Treat `requirements/deployment-pipeline/plan.md` as approved for Phase 1 execution.
- [x] Add a GitHub Actions quality-gate job for lint, build, import tests, and phase test scripts.
- [x] Preserve existing auth, route guard, and logout smoke coverage in CI.
- [x] Run the Phase 1 verification commands locally.
- [x] Fix CI-gate failures found by local verification.
- [x] Document the required `pre-main` branch protection checks once the workflow names are final.
- [ ] Push the branch and confirm GitHub Actions runs the new checks.

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
- [ ] Configure GitHub branch protection for `pre-main`.
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

Push the branch and confirm GitHub Actions runs `CI / quality-gate` and `CI / auth-smoke` successfully before configuring the checks as required on `pre-main`.
