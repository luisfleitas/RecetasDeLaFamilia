# Test Plan

## Unit Tests
1. Invite validity derivation (`active`, `expired`, `revoked`, `consumed`).
2. Authorization matrix by role and membership.
3. Admin invariant checks on promote/remove/leave.
4. Family name validation (trimmed, required, length limits).
5. Family description validation (optional, trimmed, max length).
6. Family picture validation (type, size, nullable clear behavior).
7. Family deletion threshold calculation uses `ceil(0.75 * adminCount)`.
8. Family deletion impossibility rule denies when threshold can no longer be reached.
9. Family deletion vote immutability blocks second or changed vote from same admin.
10. Family deletion cooldown window calculation after denied/expired requests.

## Integration/API Tests
1. Create family assigns creator as admin.
2. Invite lifecycle: create -> open -> accept.
3. Decline and undo-decline behavior while invite valid.
4. Revoke behavior and idempotency.
5. Already-member accept idempotency.
6. Concurrent single-use accept only allows one success.
7. Last-member leave removes membership but does not delete family automatically.
8. Last-admin constraint blocks invalid state transitions.
9. Family metadata update persists and returns normalized profile fields.
10. Admin can remove member.
11. Admin can promote member to admin.
12. Admin demotion attempt is rejected.
13. Create deletion request records initiator auto-approve vote.
14. Only one active deletion request per family is allowed.
15. Only initiator can cancel active deletion request.
16. Deletion request auto-expires at 20 days when unresolved.
17. Request auto-denies when remaining votes cannot satisfy threshold.
18. Denied/expired request enforces 7-day cooldown for new requests.
19. Approved deletion request removes/archives family according to delete strategy.

## UI/E2E Tests
1. Logged-out invite open -> auth -> return to invite confirmation.
2. `My Families` shows memberships and pending invite actions.
3. Admin-only controls hidden/blocked for non-admin users.
4. Invite state rendering: valid, already-member, declined, invalid.
5. Family list and family detail render description and picture fallback states.
6. Family detail shows admin member actions (edit/remove/promote) only to admins.
7. Deletion request banner/state appears when request is active.
8. Admin can approve or deny once; controls disable after voting.
9. Initiator can cancel active request from UI.
10. Cooldown state blocks request creation and shows next eligible date.

## Phase 2 Tests
1. Recipe visibility enforcement for private vs family-scoped recipes.
2. Family member can view linked recipes.
3. Non-member denied for family recipes.
4. Existing private recipe flows remain unchanged.

## Exit Criteria
1. All critical-path tests pass in CI.
2. Concurrency tests pass repeatedly without flakiness.
3. No unresolved P0/P1 defects in invite and membership flows.
