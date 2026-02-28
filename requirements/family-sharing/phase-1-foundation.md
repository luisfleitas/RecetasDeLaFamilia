# Phase 1: Family Foundation

## Objective
Deliver family creation, single-use invite-link join flow, family membership management, and admin role controls.

## In Scope
1. Family creation and listing for current user.
2. Family detail with member roster, role badges, description, and picture.
3. Family profile metadata updates (`name`, `description`, `picture`) by admins.
4. Invite link generation, listing, revocation, and token resolution.
5. Invite accept/decline/undo decline flows.
6. `My Families` area with memberships and pending invite actions.
7. Role management (promotion to `admin`) and member removal.
8. Leave flow for all members.
9. Admin-governed family deletion request flow with threshold voting.

## Out of Scope
1. Recipe visibility or ownership changes.
2. Email/push delivery.
3. Cross-family content feeds.

## Core Invariants
1. If a family has members, it must have at least one admin.
2. Single-use invite may be consumed only once.
3. Family creator starts as admin.
4. Unique membership by `(familyId, userId)`.
5. Invite validity is derived from `revokedAt`, `consumedAt`, and `expiresAt`.

## Authorization Rules
1. Admin-only: create/revoke invite links; promote/remove members; create/vote/cancel family deletion request (cancel limited to initiator).
2. Member: view family details and leave.
3. Non-member: no access to family internals.
4. Invite token endpoints: authenticated access for accept/decline/undo.

## Critical Behaviors
1. Already-member accept returns idempotent success.
2. Concurrent accepts are transaction-safe; only one can consume invite.
3. Last-admin leave/removal is blocked unless another admin remains.
4. Deletion request threshold is `ceil(0.75 * eligibleAdminCount)` using admin snapshot at request creation.
5. Initiator gets immediate `approve` vote when request is created.
6. Votes are single-submit and immutable.
7. Request auto-denies when remaining available approvals cannot reach threshold.
8. Active request auto-expires after 20 days if unresolved.
9. Initiator may cancel active request.
10. New request is blocked for 7 days after denied/expired request.
11. Family records are deleted only after deletion request is approved.

## UI Requirements
1. Add `My Families` section under account/profile.
2. Show family list + create action, including picture thumbnail and short description preview.
3. Show pending invites only after first authenticated token open.
4. Family detail includes family profile header (name, description, picture), member management, and invite link management for admins.
5. Invite page supports: valid pending, already member, declined with undo, invalid (expired/revoked/consumed/malformed).
6. Logged-out invite visitors are redirected to auth and returned to invite confirmation after auth.
7. Family detail includes `Delete Family` request state card (active status, expiry countdown, threshold progress, and cooldown state when applicable).
8. During active request, each admin sees one-time vote actions (`Approve`/`Deny`) and the initiator sees `Cancel Request`.

## Validation Rules
1. Family `name`: required, trimmed, length constrained.
2. Family `description`: optional, trimmed, max length constrained.
3. Family `picture`: optional image URL or storage-backed file reference; only supported image MIME types allowed.
4. If picture upload is supported via multipart, enforce max file size and image dimension bounds.
5. Deletion request create is rejected while another active request exists.
6. Deletion request create is rejected during cooldown.
7. Vote submit is rejected for non-eligible users and repeat voters.

## Acceptance Criteria
1. Creator becomes admin on create.
2. Admin can create and revoke invite links.
3. Invitee can accept/decline/undo per validity constraints.
4. Role actions enforce admin invariant.
5. Admin can update family profile fields with validation.
6. Admin can remove members and promote members to admin.
7. Any member can view family members and leave family.
8. Admin can create a deletion request and gets an automatic approve vote.
9. Family is deleted only when request reaches 75% approvals (rounded up).
10. Request expires after 20 days if unresolved.
11. Request is denied when threshold becomes unreachable.
12. Initiator can cancel active request.
13. New request is blocked for 7 days after denied/expired request.
