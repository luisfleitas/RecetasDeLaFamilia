# Handwritten Recipe Import Execution Checklist

## Phase Gate
Status: `IN_IMPLEMENTATION`
Rule: Track execution for the handwritten recipe import feature against the approved Option B direction and call out any gaps between the current branch state and the approved plan.

## Progress Snapshot (Updated: 2026-03-23)
- Handwritten import implementation is actively in progress on branch `codex/feature/handwritten-recipe-import`.
- The import UI has been refactored to support `Document Import` and `Handwritten Notes` modes on the existing `/recipes/import` page.
- The handwritten mode UI now includes multi-image upload, ordered page review, handwritten-specific helper copy, stable `id` attributes, and a handwritten review warning area.
- The parse pipeline now branches by `inputMode`, accepts multiple handwritten image uploads, preserves upload order, and stores handwritten session metadata.
- Import session metadata and recipe source-document metadata have been expanded to preserve handwritten context and source-image visibility.
- Recipe-linked source image visibility plumbing is in progress and private/public handling is wired into source-document promotion and file access.
- The implementation does not yet match the full OCR-provider plan:
  - current helper logic supports `openai` or `local`
  - Google Vision fallback is not implemented yet
  - review hints are currently baseline hints, not the fuller heuristic set described in the plan
- Dedicated handwritten automated test coverage is not present yet in `scripts/`, so verification is still pending.
- Two migration folders exist for the metadata JSON additions, but local migration application/verification is still an open checkpoint.
- The implementation-plan document still says `Pending final user approval before coding`, which no longer matches the branch state and should be reconciled before PR review.

## 1. Workflow And Documentation Alignment
- [x] Research pack created in `requirements/recipe-import/handwritten-ui-research-pack.md`.
- [x] Approved implementation plan created in `requirements/recipe-import/handwritten-ui-option-b-implementation-plan.md`.
- [x] Feature work is happening on `codex/feature/handwritten-recipe-import`.
- [ ] Reconcile plan status text so the approval record matches the fact that implementation is already underway.
- [ ] Add final verification notes once the handwritten flow is tested end to end.

## 2. Schema And Persistence
- [x] Extend `ImportSession` storage to support `metadataJson`.
- [x] Extend `RecipeSourceDocument` storage to support `metadataJson`.
- [x] Add handwritten metadata parsing/types in `lib/application/recipes/import-session-metadata.ts`.
- [x] Add recipe source-document metadata parsing/types in `lib/application/recipes/source-documents.ts`.
- [~] Migration files for metadata JSON columns are present in `prisma/migrations/`, but local application/verification is still pending.

## 3. Import Page And UX
- [x] Keep the existing `/recipes/import` page as the single entry point.
- [x] Add the handwritten/document secondary tab switch using the existing tab-strip pattern.
- [x] Preserve the document import path while introducing handwritten mode.
- [x] Refactor the page into a clearer source-first handwritten workspace.
- [x] Support multi-file handwritten upload from the client.
- [x] Show ordered uploaded page cards for handwritten imports.
- [x] Add handwritten-specific helper copy and supported-format guidance.
- [x] Add stable `id` attributes to the new handwritten UI elements.
- [x] Add handwritten warning banner and merged-page context in the review area.
- [x] Add handwritten source-image visibility control before continue.
- [ ] Complete manual QA for empty, loading, error, and success states across both modes on desktop and mobile.

## 4. Parse Route And OCR Orchestration
- [x] Add `inputMode` request handling to `POST /api/recipes/import/parse`.
- [x] Preserve existing document import behavior when `inputMode=document`.
- [x] Accept one or more handwritten image files when `inputMode=handwritten`.
- [x] Preserve handwritten upload order through OCR assembly.
- [x] Extract handwritten OCR logic into `lib/application/recipes/handwritten-import.ts`.
- [x] Persist handwritten metadata on created import sessions.
- [~] Handwritten OCR provider selection exists, but it currently switches between `openai` and `local`, not the approved provider-chain design.
- [ ] Implement the approved OpenAI primary plus Google Vision fallback chain.
- [ ] Add weak-result/fallback heuristics that match the handwritten plan more closely.
- [ ] Expand handwritten review-hint generation beyond the current baseline warnings.

## 5. Session Round-Trip And Source Documents
- [x] Return handwritten metadata from `GET /api/recipes/import/sessions/[sessionId]`.
- [x] Preserve handwritten metadata during `PATCH /api/recipes/import/sessions/[sessionId]`.
- [x] Save handwritten source-image visibility changes from the review step.
- [x] Carry handwritten import metadata into promoted recipe source documents.
- [x] Gate source-document file access by private/public visibility metadata.
- [ ] Verify the private/public source-image behavior manually for owner, family-member, and public viewers.

## 6. Recipe Creation Hydration
- [x] Keep the existing continue path to `/recipes/new?importSession=...`.
- [~] Handwritten session data appears wired for the existing flow, but end-to-end handwritten hydration through recipe creation still needs explicit verification.

## 7. Verification And QA
- [ ] Gather handwritten test images from `/Users/luisfleitas/Personal Projects/Libro Abuela` and use them as the primary manual QA set for this feature.
- [ ] Add automated coverage for handwritten multi-image parse handling.
- [ ] Add automated coverage for handwritten metadata parsing and session round-trip.
- [ ] Add automated coverage for source-image visibility behavior.
- [ ] Add regression coverage proving document import still works unchanged.
- [ ] Run manual end-to-end verification from handwritten upload through recipe creation.
- [ ] Record verification results in a follow-up report or update this checklist with the final pass/fail notes.

## 8. Release Readiness
- [x] Feature flag support exists for handwritten import enablement.
- [ ] Confirm environment configuration for the chosen handwritten OCR provider path.
- [ ] Decide whether V1 will ship with the current `openai/local` implementation or wait for the planned Google Vision fallback.
- [ ] Complete migration, QA, and implementation-plan status cleanup before PR review.

## Suggested Next Checkpoint
1. Finish the OCR/provider decision and either implement the approved fallback chain or explicitly narrow the V1 scope.
2. Apply and verify the pending migrations locally.
3. Add handwritten-specific automated tests.
4. Run one full handwritten import-to-create QA pass and update this checklist with the results.
