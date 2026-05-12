# Family Pages Rebrand Design Options

## Inputs Received

- `requirements/family-pages-rebrand/requirements-brief.md`
- `requirements/family-pages-rebrand/implementation-plan.md`
- `requirements/family-pages-rebrand/research-pack.md`
- `requirements/ui-workflow/ui-agents-workflow.md`

## Assumptions

- Both directions preserve the approved routes:
  - `/account/families/new`
  - `/account/families/[familyId]/edit`
  - `/account/families`
- Both directions use `RecipeWorkspaceFrame`.
- Both directions use the Add Recipe wizard and `secondary-tab-strip` patterns.
- Both directions keep Create Family to one final Create action on Review.
- Both directions keep username direct invites, invite links, and family image upload in scope.
- Both directions keep email invites, registration handoff, contact import, and crop editing out of scope.

## Shared Design Foundation

All options should use these common elements:

- Page header:
  - Eyebrow: family workflow context.
  - H1: exact task, such as "Create a family", "Edit family details", "Family details", or "Manage families".
  - One short supporting sentence focused on the current task.
- Wizard bar:
  - `secondary-tab-strip` style.
  - Current/completed/future step states.
  - No green completed states; use warm Recetas surfaces and orange active emphasis.
- Main surfaces:
  - Use `surface-panel` for one major workflow surface.
  - Use `surface-card` only for repeated family, member, invite, or pending-invite rows.
  - Avoid card-within-card layouts.
- Permissions:
  - Admin mode shows editing and management controls.
  - Read-only member mode labels the route as View/Details, skips Review, and keeps permission copy visible near the header and affected sections.
  - Authenticated non-members on direct family pages get not-found behavior.
  - Unauthenticated family pages redirect to `/`.
- Mobile:
  - Design for 390px width from the start.
  - Let wizard strips scroll or wrap without horizontal page overflow.
  - Stack row content and actions.
  - Keep primary actions reachable after the content they affect.

## Option A: Guided Family Studio

### Concept

Use the Add Recipe flow almost directly: every family task is a single-column guided workflow inside the app frame. Create, Edit/View, and Manage all have a familiar header, a wizard strip, one active surface, and short task-focused screens. This direction optimizes consistency, implementation predictability, and low cognitive load.

### Create Family

Steps:

1. Start
   - Explains a family as a shared recipe space.
   - Primary action: "Start family setup".
2. Family details
   - Family name.
   - Optional description.
   - Square image upload with preview, replace, remove, and validation state.
3. Invite members
   - Two sections in one panel:
     - Invite link setup with single-use/multi-use choice.
     - Invite by username with one username field and staged invite list.
   - Staged rows show method, recipient/usage, expiration, and remove action.
4. Review
   - Details summary, image preview, invite summary.
   - Final Create action.
   - Partial invite failure warning says the family was created and failed invites can be retried in Edit or Manage.

Desktop layout:

- Header, wizard strip, one `surface-panel`.
- Details fields in a two-column grid only where space helps: text fields left, image uploader right.
- Invite methods stack vertically to avoid nested tabs.

Mobile layout:

- Single column.
- Image uploader follows name/description.
- Staged invites appear as compact rows with wrapping text.
- Review summary sections stack.

### Edit/View Family

Admin mode:

- Uses the same four steps: Start, Family details, Invite members, Review.
- Start summarizes current family status and has "Edit profile and invites".
- Family details edits name, description, image.
- Invite members includes invite links and username direct invites.
- Review summarizes pending changes before save.

Read-only member mode:

- Header title becomes "Family details".
- Wizard strip has two steps: Details and Invites.
- Details shows profile and image read-only.
- Invites/status shows available invite status information without create/revoke controls.
- A warm permission note explains that admins manage profile, invites, members, and safety settings.

Desktop layout:

- Same single-column flow as Create.
- Read-only mode keeps the same visual shell so the route does not feel like an error.

Mobile layout:

- Permission note appears directly below the H1.
- Read-only fields are rendered as text blocks, not disabled form inputs where that would look broken.

### Manage Families

Steps:

1. Families
   - Shows "Families you belong to" and "Pending invites" on the same active screen.
   - Family rows show image, name, role, description, and action: Manage, View, or Create Family empty-state link.
   - Pending invite rows show family name, state, accept, decline, undo where applicable.
2. Overview
   - Appears after selecting a family.
   - Summarizes role, members, active invites, and safety state.
3. Members
   - Admins can promote/remove where allowed.
   - Members can view list.
4. Invites
   - Admins see invite links and username direct invites.
   - Members see read-only invite/status info where appropriate.
5. Safety
   - Leave family.
   - Deletion request/vote/cancel state.
   - Destructive actions separated in warning surfaces.

Desktop layout:

- One active panel at a time.
- Family selection returns users to the same wizard strip with selected-family context shown under the header.

Mobile layout:

- Families step acts as the entry list.
- After selecting a family, show a compact selected-family summary and the selected-family steps.

### State Treatment

- Loading: skeleton-like muted rows inside the active panel.
- Empty families: Create Family link styled as a primary action.
- Empty pending invites: muted copy after family list.
- Empty invites: method-specific empty copy in Invite members/Invites.
- Validation and rate limits: inline error under the affected control.
- Success: green only for completed create/update/invite actions.
- Partial invite failure: warning surface on Review result, not a blocking error.
- Not found: server not-found page for direct non-member URLs.

### Scorecard

