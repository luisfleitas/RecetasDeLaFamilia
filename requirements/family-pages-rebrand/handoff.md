# Family Pages Rebrand Handoff

## Current State

Business analysis, the research pack, branded wireframes, design approval, final task-by-task plan approval, Slice 1 implementation, Slice 2 implementation, Slice 3 implementation, Slice 4 implementation, Slice 5 implementation, Slice 6 implementation, and Slice 7 implementation are complete for a rebrand and workflow split of the Recetas family pages. Slice 1 updated left navigation family routes, added the page-access helper contract, added the edit page loader, added the Create/Edit route shells, and changed unauthenticated `/account/families` access to redirect to the landing page. Slice 2 added shared workflow state/view-model helpers and reusable presentation primitives for the upcoming family workflows. Slice 3 added the family image upload contract with staged Create uploads, admin-only Edit replace/remove routes, square/avatar resizing, and validation for family-generated image keys. Slice 4 added the username direct invite persistence/API contract with targeted invite URLs, wrong-user protection, duplicate/already-member handling, revoke support, pending invite list metadata, and explicit link-vs-direct invite typing. Slice 5 added the Create Family wizard, final-create API sequencing, generated invite URL success display, recoverable warning actions, and English/Spanish message keys for the Create Family labels/help/errors/success/warning copy. Slice 6 added the Edit/View Family wizard, admin profile/image/invite workflow, member read-only Details/Invites mode, English/Spanish Edit/View copy, and focused workflow tests. Slice 7 rebuilt Manage Families around `ManageFamiliesWorkspace` for the approved top-level Families/Pending invites/Selected family tabs, desktop two-zone layout, mobile list-first layout, selected-family Overview/Members/Invites/Safety steps, desktop/mobile focus-on-select behavior, pending invite accept/decline/undo actions, link invite generation/delete, username direct-invite listing/revoke, member operations, leave-family, and deletion request actions. `/account/families` is now wrapped in `RecipeWorkspaceFrame`, so Manage Families uses the warm Recetas workspace palette instead of the old sage theme. Follow-up invite-link visibility work now focuses and scrolls the generated URL input immediately after invite creation in Create, Edit, and the new Manage workspace.

Feature branch:

- `codex/feature/family-pages-rebrand`

Visual companion:

- URL: `http://localhost:50590`
- Session content: `.superpowers/brainstorm/12048-1778177405/content`

## Completed

- Created the feature branch from `pre-main`.
- Confirmed the feature should follow the Recetas approval-driven UI process used for the recipe workflow refresh.
- Confirmed the scope includes:
  - Create Family page from left navigation family `+`.
  - Edit Family page from left navigation family edit links.
  - Manage Families page from left navigation family `More`.
- Confirmed route direction:
  - `/account/families/new` for Create Family.
  - `/account/families/[familyId]/edit` for Edit Family.
  - `/account/families` for Manage Families.
- Confirmed Create/Edit Family should use wizard structure similar to Create Recipe.
- Confirmed Manage Families should use a list-then-select wizard-like structure.
- Confirmed invite links and direct invites are in scope.
- Confirmed direct invites support existing Recetas username only in this phase.
- Confirmed email invites, registration handoff, app-sent email, contact import, and crop editor are out of scope.
- Confirmed family image upload is in scope and should use the same pattern/provider as recipe images where practical.
- Created `requirements/family-pages-rebrand/requirements-brief.md`.
- Updated the requirements brief after review feedback:
  - Non-admin family members can access the family route in read-only View/Details mode.
  - Create Family keeps one final Create action; invite choices are staged until Review.
  - Username direct invites are single-use and create both an in-app pending invite and shareable targeted URL.
  - Edit Family is profile/invite setup; Manage Families is operations, members, roles, leave-family, and deletion/safety.
  - Family image upload is one active profile image with preview/replace/remove, staged in Create, saved in Edit, and no crop editor.
  - Unauthenticated `/account/families*` access redirects to the landing page; authenticated non-members get not-found behavior.
  - Create/Edit/View/Manage family pages should use `RecipeWorkspaceFrame`.
  - Backwards compatibility for old invite links, old invite records, and previous raw family image behavior is not an acceptance requirement.
  - Verification expectations now include unit/use-case, API/route, browser/mobile, recipe-visibility regression, and i18n checks.
