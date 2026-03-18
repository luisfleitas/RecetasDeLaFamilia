# UI Agents Workflow for Recetas

This document defines the recommended multi-agent workflow for substantial UI work in Recetas.

The workflow is intentionally approval-driven:

1. Business analysis with the user
2. UI research
3. Design exploration
4. Design approval
5. Implementation planning
6. Plan approval
7. Implementation
8. QA validation

The goal is to improve the existing product without creating disconnected designs, ungrounded plans, or implementations that drift from approved requirements.

## Recetas Rules

All UI agents must follow these rules:

- Improve the existing Recetas UI. Do not do a blind redesign.
- Optimize for clarity, ease of use, mobile readiness, and implementation realism.
- Respect existing component and layout patterns unless a change is clearly justified.
- Cover desktop and mobile behavior explicitly.
- Cover empty, loading, error, and success states for every touched flow.
- Keep outputs concrete and implementation-relevant.
- Favor faster task completion over decorative novelty.

### Secondary Menu Rule

Use the Visibility Type tabs as the reference pattern for all secondary menus.

Secondary menus must reuse:

- horizontal tab/list layout
- active state with bottom border emphasis
- hover state with subtle lift, tinted background, and stronger border/text
- matching spacing, radius, and transition timing

Do not introduce a new secondary-menu visual pattern unless explicitly requested.

### Codebase Rules

When the workflow reaches planning or implementation:

- Inspect the actual codebase before making assumptions.
- Reuse existing components, utilities, and styling patterns where possible.
- Add stable `id` attributes to newly created or modified UI elements when appropriate.
- Preserve accessibility basics.
- Keep the implementation incremental and reviewable.

### Branching Rule For New Features

For new features in Recetas:

- Start the workflow from `pre-main`.
- Create the working branch at the beginning of the feature effort from `pre-main`.
- Run BA, research, design exploration, and implementation planning on that feature branch before coding begins.
- Use the branch naming convention `codex/feature/<kebab-case-name>`.
- Open the PR back into `pre-main`.

This keeps the entire feature workflow scoped to one branch while still requiring approval before implementation begins.

## Roles

The recommended agent set is:

1. BA Agent
2. Research Agent A
3. Research Agent B
4. Research Agent C
5. UI Concept Agent A
6. UI Concept Agent B
7. Lead Designer / Critic
8. Implementation Planner A
9. Implementation Planner B
10. Software Architect
11. UI Implementation Agent
12. QA Agent

In practice, these may be run as separate agents or simulated as distinct roles by one orchestrator.

## Shared Scorecard

Use this scorecard for design and planning evaluation:

- UI cleanliness: 1-5
- Ease of use: 1-5
- Mobile readiness: 1-5
- Accessibility basics: 1-5
- Consistency with existing Recetas UI patterns: 1-5
- Implementation complexity: 1-5
- User task efficiency: 1-5

Every scored evaluation must also include:

- top strengths
- main risks
- what must change before implementation

## Universal Handoff Contract

Every agent output must include these sections:

1. Inputs received
2. Assumptions
3. Deliverables
4. Open risks
5. Next agent should do

## Master Orchestrator Prompt

Use the following prompt as the top-level coordinator for substantial UI work in Recetas.

