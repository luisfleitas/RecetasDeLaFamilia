# Handwritten Import UI Research Pack

## Status
- Workflow phase: Phase 2 complete
- Related feature branch: `codex/feature/handwritten-recipe-import`
- Approved design direction to carry forward: Option B (`Source-First Workspace`)

## Inputs Received
- Locked handwritten-import scope in `requirements/recipe-import/handwritten-import-plan.md`
- Current import UI in `app/recipes/import/import-recipe-form.tsx`
- Existing secondary-tab reference pattern in `app/_components/recipe-visibility-tabs.tsx`
- Shared styling and tab rules in `app/globals.css`

## Assumptions
- Handwritten import extends the existing `/recipes/import` flow rather than creating a separate product area.
- The current document import experience should remain functional with minimal behavioral change.
- Handwritten mode must stay implementation-realistic and reuse established Recetas UI patterns.

## Research Agent A: Workflow Patterns
### Deliverables
- The current import flow already has the right high-level structure:
  1. provide source
  2. parse
  3. review/edit
  4. continue to `/recipes/new`
- The main UX risk is mode confusion. Handwritten import should feel like a focused variant of import, not a separate tool.
- The cleanest pattern is a mode switch directly below the page header, followed by mode-specific input UI.
- Handwritten mode should prioritize guided image upload over pasted text.
- Multi-image upload must communicate that upload order affects OCR merge order.
- The existing review/edit screen should be reused rather than replaced, with handwritten-specific additions layered on top.

### Open Risks
- Users may not understand which input path is active if handwritten and document controls are shown with equal emphasis.
- Multi-image order may be invisible unless surfaced explicitly near upload and review.

### Next Agent Should Do
- Review consistency with current Recetas UI patterns and mobile expectations.

## Research Agent B: Product/UI Consistency
### Deliverables
- All secondary menus must reuse the Visibility Type tab pattern:
  - horizontal tab/list layout
  - active state with bottom border emphasis
  - subtle hover lift
  - tinted hover background
  - matching spacing, radius, and timing
- The current import screen is simple and utility-first; handwritten mode should keep the same visual language.
- Existing strengths to preserve:
  - single-column, low-friction form flow
  - direct error treatment
  - familiar preview/edit step
  - stable `id` discipline already present in the current form
- Consistency rules for handwritten mode:
  - keep one clear primary action in the parse area
  - avoid over-nesting card layouts
  - reuse warning styles already used in the current review UI
  - use explicit labels rather than clever wording
- The mode tabs should appear directly below the import header, not inside the review area.

### Open Risks
- A decorative or new tab style would violate existing project rules.
- A custom handwritten-only review layout would drift from the approved product direction.

### Next Agent Should Do
- Validate mobile behavior and state coverage for empty, loading, error, and success states.

## Research Agent C: Mobile and State Behavior
### Deliverables
- Mobile priorities for handwritten mode:
  - large tap-friendly upload control
  - short capture guidance above the picker
  - horizontally scrollable mode tabs
  - warning summary near the top of the draft review area
- Empty state should teach capture quality:
  - strong lighting
  - flat page
  - tight framing
  - ordered uploads
- Loading copy should be handwritten-specific: `Reading handwriting...`
- Error states should distinguish between:
  - unsupported file type
  - unreadable handwriting / weak extraction
  - OCR provider unavailable
- Success state should confirm when multiple images were merged in upload order.
- The review/edit area will need strong warning visibility because handwritten drafts will likely require more correction.

### Open Risks
- A plain file input may be functionally enough but feel weak on mobile unless wrapped in stronger guidance and spacing.
- Field-only warnings may not be prominent enough for OCR ambiguity.

### Next Agent Should Do
- Synthesize the research into concrete design rules for concept development.

## Research Pack Synthesis
### Deliverables
- Add a secondary tab strip below the import header using the same interaction model as the existing visibility tabs.
- Keep `Document Import` behavior intact when that tab is active.
- In `Handwritten Notes`, make image upload the primary interaction and de-emphasize pasted text.
- Surface short capture guidance before upload.
- Support multiple images with explicit upload-order messaging.
- Use handwritten-specific loading and error copy.
- Reuse the existing preview/edit layout rather than building a separate review screen.
- Add a top-level handwritten warning banner in the review step.
- Add a handwritten source-image visibility control in the review step, defaulting to private.
- Preserve mobile readiness, stable ids, and accessibility basics.

### Open Risks
- The current parse form is built around a single textarea plus a single-file input, so Option B will require moderate UI restructuring.
- The ingredient editor is serviceable today, but on mobile it will need careful spacing once handwritten-specific warnings and metadata are present.

### Next Agent Should Do
- Create design directions that preserve current Recetas patterns while solving handwritten-specific clarity gaps.

## Approved Design Direction
### Selected Option
- Option B: `Source-First Workspace`

### Why It Was Chosen
- Best support for multi-image handwritten workflows
- Strongest handling for mobile capture guidance
- Clearest separation between source collection and draft review
- Better surfaces upload order and source-awareness without requiring a separate review screen

### Guardrails For Implementation
- Keep the section styling restrained and native to the current import page.
- Reuse the current warning, panel, token, and button language.
- Preserve the current review/edit flow and route to `/recipes/new?importSession=...`.

## Related Artifacts
- Wireframe index: `design/handwritten-import-wireframes.html`
- Option A wireframe: `design/handwritten-import-option-a-wireframe.html`
- Option B wireframe: `design/handwritten-import-option-b-wireframe.html`
