# Recipe Import - Phase 1 Test Strategy

## Goal
Define minimum test coverage required before implementation can be considered ready for Phase 2 execution.

## Unit Coverage
- Text extraction adapters:
  - TXT success/failure
  - DOCX success/failure
  - DOC best-effort expected failure classification
  - PDF text extraction success/no-text behavior
- OCR pipeline:
  - Local OCR above threshold (no fallback)
  - Local OCR below threshold (fallback invoked)
  - Fallback success path
  - Fallback failure path with stable error code
- Draft normalization:
  - Missing required title/ingredients/steps flagged correctly
  - Quantity and unit validation rules enforced
- Session service:
  - Parse creates/updates session
  - Expired session handling
  - Idempotency behavior on duplicate parse requests

## Integration Coverage
- `POST /api/recipes/import/parse`:
  - Auth required
  - Paste-text success
  - File upload success
  - Unsupported file type
  - Timeout and max-size failures
- `GET /api/recipes/import/sessions/[sessionId]`:
  - Owner access
  - Non-owner denial
  - Expired session response behavior
- Source-doc routes:
  - Authorized list/download success
  - Unauthorized/forbidden behavior

## End-to-End Coverage
- Import pasted content -> edit preview -> continue -> prefilled `/recipes/new` -> save recipe.
- Import scanned/low-text PDF path where OCR fallback is required.
- Error UX for failed extraction with clear corrective message.

## Non-Functional Checks
- Parse p95 latency within configured timeout budget.
- Fallback frequency measurable through telemetry.
- No raw recipe content written to logs.
- Feature flag off path verified (`RECIPE_IMPORT_ENABLED=false`).

## Exit Criteria
- All required tests pass in CI.
- No critical or high-severity auth/access regression.
- No blocker defects in happy path for paste and at least one file-based import.
