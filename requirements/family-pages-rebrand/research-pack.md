# Family Pages Rebrand Research Pack

## Inputs Received

- `requirements/family-pages-rebrand/requirements-brief.md`
- `requirements/family-pages-rebrand/implementation-plan.md`
- `requirements/family-pages-rebrand/handoff.md`
- `requirements/ui-workflow/ui-agents-workflow.md`
- Current family page and APIs:
  - `app/account/families/page.tsx`
  - `app/account/families/families-dashboard.tsx`
  - `app/api/families/**`
  - `app/api/me/family-invites/route.ts`
  - `app/api/family-invites/[token]/**`
  - `lib/application/families/validation.ts`
  - `lib/families/utils.ts`
  - `prisma/schema.prisma`
- Reusable recipe workflow and chrome patterns:
  - `app/_components/recipe-workspace-frame.tsx`
  - `app/_components/home-left-navigation.tsx`
  - `app/_components/recipe-visibility-tabs.tsx`
  - `app/recipes/add/**`
  - `app/recipes/_components/**`
  - `lib/application/recipes/add-workflow-state.ts`
  - `lib/infrastructure/images/**`

## Assumptions

- The approved requirements brief is the source of truth.
- Option B, Family Command Workspace, is the approved design direction. Implementation remains blocked until the final task-by-task implementation plan is approved.
- This research pack is meant to prepare design options, not to decide final schema/API implementation details.
- The current feature branch is `codex/feature/family-pages-rebrand`.
- The unrelated untracked recipe-workflow Playwright evidence under `output/playwright/recipe-workflow-refresh/` should remain untouched.

## Current Family Surface

The current family experience is concentrated in `FamiliesDashboard`, mounted by `/account/families`. It currently owns all of these responsibilities in one client component:

- Loads the user's families and pending family invites.
- Creates a family from an inline form.
- Reads and updates selected-family detail context.
- Shows family members and role state.
- Allows members to leave a family.
- Lets admins promote and remove members.
- Creates, copies, lists, and revokes invite links.
- Shows deletion request status and allows admin voting/cancel/create actions.
- Handles localized error mapping and success/error messages.
- Tracks busy states, selected family state, active management tab state, loaded detail caches, invite URL copy state, deletion context, and pending invite state.

This file already contains useful behavior and stable ids, but it is too broad to become the base of three focused workflows. The design and implementation plan should treat it as a source of contracts and behavior to preserve, then split responsibilities into focused loaders, use cases, hooks, and view components.

## Existing API And Data Contracts

Current family API support:

- `GET /api/families` lists family memberships for the authenticated user.
- `POST /api/families` creates a family and creates the creator's admin membership in one transaction.
- `GET /api/families/[familyId]` returns family detail only when the authenticated user is a member.
- `PATCH /api/families/[familyId]` lets admins update name, description, and `pictureStorageKey`.
- `GET/POST /api/families/[familyId]/invite-links` supports listing and creating invite links for admins.
- `DELETE /api/families/[familyId]/invite-links/[inviteId]` revokes invite links.
- `POST /api/families/[familyId]/leave` supports leaving a family.
- `PATCH/DELETE /api/families/[familyId]/members/[userId]` supports role changes and removal.
- `app/api/families/[familyId]/deletion-requests/**` supports deletion request creation, active-status lookup, voting, denial, and cancellation.
- `GET /api/me/family-invites?status=pending` lists invite decisions for the authenticated user.
- `app/api/family-invites/[token]/**` resolves, accepts, declines, and undo-declines token-based family invites.

Current schema support:

- `Family` stores `name`, optional `description`, optional `pictureStorageKey`, creator, memberships, invites, deletion requests, recipe links, audit events, and metrics.
- `FamilyInvite` is token-hash based with creator, family, expiration, revoke/consume fields, `maxUses`, decisions, metrics, and audit events.
- `FamilyInviteDecision` is unique per invite/user and is already the basis of pending in-app invites.
- `User.username` is unique, so username-targeted direct invites can resolve against an existing user without email support.

Contract gap for design and later planning:

- Existing invite records are link-oriented. They do not store a target user, invite type, targeted URL semantics, wrong-user behavior, or duplicate targeted invite semantics yet.
- Existing family picture support stores a raw key and resolves it through `/uploads/${pictureStorageKey}`. It does not have upload, validation, cleanup, or avatar-specific image processing.
- Page-level privacy requirements differ from API behavior. The brief calls for unauthenticated family pages to redirect to `/` and authenticated non-members on direct family URLs to behave like not found, while current API routes mostly return JSON `401`, `403`, or `404`.

## Reusable UI Patterns

### Workspace Frame

`RecipeWorkspaceFrame` is the right shell for Create Family, Edit/View Family, and Manage Families. It supplies:

- Recetas top chrome.
- Locale switcher and account menu.
- Left navigation built from `buildHomeNavigationViewModel`.
- The refreshed app frame/body layout already used by Add Recipe, Import Recipe, New Recipe, Edit Recipe, and Recipe Detail.