- Reviewed and approved `requirements/family-pages-rebrand/implementation-plan.md` as the plan structure for research/design, detailed slice refinement, implementation, and QA.
- Produced `requirements/family-pages-rebrand/research-pack.md` from the approved brief, current family UI/API surface, Add Recipe workflow patterns, `RecipeWorkspaceFrame`, image handling seams, and Visibility Type tabs.
- Produced `requirements/family-pages-rebrand/design-options.md` with two concrete directions:
  - Option A: Guided Family Studio.
  - Option B: Family Command Workspace.
- Initially scored Option A as the lower-risk direction, then reviewed branded wireframes with the user.
- Produced `requirements/family-pages-rebrand/branded-wireframes.html` with branded desktop/mobile static wireframes for both options.
- User approved Option B: Family Command Workspace.
- Updated `requirements/family-pages-rebrand/design-options.md` to mark Option B as the approved direction.
- Updated `requirements/family-pages-rebrand/implementation-plan.md` with:
  - Option B as the selected direction.
  - Create/Edit/View/Manage layout decisions.
  - Manage Families top-level tabs: Families, Pending invites, Selected family.
  - Selected-family steps: Overview, Members, Invites, Safety.
  - Direct-invite contract direction: extend existing invite model with explicit type and nullable target user.
  - Family image direction: family-specific square/avatar upload with Create staging and Edit replace/remove.
  - Refined implementation slices for task-by-task planning.
- Expanded `requirements/family-pages-rebrand/implementation-plan.md` into the final task-by-task implementation plan:
  - Slice 1: Navigation and route guards.
  - Slice 2: Shared family workflow primitives.
  - Slice 3: Family image upload contract.
  - Slice 4: Username direct invite contract.
  - Slice 5: Create Family wizard.
  - Slice 6: Edit/View Family wizard.
  - Slice 7: Manage Families command workspace.
  - Slice 8: I18n, regression, QA evidence, and release polish.
- User approved the final task-by-task implementation plan.
- Completed Slice 1: Navigation and route guards.
  - Updated `scripts/home-navigation-view-model.test.ts`.
  - Updated `lib/application/home-navigation/view-model.ts`.
  - Added `scripts/family-page-access.test.ts`.
  - Added `lib/application/families/page-access.ts`.
  - Added `lib/application/families/page-loaders.ts`.
  - Added `app/account/families/new/page.tsx`.
  - Added `app/account/families/[familyId]/edit/page.tsx`.
  - Updated `app/account/families/page.tsx`.
- Completed Slice 2: Shared family workflow primitives.
  - Added `scripts/family-workflow-state.test.ts`.
  - Added `lib/application/families/workflow-state.ts`.
  - Added `lib/application/families/family-view-models.ts`.
  - Added shared family presentation primitives under `app/account/families/_components/`.
- Completed Slice 3: Family image upload contract.
  - Added `scripts/family-image-upload.test.ts`.
  - Added `lib/application/families/family-image-constraints.ts`.
  - Added `lib/application/families/family-image-use-cases.ts`.
  - Added `app/api/family-images/route.ts`.
  - Added `app/api/families/[familyId]/image/route.ts`.
  - Updated `lib/application/families/validation.ts`.
  - Updated `lib/families/utils.ts`.