| Criterion | Score | Notes |
| --- | ---: | --- |
| UI cleanliness | 5 | One active surface keeps visual density controlled. |
| Ease of use | 4 | Familiar wizard rhythm; Manage may require more step navigation. |
| Mobile readiness | 5 | Single-column structure is naturally mobile-friendly. |
| Accessibility basics | 4 | Straightforward wizard semantics; needs careful step focus management. |
| Consistency with Recetas patterns | 5 | Closest to Add Recipe and existing workspace frame. |
| Implementation complexity | 4 | Lower UI complexity, though contracts remain substantial. |
| User task efficiency | 4 | Excellent for Create/Edit; Manage may be slower for admins doing repeated operations. |

Top strengths:

- Most consistent with approved Add Recipe visual language.
- Easiest path away from the all-in-one dashboard without creating a new design system.
- Strong mobile fit.
- Clear separation between profile setup, invites, members, and safety.

Main risks:

- Manage Families can feel overly sequential for admin-heavy work.
- Admin users may need extra clicks to move between members, invites, and safety.
- The selected-family context must remain obvious after leaving the initial Families step.

What must change before implementation:

- Decide exact Manage step labels.
- Decide whether Edit invite revoke actions are immediate or reviewed.
- Define direct invite and image upload contracts in the implementation plan.

## Option B: Family Command Workspace

### Concept

Use guided wizards for Create and Edit/View, but make Manage Families a denser operations workspace on desktop: a family/pending-invite list on the left and selected-family management on the right. On mobile, it collapses into the same list-then-selected-family wizard pattern. This direction optimizes repeated family administration while keeping Create and Edit focused.

### Create Family

Create remains the same four-step guided wizard as Option A:

1. Start
2. Family details
3. Invite members
4. Review

Differences from Option A:

- Invite members uses a secondary tab strip for "Invite link" and "Username invite" to reduce vertical length.
- Staged invite summary stays visible below the tabs.
- Review uses a more compact two-column desktop summary: profile/image on one side, staged invites on the other.

Mobile layout:

- Invite method tabs become horizontally scrollable.
- Review returns to stacked summary sections.

### Edit/View Family

Admin mode:

- Same four-step wizard as Create.
- Family details and Invite members are optimized for profile setup rather than operations.
- Invite member creation is allowed, but member role management and deletion remain in Manage.

Read-only member mode:

- Details and Invites/Status view, same as Option A.
- Header and left-navigation copy should avoid "Edit" for non-admin users.

### Manage Families

Desktop layout:

- Header and top-level secondary strip:
  - Families
  - Pending invites
  - Selected family
- Below the header, use a two-zone workspace:
  - Left column: family list and pending invites depending on the active top-level tab.
  - Right column: selected-family workspace.
- Selected-family workspace has a secondary step strip:
  - Overview
  - Members
  - Invites
  - Safety
- The right column starts with an empty selected-family state until the user selects a family.

Mobile layout:

- Collapse to a single column.
- Top-level tabs show Families and Pending invites first.
- Selecting a family pushes the selected-family summary and step strip below the list.
- Avoid persistent side-by-side panels at 390px.

Admin behavior:

- Admins can move quickly between selected-family Members, Invites, and Safety without returning to the list.
- Operational invite administration can live here, with Edit Family linking out for profile/image updates.

Member behavior:

- Members see Overview, Members, and Safety with leave-family actions only.
- Invites step is read-only or hidden depending on available data.

### State Treatment

- Loading: left list placeholders plus right-panel placeholder if a family is selected.
- Empty selected family: right panel prompts "Select a family to manage".
- Empty families: left panel points to Create Family.
- Empty pending invites: top-level Pending invites tab shows a muted empty state.
- Empty members/invites/safety: step-local empty copy.
- Errors: step-local inline errors where possible, page-level only for load failures that block the whole workspace.
- Success: green success banners inside the affected right-panel step.
- Mobile errors: appear immediately after the control or row that caused them.

### Scorecard

| Criterion | Score | Notes |
| --- | ---: | --- |
| UI cleanliness | 4 | More structure and density, but still organized. |
| Ease of use | 4 | Fast for admins; slightly more complex for casual users. |
| Mobile readiness | 4 | Good if collapse rules are strict; more QA risk than Option A. |
| Accessibility basics | 3 | Nested tab/selection regions need careful keyboard and focus behavior. |
| Consistency with Recetas patterns | 4 | Uses approved primitives, but Manage introduces a more operational layout. |
| Implementation complexity | 3 | More state coordination, responsive behavior, and focus management. |
| User task efficiency | 5 | Best for repeated admin/member/invite/deletion operations. |

Top strengths:

- Best desktop experience for admins managing multiple families.
- Keeps Create and Edit focused while giving operations their own workspace.
- Clearer separation between list selection and selected-family work.

Main risks:

- Nested top-level and selected-family tabs could feel busy.
- More responsive and accessibility complexity.
- Easier to drift toward dashboard density if the visual hierarchy is not disciplined.

What must change before implementation:

- Define exact responsive breakpoint behavior.
- Decide whether top-level Families/Pending/Selected tabs are necessary or whether left-column headings are enough.
- Specify focus movement when selecting a family and changing selected-family steps.

## Approved Direction

Approved by user on 2026-05-08: Option B, Family Command Workspace.

Selection rationale:

- Create Family and Edit/View Family still keep the guided Add Recipe-style wizard.
- Manage Families should prioritize repeated desktop administration with a command-workspace layout.
- Mobile must keep the list-then-selected-family collapse so the denser desktop layout does not create horizontal overflow.
- The implementation plan should treat the nested navigation/accessibility complexity as a first-class planning concern.

## Approval Gate

Design direction approval is complete. Next gate: update `implementation-plan.md` with the selected direction, exact slice details, final Manage step labels/order, and the direct-invite/image-upload contract decisions required before coding.
