# Project Agent Instructions

## New Chat Handoff
- To reduce repeated context-gathering, prefer a short handoff packet at the start of a new chat when continuing existing Recetas work.
- For active feature work, keep a live handoff file at `requirements/<feature>/handoff.md` when the feature has enough moving parts to need one.
- The handoff file should include:
  - Current State
  - Completed
  - In Progress
  - Next Action
  - Known Issues
  - Verification Already Run
  - Manual Testing Status
  - Decisions Already Approved
- In a new chat, read the requested handoff file first, then inspect only the files needed for the next task unless the repo evidence contradicts the handoff.
- When no handoff file exists, use this quick-start order before broader exploration:
  1. `AGENTS.md`
  2. `requirements/<feature>/implementation-plan.md`
  3. `requirements/<feature>/qa-checklist.md`
  4. `git status --short --branch`
- Treat implementation trackers and checklists as the source of truth for progress when they are present and current.
- Do not re-plan completed or approved decisions unless the docs, code, or user request explicitly indicate the plan is stale.
- When closing a work session, update the relevant tracker or handoff file with the next concrete action and any verification already run.

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
- Create all design documents inside the relevant `requirements/<feature>/` folder. Do not place feature design docs in ad hoc locations outside that feature's requirements directory.
- Add stable `id` attributes to newly created or modified UI elements when appropriate.
- Preserve accessibility basics.
- Keep the implementation incremental and reviewable.

### Branching Rule For New UI Features
- Start UI feature workflow from `pre-main`.
- Create the working branch at the beginning of the approved UI feature effort from `pre-main`.
- Run BA, research, design exploration, and implementation planning on that feature branch before coding begins.
- Use the branch naming convention `codex/feature/<kebab-case-name>`.
- Open the PR back into `pre-main`.