- Completed Slice 4: Username direct invite contract.
  - Added `scripts/family-direct-invite.test.ts`.
  - Added `FamilyInviteType`, `FamilyInvite.inviteType`, and `FamilyInvite.targetUserId` to `prisma/schema.prisma`.
  - Added migration `prisma/migrations/20260508180000_add_family_direct_invites/migration.sql`.
  - Added `lib/application/families/direct-invites.ts`.
  - Added `app/api/families/[familyId]/direct-invites/route.ts`.
  - Added `app/api/families/[familyId]/direct-invites/[inviteId]/route.ts`.
  - Updated existing invite-link and family-invite token routes to preserve link invite behavior while enforcing direct-invite target-user privacy.
  - Updated `app/api/me/family-invites/route.ts` to include invite type and direct target metadata.
- Completed Slice 5: Create Family wizard.
  - Added `scripts/create-family-workflow.test.ts`.
  - Added `lib/application/families/create-family-workflow.ts` with draft details, staged image, staged link invite, staged username invite, review payload/summary, invite removal, and post-create completion helpers.
  - Added `scripts/create-family-route.test.ts`.
  - Added `lib/application/families/create-family-submission.ts`.
  - Updated `POST /api/families` so final Review submissions create the family and admin membership first, then create staged invite-link and username-direct invite records.
  - Updated `parseCreateFamilyInput` and `buildCreateFamilyPayload` so the final Review payload carries staged invite choices to the API.
  - Added `scripts/create-family-ui-contract.test.ts`.
  - Added `lib/application/families/create-family-ui-contract.ts`.
  - Added `app/account/families/_components/create-family-workflow.tsx`.
  - Updated `app/account/families/new/page.tsx` to render the Create Family wizard instead of the placeholder.
  - Added Start, Family details, Invite members, and Review screens with `FamilyWizardBar`, `FamilySecondaryTabs`, stable ids, mobile stacking, desktop two-column review summary, no raw storage-key field, staged family-image upload, staged link/username invite choices, final Create submission, success state, and recoverable invite-warning recovery actions to Edit Family or Manage Families.
  - Fixed Create Family success handling so generated link/direct invite URLs from the final create response are shown once with copy controls. Root cause of the local "invite links are not being generated" symptom was the pending `20260508180000_add_family_direct_invites` migration not being applied to `prisma/dev.db`, leaving the `invite_type` column missing at runtime.
  - Added English and Spanish message keys for Create Family shell, wizard steps, field labels, helper text, invite methods, review summaries, generated invite URL copy, warning/success/error states, and footer actions.
  - Replaced hard-coded Create Family UI copy in `/account/families/new`, `create-family-workflow.tsx`, and `create-family-ui-contract.ts` with `messages.family.createFamily`.
- Completed Slice 6: Edit/View Family wizard.
  - Added `scripts/edit-family-workflow.test.ts`.
  - Added `lib/application/families/edit-family-workflow.ts` with admin/member mode labels, profile draft changes, image replace/remove save payloads, staged invite review metadata, and action visibility helpers.
  - Added `app/account/families/_components/edit-family-workflow.tsx`.
  - Added `app/account/families/_components/family-read-only-details.tsx`.
  - Updated `app/account/families/[familyId]/edit/page.tsx` to render the admin Edit wizard or member read-only Family Details mode from the existing page loader/access contract.
  - Added English and Spanish message keys for Edit Family and Family Details labels, states, review summaries, invite creation, image handling, and member read-only copy.
  - Admin Edit now has Start, Family details, Invite members, and Review steps with profile PATCH saving, staged image upload via the family image upload contract, generated invite URLs, and direct username invite creation.
  - Member View now has Details and Invites steps, read-only profile/member display, and no save/profile mutation, invite creation, invite revoke, member removal, or deletion controls.
- Completed invite-link visibility follow-up:
  - Create Family generated invite rows now expose stable input IDs through the UI contract and focus/scroll the first generated URL after final Create.
  - Edit Family invite creation now focuses/scrolls the generated URL immediately after creating link or username invites.
  - The current Manage Families dashboard now keeps the Invite Codes tab active and focuses/scrolls the latest generated URL after invite-link creation.
