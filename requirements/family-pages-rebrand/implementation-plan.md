# Family Pages Rebrand Implementation Plan

## Summary

Use the approved `requirements/family-pages-rebrand/requirements-brief.md` as the baseline and implement the user-approved Option B, Family Command Workspace direction from `requirements/family-pages-rebrand/design-options.md`. The rebrand will split the current all-in-one `/account/families` dashboard into guided Create and Edit/View workflows plus a denser desktop Manage Families command workspace that reuses `RecipeWorkspaceFrame`, Add Recipe wizard patterns, warm Recetas styling, and the Visibility Type tab interaction model.

The work should proceed in three gated phases: research/design, implementation planning refinement, then implementation/QA. The requirements brief, research pack, and Option B design direction are approved. Implementation remains blocked until this plan is refined into a detailed task-by-task plan and approved. Do not reopen approved BA/design decisions unless implementation evidence contradicts the brief.

## Approved Design Direction

Approved by user on 2026-05-08: Option B, Family Command Workspace.

Design implications:

- Create Family remains a guided four-step wizard: Start, Family details, Invite members, Review.
- Edit/View Family remains a guided profile-and-invite wizard for admins, with a read-only Details/Invites view for non-admin members.
- Manage Families becomes a desktop command workspace:
  - Top-level tabs: Families, Pending invites, Selected family.
  - Desktop body: left list column plus right selected-family workspace.
  - Selected-family steps: Overview, Members, Invites, Safety.
  - Mobile collapse: list-first flow, then selected-family summary and selected-family steps below the list.
- Manage Families must use `secondary-tab-strip` styling for both top-level tabs and selected-family steps.
- The command workspace must stay operational, not decorative: rows should be compact, scannable, and action-oriented.
- Nested navigation and focus behavior are elevated risks and must be covered in implementation and QA.

## Key Changes

- Routes:
  - `/account/families/new`: Create Family wizard.
  - `/account/families/[familyId]/edit`: Edit Family for admins, View/Details for non-admin members.
  - `/account/families`: Manage Families list, pending invites, and selected-family operations.
- UI architecture:
  - Wrap all three family pages in `RecipeWorkspaceFrame`.
  - Replace the current large `FamiliesDashboard` shape with focused page shells, client workflows, view components, hooks, and application helpers.
  - Update left navigation route targets in `lib/application/home-navigation/view-model.ts`.
- Product contracts:
  - Keep final Create action on Review; stage details, image, and invites until submit.
  - Add username-only direct invites with immediate pending invite plus targeted share URL.
  - Keep email invites, registration handoff, app-sent email, contact import, and crop editor out of scope.
  - Redirect unauthenticated `/account/families*` access to the landing page; return not-found behavior for authenticated non-members on direct family URLs.

## Direct Invite Contract To Resolve

Username direct invites are a data/API contract decision, not just a UI step. Before implementing Create/Edit invite UI, the detailed plan must define the direct-invite contract and its tests.

Selected direction:

- Extend the existing invite model with optional targeting fields instead of creating a parallel invite system, unless schema inspection during detailed planning shows that would distort existing invite-link semantics.
- Represent invite type explicitly so API/UI can distinguish multi-use links, single-use links, and username-targeted direct invites.
- Add a nullable target-user field for username direct invites.
- Create the recipient's `FamilyInviteDecision` row immediately when a username direct invite is created.
- Reuse `/invite/family/[token]` for targeted share URLs, but add wrong-user handling so an authenticated user who is not the target cannot accept or learn unnecessary family detail.

The detailed task plan must define exact migrations, use cases, routes, and tests for:

- How the username lookup resolves an existing Recetas user, including case normalization and not-found behavior.
- What happens when the targeted URL is opened by a different authenticated user.
- How duplicate pending direct invites are handled.
- How already-member attempts are handled.
- How expiration, revoke, accept, decline, and undo-decline align with existing invite-link behavior.
- Whether family audit events or metrics need new invite-type fields.

Do not build direct-invite UI against placeholder behavior. The schema/API/use-case contract must be resolved and covered before Create/Edit UI depends on it.

## Family Image Upload Architecture

Family image upload should use a narrow family-image upload path that reuses the existing image storage provider and recipe image validation constraints where practical. Do not force family profile images into `RecipeImage` records: family pictures are one active square/avatar-style profile image, not a recipe image gallery.

