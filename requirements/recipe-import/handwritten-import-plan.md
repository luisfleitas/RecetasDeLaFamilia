# Handwritten Recipe Import Plan

## Summary
Extend the existing authenticated recipe import flow at `/recipes/import` with a new `Handwritten Notes` mode for image-based handwritten recipes. Handwritten image imports will use the current handwritten OCR implementation, which supports `openai` or `local` as the configured V1 provider path. The extracted text will feed into the existing structured recipe extraction flow. Users can upload one or more images for the same handwritten recipe, review and edit the parsed draft before continuing to `/recipes/new`, and see stronger warnings for cursive or ambiguous OCR output. The uploaded handwritten images should also be preserved as recipe-linked source images after creation, with an explicit option to allow public viewing when desired.

This plan is intentionally incremental:
- V1: handwritten image import (`JPG`, `PNG`, `WEBP`, `TIFF`, `BMP`)
- V2: scanned handwritten PDF support
- Optional later: source preview in the review step

## Product Decisions Locked
- Extend the existing import feature instead of building a separate handwritten-import system.
- Add a source-mode split on `/recipes/import`:
  - `Document Import`
  - `Handwritten Notes`
- Use the existing secondary tab pattern that matches the Visibility Type tabs.
- Keep `/recipes/new?importSession=...` as the final recipe creation path.
- Use a provider model for handwritten OCR so OCR engines can be changed without rewriting the import flow.
- Ship V1 with the current handwritten OCR implementation using `openai` or `local` as the configured provider path.
- Keep the existing preview/edit step and strengthen it for handwriting ambiguity.
- Preserve handwritten import images as recipe-linked assets after successful recipe creation.
- Add an explicit visibility option so handwritten source images can be made publicly viewable when the user wants.
- Handwritten images are first-class scope in V1.
- Handwritten scanned PDFs are deferred to V2.

