# Family Pages Rebrand Requirements Brief

## Current State

Recetas currently combines family creation, family list management, member administration, invite links, pending invites, leave-family actions, and deletion requests in one authenticated page:

- `/account/families` renders `FamiliesDashboard`.
- The home left navigation family `+` links to `/account/families`.
- The home left navigation family edit link also points to `/account/families`.
- The home left navigation family `More` link points to `/account/families`.
- Existing family APIs already support listing families, creating families, fetching one family, updating family profile fields, member promotion/removal, invite-link generation/revocation, pending invite decisions, leave-family, and deletion request voting.
- Family picture support currently stores a `pictureStorageKey` and renders `pictureUrl`, but the UI exposes a raw storage-key field instead of a branded upload flow.

The approved direction is to split the current combined page into three dedicated, branded family workflows that mirror the recipe workflow refresh: clear entry routes, wizard bars, focused steps, warm Recetas state language, mobile-ready layouts, and documented QA coverage.

## Problem Statement

Family management currently feels like a utility dashboard instead of part of the refreshed Recetas experience. Creating, editing, inviting, and managing families should become guided workflows connected directly to the left navigation:

- The family `+` shortcut starts a dedicated Create Family wizard.
- Each family edit shortcut opens a dedicated Edit Family wizard for that family.
- The family `More` shortcut opens a Manage Families page that starts with the user's family list and pending invites, then enters a selected-family management wizard.

The work must improve the existing UI rather than redesigning the product from scratch, preserve current permissions, reuse established app chrome and secondary menu patterns, and keep implementation incremental.

## Approved BA Decisions

- Create a dedicated Create Family route, expected to be `/account/families/new`.
- Keep `/account/families` as the Manage Families page.
- Create a dedicated Edit Family route, expected to be `/account/families/[familyId]/edit`.
- The left navigation family `+` link must open Create Family.
- The left navigation family edit link must open Edit Family for that family.
- The left navigation family `More` link must open Manage Families.
- Create Family uses a wizard structure with these steps:
  1. Start
  2. Family details
  3. Invite members
  4. Review
- Create Family keeps one final Create action on Review.
- Invite choices made before Review are staged until final Create; persisted invite records are created only after the family is created.
- Edit Family mirrors the Create Family wizard for admins:
  1. Start
  2. Family details
  3. Invite members
  4. Review
- Non-admin family members can open the same family route in read-only mode, but navigation should label the action as View or Details rather than Edit.
- Read-only Edit Family skips the Review step.
- Manage Families uses a wizard-like structure.
- Manage Families starts with a list, then the user selects a family before entering management steps.
- Manage Families must include sections for:
  - Families you belong to
  - Pending invites
  - Selected-family management
- Invite members is in scope for both invite links and direct invites.
- Direct invites must support existing Recetas username only.
- Username direct invites create an in-app pending invite for the recipient immediately and also generate a shareable targeted URL.
- Direct invites are single-use and follow the same expiration and revoke model as invite links.
- Multi-use invites remain invite-link only.
- Create/Edit Family must support image upload in the UI.
- Family image upload should use the same image handling pattern and storage provider as recipe images where practical, including preview, replace/remove, validation, and clear error states.
- Family pages should reuse the recipe workflow visual language:
  - top app chrome
  - wizard bar
  - warm cream/orange active and completed states
  - green only for true success states

## In Scope

### Left Navigation Routing

- Update the home left navigation view model so:
  - `familyCreateHref` points to `/account/families/new`.
  - family edit links point to `/account/families/[familyId]/edit`.
  - `familiesMoreHref` remains `/account/families`.
- Preserve the current left navigation structure, compact rail/drawer behavior, stable ids, and family/recipe grouping.

### Create Family Wizard

Create Family is a focused page, not a combined dashboard section.

Required steps:

1. Start
   - Introduce the task in the same concise, branded style as the Add Recipe start screen.
   - Clarify that a family is a shared recipe space.
   - Primary action advances to Family details.
2. Family details
   - Collect family name.
   - Collect optional description.
   - Upload optional family image.
   - Show image preview, replace/remove controls, validation errors, and upload state.
3. Invite members
   - Generate invite links.
   - Create direct invites by username.
   - Show staged invite choices created during the flow.
   - Do not persist the family or invite records before Review.
