# API Contracts

## Phase 1 Endpoints
1. `POST /api/families`
2. `GET /api/families`
3. `GET /api/families/:familyId`
4. `PATCH /api/families/:familyId` (admin-only family metadata update)
5. `POST /api/families/:familyId/invite-links`
6. `GET /api/families/:familyId/invite-links`
7. `DELETE /api/families/:familyId/invite-links/:inviteId`
8. `GET /api/family-invites/:token`
9. `POST /api/family-invites/:token/accept`
10. `POST /api/family-invites/:token/decline`
11. `POST /api/family-invites/:token/undo-decline`
12. `GET /api/me/family-invites?status=pending`
13. `PATCH /api/families/:familyId/members/:userId`
14. `DELETE /api/families/:familyId/members/:userId`
15. `POST /api/families/:familyId/leave`
16. `POST /api/families/:familyId/deletion-requests`
17. `GET /api/families/:familyId/deletion-requests/active`
18. `POST /api/families/:familyId/deletion-requests/:requestId/approve`
19. `POST /api/families/:familyId/deletion-requests/:requestId/deny`
20. `POST /api/families/:familyId/deletion-requests/:requestId/cancel`

## Family Metadata Contracts
1. `POST /api/families` request body includes:
2. `name` (required)
3. `description` (optional)
4. `picture` (optional: image URL or upload reference, per implementation)
5. `GET /api/families` and `GET /api/families/:familyId` responses include:
6. `name`, `description`, `pictureUrl`
7. `PATCH /api/families/:familyId` request body supports partial updates:
8. `name?`, `description?`, `picture?`
9. `picture` may be cleared with `null`

## Standard Error Codes
Use stable machine-readable error codes with HTTP status.

1. `UNAUTHORIZED` (401)
2. `FORBIDDEN` (403)
3. `NOT_FOUND` (404)
4. `VALIDATION_ERROR` (400)
5. `INVITE_INVALID` (400)
6. `INVITE_EXPIRED` (409)
7. `INVITE_REVOKED` (409)
8. `INVITE_CONSUMED` (409)
9. `ALREADY_MEMBER` (200)
10. `ADMIN_INVARIANT_VIOLATION` (409)
11. `CONFLICT` (409)
12. `UNSUPPORTED_IMAGE_TYPE` (400)
13. `IMAGE_TOO_LARGE` (400)
14. `DELETION_REQUEST_ACTIVE` (409)
15. `DELETION_REQUEST_COOLDOWN` (409)
16. `DELETION_REQUEST_EXPIRED` (409)
17. `DELETION_REQUEST_ALREADY_VOTED` (409)
18. `DELETION_REQUEST_NOT_ELIGIBLE` (403)
19. `DELETION_REQUEST_THRESHOLD_UNREACHABLE` (409)
20. `DELETION_REQUEST_NOT_INITIATOR` (403)

## Endpoint Semantics
1. Invite revoke is idempotent.
2. Invite accept is idempotent for already-member case.
3. Role changes are done through `PATCH` body `{ "role": "admin" | "member" }`.
4. Time comparisons are UTC and boundary-consistent (`now >= expiresAt` means expired).
5. Role mutation is promotion-only for Phase 1. `PATCH` to `member` for an admin target is rejected.
6. Deletion approval threshold is `ceil(0.75 * eligibleAdminCount)` captured at request creation.
7. Initiating a deletion request auto-creates an `approve` vote by initiator.
8. Only one active deletion request is allowed per family.
9. Votes are immutable; one vote per eligible admin for a request.
10. Deletion request auto-cancels at 20 days if still open.
11. If `currentApprovals + remainingUncastVotes < requiredApprovals`, request is denied immediately.
12. Only request initiator may cancel an active request.
13. After `denied` or `expired`, family enters 7-day deletion-request cooldown.

## Phase 2 Additions
1. Recipe APIs gain visibility and family linkage fields.
2. Read/list behavior enforces family membership.
3. Additive contracts only; existing private recipe behavior remains valid.