Selected direction:

- Add a family-specific image upload contract or endpoint that stores one active family profile image key on the family record.
- Reuse the existing image storage provider family and upload validation limits unless the research pack identifies a family-specific exception.
- Keep Create Family image choice staged until the final Create action.
- Save Edit Family image replace/remove when the user saves the profile changes.
- Clean up replaced/removed files where the provider supports it, but do not block a successful family profile update if cleanup fails.
- Add square/avatar-oriented image resizing for family pictures instead of forcing the recipe image landscape dimensions onto family profile images.
- Prefer a temporary, user-scoped staged upload for Create Family so the UI can preview the image before the family exists; final Create should attach the staged key to the new family.

The detailed task plan must define exact endpoints, use cases, UI states, and tests for:

- Exact endpoint shape for uploading, replacing, removing, and fetching family images.
- Storage key naming and whether one square image or square image plus thumbnail is required.
- How Create staging stores a temporary upload before the family exists.
- How Edit replace/remove handles old stored keys.
- Validation behavior for unsupported mime types, oversized files, and upload failures.
- Preview, replace, remove, loading, error, and success UI states for desktop and mobile.
- Tests for validation, storage-provider integration boundaries, cleanup-tolerant updates, and browser-visible failure states.

## Page Auth And API Semantics

The approved privacy behavior is primarily page-route behavior, not necessarily a blanket API response change.

Preferred direction:

- Implement unauthenticated `/account/families*` page access with a server-page or loader `redirect("/")`.
- Implement authenticated non-member access to direct family pages, such as `/account/families/[familyId]/edit`, with page-level `notFound()` behavior so family existence is not exposed.
- Render authenticated non-admin family members on `/account/families/[familyId]/edit` in read-only View/Details mode rather than as an error.
- Let existing JSON API routes keep returning explicit status codes such as `401`, `403`, and `404` unless a specific new UI flow needs a refined API contract.

The detailed plan must identify which routes perform page-level redirects/not-found checks and which API responses remain unchanged. Tests should cover both page behavior and API behavior where they intentionally differ.

## Option B Layout Decisions

### Create Family

- Route: `/account/families/new`.
- Wizard steps: Start, Family details, Invite members, Review.
- Invite members uses a secondary tab strip with:
  - Invite link.
  - Username invite.
- Staged invite summary stays visible below the invite-method tabs.
- Desktop Review uses a compact two-column summary: profile/image and staged invites.
- Mobile Review stacks all summary sections.

### Edit/View Family

- Route: `/account/families/[familyId]/edit`.
- Admin wizard steps: Start, Family details, Invite members, Review.
- Admin Edit remains profile/invite setup.
- Member read-only steps: Details, Invites.
- Non-admin navigation and page copy must say View or Details, not Edit.
- Member role management, deletion, leave-family, and operational invite administration live in Manage Families, not Edit Family.

### Manage Families

- Route: `/account/families`.
- Top-level tabs:
  - Families.
  - Pending invites.
  - Selected family.
- Desktop body:
  - Left column for family list or pending invites.
  - Right column for selected-family workspace.
  - Empty selected-family state prompts the user to select a family.
- Selected-family steps:
  - Overview.
  - Members.
  - Invites.
  - Safety.
- Mobile body:
  - Collapse to a single column.
  - Top-level Families and Pending invites appear first.
  - Selecting a family reveals selected-family summary and selected-family steps below the list.
  - No persistent side-by-side layout around 390px.
- Accessibility:
  - Top-level tabs and selected-family tabs must use distinct labels.
  - Selecting a family should move focus to the selected-family workspace heading on desktop and to the selected-family summary on mobile.
  - Switching tabs should preserve selected family but not trap focus.

## Execution Plan

### 1. Research Pack

- Review the existing `FamiliesDashboard`, family APIs, Add Recipe workflow components, `RecipeWorkspaceFrame`, recipe image upload patterns, and Visibility Type tabs.
- Produce `requirements/family-pages-rebrand/research-pack.md`.
- Include desktop/mobile rules, reusable Recetas patterns, risks, and state coverage expectations.

### 2. Design Directions

- Produce two concrete UI directions in `requirements/family-pages-rebrand/design-options.md`.
- Both directions must cover Create, Edit/View, and Manage pages; desktop and 390px mobile; loading, empty, error, warning, and success states.
- Lead critique selects a recommended direction using the shared scorecard.
- Stop for design approval before implementation planning is finalized.

