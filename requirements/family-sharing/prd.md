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
3. Family admin: can manage invite links and member roles.

## Product Decisions
1. Invite acceptance is allowed for any authenticated user with a valid link.
2. Users may belong to multiple families.
3. Family creator starts as admin.
4. Invite link default validity is 7 days.
5. Invite links are single-use.
6. Declines are reversible while invite remains valid and unconsumed.
7. Roles are `admin` and `member` in Phase 1.
8. Recipe-sharing model is deferred to Phase 2.

## Scope by Phase
1. Phase 1: families (including description/picture profile metadata), invites, membership, role management, leave/delete behavior.
2. Phase 2: recipe visibility + family linkage + access enforcement.
3. Phase 3: rate limits, auditability, monitoring, and staged rollout hardening.

## Success Criteria
1. Users can create/manage multiple families with clear role-based controls.
2. Invite lifecycle handles valid, invalid, expired, revoked, consumed, and already-member states.
3. Admin invariants prevent families from entering invalid role states.
4. Family-sharing recipe access in Phase 2 is enforced at API and UI level.
5. Rollout can be expanded/reverted safely using feature flags and metrics.
