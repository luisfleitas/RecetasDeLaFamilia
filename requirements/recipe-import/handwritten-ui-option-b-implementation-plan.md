# Handwritten Import UI Option B Implementation Plan

## Status
- Workflow phase: Phase 5 complete
- Design approval status: Approved
- Approved design direction: Option B (`Source-First Workspace`)
- Branch: `codex/feature/handwritten-recipe-import`

## Inputs Received
- Approved handwritten UI research pack
- Approved Option B wireframe
- Existing import page implementation in `app/recipes/import/import-recipe-form.tsx`
- Existing parse route in `app/api/recipes/import/parse/route.ts`
- Existing session route in `app/api/recipes/import/sessions/[sessionId]/route.ts`
- Import metadata helpers in `lib/application/recipes/import-session-metadata.ts`
- Import warnings in `lib/application/recipes/import-warnings.ts`

## Assumptions
- The current document import experience must keep working during the handwritten UI rollout.
- Handwritten import should use the same `/recipes/import` page and the same session-to-create flow.
- New handwritten logic should be isolated where practical instead of expanding route files indefinitely.

## Final Recommendation
Implement Option B as a staged refactor that keeps document import stable while introducing a clearer handwritten workspace:
1. add the mode tabs and new source-first page layout
2. extend request and session contracts for handwritten mode and metadata
3. add handwritten-specific upload, OCR orchestration, metadata persistence, and review UI
4. verify that `/recipes/new?importSession=...` still hydrates and submits correctly

## Architecture Decision
- Use the existing secondary-tab pattern in `app/globals.css` for the handwritten/document mode switch.
- Keep `Document Import` behavior close to today’s implementation.
- Build handwritten support as an extension of the existing import flow, not as a parallel import feature.
- Reuse the existing draft editor and only add handwritten-specific review elements around it.
- Prefer dedicated handwritten helper modules in `lib/application/recipes/` over placing all new logic in route files.

## Implementation Plan

### Step 1: Refactor The Import Page Layout
Update `app/recipes/import/import-recipe-form.tsx` to match the approved Option B structure.

Planned changes:
- Add `inputMode` client state with:
  - `document`
  - `handwritten`
- Insert a secondary tab strip below the page header using the existing project pattern.
- Reframe the page as two sections:
  - `Add source`
  - `Review draft`
- Keep the document import controls close to today’s layout inside document mode.
- In handwritten mode:
  - make image upload the primary control
  - allow multi-file upload
  - show ordered uploaded-page UI
  - display handwritten-specific helper copy
- Preserve stable `id` attributes for newly created or modified UI elements.

Acceptance criteria:
- Tabs match the required secondary-menu pattern.
- Document mode remains usable.
- Handwritten mode clearly presents source upload before review.
- The page remains readable on mobile.

### Step 2: Extend The Client Request Contract
Update the client-side submit logic in `app/recipes/import/import-recipe-form.tsx`.

Planned changes:
- Send `inputMode` with parse requests.
- For document mode:
  - preserve pasted text and single-file behavior
- For handwritten mode:
  - send multiple uploaded files in form data
  - preserve upload order
- Add client-side validation messaging for handwritten image types and empty selections.

Acceptance criteria:
- Parse requests communicate the active mode explicitly.
- Upload order is preserved from UI to request payload.

### Step 3: Add Handwritten-Specific Metadata Types
Extend the shared metadata model in `lib/application/recipes/import-session-metadata.ts`.

Planned additions:
- handwritten metadata shape containing:
  - `inputMode`
  - `imageCount`
  - `pageOrder`
  - `ocrProviderUsed`
  - `ocrFallbackUsed`
  - `ocrProvidersByImage`
  - review flags / review hints
  - source-image visibility preference
- parsing helpers for the new metadata fields

Acceptance criteria:
- Session metadata can represent handwritten-specific context without breaking current import sessions.

### Step 4: Add Handwritten Parse/OCR Helpers
Create dedicated handwritten helpers under `lib/application/recipes/`.

Planned responsibilities:
- validate handwritten files and supported MIME types
- orchestrate per-image OCR in upload order
- trigger primary/fallback OCR provider logic
- merge extracted text into one structured extraction payload
- generate handwritten review hints and metadata for the session layer

Acceptance criteria:
- The parse route can delegate handwritten-specific logic to focused helpers.
- OCR/provider orchestration is testable outside the route handler.

### Step 5: Update The Parse Route
Refactor `app/api/recipes/import/parse/route.ts` to support `document` and `handwritten` modes cleanly.

Planned changes:
- branch request handling by `inputMode`
- preserve current document behavior
- add handwritten path with:
  - multiple uploaded image support
  - upload-order preservation
  - handwritten OCR orchestration
  - handwritten metadata persistence in the import session
  - handwritten warning payloads as needed

Acceptance criteria:
- Existing document import behavior continues to work.
- Handwritten mode accepts multiple supported image files.
- The route returns enough metadata for the UI to render the approved review experience.

### Step 6: Extend Session GET/PATCH Responses
Update `app/api/recipes/import/sessions/[sessionId]/route.ts` to round-trip handwritten context.

Planned changes:
- return handwritten metadata in GET responses
- preserve handwritten metadata in PATCH responses
- keep draft editing behavior stable

Acceptance criteria:
- Refreshing or revisiting the session preserves handwritten review context.
- Saving edits to the draft does not lose handwritten metadata.

### Step 7: Expand Review Warnings And Controls
Update `lib/application/recipes/import-warnings.ts` and the import UI to support handwritten-specific review treatment.

Planned changes:
- keep current draft-field warnings
- add a top-level handwritten warning banner
- show merged-pages context when multiple images were combined
- add source-image visibility control in the review section

Acceptance criteria:
- OCR ambiguity is visible before the user continues.
- Handwritten source visibility defaults to private but can be changed intentionally.

### Step 8: Verification And QA
Add or update tests around the handwritten workflow.

Coverage targets:
- document mode regression behavior
- handwritten multi-image request handling
- handwritten metadata parsing and round-trip through the session API
- review warning/banner behavior
- continued hydration into `/recipes/new?importSession=...`

Acceptance criteria:
- No document import regression
- Handwritten mode works end to end through parse, review, save, and continue

## Planned File Targets
- `app/recipes/import/import-recipe-form.tsx`
- `app/api/recipes/import/parse/route.ts`
- `app/api/recipes/import/sessions/[sessionId]/route.ts`
- `lib/application/recipes/import-session-metadata.ts`
- `lib/application/recipes/import-warnings.ts`
- new handwritten helpers under `lib/application/recipes/`
- `prisma/schema.prisma` only if current session metadata storage is insufficient

## Risks
- The current parse route is strongly shaped around a single file input, so multipart parsing will need careful refactoring.
- Option B introduces stronger source/review framing, but the UI must avoid implying the review step is complete before a parse succeeds.
- The current session metadata helpers may need modest expansion to handle handwritten state cleanly.
- OCR heuristics could grow in scope if not kept tightly tied to V1 acceptance criteria.

## Out Of Scope For This Implementation Pass
- scanned handwritten PDF support
- OCR overlays or confidence visualizations
- in-browser camera capture
- a fully custom handwritten review screen
- broader changes to `/recipes/new` unrelated to import hydration

## Approval Record
- Design approval: Option B selected
- Plan approval state: Pending final user approval before coding

## Related Artifacts
- Research pack: `requirements/recipe-import/handwritten-ui-research-pack.md`
- Wireframe index: `design/handwritten-import-wireframes.html`
- Approved wireframe direction: `design/handwritten-import-option-b-wireframe.html`