### 3. Final Task-By-Task Implementation Plan

Option B is approved. The next approval gate is this final task-by-task plan. Each slice below should be executed with failing tests first, then implementation, then the listed verification gate. Keep commits small and do not move to the next slice until the review checkpoint is satisfied.

Observed current implementation anchors:

- `/account/families` currently renders `app/account/families/families-dashboard.tsx` from `app/account/families/page.tsx`.
- Family APIs already exist under `app/api/families/**`, `app/api/family-invites/**`, and `app/api/me/family-invites/route.ts`.
- Family validation currently lives in `lib/application/families/validation.ts`.
- Family utility behavior currently lives in `lib/families/utils.ts`, `lib/families/deletion-requests.ts`, and `lib/families/deletion-actions.ts`.
- Home navigation family links currently come from `lib/application/home-navigation/view-model.ts`.
- Existing focused tests live under `scripts/*.test.ts` and run with `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test ...`.
- Image upload seams already exist under `lib/application/recipes/image-upload-constraints.ts`, `lib/infrastructure/images/*`, `app/api/recipes/[id]/images/route.ts`, and `scripts/recipe-image-upload-route.test.ts`.

| Slice | Goal | Likely Files/Areas | Dependencies | Verification Gate |
| --- | --- | --- | --- | --- |
| 1. Navigation and route guards | Point left navigation to the new family routes and define page-level auth/not-found behavior. | Modify `lib/application/home-navigation/view-model.ts`; likely test under `tests/` or existing view-model tests; add `app/account/families/new/page.tsx`; add `app/account/families/[familyId]/edit/page.tsx`; update `app/account/families/page.tsx`; add page loader helpers under `lib/application/families/` if needed. | Approved route contract, Option B direction, permission matrix. | Unit coverage for navigation hrefs; route/page checks for unauthenticated redirect, member read-only, and non-member not-found; browser check for left navigation desktop/mobile links. |
| 2. Shared family workflow primitives | Establish reusable wizard, tab, state, and shell primitives for Create, Edit/View, and Manage without adding business logic to JSX-heavy page files. | Create focused files under `app/account/families/_components/`; create state/view-model helpers under `lib/application/families/`; reuse `RecipeWorkspaceFrame`; reuse `secondary-tab-strip`; remove reliance on one-off dashboard tab styling. | Slice 1; Option B layout decisions. | Focused state tests for wizard/tab behavior; browser smoke that shared shell renders on desktop and 390px without overflow. |
| 3. Family image upload contract | Replace raw `pictureStorageKey` with square family-image upload, Create staging, Edit replace/remove, and best-effort cleanup. | Create or modify image helpers under `lib/infrastructure/images/`; create family image use cases under `lib/application/families/`; add family image API routes under `app/api/families/**`; update family validation; wire into Create/Edit views. | Slice 2; selected image architecture. | Upload validation tests; storage boundary tests; route/use-case tests; browser checks for preview, replace, remove, unsupported type, oversized image, upload failure, and cleanup-tolerant save. |
| 4. Username direct invite contract | Add username-targeted direct invite persistence/API/use cases and targeted URL behavior. | Modify `prisma/schema.prisma` and migrations if needed; add family invite use cases under `lib/application/families/`; modify `app/api/families/[familyId]/invite-links/**` or add direct-invite routes; modify `app/api/family-invites/[token]/**`; update pending-invite loaders. | Slice 2; selected direct-invite contract. | Unit/use-case tests for username resolution, duplicate pending invite, already-member, wrong-user targeted URL, revoke, expiration, accept, decline, undo-decline; API route tests. |
| 5. Create Family wizard | Build `/account/families/new` with Start, Family details, Invite members, and Review, using Option B invite-method tabs and final-create sequencing. | `app/account/families/new/page.tsx`; create family workflow components under `app/account/families/_components/`; create reducer/view-model under `lib/application/families/`; update `lib/i18n/messages.ts`; integrate family create, staged image, staged invite calls. | Slices 1-4. | Browser checks desktop and 390px; tests for final-create sequencing and recoverable invite failure warning; no raw storage-key field visible. |
| 6. Edit/View Family wizard | Build `/account/families/[familyId]/edit` with admin Edit and non-admin read-only Details behavior. | `app/account/families/[familyId]/edit/page.tsx`; edit/view workflow components under `app/account/families/_components/`; family detail/update loaders/use cases; invite/image integrations; i18n copy. | Slices 1-4. | Route tests for admin, member, non-member, and unauthenticated behavior; browser checks desktop and 390px for admin and read-only member modes. |
| 7. Manage Families command workspace | Rebuild `/account/families` around Option B top-level tabs, desktop two-zone command workspace, mobile list-first collapse, and selected-family Overview/Members/Invites/Safety steps. | `app/account/families/page.tsx`; replacement focused Manage views/hooks under `app/account/families/_components/`; family list/pending invite/selected-family view-models under `lib/application/families/`; integrate member/role/leave/deletion request APIs. | Slices 1-4; selected Manage labels/order. | Browser checks desktop and 390px; keyboard/focus checks for nested tabs and selection; API/use-case regression for accept/decline/undo, leave, member/admin actions, deletion workflow. |
| 8. I18n, regression, and release polish | Complete English/Spanish copy, stable ids, accessibility pass, recipe visibility regression, and QA documentation. | `lib/i18n/messages.ts`; all touched UI files; `requirements/family-pages-rebrand/qa-checklist.md`; Playwright/browser evidence under this feature folder or approved output path. | Slices 1-7. | `npm run lint`, `npm run build`, `npm run test:phase3`, focused `node --test` coverage, recipe visibility regression, desktop/mobile browser QA, `git diff --check`. |