## Scope
### In scope (V1)
- Add `Handwritten Notes` mode to the import screen.
- Support handwritten recipe image uploads:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/tiff`
  - `image/bmp`
- Allow multiple images for a single handwritten import session.
- Route handwritten image OCR through a dedicated source-aware orchestration layer.
- Use the current handwritten OCR provider selection already implemented for V1.
- Reuse the existing structured recipe extraction provider after OCR text extraction.
- Persist session metadata for handwritten imports.
- Promote staged handwritten images into recipe-linked source image records on successful recipe creation.
- Add handwriting-specific review hints and warnings in the existing preview/edit UI.
- Preserve mobile readiness, stable ids, and accessibility basics.
- Add test coverage and telemetry for handwritten imports.

### Out of scope (V1)
- Scanned handwritten PDF parsing.
- OCR overlays or character-level confidence visualization.
- In-browser camera capture.
- A fully new review screen.
- Authenticated staged-source preview before recipe creation.
- Replacing the standard document import pipeline.

## UX Direction
### Import screen
- Keep the existing page structure intact.
- Add a secondary tab strip below the page header using the existing `secondary-tab-strip` pattern.
- Tabs:
  - `Document Import`
  - `Handwritten Notes`

### Document Import mode
- Preserve current behavior:
  - pasted text
  - TXT, DOCX, DOC, PDF, and supported image document upload

### Handwritten Notes mode
- Focus UI copy on photo/scan uploads.
- Prefer guidance that helps users capture legible cursive notes:
  - strong lighting
  - page fills most of the frame
  - straight angle
  - preserve page order when uploading multiple images
- Allow users to select multiple images when one recipe spans several pages/cards/photos.
- De-emphasize freeform text paste in this mode.
- Show supported image formats clearly.

### States
- Empty:
  - explain best practices for photographing handwritten recipes
- Loading:
  - use copy like `Reading handwriting...`
- Error:
  - unsupported file type
  - unreadable handwriting
  - OCR provider unavailable
  - extraction too weak for a reliable draft
- Success:
  - show parsed draft in the existing preview/edit layout
  - show a handwriting-specific warning banner near the top
  - if multiple images were uploaded, note that pages were combined in upload order

### Review step
- Reuse the existing preview/edit flow.
- Keep title, description, ingredients, and steps editable before continue.
- Add stronger warning language for handwritten imports:
  - `Review carefully before continuing. Handwritten recipes can produce ambiguous text.`
- Surface review hints when the OCR result looks weak or cursive-heavy.
- Add a visibility control for handwritten source images:
  - default: not publicly viewable
  - optional: make handwritten source images publicly viewable with the recipe

### Mobile behavior
- Tabs remain horizontally scrollable.
- Upload control uses large tap targets.
- Warning summary stays near the top of the editable draft.

## Architecture and Flow
1. User opens `/recipes/import`.
2. User selects `Document Import` or `Handwritten Notes`.
3. User uploads one or more supported handwritten images in `Handwritten Notes` mode.
4. Client sends `POST /api/recipes/import/parse` with `inputMode=handwritten`.
5. Server pipeline:
   - validate file type, size, and image count
   - preserve upload order as page order
   - select the configured handwritten OCR provider path for V1
   - run handwritten OCR orchestration for each image
   - use the configured handwritten OCR path for each image
   - concatenate per-image text in upload order with page boundaries preserved
   - send combined text into the existing recipe extraction provider
   - validate draft
   - create import session with draft, warnings, source refs, and handwritten metadata
6. Client renders the existing preview/edit form plus handwritten-specific warning UI.
7. User edits the draft and continues to `/recipes/new?importSession=<id>`.
8. Existing create flow hydrates from the session and completes recipe creation.
9. On successful recipe creation, staged handwritten images are promoted and linked to the recipe with the selected visibility setting.

## OCR Strategy
### Handwritten image OCR
- V1 OCR model: current handwritten OCR implementation with `openai` or `local` as the configured provider path
- Default V1 provider: `openai`
- Execution model: per-image OCR with ordered merge into one recipe text payload

### Provider contract
V1 does not introduce a separate multi-provider handwritten OCR chain. The implementation should continue to use the existing handwritten OCR path selection and return normalized metadata that records which provider path produced the result.

Recommended provider result fields:
- `text`
- `providerName`
- `providerModel` when available
- `warnings`

The orchestrator should decide:
- provider selection for the request
- weak-result heuristics for review hints
- merged metadata returned to the session layer

### Review hint triggers
Add `manual review required` or similar hints when:
- title is missing or fragmented
- ingredient rows fail parsing in unusual numbers
- step text is overly short or noisy
- character noise suggests cursive misreads
- image order suggests a split recipe but later images add little or no usable text

### Design note
OpenAI OCR does not currently expose a useful confidence score in the existing implementation, so handwritten review guidance should be based on heuristics and extraction quality rather than provider confidence values.

## API and Contract Changes
### `POST /api/recipes/import/parse`
- Accept an `inputMode` field:
  - `document`
  - `handwritten`
- Accept multiple uploaded files for handwritten mode.
- Default to `document` when omitted for backward compatibility.
- For handwritten image uploads, route through handwritten OCR orchestration and merge results in upload order.
- Return:
  - `importSessionId`
  - `draft`
  - `warnings`
  - `sourceRefs`
  - `providerName`
  - `providerModel`
  - `promptVersion`
  - `inputMode`
  - handwritten metadata payload

### `GET /api/recipes/import/sessions/[sessionId]`
- Return handwritten metadata alongside existing draft and warnings so the review UI can fully rehydrate.

### `PATCH /api/recipes/import/sessions/[sessionId]`
- Preserve handwritten metadata while updating the user-edited draft and warnings.

### Recipe source image access
- Add or extend recipe source-document/image read routes so handwritten source images can be served:
  - privately by default
  - publicly only when the stored visibility option allows it
- Public exposure should be explicit and scoped to the linked recipe source images only.

## Data Model Changes
Update `ImportSession` to store handwritten import metadata.

Recommended change in `/Users/luisfleitas/Personal Projects/Recetas/prisma/schema.prisma`:
- add `metadataJson String? @map("metadata_json")`

Recommended metadata shape:
- `inputMode`
- `imageCount`
- `pageOrder`
- `ocrProviderUsed`
- `ocrFallbackUsed`
- `ocrProvidersByImage`
- `ocrReviewLevel`
- `reviewHints`
- `sourceImageVisibility`

This is preferred over adding multiple handwritten-specific columns because it keeps the initial schema change small and the feature easier to evolve.

## Application and Infrastructure Changes
### Update
- `/Users/luisfleitas/Personal Projects/Recetas/app/recipes/import/import-recipe-form.tsx`
- `/Users/luisfleitas/Personal Projects/Recetas/app/api/recipes/import/parse/route.ts`
- `/Users/luisfleitas/Personal Projects/Recetas/app/api/recipes/import/sessions/[sessionId]/route.ts`
- `/Users/luisfleitas/Personal Projects/Recetas/lib/application/recipes/import-session-metadata.ts`
- `/Users/luisfleitas/Personal Projects/Recetas/lib/application/recipes/openai-ocr.ts`

### Add
- `/Users/luisfleitas/Personal Projects/Recetas/lib/application/recipes/handwritten-import.ts`

### Responsibilities
#### `import-recipe-form.tsx`
- add tab state and UI
- add stable ids for new mode tabs and handwritten-specific elements
- send `inputMode`
- allow selecting multiple images in handwritten mode
- preserve and communicate upload order
- show handwritten review banner and hints
- collect handwritten source-image visibility preference

#### `parse/route.ts`
- parse `inputMode`
- preserve existing document flow
- route handwritten image files through handwritten OCR orchestration
- stage and persist multiple source documents for one handwritten session
- attach handwritten metadata to the import session and response
- emit handwritten-aware telemetry

#### `handwritten-import.ts`
- execute the configured handwritten OCR path per image
- merge ordered image text into one extraction payload
- return normalized OCR result plus metadata and review hints

#### `openai-ocr.ts`
- support the configured OpenAI OCR path when selected for handwritten imports

#### `import-session-metadata.ts`
- define and parse handwritten metadata shape

#### recipe creation flow
- read the handwritten source-image visibility preference from the import session
- promote handwritten images to recipe-linked records on successful recipe creation
- persist the selected visibility setting with the promoted source images

#### source-image delivery route
- enforce private access by default
- allow public reads only for source images explicitly marked public

## Environment Variables
Existing variables remain in use for standard import behavior.

Add provider selection configuration for handwritten OCR, for example:
- `RECIPE_IMPORT_HANDWRITTEN_PRIMARY_OCR_PROVIDER=openai`

Exact naming can follow the team’s preferred conventions, but the implementation should include:
- explicit config validation
- clear startup/runtime error messages
- deployment documentation updates

## Telemetry
Track handwritten imports separately from standard document imports.

Recommended handwritten telemetry dimensions:
- `inputMode`
- image count
- OCR provider configured
- OCR providers used
- parse success or failure
- warning count
- review level
- source image visibility selection

This will help determine whether cursive-heavy imports need further tuning after rollout.

## Validation and Error Behavior
### Validation
- Reuse existing draft validation after OCR and structured extraction.
- Keep existing strict requirements for title, ingredients, and steps before continue.

### Error behavior
- Do not silently create weak handwritten drafts without warning.
- If the configured OCR path fails, return a clear actionable error.
- If extraction succeeds but quality is weak, allow review/edit with prominent warnings instead of hard failure.

## Testing Plan
### Unit tests
- handwritten OCR orchestration:
  - single-image OpenAI success
  - multi-image OpenAI success
  - single-image local OCR success when `local` is selected
  - multi-image local OCR success when `local` is selected
  - both providers fail
  - ordered merge preserves image order
- handwritten metadata parsing
- handwritten review hint generation

### Integration tests
- `POST /api/recipes/import/parse` with one handwritten image
- `POST /api/recipes/import/parse` with multiple handwritten images
- handwritten OpenAI path
- handwritten local path
- standard document import remains unchanged
- session GET returns handwritten metadata
- session PATCH preserves handwritten metadata
- successful recipe creation promotes handwritten images
- public visibility flag persists correctly
- private handwritten source images reject unauthorized public access
- public handwritten source images are readable without auth only when explicitly enabled

### UI tests
- mode tab switching
- handwritten mode copy and supported types
- warning banner appears for handwritten parses
- existing preview/edit workflow still works
- mobile-width tab behavior remains usable

## Acceptance Criteria
- Users can choose `Document Import` or `Handwritten Notes` on `/recipes/import`.
- Handwritten image uploads are supported in V1, including multiple images for one recipe.
- Handwritten image imports use the current V1 handwritten OCR implementation with `openai` or `local` as the configured provider path.
- Default handwritten OCR provider is `openai`.
- When multiple images are uploaded, they are processed and merged in upload order.
- Users can edit the parsed handwritten draft before continuing.
- Handwritten imports show stronger review guidance than standard imports.
- Handwritten import images are saved and linked to the created recipe after successful creation.
- Handwritten source images are private by default.
- Users can explicitly opt in to making handwritten source images publicly viewable.
- Standard document import behavior remains unchanged.
- New UI elements include stable ids.
- Handwritten imports are distinguishable in telemetry and session metadata.

## Rollout Notes
- V1 should ship handwritten image import only.
- V2 can add handwritten scanned PDF support by rasterizing PDF pages and reusing the handwritten OCR orchestration.
- Source preview should remain optional and should not block V1 unless it becomes a hard product requirement.

## Recommendation
Implement handwritten image import first, including multi-image recipe support, the current V1 handwritten OCR provider selection, and recipe-linked source-image preservation. Keep handwritten source images private by default and require an explicit opt-in for public viewing so the feature remains useful without weakening privacy by accident.
