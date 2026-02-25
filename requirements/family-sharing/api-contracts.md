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

## Endpoint Semantics
1. Invite revoke is idempotent.
2. Invite accept is idempotent for already-member case.
3. Role changes are done through `PATCH` body `{ "role": "admin" | "member" }`.
4. Time comparisons are UTC and boundary-consistent (`now >= expiresAt` means expired).

## Phase 2 Additions
1. Recipe APIs gain visibility and family linkage fields.
2. Read/list behavior enforces family membership.
3. Additive contracts only; existing private recipe behavior remains valid.