- Completed invite-link delete follow-up:
  - Admins can now delete an existing link invite from the current Manage Families Invite Codes list.
  - `DELETE /api/families/[familyId]/invite-links/[inviteId]` removes link invite records instead of only revoking them, which removes them from admin lists and invalidates the stored token hash.
  - The Manage Families dashboard now labels the action as Delete, refreshes the invite list after deletion, and shows English/Spanish delete success/error copy.
  - Edit Family now loads existing invite-link metadata in the Invite members step and exposes Delete controls there too, so admins do not have to return to Manage Families to remove an invite link.
- Fixed the Manage Families old-color-scheme regression:
  - `/account/families` now renders inside `RecipeWorkspaceFrame`, matching the warm Create/Edit family page shell.
  - `FamiliesDashboard` now renders as a section inside the workspace frame instead of nesting its own page-level main landmark.
- Completed Slice 7: Manage Families command workspace.
  - Added an in-app pending invite action route at `PATCH /api/me/family-invites/[inviteId]` so Manage Families can accept, decline, and undo declined pending invites without needing a retrievable raw invite token.
  - Added `GET /api/families/[familyId]/direct-invites` for admin direct-invite listing and wired Manage Families to revoke username direct invites.
  - Wired Manage Families pending invite action buttons, direct invite rows, link invite generation/delete, member promote/demote/remove, leave-family, and deletion request create/vote/cancel actions.
  - Changed `ManageFamiliesWorkspace` to render only the active responsive layout so desktop and mobile variants do not duplicate stable IDs in the DOM.

## In Progress

- Slice 8: I18n, regression, QA evidence, and release polish.

## Next Action

Start Slice 8 from `requirements/family-pages-rebrand/implementation-plan.md`: create `requirements/family-pages-rebrand/qa-checklist.md`, add the Playwright smoke/evidence bundle for Create/Edit/View/Manage desktop and 390px flows, finish stable-id/accessibility/i18n review, run recipe visibility regression, and update this handoff with final QA status.

## Known Issues

- The current family UI is concentrated in one large client component: `app/account/families/families-dashboard.tsx`.
- Family image upload has API/use-case coverage and Create/Edit UI exposure; Manage/Slice 8 still needs final browser and QA evidence coverage.
- Username direct invites have API/use-case coverage and Create/Edit/Manage UI exposure; Slice 8 still needs final browser evidence coverage.
- The research pack calls out the need to split current dashboard responsibilities instead of extending the all-in-one component directly.
- The active working tree includes untracked prior recipe-workflow Playwright evidence under `output/playwright/recipe-workflow-refresh/`; those files are unrelated to this feature and should be left alone unless the user asks otherwise.
- Existing invite URLs are intentionally not retrievable after creation because only token hashes are stored, so Create/Edit/Manage surfaces must show copyable URLs immediately after generating them.
- Deleted invite links are removed from the admin list and their old invite URLs resolve through the existing invalid-invite token contract.
- The old sage color scheme on `/account/families` was caused by the page rendering outside `RecipeWorkspaceFrame`; this is fixed and visually verified in the local browser.

## Verification Already Run

