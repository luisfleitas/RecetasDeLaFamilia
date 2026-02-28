# Recipe Import - Phase 1 Execution Checklist

## Phase Gate
Status: `PENDING_APPROVAL`
Rule: No implementation code starts until this checklist is approved.

## 1. Schema and Persistence
- [ ] Add `ImportSession` model in Prisma schema.
- [ ] Add `RecipeSourceDocument` model in Prisma schema.
- [ ] Create and apply migration locally.
- [ ] Extend repositories for import session CRUD and expiration.
- [ ] Extend repositories for source document metadata and lookup.

## 2. Backend Pipeline
- [ ] Add `POST /api/recipes/import/parse` route (multipart + JSON support).
- [ ] Implement input normalization and file type routing.
- [ ] Implement TXT extraction adapter.
- [ ] Implement DOCX extraction adapter.
- [ ] Implement DOC best-effort adapter with explicit failure path.
- [ ] Implement PDF text-layer extraction adapter.
- [ ] Implement local OCR adapter.
- [ ] Implement OpenAI OCR fallback when local confidence is low.
- [ ] Implement extractor provider interface and factory.
- [ ] Implement OpenAI extraction provider mapping to app schema.
- [ ] Add parse validation with standardized error codes.
- [ ] Persist/refresh import session with draft + warnings + metadata.

## 3. API and Access Control
- [ ] Add `GET /api/recipes/import/sessions/[sessionId]` (owner-only).
- [ ] Add `GET /api/recipes/[id]/source-documents` (authorized access).
- [ ] Add `GET /api/recipes/[id]/source-documents/[docId]/file` (authorized access).
- [ ] Ensure source document access policy aligns with recipe access policy.

## 4. Frontend
- [ ] Build `/recipes/import` entry page with paste and upload input modes.
- [ ] Add parse action with loading, success, and error states.
- [ ] Render structured editable preview of parsed output.
- [ ] Add warnings/error mapping at field level.
- [ ] Add continue action to `/recipes/new` with import session hydration.
- [ ] Ensure new UI elements have stable `id` attributes.

## 5. Session and File Lifecycle
- [ ] Stage uploaded files under import session staging path.
- [ ] On recipe create success, promote staged files and link to recipe.
- [ ] On session expiry, remove staged files and mark session expired.
- [ ] Add cleanup command/script and document run cadence.

## 6. Observability and Guardrails
- [ ] Add request timeout enforcement for parse endpoint.
- [ ] Add file/page/text size caps via env config.
- [ ] Add parse attempt rate limiting.
- [ ] Add telemetry: success rate, fallback rate, top error codes, latency.

## 7. Verification
- [ ] Unit tests for adapters, provider mapping, and validation.
- [ ] Integration tests for parse endpoint and source-doc access control.
- [ ] E2E happy path from import to create.
- [ ] Regression check that non-import recipe create flow is unchanged.

## 8. Release Readiness
- [ ] Feature gate verified (`RECIPE_IMPORT_ENABLED`).
- [ ] Staging validation runbook executed.
- [ ] Rollback plan documented.
- [ ] Approval obtained for Phase 2 (implementation start).
