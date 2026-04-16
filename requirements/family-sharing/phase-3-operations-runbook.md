# Phase 3 Operations Runbook

## Feature Flag
- Phase 3 controls are gated by `FEATURE_FAMILY_SHARING_PHASE3` (fallback: `familySharingPhase3`).
- Enabled values: `1`, `true`, `yes`, `on` (case-insensitive).
- If unset, defaults to enabled.

## Dashboard Queries (SQLite)

### Funnel (last 24h)
```sql
SELECT metric_name, COUNT(*) AS total
FROM MetricEvent
WHERE created_at >= datetime('now', '-1 day')
GROUP BY metric_name
ORDER BY metric_name;
```

### Invite conversion (opened -> accepted, last 24h)
```sql
WITH opened AS (
  SELECT COUNT(*) AS c
  FROM MetricEvent
  WHERE metric_name = 'invite_opened'
    AND status_code = 200
    AND created_at >= datetime('now', '-1 day')
),
accepted AS (
  SELECT COUNT(*) AS c
  FROM MetricEvent
  WHERE metric_name = 'invite_accepted'
    AND status_code = 200
    AND created_at >= datetime('now', '-1 day')
)
SELECT opened.c AS opened_count,
       accepted.c AS accepted_count,
       CASE WHEN opened.c = 0 THEN 0.0 ELSE ROUND((accepted.c * 1.0 / opened.c) * 100, 2) END AS accepted_pct
FROM opened, accepted;
```

### Token invalid/rejected rate (last 24h)
```sql
SELECT COUNT(*) AS rejected_count
FROM MetricEvent
WHERE metric_name = 'invite_opened'
  AND status_code >= 400
  AND created_at >= datetime('now', '-1 day');
```

### Role/membership changes audit trail (latest 100)
```sql
SELECT created_at, event_type, actor_user_id, family_id, target_user_id, old_role, new_role, request_id
FROM FamilyAuditEvent
ORDER BY created_at DESC
LIMIT 100;
```

## Alert Thresholds
- Invite probing alert: `invite_opened` with `status_code >= 400` over 200/hour.
- API error spike alert: any `metric_name` with `status_code >= 500` over 50/hour.
- Role-management failures alert: `ADMIN_INVARIANT_VIOLATION` responses over 20/hour.

## Response Procedure
1. Set `FEATURE_FAMILY_SHARING_PHASE3=false` to pause Phase 3 controls if instability appears.
2. Inspect `request_id` from failing responses and trace related rows in `MetricEvent` and `FamilyAuditEvent`.
3. Validate whether failures are abuse-driven (429 spikes) or regression-driven (500 spikes).
4. Re-enable Phase 3 only after error and abuse rates are below thresholds for two consecutive hours.
