# Executive Dashboard Guide

The Executive Command Centre at `/legal/reports/command-centre` is the home
dashboard for legal executives.

## Sections

- **Today's KPIs** — Open matters, outstanding, recovered, recovery %, upcoming hearings, legal costs.
- **Critical Alerts** — Overdue matters, SLA breached, consent breached, escalated items.
- **Overdue Hearings / Overdue Matters / Upcoming Court Dates / Appeals Pending / Consent Orders Breached / High-Risk Employers** — each widget drills into the canonical Legal V1 page.
- **Recovery Performance** — Assessed, monthly collection, legal cost recovery, active consent orders.
- **Recent Exports / Scheduled Reports / Quick Actions** — direct navigation to management surfaces.
- **Recent Activity** — last 12 `lg_case_activity` events, each drilling into the matter workspace.

## Global filters

The `GlobalDashboardFilters` bar at the top writes to the URL query string via
`useDashboardFilters`. Every widget re-queries when the filters change, and every
drilldown carries the filter state forward (Part 3).

## Financial reconciliation

All money figures come from `getExecutiveKpis()` (backed by
`v_lg_case_financials`) and roll-ups of `lg_recoverable_liability`. The Command
Centre never recomputes assessed/paid/outstanding.

## Extending

To add a new widget:

1. Add a `useQuery` call in `ExecutiveCommandCentre.tsx`.
2. Reuse `<Kpi>` for a metric tile or a `<Card>` for a list.
3. Link into an existing Legal V1 route — do not create new engines.