#### Slice 1: Navigation And Route Guards

Files:

- Modify `scripts/home-navigation-view-model.test.ts`.
- Modify `lib/application/home-navigation/view-model.ts`.
- Create `scripts/family-page-access.test.ts`.
- Create `lib/application/families/page-access.ts`.
- Create `lib/application/families/page-loaders.ts`.
- Create `app/account/families/new/page.tsx`.
- Create `app/account/families/[familyId]/edit/page.tsx`.
- Modify `app/account/families/page.tsx`.
- Leave `app/account/families/families-dashboard.tsx` in place until Slice 7 replaces the rendered manage experience.

Steps:

- [x] Update `scripts/home-navigation-view-model.test.ts` so admin families expect `editHref: "/account/families/20/edit"`, member families expect `editHref: "/account/families/21/edit"` with `canEdit: false`, and `familyCreateHref` expects `"/account/families/new"`.
- [x] Run `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` and confirm it fails on the current `/account/families` href expectations.
- [x] Update `buildHomeNavigationViewModel` in `lib/application/home-navigation/view-model.ts` so `familyCreateHref` is `/account/families/new` and each family `editHref` is `/account/families/${family.id}/edit`.
- [x] Run the same home navigation test and confirm it passes.
- [x] Add `scripts/family-page-access.test.ts` with tests for `resolveFamilyPageAccess`: unauthenticated returns `{ kind: "redirect", href: "/" }`; authenticated non-member on direct family route returns `{ kind: "not-found" }`; member returns `{ kind: "view", role: "member" }`; admin returns `{ kind: "edit", role: "admin" }`.
- [x] Implement `lib/application/families/page-access.ts` with `resolveFamilyPageAccess({ authUserId, membership })` and a `FamilyPageAccess` union for redirect, not-found, view, and edit.
- [x] Add `lib/application/families/page-loaders.ts` with `loadFamilyForEditPage({ familyId, authUserId })`, returning sanitized family profile, current role, members, and invite summary inputs for the edit/view route.
- [x] Create the new route pages using `RecipeWorkspaceFrame`: `/account/families/new` redirects unauthenticated users to `/`; `/account/families/[familyId]/edit` redirects unauthenticated users to `/`, calls `notFound()` for authenticated non-members, and passes admin/member access mode into a temporary placeholder component until Slice 6.
- [x] Update `app/account/families/page.tsx` to redirect unauthenticated users to `/` instead of using the generic auth page behavior, while still rendering the existing dashboard until Slice 7.
- [x] Review checkpoint: confirm route guards are separated from JSX-heavy components and no new business rules were added to `families-dashboard.tsx`.

Verification:

- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts scripts/family-page-access.test.ts`
- `npm run lint`
- `git diff --check`

#### Slice 2: Shared Family Workflow Primitives

Files:

- Create `scripts/family-workflow-state.test.ts`.
- Create `lib/application/families/workflow-state.ts`.
- Create `lib/application/families/family-view-models.ts`.
- Create `app/account/families/_components/family-workflow-shell.tsx`.
- Create `app/account/families/_components/family-wizard-bar.tsx`.
- Create `app/account/families/_components/family-secondary-tabs.tsx`.
- Create `app/account/families/_components/family-status-message.tsx`.
- Create `app/account/families/_components/family-image-frame.tsx`.
- Create `app/account/families/_components/family-empty-state.tsx`.

Steps:

- [x] Add `scripts/family-workflow-state.test.ts` for `getCreateFamilySteps`, `getAdminEditFamilySteps`, `getMemberViewFamilySteps`, `getManageFamilyTopTabs`, `getManageFamilySelectedSteps`, and `resolveNextFamilyStep`. Assert the approved labels and ordering: Create/Admin Edit use Start, Family details, Invite members, Review; member view uses Details, Invites; Manage uses Families, Pending invites, Selected family; selected-family uses Overview, Members, Invites, Safety.
- [x] Implement `lib/application/families/workflow-state.ts` with typed step IDs and pure helpers for current/next/previous/completed step state.
- [x] Add `family-view-models.ts` pure helpers for mapping API/domain data into UI-safe family summary, pending invite summary, selected-family overview, member row, invite row, and safety summary objects.
- [x] Build `FamilyWorkflowShell` around `RecipeWorkspaceFrame` children conventions, but keep route pages responsible for auth/data loading.
- [x] Build `FamilyWizardBar` by following the Add Recipe wizard bar interaction model and using stable ids like `family-create-step-start`.
- [x] Build `FamilySecondaryTabs` using `secondary-tab-strip` and `secondary-tab-strip-item`, with explicit `aria-label` values for top-level manage tabs and selected-family tabs.
- [x] Build reusable status, empty, and image frame components with loading/error/success variants, square image display, and no nested-card layout.
- [x] Review checkpoint: shared components are presentation-only and accept prepared props; reducers/view-models stay under `lib/application/families`.

Verification:

- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-workflow-state.test.ts`
- `npm run lint`
- `npm run build`
- `git diff --check`

#### Slice 3: Family Image Upload Contract

Files:

- Create `scripts/family-image-upload.test.ts`.
- Create `lib/application/families/family-image-constraints.ts`.
- Create `lib/application/families/family-image-use-cases.ts`.
- Create `app/api/family-images/route.ts`.
- Create `app/api/families/[familyId]/image/route.ts`.
- Modify `lib/application/families/validation.ts`.
- Modify `lib/families/utils.ts`.

Steps:

- [x] Add tests for accepted mime types, max file size, square/avatar output metadata, staged create upload keys, authenticated-only upload, unsupported type rejection, oversized file rejection, edit replace, edit remove, and cleanup-tolerant replace/remove.
- [x] Implement family image constraints by reusing the recipe image validation ceiling unless a smaller square output limit is needed; name keys under a family-specific prefix such as `family-images/`.
- [x] Add `stageFamilyImageForCreate({ userId, file })`, `replaceFamilyImage({ familyId, userId, file })`, and `removeFamilyImage({ familyId, userId })` use cases that verify admin permission before edit mutations.
- [x] Add `POST /api/family-images` for user-scoped staged uploads before a family exists.
- [x] Add `PUT /api/families/[familyId]/image` for replace and `DELETE /api/families/[familyId]/image` for remove.
- [x] Update family validation to stop accepting arbitrary raw picture keys from browser JSON for new UI flows; allow only staged keys produced by the family-image use case.
- [x] Keep `buildFamilyPictureUrl` compatible with existing `pictureStorageKey` records while returning new family image URLs.
- [x] Review checkpoint: family profile images are not stored as `RecipeImage` records, cleanup failure cannot fail an otherwise valid profile update, and Create staging does not create a family early.

Verification:

- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-image-upload.test.ts scripts/recipe-image-upload-route.test.ts`
- `npm run lint`
- `npm run build`
- `git diff --check`

#### Slice 4: Username Direct Invite Contract

Files:

- Modify `prisma/schema.prisma`.
- Add a Prisma migration under `prisma/migrations/`.
- Create `scripts/family-direct-invite.test.ts`.
- Create `lib/application/families/direct-invites.ts`.
- Modify `lib/application/families/validation.ts`.
- Modify `lib/families/utils.ts`.
- Create `app/api/families/[familyId]/direct-invites/route.ts`.
- Create `app/api/families/[familyId]/direct-invites/[inviteId]/route.ts`.
- Modify `app/api/family-invites/[token]/route.ts`.
- Modify `app/api/family-invites/[token]/accept/route.ts`.
- Modify `app/api/family-invites/[token]/decline/route.ts`.
- Modify `app/api/family-invites/[token]/undo-decline/route.ts`.
- Modify `app/api/me/family-invites/route.ts`.

Steps:

- [x] Add failing tests for username normalization, user-not-found, duplicate pending direct invite, already-member, immediate `FamilyInviteDecision` creation, generated targeted URL, wrong authenticated user opening a targeted URL, revoke, expiration, accept, decline, undo-decline, and multi-use link behavior staying unchanged.
- [x] Extend `FamilyInvite` with explicit invite kind, such as `type` or `inviteType`, and nullable target user ID. Keep existing invite links as non-targeted link invites.
- [x] Add indexes for family/type/target user pending lookups and run the migration locally.
- [x] Implement `createUsernameDirectInvite`, `revokeUsernameDirectInvite`, `resolveTargetedInviteAccess`, and `listPendingInvitesForUser` helpers.
- [x] Add `POST /api/families/[familyId]/direct-invites` accepting `{ username }` and returning invite metadata plus targeted URL.
- [x] Add `DELETE /api/families/[familyId]/direct-invites/[inviteId]` for admin revoke.
- [x] Update family invite token routes so targeted invites reveal no unnecessary family detail to the wrong authenticated user and cannot be accepted by the wrong user.
- [x] Update pending invite listing to include direct invite type, target information for the recipient, and existing link invite fields.
- [x] Review checkpoint: no placeholder direct-invite UI is allowed in later slices until these use cases and API semantics are passing.

Verification:

- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-direct-invite.test.ts scripts/phase3-ops.test.ts scripts/family-deletion-workflow.test.ts`
- `npm run db:postgres:check`
- `npm run lint`
- `git diff --check`

#### Slice 5: Create Family Wizard

Files:

- Create `scripts/create-family-workflow.test.ts`.
- Create `scripts/create-family-route.test.ts`.
- Modify `app/account/families/new/page.tsx`.
- Create `app/account/families/_components/create-family-workflow.tsx`.
- Create `app/account/families/_components/family-details-step.tsx`.
- Create `app/account/families/_components/family-invite-step.tsx`.
- Create `app/account/families/_components/family-review-step.tsx`.
- Create `lib/application/families/create-family-workflow.ts`.
- Modify `app/api/families/route.ts`.
- Modify `lib/i18n/messages.ts`.

Steps:

- [x] Add tests for Create wizard draft state, final-create sequencing, image staged until Review, invite choices staged until Review, family-created-plus-invite-warning when invite creation partially fails, and reset behavior after success.
- [x] Implement `create-family-workflow.ts` pure draft helpers with `updateDetails`, `stageImage`, `stageInviteLink`, `stageUsernameInvite`, `removeStagedInvite`, `buildCreateFamilyPayload`, and `summarizeCreateFamilyReview`.
- [x] Update `POST /api/families` or add an application use case so final Create can create the family first, then attach the staged image and create staged invite link/direct invite records.
- [x] Build Start, Family details, Invite members, and Review screens with `FamilyWizardBar`, `FamilySecondaryTabs`, stable ids, mobile stacking, desktop two-column review summary, and no raw storage-key field.
- [x] Add recoverable warning UI when family creation succeeds but one or more invite creations fail, with links or actions that send the user to Edit Family or Manage Families.
- [x] Add English and Spanish messages for all Create Family labels, helper text, errors, warning, and success states.
- [x] Review checkpoint: no create mutation happens before Review, green appears only after successful family creation, and the flow works without an image or invites.

Verification:

- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-workflow.test.ts scripts/create-family-route.test.ts scripts/create-family-ui-contract.test.ts scripts/family-image-upload.test.ts scripts/family-direct-invite.test.ts`
- Browser check `/account/families/new` at desktop width and 390px.
- `npm run lint`
- `git diff --check`

#### Slice 6: Edit/View Family Wizard

Files:

- Create `scripts/edit-family-workflow.test.ts`.
- Modify `app/account/families/[familyId]/edit/page.tsx`.
- Create `app/account/families/_components/edit-family-workflow.tsx`.
- Create `app/account/families/_components/family-read-only-details.tsx`.
- Create `lib/application/families/edit-family-workflow.ts`.
- Modify `app/api/families/[familyId]/route.ts`.
- Modify `lib/i18n/messages.ts`.

Steps:

- [x] Add tests for admin mode steps, member read-only steps, non-admin labels using View or Details, profile update payloads, image replace/remove save behavior, direct invite create/revoke visibility, and non-member not-found behavior through page access helpers.
- [x] Implement edit workflow draft helpers for profile changes, image actions, invite actions, review summaries, dirty state, and save payloads.
- [x] Build admin Edit route with Start, Family details, Invite members, and Review.
- [x] Build member read-only route with Details and Invites only; hide or disable edit, invite creation, revoke, member removal, and deletion controls.
- [x] Update family detail/update API behavior only where the new profile/image/invite flows require it; preserve explicit JSON `401`, `403`, and `404` responses.
- [x] Add English and Spanish messages for admin edit and member view modes.
- [x] Review checkpoint: page-level privacy is implemented in the server route/loader, while API status codes remain explicit and intentional.

Verification:

- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/edit-family-workflow.test.ts scripts/family-page-access.test.ts scripts/family-direct-invite.test.ts scripts/family-image-upload.test.ts`
- Browser check `/account/families/[familyId]/edit` at desktop width and 390px for admin and read-only member fixtures.
- `npm run lint`
- `git diff --check`

#### Slice 7: Manage Families Command Workspace

Files:

- Create `scripts/manage-families-workspace.test.ts`.
- Modify `app/account/families/page.tsx`.
- Replace or shrink `app/account/families/families-dashboard.tsx`.
- Create `app/account/families/_components/manage-families-workspace.tsx`.
- Create `app/account/families/_components/family-list-panel.tsx`.
- Create `app/account/families/_components/pending-invites-panel.tsx`.
- Create `app/account/families/_components/selected-family-workspace.tsx`.
- Create `app/account/families/_components/family-members-panel.tsx`.
- Create `app/account/families/_components/family-invites-panel.tsx`.
- Create `app/account/families/_components/family-safety-panel.tsx`.
- Create `lib/application/families/manage-family-workspace.ts`.
- Modify existing member, invite, leave, and deletion request API routes only as needed for view-model consistency.
- Modify `lib/i18n/messages.ts`.

Steps:

- [x] Add tests for top-level tab state, selected-family state persistence across top-level tabs, selected-family step state, desktop list-plus-workspace view models, mobile list-first view models, pending invite accept/decline/undo summaries, member role action permissions, leave-family permissions, and deletion workflow summaries.
- [x] Implement manage workspace view-model helpers that consume families, pending invites, selected family details, member rows, invite rows, and deletion request state.
- [x] Build top-level tabs: Families, Pending invites, Selected family, using `FamilySecondaryTabs` with unique labels.
- [x] Build desktop two-zone layout with compact family/pending rows on the left and selected-family workspace on the right.
- [x] Build mobile single-column layout where list/pending content appears first and selected-family summary plus selected-family steps appear below selection.
- [x] Build selected-family steps: Overview, Members, Invites, Safety.
- [x] Preserve current operations: accept, decline, undo decline, generate/revoke invite links, username direct invite revoke, promote/demote/remove members, leave family, deletion request create/vote/cancel/deny.
- [x] Add focus behavior: selecting a family focuses the selected-family workspace heading on desktop and selected-family summary on mobile; tab switches preserve selected family and do not trap focus.
- [x] Review checkpoint: the old all-in-one dashboard is no longer the organizing component; remaining logic is extracted to focused view-models or hooks.

Verification:

- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/manage-families-workspace.test.ts scripts/phase3-ops.test.ts scripts/family-deletion-workflow.test.ts`
- Browser check `/account/families` at desktop width and 390px, including keyboard/focus checks.
- `npm run lint`
- `git diff --check`

#### Slice 8: I18n, Regression, QA Evidence, And Release Polish

Files:

- Create `requirements/family-pages-rebrand/qa-checklist.md`.
- Create `output/playwright/family-pages-rebrand/family-pages-smoke.mjs`.
- Create or update browser evidence under `output/playwright/family-pages-rebrand/`.
- Modify `scripts/i18n-family.test.ts`.
- Modify `scripts/recipe-family-link-sanitization.test.ts` only if recipe visibility behavior changes.
- Modify `lib/i18n/messages.ts`.
- Touch all new UI files for final stable ids, labels, and accessibility polish as needed.

Steps:

- [ ] Add/extend i18n tests to assert every new family workflow key exists in English and Spanish.
- [ ] Add a Playwright smoke covering Create Family desktop, Create Family 390px, Edit/View desktop, Edit/View 390px, Manage Families desktop, Manage Families 390px, left navigation create/edit/more links, and mobile drawer links.
- [ ] Verify all new or modified controls have stable ids where they are user-facing workflow anchors.
- [ ] Verify empty, loading, error, warning, and success states for each touched flow.
- [ ] Run recipe visibility regression through existing family selection tests and a browser check on recipe Add/Edit family visibility controls.
- [ ] Fill out `requirements/family-pages-rebrand/qa-checklist.md` with each automated command, browser check, manual result, known issue, and evidence path.
- [ ] Update `requirements/family-pages-rebrand/handoff.md` with final state, verification run, manual testing status, and next action.
- [ ] Review checkpoint: the feature is ready for a draft PR into `pre-main` only after the required verification bundle passes or any exceptions are documented in the handoff.

Verification:

- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts scripts/family-page-access.test.ts scripts/family-workflow-state.test.ts scripts/family-image-upload.test.ts scripts/family-direct-invite.test.ts scripts/create-family-workflow.test.ts scripts/edit-family-workflow.test.ts scripts/manage-families-workspace.test.ts scripts/i18n-family.test.ts`
- `npm run test:phase3`
- `npm run lint`
- `npm run build`
- Browser smoke from `output/playwright/family-pages-rebrand/family-pages-smoke.mjs`
- `git diff --check`

Stop here for user approval before code changes.

### 4. Implementation And QA

- Implement only after plan approval.
- Keep page files focused on routing, auth, and data loading.
- Keep business rules in `lib/application` or domain/infrastructure helpers.
- Add stable ids to new or modified UI elements.
- Leave unrelated untracked recipe-workflow evidence under `output/playwright/recipe-workflow-refresh/` alone.

## Test Plan

- Unit/use-case tests:
  - family validation
  - permission decisions
  - username invite targeting
  - duplicate invite handling
  - already-member handling
  - route/view-model href updates
- API/route tests:
  - family create/update
  - invite-link create/revoke
  - username direct invite create/revoke/accept/decline
  - member/admin-only actions
  - non-member not-found behavior
- Browser checks:
  - Create Family, Edit/View Family, and Manage Families on desktop.
  - Same flows around 390px width.
  - No horizontal overflow, overlapping text, broken wizard states, or hidden primary actions.
- Regression checks:
  - Recipe visibility family selection still loads family options.
  - Left navigation still opens and collapses correctly.
  - English and Spanish copy exists for new family workflow UI.

## Required Verification Bundle

The final detailed implementation plan must refine this list with the exact new focused test files, but every implementation closeout should include this baseline verification bundle:

- `npm run lint`
- `npm run build`
- `npm run test:phase3`
- Focused `node --test` coverage added or updated for:
  - navigation href updates
  - page auth/not-found behavior
  - username direct invite use cases and API routes
  - family image upload validation/use cases/routes
  - recipe visibility family-selection regression
- Browser or Playwright checks for:
  - Create Family desktop
  - Create Family around 390px width
  - Edit/View Family desktop
  - Edit/View Family around 390px width
  - Manage Families desktop
  - Manage Families around 390px width
  - left navigation route targets and mobile drawer behavior
- English and Spanish copy verification for all new family workflow UI.
- `git diff --check`

## Assumptions

- The approved requirements brief is the source of truth.
- The feature branch remains `codex/feature/family-pages-rebrand`.
- Option B, Family Command Workspace, is the approved visual direction.
- Implementation planning still needs the final task-by-task plan approval before coding starts.
- The implementation should improve the existing Recetas UI without introducing a disconnected redesign.
