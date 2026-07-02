# Command Centre Dashboard — Phase 12

Live dashboard at `/legal/lg/dashboard` (`LegalDashboard`) replaces the
static SSB dashboard. Every widget is a `useQuery` against live tables and
deep-links into a pre-filtered Explorer view or Workbench bucket.

## Widgets

| Widget | Data source | Deep-link |
|--------|-------------|-----------|
| My Urgent Work | `lg_case_task` where assignee = me AND sla_status IN (AT_RISK, OVERDUE, ESCALATED) | `/legal/lg/tasks?view=mine` |
| Active Matters | `lg_case` non-terminal statuses | `/legal/lg/recovery?bucket=active` |
| Outstanding Recovery | Σ `lg_case.outstanding_amount_snapshot` | `/legal/reports/lg/recovery` |
| Recovered MTD / YTD | `core_payment_allocation` joined via `lg_payment_arrangement_link` | `/legal/reports/lg/recovery?range=mtd` |
| Recovery % | `lgRecoveryService.getPortfolioRecoveryPct` | Explorer drill |
| Overdue Matters | `lg_case` where `next_hearing_date < now` OR `sla_breached` | `/legal/lg/cases?filter=overdue` |
| SLA Breached | `lg_case_task.sla_status = 'BREACHED'` | `/legal/lg/tasks?view=team&sla=breached` |
| Hearings This Week | `lg_hearing.scheduled_at` between week bounds | `/legal/lg/hearings?range=week` |
| Orders Awaiting Compliance | `lg_order.status IN (GRANTED, ACTIVE)` past `compliance_date` | `/legal/court-orders?filter=awaiting` |
| Breached Arrangements | `lg_payment_arrangement_link.status = 'BREACHED'` | `/legal/reports/lg/arrangement-breach` |
| Officer Workload | `lg_case` grouped by `assigned_officer_code` | `/legal/reports/lg/cases-by-officer` |
| Matters by Territory | `lg_case` grouped by `territory_code` | `/legal/reports/lg/cases-by-territory` |
| Ageing Buckets | `lg_case.opened_at` bucketed | `/legal/reports/lg/ageing` |
| Recent Activity | `lg_case_activity` last 20 events | Case 360 timeline |

## Rules

- No hardcoded values or seed rows.
- Every widget: loading spinner, empty state, permission gate
  (`useLegalCapability`).
- Every widget refreshes on Supabase realtime channels
  (`lg_case`, `lg_case_task`, `lg_hearing`, `lg_order`,
  `lg_payment_arrangement_link`).
