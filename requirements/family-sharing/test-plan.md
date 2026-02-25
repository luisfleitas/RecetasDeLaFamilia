# Test Plan

## Unit Tests
1. Invite validity derivation (`active`, `expired`, `revoked`, `consumed`).
2. Authorization matrix by role and membership.
3. Admin invariant checks on demote/remove/leave.
4. Family name validation (trimmed, required, length limits).
5. Family description validation (optional, trimmed, max length).
6. Family picture validation (type, size, nullable clear behavior).

## Integration/API Tests
1. Create family assigns creator as admin.
2. Invite lifecycle: create -> open -> accept.
3. Decline and undo-decline behavior while invite valid.
4. Revoke behavior and idempotency.
5. Already-member accept idempotency.
6. Concurrent single-use accept only allows one success.
7. Last sole member leave triggers delete path.
8. Last-admin constraint blocks invalid state transitions.
9. Family metadata update persists and returns normalized profile fields.

## UI/E2E Tests
1. Logged-out invite open -> auth -> return to invite confirmation.
2. `My Families` shows memberships and pending invite actions.
3. Admin-only controls hidden/blocked for non-admin users.
4. Invite state rendering: valid, already-member, declined, invalid.
5. Family list and family detail render description and picture fallback states.

## Phase 2 Tests
1. Recipe visibility enforcement for private vs family-scoped recipes.
2. Family member can view linked recipes.
3. Non-member denied for family recipes.
4. Existing private recipe flows remain unchanged.

## Exit Criteria
1. All critical-path tests pass in CI.
2. Concurrency tests pass repeatedly without flakiness.
3. No unresolved P0/P1 defects in invite and membership flows.