- Documentation/context inspection.
- Created `requirements/family-pages-rebrand/research-pack.md`.
- Created `requirements/family-pages-rebrand/design-options.md`.
- Created `requirements/family-pages-rebrand/branded-wireframes.html`.
- Updated design and implementation docs after Option B approval.
- Updated `requirements/family-pages-rebrand/implementation-plan.md` with the final task-by-task plan.
- Updated this handoff to move the next action to plan approval.
- Slice 1 red/green verification:
  - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` failed after changing expected family routes, then passed after updating `lib/application/home-navigation/view-model.ts`.
  - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-page-access.test.ts` failed because `lib/application/families/page-access.ts` did not exist, then passed after adding the helper.
  - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts scripts/family-page-access.test.ts` passed with 13 tests.
  - `npm run lint` passed with existing warnings only.
  - `npm run build` initially caught a provider enum/string comparison in `lib/application/families/page-access.ts`; after keeping page access provider-agnostic with string roles, `npm run build` passed.
  - `git diff --check` passed.
  - Slice 2 red/green verification:
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-workflow-state.test.ts` failed first because `lib/application/families/workflow-state.ts` did not exist, then passed after adding the workflow helper.
    - The same test failed next because `lib/application/families/family-view-models.ts` did not exist, then passed after adding the family view-model helpers.
    - Final `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-workflow-state.test.ts` passed with 6 tests.
    - `npm run lint` passed with existing warnings only.
    - `npm run build` passed.
    - `git diff --check` passed.
  - Slice 3 red/green verification:
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-image-upload.test.ts` failed first because `app/api/family-images/route.ts` and `app/api/families/[familyId]/image/route.ts` did not exist, then passed after adding the family image contract.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-image-upload.test.ts scripts/recipe-image-upload-route.test.ts` passed with 6 tests.
    - `npm run lint` passed with existing warnings only.
    - `npm run build` passed.
    - `git diff --check` passed.
  - Slice 4 red/green verification:
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-direct-invite.test.ts` failed first because `app/api/families/[familyId]/direct-invites/route.ts` did not exist and invite-link responses did not expose `inviteType`, then passed after adding the direct-invite contract.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-direct-invite.test.ts scripts/phase3-ops.test.ts scripts/family-deletion-workflow.test.ts` passed with 12 tests.
    - `npm run db:postgres:check` passed and generated `.tmp/postgres/baseline.sql`.
    - `npm run lint` passed with existing warnings only.
    - `npm run build` passed.
    - `git diff --check` passed.
  - Slice 5 red/green verification:
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-workflow.test.ts` failed first because `lib/application/families/create-family-workflow.ts` did not exist, then passed after adding the pure workflow helper.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-workflow.test.ts scripts/family-image-upload.test.ts scripts/family-direct-invite.test.ts` passed with 14 tests.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-route.test.ts` failed first because `POST /api/families` did not return the final-create completion payload, then passed after adding `submitCreateFamily`.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-workflow.test.ts` failed after the payload contract changed because `buildCreateFamilyPayload` did not include staged invites, then passed after updating the helper.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-workflow.test.ts scripts/create-family-route.test.ts scripts/family-image-upload.test.ts scripts/family-direct-invite.test.ts` passed with 16 tests.
    - `npm run lint` passed with existing warnings only.
    - `npm run build` passed.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-ui-contract.test.ts` failed first because `lib/application/families/create-family-ui-contract.ts` did not exist, then passed after adding the UI contract helper.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-workflow.test.ts scripts/create-family-route.test.ts scripts/create-family-ui-contract.test.ts scripts/family-image-upload.test.ts scripts/family-direct-invite.test.ts` passed with 20 tests.
    - `npm run lint` passed with existing warnings only.
    - `npm run build` passed.
    - Browser check at `http://127.0.0.1:3100/account/families/new` desktop-authenticated session passed: Start -> Family details -> Invite members -> Review, staged single-use link plus username invite, no raw storage-key UI in the invite step, and Review showed profile plus both staged invites.
    - Browser check at 390px passed for authenticated Start screen/wizard visibility and mobile stacking; no horizontal overflow was visible in the in-app browser screenshot.
    - Invite-link bug verification:
      - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-ui-contract.test.ts` failed first because `buildCreateFamilyGeneratedInviteLinks` did not exist, then passed after adding the generated invite URL contract.
      - Browser check at `http://127.0.0.1:3100/account/families/new` first reproduced the local runtime error: Prisma could not create `FamilyInvite` because `invite_type` was missing in `prisma/dev.db`.
      - `npx prisma migrate status` showed `20260508180000_add_family_direct_invites` was pending; `npx prisma migrate deploy` applied it successfully.
      - Browser re-check at `http://127.0.0.1:3100/account/families/new` passed: final Create generated a visible `http://localhost:3100/invite/family/...` URL with Copy URL control, and the success state no longer showed the false "Family name is required" blocker.
      - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-workflow.test.ts scripts/create-family-route.test.ts scripts/create-family-ui-contract.test.ts scripts/family-direct-invite.test.ts` passed with 17 tests.
      - `npm run lint` passed with existing warnings only.
      - `npm run build` passed.
      - `git diff --check` passed.
    - Slice 5 i18n polish verification:
      - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-ui-contract.test.ts` failed first because Spanish Create Family copy still returned English helper labels, then passed after adding message-backed Create Family UI copy.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-workflow.test.ts scripts/create-family-route.test.ts scripts/create-family-ui-contract.test.ts scripts/family-image-upload.test.ts scripts/family-direct-invite.test.ts` passed with 22 tests.
    - `npm run lint` passed with existing warnings only.
    - `npm run build` passed.
    - `git diff --check` passed.
  - Slice 6 red/green verification:
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/edit-family-workflow.test.ts` failed first because `lib/application/families/edit-family-workflow.ts` did not exist, then passed after adding the workflow helper.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/edit-family-workflow.test.ts scripts/family-page-access.test.ts scripts/family-direct-invite.test.ts scripts/family-image-upload.test.ts` passed with 18 tests.
    - `npm run lint` passed with existing warnings only.
    - `npm run build` passed.
    - Browser check at `http://127.0.0.1:3100/account/families/20/edit` passed for authenticated Alice/admin: admin Edit route rendered `Edit Family`, the four admin steps, and the Start screen.
    - Browser check at `http://127.0.0.1:3100/account/families/8/edit` passed for authenticated Bob/member: member View route rendered `Family Details`, Details/Invites steps, read-only profile/member details, and no visible Save Family Changes control.
    - Browser check at 390px passed for the same admin and member routes using the in-app browser viewport override.
    - `git diff --check` passed.
  - Invite-link visibility follow-up verification:
    - `npx prisma migrate status` confirmed `prisma/dev.db` is up to date.
    - Browser check at `http://localhost:3100/account/families/new` passed: after final Create, the generated invite URL input is visible and focused.
    - Browser check at `http://localhost:3100/account/families/22/edit` passed: after creating a single-use invite link, the generated URL input is visible and focused.
    - Browser check at `http://localhost:3100/account/families` passed: after generating an invite from Invite Codes, the latest generated URL input is visible and focused.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/create-family-ui-contract.test.ts scripts/create-family-route.test.ts scripts/edit-family-workflow.test.ts scripts/family-direct-invite.test.ts` passed with 18 tests.
    - `npm run lint` passed with existing warnings only.
    - `npm run build` passed.
    - `git diff --check` passed.
  - Invite-link delete follow-up verification:
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-direct-invite.test.ts` failed first because the existing invite-link DELETE route returned a revoked invite and kept the record visible, then passed after changing the route to delete link invite records and invalidate the token.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/i18n-family.test.ts` failed first because the new delete copy keys were missing, then passed after adding English and Spanish message coverage.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-direct-invite.test.ts` passed with 6 tests.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/i18n-family.test.ts` passed with 3 tests.
    - `npm run lint` passed with existing warnings only.
    - `npm run build` passed.
    - `git diff --check` passed.
  - Edit Family invite-link delete follow-up verification:
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/edit-family-workflow.test.ts` failed first because `buildEditFamilyExistingInviteRows` did not exist, then passed after adding the existing invite row view-model helper.
    - Browser check at `http://localhost:3100/account/families/22/edit` passed: Continue to Invite members, existing invite links rendered with Delete buttons, and clicking Delete removed the selected invite from the list.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/edit-family-workflow.test.ts scripts/i18n-family.test.ts` passed with 9 tests.
    - `npm run lint` passed with existing warnings only.
    - `npm run build` passed.
    - `git diff --check` passed.
  - Slice 7 Manage workspace helper/UI verification:
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/manage-families-workspace.test.ts` failed first because `lib/application/families/manage-family-workspace.ts` did not exist, then passed after adding the pure Manage workspace helper.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/manage-families-workspace.test.ts scripts/phase3-ops.test.ts scripts/family-deletion-workflow.test.ts` passed with 16 tests.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/manage-families-workspace.test.ts` failed after adding the direct-invite row expectation because `buildDirectInviteAdminRows` did not exist, then passed after adding the helper.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/family-direct-invite.test.ts` failed after adding the in-app invite-id action/listing expectation because `GET /api/families/[familyId]/direct-invites` and `PATCH /api/me/family-invites/[inviteId]` did not exist, then passed after adding those routes and helpers.
    - Replaced the old `/account/families` organizing UI with `ManageFamiliesWorkspace`; `families-dashboard.tsx` now acts as the data/action container.
    - Added top-level Manage tabs, desktop list-plus-workspace layout, mobile list-first layout, selected-family Overview/Members/Invites/Safety tabs, pending invite accept/decline/undo controls, member promote/demote/remove controls, invite-link create/delete/copy controls, username direct-invite list/revoke controls, deletion request controls, and select-family focus behavior.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/manage-families-workspace.test.ts scripts/phase3-ops.test.ts scripts/family-deletion-workflow.test.ts scripts/family-direct-invite.test.ts scripts/i18n-family.test.ts` passed with 27 tests.
    - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/manage-families-workspace.test.ts scripts/family-direct-invite.test.ts scripts/i18n-family.test.ts` passed with 20 tests after the duplicate-ID responsive layout fix.
    - `npm run lint` passed with existing warnings only.
    - `npm run build` passed.
    - `git diff --check` passed.
    - Browser check at `http://127.0.0.1:3100/account/families` desktop passed: top-level tabs rendered, selecting an admin family opened the Selected family tab, details loaded, the Invites tab showed invite-link controls plus the Username invites section, and duplicate workflow IDs no longer appeared.
    - Browser check at 390px passed: Families list rendered first, selecting an admin family revealed selected-family summary and selected-family tabs below the list, the Invites tab showed invite-link controls plus the Username invites section, and duplicate workflow IDs no longer appeared.
  - Manage Families palette follow-up verification:
    - Browser check at `http://localhost:3100/account/families` after seeded local sign-in passed: the route renders inside the warm `RecipeWorkspaceFrame` shell instead of the old sage dashboard shell.
    - `git diff --check` passed.

