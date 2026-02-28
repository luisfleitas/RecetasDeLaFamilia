# Recipe Import Feature Plan (Copy/Paste + TXT/DOC/PDF) with Local-First OCR and Provider-Swappable AI Extraction

## Summary
Build a new authenticated import flow at `/recipes/import` where users can paste recipe text or upload TXT, DOCX, DOC (best-effort), or PDF, extract structured recipe data via a provider-based extraction service, and run OCR with a local library first and OpenAI fallback when local OCR confidence is below threshold. Users preview/edit the parsed result, then continue to `/recipes/new` with prefilled structured fields. Source documents are persisted and linked to the created recipe, with access restricted to users who can access that recipe.

## Product Decisions Locked
- Entry point: dedicated screen at `/recipes/import`.
- Inputs: copy/paste text, TXT, DOCX, DOC (best-effort), PDF.
- Parse mode: local extraction and local OCR first, then OpenAI fallback when confidence is low.
- Extensibility: provider model so extraction strategy can be switched later.
- Scanned/image-only PDF in v1: attempt local OCR first, then OpenAI OCR fallback, then fail with clear actionable error only if both are insufficient.
- UX after parse: preview + continue.
- File retention: persist source documents and link to recipe.
- Source docs: multiple docs per recipe (import history).

## Scope
### In scope (v1)
- New import page and API pipeline.
- Provider abstraction with OpenAI available for fallback extraction/OCR.
- Text extraction adapters by file type.
- OCR confidence evaluation and fallback routing.
- Preview/edit before continue.
- Prefill create form using import session token.
- Source document persistence with authorized list/download routes.
- Operational guardrails (timeouts, size/page/text caps).
- Observability for success/failure/cost signals.

### Out of scope (v1)
- Automatic draft recipe creation before user confirms.
- Edit-page import integration.
- Background queue processing.
- Provider auto-selection policy.

## Architecture and Flow
1. Add route `app/recipes/import/page.tsx` with two input modes: paste text and file upload.
2. Submit import parse request to `POST /api/recipes/import/parse`.
3. Server pipeline:
   - Normalize input source.
   - If file: extract text using MIME/extension adapter.
   - If extracted text is below quality threshold (or source is image-heavy/scanned): run local OCR.
   - If local OCR confidence is below `RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD`: run OpenAI OCR fallback.
   - Run extractor provider to map text into structured draft JSON.
   - Validate output (schema + business rules).
   - Create/update import session with draft, warnings, provider metadata.
   - Return `importSessionId` + draft + warnings/errors.
4. Preview UI on `/recipes/import`:
   - Editable fields for title, description, ingredients, steps.
   - Field-level warning indicators and global warnings.
5. Continue action routes to `/recipes/new?importSession=<id>` (or equivalent token transport).
6. `/recipes/new` hydrates structured form from the import session.
7. On successful recipe creation:
   - Promote staged source docs to recipe-linked records.
   - Link records to new recipe id.
   - Mark session completed.

## Import Session Lifecycle (New Requirement)
Introduce `ImportSession` to make parse-to-create robust:
- Fields: `id`, `userId`, `status`, `draftJson`, `warningsJson`, `sourceRefsJson`, `expiresAt`, `createdAt`, `updatedAt`.
- Status values: `PARSED`, `CONFIRMED`, `EXPIRED`, `FAILED`.
- TTL cleanup for abandoned sessions (default 24 hours).
- Source files remain in staging until session is confirmed; expired sessions are hard-cleaned.

## File Lifecycle and Storage
- During parse: upload to private staging path (`imports/staging/<sessionId>/...`).
- On recipe create success: atomically promote to recipe path (`recipes/<recipeId>/sources/...`) and persist metadata.
- On parse/create failure: preserve diagnostics but avoid orphaned permanent files.
- Scheduled cleanup removes expired staging files and expired sessions.

