# Rollout and Metrics

## Feature Flags
1. `familySharingPhase1`
2. `familySharingPhase2`
3. `familySharingPhase3`

## Rollout Stages
1. Local/dev enablement for implementation validation.
2. Staging rollout with full integration and E2E coverage.
3. Limited production cohort rollout.
4. Full production rollout after metric and error thresholds are met.

## Metrics
1. `family_created`
2. `invite_created`
3. `invite_opened`
4. `invite_accepted`
5. `invite_declined`
6. `invite_revoked`
7. `membership_removed`
8. `membership_left`
9. `family_deleted_via_sole_member_leave`
10. `family_profile_updated`

## Health Indicators
1. Invite acceptance conversion rate.
2. Token invalid/rejected rate.
3. API 4xx/5xx rates by endpoint.
4. Role-management failure rate.

## Operational Response
1. If error or abuse thresholds exceed limits, pause rollout via feature flag.
2. Keep schema additive to avoid emergency rollback migrations.
3. Use event and request correlation IDs for triage.
