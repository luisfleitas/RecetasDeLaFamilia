# Data Model and Invariants

## Entities
1. `Family`
2. `FamilyMembership`
3. `FamilyInvite`
4. `FamilyInviteDecision`
5. (Phase 2) `RecipeFamilyLink` and recipe visibility field

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

## Transaction Requirements
1. Accept invite: validate + consume invite + create membership atomically.
2. Leave/delete flow: when sole member leaves, delete family and dependent rows atomically.
3. Role/member mutation: enforce admin invariant in same transaction.