## Public Interfaces / Type Additions
### APIs
- `POST /api/recipes/import/parse`
  - Accept `multipart/form-data` for files and JSON for pasted text.
  - Supports optional `Idempotency-Key` header.
- `GET /api/recipes/import/sessions/[sessionId]`
  - Owner-only retrieval for draft hydration.
- `GET /api/recipes/[id]/source-documents`
  - Owner/scoped-access list.
- `GET /api/recipes/[id]/source-documents/[docId]/file`
  - Owner/scoped-access file stream.

### Provider contract
- `RecipeImportExtractorProvider.extract(inputText, context): Promise<ImportedRecipeDraftResult>`
- `buildRecipeImportExtractorProvider()` factory (env-driven).
- Returned metadata includes `providerName`, `model`, `promptVersion`, `latencyMs`, `tokenUsage`.

### Text adapters
- `extractTextFromTxt`
- `extractTextFromDocx`
- `extractTextFromDocBestEffort`
- `extractTextFromPdf` (text layer extraction)
- `extractTextFromPdfWithLocalOcr`
- `extractTextFromImageWithLocalOcr`
- `runOpenAiOcrFallback`

### Domain types
- `ImportedRecipeDraft`
- `ImportedIngredientDraft`
- `ImportWarning` (code + field + message)
- `RecipeSourceDocument`
- `ImportSession`

### Environment variables
- `RECIPE_IMPORT_ENABLED=true|false`
- `RECIPE_IMPORT_EXTRACTOR_DRIVER=openai|rule-based|...`
- `OPENAI_API_KEY`
- `OPENAI_RECIPE_IMPORT_MODEL`
- `RECIPE_IMPORT_OCR_DRIVER=local-first`
- `RECIPE_IMPORT_OCR_LOCAL_ENGINE=tesseract|...`
- `RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD` (default `0.80`)
- `RECIPE_IMPORT_OCR_OPENAI_MODEL`
- `RECIPE_IMPORT_MAX_FILE_BYTES`
- `RECIPE_IMPORT_MAX_PDF_PAGES`
- `RECIPE_IMPORT_MAX_TEXT_CHARS`
- `RECIPE_IMPORT_PARSE_TIMEOUT_MS`
- `RECIPE_IMPORT_SESSION_TTL_HOURS`

## Data Model Changes (Prisma + Repository)
### New model: `RecipeSourceDocument`
- `id`, `recipeId`, `uploadedByUserId`
- `originalFilename`, `mimeType`, `sizeBytes`
- `storageKey`
- `sourceType` (`paste|txt|docx|doc|pdf`)
- `extractionDriver`, `extractionModel`, `createdAt`

### New model: `ImportSession`
- `id`, `userId`, `status`
- `draftJson`, `warningsJson`, `sourceRefsJson`
- `providerName`, `providerModel`, `promptVersion`
- `expiresAt`, `createdAt`, `updatedAt`

### Relations
- `Recipe 1 -> many RecipeSourceDocument`
- `User 1 -> many ImportSession`

### Repository/use-case additions
- `createOrUpdateImportSession(...)`
- `getImportSessionForUser(sessionId, userId)`
- `expireImportSessions(now)`
- `addSourceDocument(recipeId, userId, metadata)`
- `listSourceDocuments(recipeId, userId scoped)`
- `getSourceDocumentAsset(recipeId, docId, userId scoped)`

## Validation and Error Behavior
### Two-tier validation
1. Schema normalization validation (shape/types/ranges).
2. Business rule parity with create flow (required sections and constraints).

### Strict requirements
- Non-empty title.
- At least one ingredient.
- Non-empty steps.
- Positive quantity.
- Unit required.

### Standard error codes
- `UNSUPPORTED_FILE_TYPE`
- `FILE_TOO_LARGE`
- `PDF_NO_EXTRACTABLE_TEXT`
- `OCR_LOW_CONFIDENCE`
- `OCR_FALLBACK_FAILED`
- `DOC_EXTRACTION_FAILED`
- `MISSING_REQUIRED_FIELDS`
- `EXTRACTION_TIMEOUT`
- `PROVIDER_UNAVAILABLE`
- `IMPORT_SESSION_EXPIRED`

