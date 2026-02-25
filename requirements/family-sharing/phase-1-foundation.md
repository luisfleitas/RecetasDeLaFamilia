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
7. Role management (`admin`/`member`) and member removal.
8. Leave flow including sole-member destructive delete.

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
1. Admin-only: create/revoke invite links; promote/demote/remove members.
2. Member: view family details and leave.
3. Non-member: no access to family internals.
4. Invite token endpoints: authenticated access for accept/decline/undo.

## Critical Behaviors
1. Already-member accept returns idempotent success.
2. Concurrent accepts are transaction-safe; only one can consume invite.
3. Last sole member leave requires destructive confirmation and deletes family records.
4. Last-admin leave/demotion/removal is blocked unless another admin remains.

## UI Requirements
1. Add `My Families` section under account/profile.
2. Show family list + create action, including picture thumbnail and short description preview.
3. Show pending invites only after first authenticated token open.
4. Family detail includes family profile header (name, description, picture), member management, and invite link management for admins.
5. Invite page supports: valid pending, already member, declined with undo, invalid (expired/revoked/consumed/malformed).
6. Logged-out invite visitors are redirected to auth and returned to invite confirmation after auth.

## Validation Rules
1. Family `name`: required, trimmed, length constrained.
2. Family `description`: optional, trimmed, max length constrained.
3. Family `picture`: optional image URL or storage-backed file reference; only supported image MIME types allowed.
4. If picture upload is supported via multipart, enforce max file size and image dimension bounds.

## Acceptance Criteria
1. Creator becomes admin on create.
2. Admin can create and revoke invite links.
3. Invitee can accept/decline/undo per validity constraints.
4. Role actions enforce admin invariant.
5. Admin can update family profile fields with validation.
6. Sole-member leave deletes family and related rows.
