# PRD: Family Sharing

## Summary
Build Family Sharing in three phases. Phase 1 establishes family entities and membership workflows. Phase 2 adds recipe-level family visibility rules. Phase 3 hardens reliability, abuse protection, observability, and rollout controls.

## Goals
1. Let users create and manage multiple families.
2. Let families maintain a richer profile with description and picture.
3. Let admins invite members through secure invite links.
4. Let invitees join through a deterministic flow for logged-in and logged-out visitors.
5. Add family-based recipe sharing in a backward-compatible way.
6. Ship with measurable quality and rollback-safe rollout controls.

## Non-Goals
1. Email or push notifications in Phase 1.
2. Cross-family feed/recommendation features.
3. Enterprise org/admin structures.

## Users and Roles
1. Authenticated user: can create a family and join via invite.
2. Family member: can view family details and leave family.
3. Family admin: can view/edit/remove members, promote members to admin, and manage invite links.

## Product Decisions
1. Invite acceptance is allowed for any authenticated user with a valid link.
2. Users may belong to multiple families.
3. Family creator starts as admin.
4. Invite link default validity is 7 days.
5. Invite links are single-use.
6. Declines are reversible while invite remains valid and unconsumed.
7. Roles are `admin` and `member` in Phase 1.
8. Admin role changes are promotion-only; demotion is not supported.
9. Family deletion uses an admin approval workflow: threshold is 75% of eligible admins, rounded up.
10. Deletion request initiator counts as an immediate `approve` vote.
11. Only one active deletion request may exist per family.
12. Deletion request auto-cancels after 20 days if unresolved.
13. Deletion request can be canceled by the initiating admin.
14. A request is denied as soon as reaching threshold becomes mathematically impossible.
15. After denied/expired request, a 7-day cooldown blocks new deletion requests.
16. Recipe-sharing model is deferred to Phase 2.

## Scope by Phase
1. Phase 1: families (including description/picture profile metadata), invites, membership, role management, leave behavior, and admin-governed family deletion requests.
2. Phase 2: recipe visibility + family linkage + access enforcement.
3. Phase 3: rate limits, auditability, monitoring, and staged rollout hardening.

## Success Criteria
1. Users can create/manage multiple families with clear role-based controls.
2. Invite lifecycle handles valid, invalid, expired, revoked, consumed, and already-member states.
3. Admin invariants prevent families from entering invalid role states.
4. Family deletion requests resolve deterministically based on threshold, expiry, and impossibility rules.
5. Family-sharing recipe access in Phase 2 is enforced at API and UI level.
6. Rollout can be expanded/reverted safely using feature flags and metrics.

## User Stories and Acceptance Criteria
### Story 1: Admin manages family members
As a family admin, I can view/edit/remove members and promote a member to admin so I can maintain the family.

Acceptance criteria:
1. Admin can open family member list and view all active members.
2. Admin can edit allowed member profile fields.
3. Admin can remove a non-self member from the family.
4. Admin can promote an existing member to `admin`.
5. Demotion from `admin` to `member` is not available in API or UI.

### Story 2: Family member self-service
As a family member, I can view the family roster and leave the family.

Acceptance criteria:
1. Any member can view family members.
2. Any member can leave their family membership.
3. Member-only users cannot remove other members or promote admins.

### Story 3: Admin-governed family deletion
As an admin, I can initiate and vote on family deletion so deletion requires shared admin agreement.

Acceptance criteria:
1. Any admin can initiate a deletion request if no active request exists and cooldown is not active.
2. Initiation immediately records one `approve` vote by the initiator.
3. Approval threshold equals `ceil(0.75 * eligibleAdminCount)`.
4. Admin votes are single-submit and cannot be changed.
5. Request is approved when approvals reach threshold.
6. Request is denied when remaining possible approvals cannot reach threshold.
7. Request auto-cancels 20 days after creation if unresolved.
8. Initiating admin can cancel the active request.
9. After denied or expired request, new request creation is blocked for 7 days.