4. Review
   - Summarize details, image, and invite choices.
   - Final Create action creates the family first, then creates any chosen invite records/links tied to the new family.
   - If family creation succeeds but one or more invite creations fail, show a recoverable warning that the family was created and the failed invites can be retried from Edit Family or Manage Families.
   - Use green only for successful family creation.

### Edit Family Wizard

Edit Family is a focused per-family page.

Admin mode:

- Uses Start, Family details, Invite members, Review.
- Lets admins edit name, description, and image.
- Lets admins generate/revoke invite links.
- Lets admins create/revoke direct invites by username.
- Saves profile changes through the existing family update contract or a refined family profile use case.

Read-only member mode:

- Opens the same route for non-admin family members.
- Navigation should label this action as View or Details for non-admins, not Edit.
- Shows Family details and Invite members/status information in read-only form.
- Skips Review.
- Hides or disables editing, invite creation, revoke, member removal, and deletion controls.
- Makes the permission state clear without presenting it as an error.

### Manage Families Wizard

Manage Families starts from `/account/families` and is opened from the left navigation family `More` link.

Required areas:

- Families you belong to
  - Show all memberships.
  - Show role, description/image when available, and a clear select/manage action.
  - Empty state should guide users to Create Family.
- Pending invites
  - Show pending invites.
  - Allow accept, decline, and undo decline where applicable.
  - Preserve current conflict/rate-limit/error behavior.
- Selected-family wizard
  - After selecting a family, enter wizard-like management steps.
  - Preserve appropriate capabilities for members, invite links/direct invites, leave family, and deletion request state where they remain part of the new flow.
  - Admin-only controls remain admin-only.
  - Non-admin controls remain limited to appropriate view/leave actions.

Suggested selected-family steps for later design exploration:

1. Overview
2. Members
3. Invites
4. Safety

The exact step labels and ordering are not approved yet; they should be explored during the design phase.

Edit Family is profile-oriented: family details, image, invite-link creation/revoke, and username direct invite creation/revoke.

Manage Families is operations-oriented: family list, pending invites, selected-family overview, members, roles, member removal, leave-family actions, deletion request/voting, and operational invite administration. Manage Families may link admins back to Edit Family for profile updates or invite creation when that keeps the management flow cleaner.

### Family Image Upload

- Replace raw `pictureStorageKey` entry with a branded upload UI.
- Use the existing image storage provider family where practical.
- Reuse recipe image constraints and UI behavior where appropriate, unless family pictures need a documented exception.
- Treat family pictures as one active profile image per family, not a gallery.
- The Create flow stages the final image choice until the final Create action.
- The Edit flow can replace or remove the active family image immediately when the user saves.
- Replace/remove should clean up old stored files where the storage provider supports it, but cleanup failure should not block the family update.
- The UI should display family images in a consistent square/avatar frame with `object-fit: cover`.
- Cropping is not part of this phase.
- The implementation plan must decide whether family pictures use a new family-image endpoint, a generalized image upload use case, or a narrowly adapted recipe image pipeline.

### Direct Invite Contract

The existing invite-link system is not enough for the approved scope.

The design and implementation plan must define:

- Invite by username behavior.
- How username direct invites resolve and store the targeted existing user.
- How username direct invites create an in-app pending invite for the recipient immediately.
- How username direct invites also expose a shareable targeted URL.
- Pending direct invite data shape.
- How direct invites map to accept URLs.
- Expiration and revoke behavior aligned with invite links.
- Duplicate invite handling.
- Already-member handling.
- Behavior when a targeted URL is opened by a different authenticated user.
- Audit/metrics impact if applicable.

### Permission Matrix

- Unauthenticated users who access `/account/families*` routes redirect to the landing page.
- Authenticated non-members who access a direct family URL get not-found behavior so family existence is not exposed.
- Family members can view family details and invite status in read-only mode, respond to pending invites, and leave a family from Manage Families.
- Family admins can edit family profile details and image, create/revoke invite links, create/revoke username direct invites, manage members/roles/removal, and manage deletion requests/votes.
- Admin-only controls must not render as available actions for non-admins.

## Out Of Scope

- Email invites.
- Registration handoff for unregistered invite recipients.
- Sending emails from the app.
- Redesigning the public home page beyond left navigation route updates required by this feature.
- Changing recipe creation, recipe editing, or recipe visibility behavior beyond links that reference families.
- Replacing the existing auth system.
- Building a full address book or contact import system.
- Adding a family image crop editor.
- Adding decorative novelty that does not improve task completion.

