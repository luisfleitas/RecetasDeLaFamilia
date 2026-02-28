# Recipe Import - Phase 1 Implementation Readiness

## Objective
Start implementation of recipe import with clear, locked scope and execution boundaries so backend, frontend, and QA can work in parallel without rework.

## Feature Scope (Implementation Baseline)
- Add authenticated import flow at `/recipes/import`.
- Support paste text and file upload inputs (`txt`, `docx`, `doc` best-effort, `pdf`).
- Use local-first OCR with OpenAI fallback when local confidence is below threshold.
- Parse into structured recipe draft (title, description, ingredients, steps).
- Let user review/edit parsed draft before continuing to `/recipes/new` with prefilled fields.
- Persist source documents and link them to the created recipe.
- Enforce recipe-level authorization on source document access.

## Out of Scope (This Phase)
- Background queue processing.
- Automatic recipe draft creation without user confirmation.
- Import from edit page.
- Dynamic provider selection policy.

## Locked Technical Decisions
- Keep extractor and OCR behind provider-style interfaces.
- Keep import flow session-based with explicit session states and TTL cleanup.
- Keep `/recipes/new` as canonical recipe editor; import only pre-fills it.
- Keep file storage private and expose files only through authorized API routes.
- Enforce API guardrails: max file size, page cap, char cap, timeout, and idempotency.

## Required Data/Contract Additions
- Prisma model: `ImportSession`.
- Prisma model: `RecipeSourceDocument`.
- API endpoints:
  - `POST /api/recipes/import/parse`
  - `GET /api/recipes/import/sessions/[sessionId]`
  - `GET /api/recipes/[id]/source-documents`
  - `GET /api/recipes/[id]/source-documents/[docId]/file`

## System Components to Build
- Import page UI (`app/recipes/import/page.tsx` and supporting client components).
- Import parse route handler and pipeline orchestration.
- File-type text extraction adapters.
- Local OCR adapter + OpenAI fallback adapter.
- Import extractor provider factory and OpenAI provider implementation.
- Import session service and repository operations.
- Source document metadata + authorized retrieval handlers.
- Cleanup mechanism for expired import sessions and staged files.

## Risk Register (Initial)
1. Legacy `.doc` extraction quality may be inconsistent.
Mitigation: mark as best-effort and return explicit, actionable failure messaging.
2. OCR fallback costs/latency may spike on scanned PDFs.
Mitigation: strict timeout/caps + telemetry + fallback rate tracking.
3. Session and staging file orphaning.
Mitigation: TTL and scheduled cleanup with idempotent delete behavior.
4. Authorization drift between recipe access and source-doc routes.
Mitigation: centralize access check function and integration-test it.

## Definition of Ready
- Scope and out-of-scope locked (this document).
- Existing plan approved: `requirements/recipe-import/plan.md`.
- Environment variables finalized for import feature.
- DB migration path approved for new models.
- Error code catalog approved by frontend and backend owners.
- Test strategy approved: `requirements/recipe-import/phase-1-test-strategy.md`.

## Definition of Done (Phase 1 Delivery Target)
- End-to-end import happy path works for paste text and at least one file type.
- All required endpoints implemented with auth + ownership checks.
- Import session lifecycle implemented and tested (parsed, confirmed, expired).
- Source docs persist and are retrievable only by authorized users.
- Regression-safe: existing recipe create flow still works without import.
- Feature can be turned off with `RECIPE_IMPORT_ENABLED`.
