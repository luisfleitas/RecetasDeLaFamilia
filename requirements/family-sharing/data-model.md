# Data Model and Invariants

## Entities
1. `Family`
2. `FamilyMembership`
3. `FamilyInvite`
4. `FamilyInviteDecision`
5. `FamilyDeletionRequest`
6. `FamilyDeletionVote`
7. (Phase 2) `RecipeFamilyLink` and recipe visibility field

## Suggested Fields
### Family
1. `id`
2. `name`
3. `description` nullable
4. `pictureStorageKey` nullable
5. `pictureUrl` nullable (derived/presentational field for clients)
6. `createdAt`
7. `updatedAt`
8. `createdByUserId`
9. `deletedAt` (optional soft-delete support)
10. `deletionCooldownUntil` nullable

### FamilyMembership
1. `familyId`
2. `userId`
3. `role` (`admin` | `member`)
4. `joinedAt`
5. Unique `(familyId, userId)`

### FamilyInvite
1. `id`
2. `familyId`
3. `tokenHash`
4. `createdByUserId`
5. `createdAt`
6. `expiresAt`
7. `revokedAt` nullable
8. `consumedAt` nullable
9. `consumedByUserId` nullable
10. `maxUses` default `1`

### FamilyInviteDecision
1. `inviteId`
2. `userId`
3. `status` (`pending` | `declined` | `accepted`)
4. `firstOpenedAt`
5. `lastOpenedAt`
6. `decidedAt` nullable
7. Unique `(inviteId, userId)`

### FamilyDeletionRequest
1. `id`
2. `familyId`
3. `initiatedByUserId`
4. `status` (`active` | `approved` | `denied` | `cancelled` | `expired`)
5. `eligibleAdminCount` (snapshot at creation)
6. `requiredApprovals` (`ceil(0.75 * eligibleAdminCount)`)
7. `approveCount` (denormalized for efficient checks)
8. `denyCount` (denormalized for efficient checks)
9. `expiresAt` (`createdAt + 20 days`)
10. `resolvedAt` nullable
11. `resolveReason` nullable
12. `createdAt`
13. `updatedAt`
14. Unique partial index: one `active` request per `familyId`

### FamilyDeletionVote
1. `deletionRequestId`
2. `userId`
3. `vote` (`approve` | `deny`)
4. `votedAt`
5. Unique `(deletionRequestId, userId)`

## Derived Invite Validity
Invite is valid when all are true:
1. `revokedAt IS NULL`
2. `consumedAt IS NULL`
3. `now < expiresAt`

## Required Invariants
1. Family with members must have at least one admin.
2. Invite token hash is unique.
3. Membership uniqueness per family/user.
4. Single-use invites consume at most once under concurrency.
5. Family `description` is optional but length-bounded.
6. Family `pictureStorageKey` is nullable and points to a valid image object when present.
7. Admin demotion is disallowed; admins may only be added via member promotion.
8. Only admins in the request's eligible-admin snapshot can vote.
9. Initiator auto-votes `approve` at request creation.
10. Votes are immutable (no vote updates/deletes while request active).
11. Request is denied when `approveCount + remainingUncastVotes < requiredApprovals`.
12. Family deletion cooldown is set to `now + 7 days` when request ends as `denied` or `expired`.
13. Family hard/soft delete executes only after request reaches `approved`.

## Transaction Requirements
1. Accept invite: validate + consume invite + create membership atomically.
2. Leave flow: remove member atomically while preserving admin invariants.
3. Role/member mutation: enforce admin invariant in same transaction.
4. Deletion request creation: lock eligible admin set + insert request + insert initiator approve vote atomically.
5. Vote submission: insert vote + recompute counts + apply terminal status (`approved`/`denied`) atomically.
6. Expiration worker: transition overdue active requests to `expired` and set cooldown atomically.