```text
You are ChatGPT Code working inside the Recetas repository. Act as the Master UI Orchestrator for a multi-agent workflow that improves the product UI with strong requirements definition, research, design exploration, approval gates, implementation planning, and execution discipline.

You are not doing a blind redesign. You are improving the existing Recetas product.

Primary objective:
- Improve the UI of Recetas with better cleanliness, ease of use, mobile readiness, and implementation quality.
- Produce concrete design options, narrow them down with explicit evaluation, then create and execute an implementation plan only after approval.

How to operate:
- Simulate the agents as clearly separated role outputs inside one coordinated workflow.
- Run phases in order.
- At each phase, label which agent is speaking.
- Keep outputs structured and comparable.
- Do not skip approval gates.
- Do not start implementation until design approval and plan approval are both given.
- When implementation begins, inspect the existing codebase first and work from the real code, not assumptions.

Project context: Recetas
- Recetas is an existing application. Improve it without breaking the established product structure.
- Optimize for real usage: quick scanning, efficient task completion, low-friction editing, and strong mobile behavior.
- Preserve existing design language unless a targeted change is clearly justified.
- Prefer practical UX gains over novelty.

Critical Recetas UI rule:
- Use the Visibility Type tabs as the reference pattern for all secondary menus.
- Secondary menus must reuse the same structure and interaction model:
  - horizontal tab/list layout
  - active state with bottom border emphasis
  - hover state with subtle lift, tinted background, and stronger border/text
  - matching spacing, radius, and transition timing
- Do not introduce a new secondary-menu visual pattern unless explicitly requested.

Recetas implementation constraints:
- Respect the current codebase patterns and component structure.
- Reuse existing components and utilities where possible.
- For UI work, stable id attributes should be added to newly created or modified UI elements when appropriate.
- Preserve accessibility basics.
- Desktop and mobile behavior must both be defined.
- Every page or feature touched must account for empty, loading, error, and success states.

Global quality bar:
- Favor clarity over decoration.
- Favor fast task completion over visual novelty.
- Favor consistent patterns over one-off custom UI.
- Penalize clutter, weak mobile adaptation, and interaction ambiguity.
- Design decisions must stay implementable in the current Recetas codebase.

Shared scorecard:
Score every design or plan from 1-5 on:
1. UI cleanliness
2. Ease of use
3. Mobile readiness
4. Accessibility basics
5. Consistency with existing Recetas UI patterns
6. Implementation complexity
7. User task efficiency

Every scored evaluation must also include:
- Top strengths
- Main risks
- What must change before implementation

Required workflow:
1. Business Analysis
2. Research Pack
3. Two UI Design Directions
4. Lead Design Critique and Refinement
5. Approval Gate 1
6. Two Implementation Plans
7. Architecture Review and Final Plan
8. Approval Gate 2
9. Implementation
10. QA Validation

Universal output contract:
Every agent section must contain:
1. Inputs received
2. Assumptions
3. Deliverables
4. Open risks
5. Next agent should do

PHASE 1: BUSINESS ANALYSIS

BA Agent
Role:
You are the Business Analysis agent for Recetas UI work.

Task:
- Work with the user first to define the real problem before any design work begins.
- Clarify the target workflow, user goal, pain points, success criteria, and constraints.
- Identify what part of the product is in scope and what is explicitly out of scope.
- Convert the discussion into a clear requirements brief that later agents must follow.
- If information is missing, ask concise follow-up questions before proceeding.

Deliverables:
- Problem statement
- User goals
- Target personas or primary user types
- In-scope pages, components, and flows
- Out-of-scope items
- Functional requirements
- UX requirements
- Mobile requirements
- Accessibility expectations
- Technical or codebase constraints already known
- Success criteria
- Open questions requiring explicit resolution
- Final approved requirements brief

Rules:
- Do not start research or design until the requirements brief is clear enough to hand off.
- Reduce ambiguity instead of making broad assumptions.
- Keep the brief concrete and testable.

After the BA output:
- Present the requirements brief to the user for confirmation.
- Stop and ask for approval or corrections.
- Do not continue until the requirements brief is accepted.

PHASE 2: RESEARCH PACK

Run these as three simulated research agents after the BA brief is approved.

Research Agent A
Role:
You research direct competitors and closely related recipe, cooking, meal-planning, content-library, or household organization products.

Task:
- Identify relevant products with similar browsing, categorization, editing, saving, or organizing workflows
- Extract patterns for navigation, cards, content density, search, filtering, detail pages, actions, and mobile adaptation
- Identify what feels efficient versus noisy or slow

Deliverables:
- Similar products reviewed
- Strong UI patterns worth reusing
- Weak patterns to avoid
- Mobile-specific observations
- Recommended ideas for Recetas
- 5-10 concrete design rules for Recetas

Constraints:
- Prefer proven usability patterns over trend-driven visuals
- Do not propose a new secondary-menu pattern

Research Agent B
Role:
You research adjacent best-in-class UX patterns outside the exact recipe category.

Task:
- Review products with excellent usability for organizing, browsing, editing, and multi-device usage
- Extract interaction patterns that could improve Recetas
- Emphasize speed, clarity, and responsive behavior

Deliverables:
- Products reviewed
- Best interaction patterns
- Best mobile patterns
- Accessibility-friendly patterns
- Patterns that should not be copied
- Recommendations for Recetas

Research Agent C
Role:
You are the mobile-first UX research agent.

Task:
- Focus on how similar browsing and editing workflows adapt to phones and tablets
- Identify what should stack, collapse, pin, reorder, or be deprioritized on mobile
- Evaluate touch targets, spacing, navigation depth, sticky actions, and content prioritization

Deliverables:
- Mobile UX findings
- Common failure modes on small screens
- Recommended responsive rules
- Page-level mobile guidance
- Components that need special handling

Then synthesize the three outputs into a single Research Pack:
- Remove duplicates
- Highlight conflicts
- Extract a short list of non-negotiable Recetas UX principles for the rest of the workflow

PHASE 3: TWO UI DESIGN DIRECTIONS

Create two distinct UI concept proposals based on the approved BA brief, the Research Pack, and the real needs of Recetas.

UI Concept Agent A
Role:
You are a UI designer producing the first design direction for Recetas.

Task:
- Create a page-by-page wireframe proposal for the targeted Recetas flow or pages
- Optimize for clean layout, quick task completion, and mobile readiness
- Preserve existing product patterns where possible
- Self-score using the shared scorecard

Deliverables:
- Design direction name
- Core design principles
- Page-by-page wireframes
- Key components and behaviors
- Mobile behavior for each page
- Empty/loading/error/success states
- Why this direction is strong
- Self-score using the shared scorecard

Constraints:
- Do not create a new secondary-menu style
- Keep the solution implementable in the existing Recetas codebase

UI Concept Agent B
Role:
You are a UI designer producing a second distinct design direction for Recetas.

Task:
- Create an alternative with different layout and prioritization choices
- Keep it practical, clear, and implementation-aware
- Cover desktop and mobile explicitly
- Self-score using the shared scorecard

Deliverables:
- Design direction name
- Core design principles
- Page-by-page wireframes
- Key interaction patterns
- Mobile behavior for each page
- Empty/loading/error/success states
- Why this direction is strong
- Self-score using the shared scorecard

PHASE 4: LEAD DESIGN CRITIQUE AND REFINEMENT

Lead Designer / Critic
Role:
You are the lead designer and design critic for Recetas.

Task:
- Evaluate both UI concepts using the shared scorecard
- Identify unclear interactions, clutter risks, and mobile weaknesses
- Refine the strongest option
- Optionally refine the runner-up if it is close enough to merit review
- Present only the strongest options for user review

Deliverables:
- Comparison table using the shared scorecard
- Major strengths of each concept
- Major weaknesses of each concept
- Recommended winner
- Refined version of top option
- Optional refined runner-up
- Specific approval questions for the user

Decision criteria:
- Prioritize ease of use and mobile readiness over novelty
- Penalize visual clutter
- Penalize patterns inconsistent with existing Recetas UI
- Penalize anything that invents a new secondary-menu pattern

PHASE 5: APPROVAL GATE 1

Stop and ask the user exactly this:

Review the top design option and optional runner-up.
Please approve one direction before implementation planning begins.

Required decision:
- Approve top option
- Approve runner-up
- Request another refinement round

Do not continue until a design direction is approved.

PHASE 6: TWO IMPLEMENTATION PLANS

After design approval, inspect the actual Recetas codebase before planning. Identify the real pages, components, routes, styling systems, and existing UI primitives involved.

Implementation Planner A
Role:
You are the implementation planner optimizing for speed and low risk.

Task:
- Create an implementation plan for the approved Recetas design
- Prefer minimal surface-area change where possible
- Reuse existing components, styling patterns, and layouts

Deliverables:
- Scope summary
- Real files/components/pages likely affected
- Component changes required
- Responsive behavior requirements
- State handling requirements
- Accessibility requirements
- Testing checklist
- Risks and mitigations
- Delivery sequence

Constraints:
- Keep the plan practical and incremental
- Avoid unnecessary refactors

Implementation Planner B
Role:
You are the implementation planner optimizing for maintainability and design quality.

Task:
- Create an implementation plan for the approved design
- Favor reusable abstractions, consistency, and long-term clarity
- Call out where a small refactor is justified

Deliverables:
- Scope summary
- Design-system/component opportunities
- Real files/components/pages likely affected
- Responsive behavior requirements
- State handling requirements
- Accessibility requirements
- Testing checklist
- Risks and mitigations
- Delivery sequence

Constraints:
- Do not over-engineer
- Propose refactors only when they reduce future UI inconsistency

PHASE 7: ARCHITECTURE REVIEW AND FINAL PLAN

Software Architect
Role:
You are the software architect for the Recetas implementation.

Task:
- Compare both implementation plans
- Select the better plan or merge them
- Refine for production readiness in the actual Recetas codebase
- Define acceptance criteria and implementation order
- Prepare the final implementation strategy for approval

Deliverables:
- Selected plan and reasoning
- Final implementation strategy
- Architecture notes
- Reuse opportunities
- Risks and mitigations
- Acceptance criteria
- Rollout order
- Final recommendation for approval

Decision criteria:
- Prioritize clarity, maintainability, and low regression risk
- Ensure mobile behavior is explicit
- Ensure all page states are covered
- Ensure UI remains consistent with existing Recetas patterns
- Ensure the plan matches the current codebase structure

PHASE 8: APPROVAL GATE 2

Stop and ask the user exactly this:

Review the final implementation strategy.

Required decision:
- Approve implementation
- Request plan changes before implementation

Do not continue until the plan is approved.

PHASE 9: IMPLEMENTATION

Before making edits:
- Inspect the relevant Recetas files and understand the current implementation
- Respect repository instructions
- Reuse existing styles and components where possible
- Keep all secondary menus aligned with the Visibility Type tabs pattern
- Add stable ids on new or modified UI elements when appropriate

UI Implementation Agent
Role:
You are the implementation agent.

Task:
- Implement the approved plan in the Recetas codebase
- Preserve existing patterns unless the approved plan requires change
- Ensure mobile behavior, state handling, and accessibility basics are included

Deliverables:
- What was implemented
- Files changed
- Any deviations from plan
- What still needs validation

PHASE 10: QA VALIDATION

QA Agent
Role:
You are the QA validation agent.

Task:
- Validate the implemented UI against the approved design and plan
- Check desktop and mobile behavior
- Check loading, empty, error, and success states
- Check accessibility basics and consistency with existing Recetas UI patterns

Deliverables:
- Pass/fail summary
- Visual regressions
- Interaction issues
- Mobile issues
- Accessibility issues
- Missing states
- Final release recommendation

Master orchestration rules:
- At the start of each phase, state the phase name and objective
- At the end of each phase, provide a short synthesis and handoff
- If any agent output is vague, inconsistent, or not actionable, reject it and rewrite that phase properly before continuing
- If coding starts, ground all implementation details in the real files present in the Recetas repo
- Do not invent components, routes, or architecture without checking the codebase first
- Keep responses concise but concrete

Definition of done:
- An approved requirements brief exists
- A user-approved UI direction exists
- A user-approved implementation plan exists
- The implementation matches the approved direction closely
- Desktop and mobile behaviors are both defined and validated
- Empty/loading/error/success states are covered
- Secondary menus remain aligned with the Visibility Type tabs pattern
- QA either passes the work or produces a concrete issue list
```

## Recommended Use

Use this workflow when:

- redesigning or improving a page
- restructuring an important flow
- validating mobile readiness before coding
- comparing multiple UI directions before implementation
- coordinating design and implementation decisions with explicit approval gates

Recommended branch timing for new features:

1. start from `pre-main`
2. complete BA, research, design, and planning
3. approve the implementation plan
4. create `codex/feature/<feature-name>`
5. implement and validate
6. open PR to `pre-main`

Do not use the full workflow for tiny visual tweaks. For small changes, compress the process into:

1. BA clarification
2. one lightweight design proposal
3. one implementation plan
4. implementation
5. QA
