# Phase 2: Recipe Sharing Model

## Objective
Introduce family-aware recipe access while preserving backward compatibility and existing ownership behavior.

## In Scope
1. Add recipe visibility modes with a default that preserves current behavior.
2. Support linking recipes to one or more families.
3. Enforce membership-based access in list/detail APIs.
4. Update recipe create/edit UI to configure family sharing.
5. Add family-context recipe views where applicable.

## Proposed Model
1. Visibility enum (initial): `private`, `family`.
2. Family linkage table for many-to-many recipe-family relations.
3. Existing recipes default to `private` after migration.

## Access Rules
1. Owner can always manage own recipes.
2. `private`: visible to owner only.
3. `family`: visible to members of linked family/families.
4. Non-members receive forbidden/not-found behavior per endpoint contract.

## Compatibility
1. Additive schema changes only.
2. No destructive backfill.
3. Existing route behavior remains unchanged for private recipes.

## Acceptance Criteria
1. Members can view family-shared recipes they are entitled to.
2. Non-members cannot access family-shared recipes.
3. Owner controls remain intact.
4. Migration preserves existing data and routes.