## Manual Testing Status

- Slice 5 Create Family and Slice 6 Edit/View Family have browser checks at desktop and 390px. Invite-link visibility was rechecked in Create, Edit, and Manage after the focus/scroll fix. Slice 7 Manage workspace has desktop and 390px browser checks for selected-family navigation, invite-link controls, username direct-invite list exposure, and duplicate-ID prevention; route/use-case tests cover pending invite accept/decline/undo and direct-invite revoke/listing. Full feature smoke across Create/Edit/View/Manage, mutation-heavy browser checks, recipe visibility regression, and evidence capture still belong to Slice 8.

## Decisions Already Approved

- Follow Recetas agent instructions and the recipe re-work process.
- Ask clarifications one by one.
- Use the visual companion when visual comparison is useful.
- Split family work into Create, Edit, and Manage pages.
- Use wizard structure for Create Family, Edit Family, and Manage Families.
- Use the recipe workflow visual language: top app chrome, wizard bar, warm cream/orange states, and green only for real success.
- Keep one final Create Family action on Review.
- Use username-only direct invites for this phase.
- Redirect unauthenticated `/account/families*` access to the landing page and use not-found behavior for authenticated non-members.
- Requirements brief is approved as the baseline for research/design.
- Implementation plan is approved as the current workflow and slice structure.
- Option B, Family Command Workspace, is the approved design direction.
- Final task-by-task implementation plan is approved; continue slice-by-slice from the tracker.
