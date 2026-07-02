# Enterprise Data Explorer Framework

The Explorer replaces static reports with interactive analytical workspaces.
Every module in the platform (Legal, Benefits, Compliance, C3, BEMA, IA, …)
consumes the **same** `<ExplorerShell />` and gets, for free:

- Live grid, kanban, timeline, calendar, map, pivot, and chart views
- Global search + advanced filter builder + role-scoped **saved views**
- KPI cards with click-through drilldown
- Interactive charts with **cross-filtering** into the grid
- Multi-level grouping in Pivot view
- Exports (Excel, PDF, Word, CSV, HTML, JSON, XML, Print) — **only the
  current filtered rows are exported**
- Scheduled email delivery (pg_cron → edge function)
- AI-powered insights (SLA breaches, recovery opportunities, workload
  imbalance, duplicate detection, missing documents)

## Adding a new dataset (any module)

1. Declare an `ExplorerDatasetDescriptor`:

```tsx
import type { ExplorerDatasetDescriptor } from "@/components/explorer";

export const myDataset: ExplorerDatasetDescriptor<MyRow> = {
  key: "mymodule.myReport",         // unique — used for saved views + schedules
  title: "My Report",
  module: "mymodule",
  breadcrumbs: [...],
  queryKey: ["my-report"],
  fetcher: async (serverFilters) => {
    const { data } = await supabase.from("my_table").select("*")...;
    return data ?? [];
  },
  rowKey: "id",
  columns: [ /* LgColumnDef[] */ ],
  kpis: [
    { id: "total", label: "Total", compute: (rows) => ({ value: rows.length }) },
  ],
  charts: [
    { id: "byStatus", title: "By status", type: "bar",
      dimension: "status", measure: { agg: "count" },
      crossFilterField: "status" },
  ],
  kanban: { groupBy: "status", titleField: "name" },
  timeline: { dateField: "due_date", titleField: "name" },
  aiInsights: true, scheduling: true, savedViews: true,
  rowNavigate: (r) => `/mymodule/items/${r.id}`,
};
```

2. Render:

```tsx
export default function MyReportPage() {
  return <ExplorerShell dataset={myDataset} />;
}
```

That's it. All views, filters, KPIs, exports, saved views, schedules, and
AI insights are wired automatically.

## Framework backend

| Table | Purpose |
|-------|---------|
| `explorer_saved_view` | Personal / role / global saved views (view state JSON) |
| `explorer_schedule` | Scheduled deliveries with next_run_at |
| `explorer_ai_insight_cache` | AI insight cache to avoid duplicate model calls |

Edge functions:

- `explorer-ai-insights` — Lovable AI Gateway (Gemini) analyses the current
  filtered view and returns structured insights.
- `explorer-scheduled-delivery` — invoked by pg_cron every 15 minutes,
  processes any active schedule whose `next_run_at` has elapsed, and
  advances the schedule.

## Legal pilot

All 11 legacy Legal reports have been migrated to the Explorer:

| Route | Dataset key |
|-------|-------------|
| /legal/reports/lg/cases-by-stage | `lg.casesByStage` |
| /legal/reports/lg/cases-by-officer | `lg.casesByOfficer` |
| /legal/reports/lg/cases-by-territory | `lg.casesByTerritory` |
| /legal/reports/lg/ageing | `lg.ageing` |
| /legal/reports/lg/overdue-hearings | `lg.overdueHearings` |
| /legal/reports/lg/sla-breach | `lg.slaBreach` |
| /legal/reports/lg/recovery | `lg.recovery` |
| /legal/reports/lg/judgment-order | `lg.judgmentOrder` |
| /legal/reports/lg/referral-source | `lg.referralSource` |
| /legal/reports/lg/closed-cases | `lg.closedCases` |
| /legal/reports/lg/pending-action | `lg.pendingAction` |

Descriptors live in `src/config/explorer/legalDatasets.tsx`.