## UX Requirements

- Follow the recipe workflow refresh style and interaction language.
- Render Create Family, Edit/View Family, and Manage Families inside the shared `RecipeWorkspaceFrame` app chrome so the top bar, left navigation, and mobile drawer behavior stay consistent with `/recipes/add`.
- Use wizard bars modeled after the Add Recipe wizard.
- Secondary menus must reuse the Visibility Type tabs pattern:
  - horizontal tab/list layout
  - active bottom border emphasis
  - subtle lift/tinted hover state
  - matching spacing, radius, and transition timing
- Keep Create/Edit/Manage flows task-first.
- Avoid card-within-card layouts.
- Avoid a marketing landing page treatment.
- Use precise success, warning, and error states.
- Preserve stable `id` attributes for new or modified UI elements.
- Preserve keyboard and screen-reader basics for tabs, wizard navigation, forms, and action buttons.

## Mobile Requirements

- All three pages must work around 390px width without horizontal overflow.
- Wizard bars should remain readable and scrollable if needed.
- Primary actions should stay reachable without covering form content.
- Family lists, pending invites, member rows, invite rows, and image upload controls must stack cleanly.
- Read-only mode must remain obvious on mobile.

## Loading, Empty, Error, And Success States

Every touched flow must define and verify:

- Initial loading state.
- Empty families list.
- Empty pending invites.
- Empty invite links/direct invites.
- Image upload validation error.
- Image upload failure.
- Family create/update validation error.
- Unauthorized redirect or auth-required behavior.
- Forbidden/read-only behavior.
- Not-found family behavior.
- Rate-limited invite behavior.
- Invite conflict state.
- Successful create/update/invite generation/revoke/accept/decline.

## Technical Constraints

- Keep page files focused on auth/routing/data loading and pass prepared props into client views.
- Do not add more business logic to the current large `FamiliesDashboard` shape; split into focused view components, hooks, helpers, and use cases as part of implementation planning.
- Reuse existing family validation helpers where possible.
- Reuse existing family APIs where they fit and add contracts only for the new direct-invite and image-upload needs.
- Preserve current permission rules:
  - Admins can edit family details and manage members/invites/deletion requests.
  - Members can view appropriate family information and leave families.
  - Non-admin edit route is read-only.
- Preserve i18n coverage for English and Spanish.
- Keep generated planning documents inside `requirements/family-pages-rebrand/`.
- This phase may replace old family UI behavior where needed; backwards compatibility for old invite links, old invite records, or previous raw family image behavior is not an acceptance requirement.

## Verification Expectations

- Unit/use-case coverage for family validation, username invite targeting, duplicate invite handling, already-member handling, and permission decisions.
- API/route coverage for family create/update, invite-link create/revoke, username direct invite create/revoke/accept/decline, member/admin-only actions, and non-member not-found behavior.
- Browser or Playwright checks for Create Family, Edit/View Family, and Manage Families on desktop and around 390px mobile width.
- Regression coverage that recipe visibility family selection still loads family options correctly after route/API changes.
- i18n verification for all new English and Spanish family workflow copy.

## Success Criteria

- Left navigation sends users to the correct dedicated family routes.
- Create Family feels like a guided Recetas workflow, not a raw dashboard form.
- Edit Family supports admin editing and non-admin read-only viewing without confusion.
- Manage Families clearly separates the user's family list, pending invites, and selected-family management.
- Invite links and username direct invites are both understandable and testable.
- Family image upload no longer exposes a raw storage-key field.
- Desktop and mobile verification demonstrate no overlap, no horizontal overflow, and no broken wizard states.
- Family behavior is preserved where required by this brief and may be intentionally replaced where this brief changes the flow.

## Open Questions For Design Phase

- What exact visual direction should distinguish family workflows from recipe workflows while keeping the same Recetas brand language?
- What are the final selected-family management wizard step labels and order?
- How much existing invite/deletion/member management should live in Edit Family versus Manage Families?

## Approval Gate

This brief captures the approved business analysis decisions and is approved as the baseline for research/design. Option B, Family Command Workspace, is the approved design direction. Do not start coding until the final task-by-task implementation plan is approved.
