# Project Agent Instructions

## UI Styling Consistency
- Use the Visibility Type tabs as the reference pattern for all secondary menus.
- Secondary menus must reuse the same structure and interaction model:
  - Horizontal tab/list layout
  - Active state with bottom border emphasis
  - Hover state with subtle lift, tinted background, and stronger border/text
  - Matching spacing, radius, and transition timing
- Do not introduce a new secondary-menu visual pattern unless explicitly requested.

## UI Workflow
- For substantial UI work in Recetas, use the approval-driven workflow defined in `requirements/ui-workflow/ui-agents-workflow.md`.
- Treat this workflow as the default for:
  - redesigning or materially improving a page
  - restructuring an important flow
  - evaluating mobile readiness before coding
  - comparing multiple UI directions before implementation
  - coordinating design and implementation decisions with explicit approval gates
- Do not use the full workflow for tiny visual tweaks. Compress the process into:
  - BA clarification
  - one lightweight design proposal
  - one implementation plan
  - implementation
  - QA

### Recetas UI Rules
- Improve the existing Recetas UI. Do not do a blind redesign.
- Optimize for clarity, ease of use, mobile readiness, and implementation realism.
- Respect existing component and layout patterns unless a change is clearly justified.
- Cover desktop and mobile behavior explicitly.
- Cover empty, loading, error, and success states for every touched flow.
- Keep outputs concrete and implementation-relevant.
- Favor faster task completion over decorative novelty.

### Planning And Implementation Rules
- Inspect the actual codebase before making assumptions.
- Reuse existing components, utilities, and styling patterns where possible.
- Add stable `id` attributes to newly created or modified UI elements when appropriate.
- Preserve accessibility basics.
- Keep the implementation incremental and reviewable.

### Branching Rule For New UI Features
- Start UI feature workflow from `pre-main`.
- Run BA, research, design exploration, and implementation planning before creating a feature branch.
- Create the working branch only after the implementation plan is approved and code changes are about to begin.
- Use the branch naming convention `codex/feature/<kebab-case-name>`.
- Open the PR back into `pre-main`.