The design options should assume each family page has a page-level server component that performs auth/routing checks, then renders a focused client workflow inside this frame.

### Add Recipe Workflow

The Add Recipe flow provides the strongest pattern for family wizards:

- `AddRecipeWorkflow` keeps workflow state in an application reducer rather than scattering step logic across views.
- `AddRecipeWizardBar` renders a compact step bar using `secondary-tab-strip`.
- `AddRecipeStartScreen` uses concise copy and two clear task choices.
- `AddRecipeDetailsScreen` embeds the larger form in a `surface-panel` and delegates form sections to focused components.

Family workflow design should reuse this structure:

- A small reducer/view-model per workflow.
- A reusable family wizard bar compatible with four-step Create/Edit and selected-family Manage steps.
- Focused screen components for Start, Details, Invites, Review, Overview, Members, Invites, and Safety.
- No new business rules embedded in JSX-heavy screens.

### Secondary Menus

The shared `secondary-tab-strip` / `secondary-tab-strip-item` CSS and Visibility Type tabs define the approved secondary menu behavior:

- Horizontal list layout.
- Active state with bottom-border emphasis.
- Hover lift with warmer surface/background treatment.
- Keyboard-friendly tab/list semantics where a real tab panel is present.

The current family dashboard has a local inline tab style for Manage sections. The rebrand should replace that one-off styling with the shared strip classes unless the approved design explicitly documents an exception.

### Visual Language

Useful existing primitives:

- `surface-panel` for page panels.
- `surface-card` for individual repeated items.
- `page-header-bar`, `page-eyebrow`, and `page-supporting-text` for task headers.
- Warm Recetas palette variables in `app/globals.css`.
- `buttonClassName("primary" | "secondary")` for action consistency.

Design constraints:

- Do not put cards inside cards.
- Use cards only for repeated rows/items and genuinely framed tools.
- Keep green reserved for real success states, especially final family create/update success.
- Keep family pages task-first, not marketing-like.

## Family Image Upload Research

Recipe image handling offers reusable validation and storage boundaries but should not be copied as a recipe-image data model:

- `lib/infrastructure/images/image-service.ts` already validates JPEG/PNG/WEBP, max upload size, resizing, and cleanup helpers.
- `lib/infrastructure/images/storage-factory.ts` already selects the local or Blob provider.
- Recipe images resize to a landscape full image and thumbnail. Family pictures need a square/avatar treatment, so the detailed plan should decide whether to add a focused family-avatar resize helper rather than reusing recipe dimensions.
- Create Family needs staged image behavior because the family does not exist until the final Review action.
- Edit Family can save replace/remove through a profile update flow and clean up old keys best-effort.

Recommended design implication:

- Treat image upload as a first-class section with preview, replace, remove, validation copy, and failure states.
- Show the final family image in a square/avatar frame with `object-fit: cover`.
- Avoid exposing storage keys anywhere in the UI.

Open implementation questions to preserve for the detailed plan:

- Whether Create Family uploads to a temporary user-scoped key before final create or uploads only during final submit.
- Whether family avatars need a full image plus thumbnail or one square optimized asset.
- How cleanup behaves for local and Blob storage.
- Whether image upload happens through a dedicated `/api/families/images` staging endpoint, a nested family endpoint for Edit, or one generalized image-upload use case with a family adapter.

## Direct Invite Research

The approved direct invite scope is username-only and applies to existing Recetas users. Email invite and registration handoff are out of scope.

Existing useful pieces:

- `User.username` is unique.
- `FamilyInviteDecision` already creates pending in-app invite state per invite/user.
- Invite links already have token, expiration, revoke, single/multi-use, accept, decline, undo-decline, metrics, and some rate limiting.

Missing pieces:

- `FamilyInvite` has no target-user field.
- `FamilyInvite` has no explicit invite type.
- The existing token route creates or updates a decision for whichever authenticated user opens the link.
- Multi-use semantics are link-only; direct username invites must remain single-use.
- The API does not currently define duplicate-target handling, already-member handling, or wrong-authenticated-user behavior for targeted URLs.

Recommended contract direction for later planning:

- Extend the existing invite model rather than creating a parallel invite system, unless schema planning finds that target-user and invite-type fields distort current invite-link behavior.
- Add explicit direct-invite states to API responses so UI can distinguish link invites from targeted username invites.
- On direct invite creation, resolve username, reject already-members, avoid duplicate active/pending direct invites, create a single-use invite, and create the recipient's pending decision immediately.
- When the targeted URL is opened by a different authenticated user, avoid exposing target or family details and return a controlled wrong-user state.

Design implication:

- Invite members screen should separate "Invite link" and "Invite by username" as sibling methods, using the approved secondary-menu pattern only if tabs materially reduce clutter.
- Create Family should show invite choices as staged rows before Review.
- Edit/View and Manage must make invite link/direct invite differences visible without adding a heavy admin dashboard feel.

## Recommended Page Shape For Design Options

### Create Family

Route: `/account/families/new`

Suggested screens:

1. Start
   - Briefly explain shared family recipe spaces.
   - Primary action advances to Details.
2. Family details
   - Name, optional description, family image upload.
   - Inline validation and upload preview/failure states.
3. Invite members
   - Invite link setup.
   - Username direct invite setup.
   - Staged invite summary.
4. Review
   - Confirm details, image, and invite choices.
   - One final Create action.
   - Recoverable warning if family creation succeeds but invite creation partially fails.

### Edit/View Family

Route: `/account/families/[familyId]/edit`

Admin mode:

- Same Start, Details, Invite members, Review structure.
- Profile/image changes and invite changes should be reviewable before save when practical.
- Revoke actions can remain immediate if the design makes that risk clear.

Read-only member mode:

- Same route, labeled as View or Details in navigation and page copy.
- Details and invite/status information shown in read-only form.
- No Review step.
- Edit/revoke/remove/delete controls hidden or disabled with clear permission language.

### Manage Families

Route: `/account/families`

Recommended structure:

- Initial list view with "Families you belong to" and "Pending invites".
- Selecting a family enters a management workflow.
- Selected-family workflow should explore these steps:
  1. Overview
  2. Members
  3. Invites
  4. Safety

Design options should decide whether selected-family management appears as:

- A single page with a sticky secondary step strip and one active panel.
- A two-column desktop layout with list context on the side and active management step on the right, collapsing to a single stacked mobile flow.

## Desktop And Mobile Rules

Desktop:

- Keep the page constrained by the same app frame rhythm as Add Recipe.
- Use a clear header plus wizard strip before each main workflow surface.
- Keep repeated family/member/invite rows scannable with compact cards or rows.
- Put destructive/safety actions in the final Safety step or an obviously separated warning surface.

Mobile around 390px:

- Wizard strips may wrap or horizontally scroll, but must not overflow the viewport.
- Primary actions should remain reachable without covering form content.
- Family rows, member rows, invite rows, and upload controls should stack with action buttons wrapping below content.
- Long invite URLs/usernames must wrap or truncate safely.
- Read-only state must remain visible near the page title and the relevant disabled/hidden controls.

## State Coverage For Design Options

Each design option must show or describe:

- Initial loading.
- Empty families list.
- Empty pending invites.
- Empty invite links.
- Empty direct invites.
- Image upload validation error.
- Image upload failure.
- Family create/update validation error.
- Unauthorized page redirect behavior.
- Authenticated non-member not-found behavior.
- Admin mode.
- Read-only member mode.
- Rate-limited invite creation.
- Duplicate direct invite.
- Already-member direct invite.
- Wrong-user targeted URL behavior.
- Successful family create/update.
- Recoverable partial invite failure after family creation.
- Invite revoke success/failure.
- Accept/decline/undo pending invite states.
- Leave-family and deletion request/vote states.

## Risks

- Scope risk: Create, Edit/View, Manage, image upload, and direct invites are a large surface. Design options must keep the implementation slices incremental and avoid solving all management operations in one screen.
- Architecture risk: Extending `FamiliesDashboard` directly would make the existing mixed-responsibility component harder to split later.
- Contract risk: Username direct invites need schema/API clarity before UI implementation. Placeholder behavior would create throwaway UI.
- Image risk: Raw `pictureStorageKey` is not compatible with the desired branded upload experience, and recipe-image dimensions do not exactly fit avatar needs.
- Privacy risk: Page-level not-found behavior and JSON API status behavior intentionally differ; design and tests need to name both.
- Mobile risk: Existing management rows and invite URL controls can become cramped; design options need mobile-first row stacking rules.
- I18n risk: Family workflows have many new state messages. English and Spanish copy must be planned as part of implementation, not left to the end.

## Design Direction Criteria

Use the shared scorecard from `requirements/ui-workflow/ui-agents-workflow.md`:

- UI cleanliness
- Ease of use
- Mobile readiness
- Accessibility basics
- Consistency with existing Recetas UI patterns
- Implementation complexity
- User task efficiency

Additional family-specific evaluation:

- Does the design clearly separate profile editing from operational family management?
- Does it keep Create Family focused on one final create action?
- Does it make admin vs read-only member mode obvious without making non-admins feel blocked?
- Does it make invite link vs username direct invite behavior understandable?
- Does it avoid burying safety/destructive actions near everyday profile edits?
- Does it give implementation a path away from the current all-in-one dashboard?

## Deliverables

This research pack establishes the context for the next phase. It does not approve a visual direction or implementation.

## Open Risks

- Direct invite schema/API decisions remain unresolved.
- Family image upload endpoint and staging strategy remain unresolved.
- Final selected-family Manage step labels and order remain unresolved.
- Design options still need to define exact desktop/mobile layouts and state treatment.

## Next Agent Should Do

Produce `requirements/family-pages-rebrand/design-options.md` with two concrete UI directions. Both directions must cover Create Family, Edit/View Family, and Manage Families on desktop and 390px mobile, include state coverage, score each direction with the shared scorecard, and recommend one direction for approval before implementation planning resumes.
