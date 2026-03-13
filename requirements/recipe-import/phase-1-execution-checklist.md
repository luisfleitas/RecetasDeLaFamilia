# Recipe Import - Phase 1 Execution Checklist

## Phase Gate
Status: `READY_FOR_STAGING_VALIDATION`
Rule: Track implementation completion against this checklist.

## Progress Snapshot (Updated: 2026-03-13)
- Implemented core import flow for paste text + TXT/PDF/image OCR.
- Implemented import session persistence and draft hydration/edit flow.
- Implemented source-document staging, promotion, and authorized retrieval endpoints.
- Added import health endpoint and cleanup script for expired sessions.
- Added parser coverage for recipes where ingredients are inferred from step text.
- Added focused import verification command and route-level happy-path coverage from file import through recipe create.
- Documented staging validation and rollback procedures for release readiness.
- Remaining work is limited to local migration application, staging runbook execution, and Phase 2 signoff.

## 1. Schema and Persistence
- [x] Add `ImportSession` model in Prisma schema.
- [x] Add `RecipeSourceDocument` model in Prisma schema.
- [ ] Create and apply migration locally.
- [x] Extend repositories for import session CRUD and expiration.
- [x] Extend repositories for source document metadata and lookup.

## 2. Backend Pipeline
- [x] Add `POST /api/recipes/import/parse` route (multipart + JSON support).
- [x] Implement input normalization and file type routing.
- [x] Implement TXT extraction adapter.
- [x] Implement DOCX extraction adapter.
- [x] Implement DOC best-effort adapter with explicit failure path.
- [x] Implement PDF text-layer extraction adapter.
- [x] Implement local OCR adapter.
- [x] Implement OpenAI OCR fallback when local confidence is low.
- [x] Implement extractor provider interface and factory.
- [x] Implement OpenAI extraction provider mapping to app schema.
- [x] Add parse validation with standardized error codes.
- [x] Persist/refresh import session with draft + warnings + metadata.

## 3. API and Access Control
- [x] Add `GET /api/recipes/import/sessions/[sessionId]` (owner-only).
- [x] Add `GET /api/recipes/[id]/source-documents` (authorized access).
- [x] Add `GET /api/recipes/[id]/source-documents/[docId]/file` (authorized access).
- [x] Ensure source document access policy aligns with recipe access policy.

## 4. Frontend
- [x] Build `/recipes/import` entry page with paste and upload input modes.
- [x] Add parse action with loading, success, and error states.
- [x] Render structured editable preview of parsed output.
- [x] Add warnings/error mapping at field level.
- [x] Add continue action to `/recipes/new` with import session hydration.
- [x] Ensure new UI elements have stable `id` attributes.

## 5. Session and File Lifecycle
- [x] Stage uploaded files under import session staging path.
- [x] On recipe create success, promote staged files and link to recipe.
- [x] On session expiry, remove staged files and mark session expired.
- [x] Add cleanup command/script and document run cadence.

## 6. Observability and Guardrails
- [x] Add request timeout enforcement for parse endpoint.
- [x] Add file/page/text size caps via env config.
- [x] Add parse attempt rate limiting.
- [x] Add telemetry: success rate, fallback rate, top error codes, latency.

## 7. Verification
- [x] Unit tests for adapters, provider mapping, and validation.
- [x] Integration tests for parse endpoint and source-doc access control.
- [x] E2E happy path from import to create.
- [x] Regression check that non-import recipe create flow is unchanged.

## 8. Release Readiness
- [x] Feature gate verified (`RECIPE_IMPORT_ENABLED`).
- [ ] Staging validation runbook executed.
- [x] Rollback plan documented.
- [ ] Approval obtained for Phase 2 (implementation completion signoff).