### Behavior
- Scanned/low-text PDFs: attempt local OCR, then OpenAI OCR fallback, return HTTP 400 with clear guidance only when both fail or remain below threshold.
- DOC best-effort failures: explicit guidance and retry options.
- Never silently produce malformed drafts.

## Security and Access
- Import APIs require authentication.
- Source document list/download require recipe access check (owner or current app-level authorized visibility policy).
- Persist docs only in private storage paths.
- Serve files only via authorized API routes.
- Validate extension, declared MIME, and detected type server-side.
- Sanitize filenames and storage keys.
- Avoid logging raw recipe content.
- Add malware-scan integration hook for uploads (sync or async quarantine path).

## Reliability and Operability
- Parse timeout budget enforced.
- User-level rate limits on parse endpoint.
- Max caps enforced for file bytes, PDF pages, and extracted text length.
- Idempotency support for duplicate submits.
- OCR path telemetry includes local confidence scores, fallback frequency, and fallback success rate.
- Structured telemetry:
  - Parse success rate by input type.
  - Time-to-parse and p95 latency.
  - Continue-to-create conversion.
  - Top error codes.
  - Provider usage/cost counters.

## UI/UX Details
Import screen includes:
- Paste text area.
- Upload control.
- Parse action with loading/error states.
- Structured preview editor.
- Field-level warning display and inline validation mapping.
- Continue action to structured form.

Additional requirements:
- Keep `/recipes/new` as canonical editor.
- Persist preview edits in session until create or expiry.
- Deterministic stable `id` attributes for new UI elements.
- Accessibility acceptance criteria: keyboard flow, labels, focus management, and screen-reader friendly error feedback.

## Testing Plan
### Unit tests
- Text extraction adapters for TXT/DOCX/DOC/PDF success/failure.
- OCR pipeline behavior (local success, local low-confidence fallback, fallback success/failure).
- Provider normalization + schema validation.
- Strict missing required sections behavior.
- Scanned/low-text PDF detection and OCR threshold handling.
- Import session expiration and cleanup logic.
- Idempotency handling logic.

### Integration tests
- `POST /api/recipes/import/parse` for paste and file uploads.
- OCR fallback invocation when local OCR confidence is below threshold.
- Auth/access control for source document routes.
- Session retrieval and ownership enforcement.
- Prefill transfer `/recipes/import -> /recipes/new`.
- Create success path promotes staged docs and links metadata.

### E2E tests
- Full happy path (paste and file).
- OCR path for scanned PDF (local success and fallback success).
- Error path for unsupported/failed DOC and OCR failure after fallback.
- Regression: existing create flow unchanged without import.

### Adversarial/regression cases
- Very large ingredient lists.
- Malformed unicode and unusual punctuation.
- Duplicate ingredients and mixed units.
- Prompt-injection-like text in source content.

## Rollout Plan
1. Gate behind `RECIPE_IMPORT_ENABLED` (default off).
2. Deploy to `pre-main` and validate via checklist:
   - Paste import success/failure.
   - TXT/DOCX/PDF behavior.
   - DOC best-effort messaging.
   - Session TTL/expiration behavior.
   - Prefill and successful save.
   - Source document access protection.
3. Monitor telemetry and error rates.
4. Promote to production after staging signoff.

## Assumptions and Defaults
- Default extractor driver is OpenAI-enabled with local-first OCR fallback policy.
- DOC support is best-effort and may fail for legacy binary files.
- OCR is included in v1 with local-first strategy and OpenAI fallback on low confidence.
- Multiple source documents per recipe are stored as import history.
- Existing parser scaffold files may be reused/refined.
- Access model for source docs follows recipe access policy and must be applied consistently across list/download.
