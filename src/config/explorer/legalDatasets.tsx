/**
 * Legal module — Enterprise Data Explorer dataset descriptors.
 * Every legacy Legal report is expressed as a descriptor consumed by
 * <ExplorerShell />. Each descriptor keeps the analytics + drill logic
 * inline so ExplorerShell is fully generic.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ExplorerDatasetDescriptor, ExplorerServerFilters } from "@/components/explorer/types";
import type { LgColumnDef } from "@/components/legal/grid";
import { Badge } from "@/components/ui/badge";
import { LgStatusBadge } from "@/components/legal/grid";
import { ageBucket, daysBetween } from "@/hooks/legal/useLgReports";

// ---- shared server fetchers ----
async function fetchCases(f: ExplorerServerFilters) {
  let q = supabase.from("lg_case").select("*").order("opened_date", { ascending: false });
  if (f.territory) q = q.eq("country_code", f.territory);
  if (f.officerId) q = q.eq("assigned_legal_officer_id", f.officerId);
  if (f.status) q = q.eq("status_code", f.status);
  if (f.stage) q = q.eq("current_stage_code", f.stage);
  if (f.dateFrom) q = q.gte("opened_date", f.dateFrom);
  if (f.dateTo) q = q.lte("opened_date", f.dateTo);
  const { data, error } = await q.limit(2000);
  if (error) throw error;
  return data || [];
}
async function fetchHearings(f: ExplorerServerFilters) {
  let q = supabase.from("lg_hearing").select("*, lg_case:lg_case_id(lg_case_no, country_code, assigned_legal_officer_id, status_code, current_stage_code)");
  if (f.dateFrom) q = q.gte("scheduled_date", f.dateFrom);
  if (f.dateTo) q = q.lte("scheduled_date", f.dateTo);
  const { data, error } = await q.limit(2000);
  if (error) throw error;
  let rows = (data || []) as any[];
  if (f.territory) rows = rows.filter((r) => r.lg_case?.country_code === f.territory);
  if (f.officerId) rows = rows.filter((r) => r.lg_case?.assigned_legal_officer_id === f.officerId);
  if (f.status) rows = rows.filter((r) => r.lg_case?.status_code === f.status);
  return rows.map((r) => ({ ...r, lg_case_no: r.lg_case?.lg_case_no, territory: r.lg_case?.country_code }));
}
async function fetchOrders(f: ExplorerServerFilters) {
  let q = supabase.from("lg_order").select("*, lg_case:lg_case_id(lg_case_no, country_code, assigned_legal_officer_id, status_code)");
  if (f.dateFrom) q = q.gte("order_date", f.dateFrom);
  if (f.dateTo) q = q.lte("order_date", f.dateTo);
  const { data, error } = await q.limit(2000);
  if (error) throw error;
  let rows = (data || []) as any[];
  if (f.territory) rows = rows.filter((r) => r.lg_case?.country_code === f.territory);
  if (f.officerId) rows = rows.filter((r) => r.lg_case?.assigned_legal_officer_id === f.officerId);
  return rows.map((r) => ({ ...r, lg_case_no: r.lg_case?.lg_case_no, territory: r.lg_case?.country_code }));
}
async function fetchTasks(f: ExplorerServerFilters) {
  let q = supabase.from("lg_case_task").select("*, lg_case:lg_case_id(lg_case_no, country_code, assigned_legal_officer_id, status_code, current_stage_code)");
  if (f.dateFrom) q = q.gte("due_date", f.dateFrom);
  if (f.dateTo) q = q.lte("due_date", f.dateTo);
  const { data, error } = await q.limit(2000);
  if (error) throw error;
  let rows = (data || []) as any[];
  if (f.territory) rows = rows.filter((r) => r.lg_case?.country_code === f.territory);
  if (f.officerId) rows = rows.filter((r) => r.lg_case?.assigned_legal_officer_id === f.officerId);
  if (f.status) rows = rows.filter((r) => r.lg_case?.status_code === f.status);
  return rows.map((r) => ({ ...r, lg_case_no: r.lg_case?.lg_case_no, territory: r.lg_case?.country_code }));
}
async function fetchIntake(f: ExplorerServerFilters) {
  let q = supabase.from("lg_case_intake").select("*");
  if (f.territory) q = q.eq("country_code", f.territory);
  if (f.dateFrom) q = q.gte("submitted_at", f.dateFrom);
  if (f.dateTo) q = q.lte("submitted_at", f.dateTo);
  const { data, error } = await q.limit(2000);
  if (error) throw error;
  return data || [];
}
async function fetchArrangementLinks(f: ExplorerServerFilters) {
  const { data, error } = await supabase.from("lg_payment_arrangement_link")
    .select("*, lg_case:lg_case_id(lg_case_no, country_code, assigned_legal_officer_id, status_code)")
    .limit(2000);
  if (error) throw error;
  let rows = (data || []) as any[];
  if (f.territory) rows = rows.filter((r) => r.lg_case?.country_code === f.territory);
  if (f.officerId) rows = rows.filter((r) => r.lg_case?.assigned_legal_officer_id === f.officerId);
  return rows.map((r) => ({
    ...r, lg_case_no: r.lg_case?.lg_case_no, territory: r.lg_case?.country_code,
    recovery_pct: Number(r.principal_amount || 0) > 0 ? (Number(r.total_paid || 0) / Number(r.principal_amount)) * 100 : 0,
  }));
}

// ---- shared common columns ----
const caseNoLink: LgColumnDef<any> = {
  accessorKey: "lg_case_no", header: "Case No",
  meta: { label: "Case No", pinLeft: true },
  cell: ({ row, getValue }) => (
    <a href={`/legal/lg/cases/${row.original.lg_case_id || row.original.id}`} className="text-primary hover:underline">
      {(getValue() as string) || "-"}
    </a>
  ),
};

const brdc = (tail: string) => [
  { label: "Legal Management", href: "/legal/dashboard" },
  { label: "Explorer", href: "/legal/reports" },
  { label: tail },
];

// ========================================================================
// 1. CASES BY STAGE
// ========================================================================
export const casesByStageDataset: ExplorerDatasetDescriptor<any> = {
  key: "lg.casesByStage",
  title: "Cases by Stage",
  subtitle: "Interactive caseload analytics by workflow stage",
  module: "legal",
  breadcrumbs: brdc("Cases by Stage"),
  queryKey: ["lg-explorer-cases-by-stage"],
  fetcher: fetchCases,
  rowKey: "id",
  serverFilterFields: ["dateRange", "territory", "officer", "status", "stage"],
  aiInsights: true, scheduling: true, savedViews: true,
  rowNavigate: (r) => `/legal/lg/cases/${r.id}`,
  columns: [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true },
      cell: ({ row, getValue }) => <a href={`/legal/lg/cases/${row.original.id}`} className="text-primary hover:underline">{getValue() as string}</a> },
    { accessorKey: "current_stage_code", header: "Stage", meta: { label: "Stage" } },
    { accessorKey: "status_code", header: "Status", meta: { label: "Status" }, cell: ({ getValue }) => <LgStatusBadge status={(getValue() as string) || "-"} /> },
    { accessorKey: "country_code", header: "Territory", meta: { label: "Territory" } },
    { accessorKey: "claim_amount", header: "Claim", meta: { label: "Claim", align: "right" },
      cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "opened_date", header: "Opened", meta: { label: "Opened" } },
    { accessorKey: "next_action_due_date", header: "Next Action Due", meta: { label: "Next Action Due" } },
  ],
  kanban: { groupBy: "current_stage_code", titleField: "lg_case_no", subtitleField: "status_code" },
  timeline: { dateField: "opened_date", titleField: "lg_case_no" },
  kpis: [
    { id: "total", label: "Total Cases", compute: (r) => ({ value: r.length }) },
    { id: "open", label: "Open", tone: "info", compute: (r) => ({ value: r.filter((x: any) => x.status_code !== "CLOSED").length }) },
    { id: "closed", label: "Closed", tone: "success", compute: (r) => ({ value: r.filter((x: any) => x.status_code === "CLOSED").length }) },
    { id: "claim", label: "Total Claim", format: "currency", compute: (r) => ({ value: r.reduce((s: number, x: any) => s + Number(x.claim_amount || 0), 0) }) },
  ],
  charts: [
    { id: "byStage", title: "By Stage", type: "bar", dimension: "current_stage_code", measure: { agg: "count" }, crossFilterField: "current_stage_code" },
    { id: "byStatus", title: "By Status", type: "donut", dimension: "status_code", measure: { agg: "count" }, crossFilterField: "status_code" },
  ],
};

// ========================================================================
// 2. CASES BY OFFICER
// ========================================================================
export const casesByOfficerDataset: ExplorerDatasetDescriptor<any> = {
  key: "lg.casesByOfficer",
  title: "Cases by Officer",
  subtitle: "Workload distribution across legal officers",
  module: "legal",
  breadcrumbs: brdc("Cases by Officer"),
  queryKey: ["lg-explorer-cases-by-officer"],
  fetcher: fetchCases,
  rowKey: "id",
  serverFilterFields: ["dateRange", "territory", "officer", "status"],
  aiInsights: true, scheduling: true, savedViews: true,
  rowNavigate: (r) => `/legal/lg/cases/${r.id}`,
  columns: [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true } },
    { accessorKey: "assigned_legal_officer_id", header: "Officer ID", meta: { label: "Officer" } },
    { accessorKey: "current_stage_code", header: "Stage", meta: { label: "Stage" } },
    { accessorKey: "status_code", header: "Status", meta: { label: "Status" } },
    { accessorKey: "country_code", header: "Territory", meta: { label: "Territory" } },
    { accessorKey: "claim_amount", header: "Claim", meta: { label: "Claim", align: "right" }, cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "opened_date", header: "Opened", meta: { label: "Opened" } },
  ],
  kanban: { groupBy: "assigned_legal_officer_id", titleField: "lg_case_no", subtitleField: "current_stage_code" },
  kpis: [
    { id: "unique", label: "Officers", compute: (r) => ({ value: new Set(r.map((x: any) => x.assigned_legal_officer_id).filter(Boolean)).size }) },
    { id: "unassigned", label: "Unassigned", tone: "warning", compute: (r) => ({ value: r.filter((x: any) => !x.assigned_legal_officer_id).length }) },
    { id: "avg", label: "Avg per officer", compute: (r) => {
      const groups = new Map<string, number>();
      r.forEach((x: any) => { const k = x.assigned_legal_officer_id || "__un"; groups.set(k, (groups.get(k) || 0) + 1); });
      const vals = Array.from(groups.values()); return { value: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0 };
    }},
  ],
  charts: [
    { id: "byOfficer", title: "Caseload per Officer", type: "bar", dimension: "assigned_legal_officer_id", measure: { agg: "count" }, limit: 15, crossFilterField: "assigned_legal_officer_id" },
  ],
};

// ========================================================================
// 3. CASES BY TERRITORY
// ========================================================================
export const casesByTerritoryDataset: ExplorerDatasetDescriptor<any> = {
  key: "lg.casesByTerritory",
  title: "Cases by Territory",
  subtitle: "Geographic distribution and workload",
  module: "legal",
  breadcrumbs: brdc("Cases by Territory"),
  queryKey: ["lg-explorer-cases-by-territory"],
  fetcher: fetchCases,
  rowKey: "id",
  serverFilterFields: ["dateRange", "territory", "status"],
  aiInsights: true, scheduling: true, savedViews: true,
  rowNavigate: (r) => `/legal/lg/cases/${r.id}`,
  columns: [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true } },
    { accessorKey: "country_code", header: "Territory", meta: { label: "Territory" } },
    { accessorKey: "current_stage_code", header: "Stage", meta: { label: "Stage" } },
    { accessorKey: "status_code", header: "Status", meta: { label: "Status" } },
    { accessorKey: "claim_amount", header: "Claim", meta: { label: "Claim", align: "right" }, cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "opened_date", header: "Opened", meta: { label: "Opened" } },
  ],
  kpis: [
    { id: "territories", label: "Territories", compute: (r) => ({ value: new Set(r.map((x: any) => x.country_code).filter(Boolean)).size }) },
    { id: "totalClaim", label: "Total Claim", format: "currency", compute: (r) => ({ value: r.reduce((s: number, x: any) => s + Number(x.claim_amount || 0), 0) }) },
  ],
  charts: [
    { id: "byTerritory", title: "Cases per Territory", type: "bar", dimension: "country_code", measure: { agg: "count" }, crossFilterField: "country_code" },
    { id: "claimByTerritory", title: "Claim Value per Territory", type: "bar", dimension: "country_code", measure: { agg: "sum", field: "claim_amount" } },
  ],
};

// ========================================================================
// 4. AGEING REPORT
// ========================================================================
export const ageingDataset: ExplorerDatasetDescriptor<any> = {
  key: "lg.ageing",
  title: "Ageing Report",
  subtitle: "Open cases bucketed by age since opened",
  module: "legal",
  breadcrumbs: brdc("Ageing"),
  queryKey: ["lg-explorer-ageing"],
  fetcher: async (f) => (await fetchCases(f))
    .filter((c: any) => c.status_code !== "CLOSED")
    .map((c: any) => ({ ...c, age_bucket: ageBucket(c.opened_date), age_days: daysBetween(c.opened_date) })),
  rowKey: "id",
  serverFilterFields: ["territory", "officer", "stage"],
  aiInsights: true, scheduling: true, savedViews: true,
  rowNavigate: (r) => `/legal/lg/cases/${r.id}`,
  columns: [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true } },
    { accessorKey: "age_bucket", header: "Age Bucket", meta: { label: "Age Bucket" } },
    { accessorKey: "age_days", header: "Days Open", meta: { label: "Days Open", align: "right" } },
    { accessorKey: "current_stage_code", header: "Stage", meta: { label: "Stage" } },
    { accessorKey: "status_code", header: "Status", meta: { label: "Status" } },
    { accessorKey: "country_code", header: "Territory", meta: { label: "Territory" } },
    { accessorKey: "opened_date", header: "Opened", meta: { label: "Opened" } },
  ],
  kpis: [
    { id: "avgAge", label: "Avg Age", format: "duration", compute: (r) => ({ value: r.length ? Math.round(r.reduce((s: number, x: any) => s + x.age_days, 0) / r.length) : 0 }) },
    { id: "over365", label: "> 365d", tone: "danger", compute: (r) => ({ value: r.filter((x: any) => x.age_days > 365).length }) },
    { id: "over180", label: "> 180d", tone: "warning", compute: (r) => ({ value: r.filter((x: any) => x.age_days > 180).length }) },
  ],
  charts: [
    { id: "buckets", title: "Ageing Buckets", type: "bar", dimension: "age_bucket", measure: { agg: "count" }, crossFilterField: "age_bucket" },
    { id: "byStage", title: "Age vs Stage", type: "bar", dimension: "current_stage_code", measure: { agg: "avg", field: "age_days" } },
  ],
};

// ========================================================================
// 5. OVERDUE HEARINGS
// ========================================================================
export const overdueHearingsDataset: ExplorerDatasetDescriptor<any> = {
  key: "lg.overdueHearings",
  title: "Overdue Hearings",
  subtitle: "Scheduled hearings past due date, not closed",
  module: "legal",
  breadcrumbs: brdc("Overdue Hearings"),
  queryKey: ["lg-explorer-overdue-hearings"],
  fetcher: async (f) => {
    const today = new Date().toISOString().slice(0, 10);
    return (await fetchHearings(f))
      .filter((h: any) => h.scheduled_date && h.scheduled_date < today && !["COMPLETED", "CANCELLED", "ADJOURNED_DONE"].includes(h.status_code || ""))
      .map((h: any) => ({ ...h, days_overdue: Math.floor((Date.now() - new Date(h.scheduled_date).getTime()) / 86_400_000) }));
  },
  rowKey: "id",
  serverFilterFields: ["dateRange", "territory", "officer"],
  aiInsights: true, scheduling: true, savedViews: true,
  rowNavigate: (r) => `/legal/lg/cases/${r.lg_case_id}`,
  columns: [
    caseNoLink,
    { accessorKey: "hearing_type_code", header: "Type", meta: { label: "Type" } },
    { accessorKey: "scheduled_date", header: "Scheduled", meta: { label: "Scheduled" } },
    { accessorKey: "days_overdue", header: "Days Overdue", meta: { label: "Days Overdue", align: "right" },
      cell: ({ getValue }) => <Badge variant="destructive">{getValue() as number}</Badge> },
    { accessorKey: "status_code", header: "Status", meta: { label: "Status" } },
    { accessorKey: "court_name", header: "Court", meta: { label: "Court" } },
    { accessorKey: "territory", header: "Territory", meta: { label: "Territory" } },
  ],
  timeline: { dateField: "scheduled_date", titleField: "hearing_type_code" },
  kpis: [
    { id: "total", label: "Overdue", tone: "danger", compute: (r) => ({ value: r.length }) },
    { id: "avg", label: "Avg days overdue", format: "duration", compute: (r) => ({ value: r.length ? Math.round(r.reduce((s: number, x: any) => s + (x.days_overdue || 0), 0) / r.length) : 0 }) },
    { id: "critical", label: "> 30d overdue", tone: "danger", compute: (r) => ({ value: r.filter((x: any) => x.days_overdue > 30).length }) },
  ],
  charts: [
    { id: "byType", title: "By Type", type: "bar", dimension: "hearing_type_code", measure: { agg: "count" }, crossFilterField: "hearing_type_code" },
    { id: "byTerritory", title: "By Territory", type: "donut", dimension: "territory", measure: { agg: "count" }, crossFilterField: "territory" },
  ],
};

// ========================================================================
// 6. SLA BREACH REPORT
// ========================================================================
export const slaBreachDataset: ExplorerDatasetDescriptor<any> = {
  key: "lg.slaBreach",
  title: "SLA Breach Report",
  subtitle: "Tasks overdue, at-risk or escalated",
  module: "legal",
  breadcrumbs: brdc("SLA Breach"),
  queryKey: ["lg-explorer-sla-breach"],
  fetcher: async (f) => (await fetchTasks(f))
    .filter((t: any) => ["OVERDUE", "ESCALATED", "AT_RISK"].includes(t.sla_status || "") || (t.due_date && t.due_date < new Date().toISOString().slice(0, 10) && t.status !== "COMPLETED"))
    .map((t: any) => ({ ...t, overdue_days: t.due_date ? Math.max(0, Math.floor((Date.now() - new Date(t.due_date).getTime()) / 86_400_000)) : 0 })),
  rowKey: "id",
  serverFilterFields: ["dateRange", "territory", "officer", "status"],
  aiInsights: true, scheduling: true, savedViews: true,
  rowNavigate: (r) => `/legal/lg/cases/${r.lg_case_id}`,
  columns: [
    caseNoLink,
    { accessorKey: "title", header: "Task", meta: { label: "Task" } },
    { accessorKey: "sla_status", header: "SLA", meta: { label: "SLA" },
      cell: ({ getValue }) => <Badge variant={getValue() === "ESCALATED" ? "destructive" : "secondary"}>{(getValue() as string) || "-"}</Badge> },
    { accessorKey: "escalation_level", header: "Esc Lvl", meta: { label: "Esc Lvl", align: "right" } },
    { accessorKey: "due_date", header: "Due", meta: { label: "Due" } },
    { accessorKey: "overdue_days", header: "Days Over", meta: { label: "Days Over", align: "right" } },
    { accessorKey: "status", header: "Status", meta: { label: "Status" } },
    { accessorKey: "territory", header: "Territory", meta: { label: "Territory" } },
  ],
  kanban: { groupBy: "sla_status", titleField: "title", subtitleField: "lg_case_no" },
  kpis: [
    { id: "total", label: "Breached", tone: "danger", compute: (r) => ({ value: r.length }) },
    { id: "esc", label: "Escalated", tone: "danger", compute: (r) => ({ value: r.filter((x: any) => x.sla_status === "ESCALATED").length }) },
    { id: "atrisk", label: "At risk", tone: "warning", compute: (r) => ({ value: r.filter((x: any) => x.sla_status === "AT_RISK").length }) },
    { id: "avg", label: "Avg days over", format: "duration", compute: (r) => ({ value: r.length ? Math.round(r.reduce((s: number, x: any) => s + (x.overdue_days || 0), 0) / r.length) : 0 }) },
  ],
  charts: [
    { id: "bySla", title: "By SLA state", type: "donut", dimension: "sla_status", measure: { agg: "count" }, crossFilterField: "sla_status" },
    { id: "byOfficer", title: "By assignee", type: "bar", dimension: "assigned_to", measure: { agg: "count" }, limit: 12 },
  ],
};

// ========================================================================
// 7. RECOVERY REPORT
// ========================================================================
export const recoveryDataset: ExplorerDatasetDescriptor<any> = {
  key: "lg.recovery",
  title: "Recovery Report",
  subtitle: "Payment arrangement linkage, recovery % and outstanding",
  module: "legal",
  breadcrumbs: brdc("Recovery"),
  queryKey: ["lg-explorer-recovery"],
  fetcher: fetchArrangementLinks,
  rowKey: "id",
  serverFilterFields: ["territory", "officer"],
  aiInsights: true, scheduling: true, savedViews: true,
  rowNavigate: (r) => `/legal/lg/cases/${r.lg_case_id}`,
  columns: [
    caseNoLink,
    { accessorKey: "principal_amount", header: "Principal", meta: { label: "Principal", align: "right" }, cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "interest_amount", header: "Interest", meta: { label: "Interest", align: "right" }, cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "penalty_amount", header: "Penalties", meta: { label: "Penalties", align: "right" }, cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "court_cost_amount", header: "Court Cost", meta: { label: "Court Cost", align: "right" }, cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "total_paid", header: "Paid", meta: { label: "Paid", align: "right" }, cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "outstanding_amount", header: "Outstanding", meta: { label: "Outstanding", align: "right" }, cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "recovery_pct", header: "Recovery %", meta: { label: "Recovery %", align: "right" },
      cell: ({ getValue }) => `${Number(getValue() || 0).toFixed(1)}%` },
    { accessorKey: "missed_installments", header: "Missed", meta: { label: "Missed", align: "right" } },
    { accessorKey: "territory", header: "Territory", meta: { label: "Territory" } },
  ],
  kpis: [
    { id: "principal", label: "Total Principal", format: "currency", compute: (r) => ({ value: r.reduce((s: number, x: any) => s + Number(x.principal_amount || 0), 0) }) },
    { id: "paid", label: "Total Paid", format: "currency", tone: "success", compute: (r) => ({ value: r.reduce((s: number, x: any) => s + Number(x.total_paid || 0), 0) }) },
    { id: "outstanding", label: "Outstanding", format: "currency", tone: "warning", compute: (r) => ({ value: r.reduce((s: number, x: any) => s + Number(x.outstanding_amount || 0), 0) }) },
    { id: "avgRec", label: "Avg Recovery %", format: "percent", compute: (r) => ({ value: r.length ? r.reduce((s: number, x: any) => s + (x.recovery_pct || 0), 0) / r.length / 100 : 0 }) },
    { id: "breached", label: "In breach", tone: "danger", compute: (r) => ({ value: r.filter((x: any) => (x.missed_installments || 0) > 0).length }) },
  ],
  charts: [
    { id: "recoveryPct", title: "Recovery % by Case", type: "bar", dimension: "lg_case_no", measure: { agg: "avg", field: "recovery_pct" }, limit: 15 },
    { id: "byTerritory", title: "Outstanding by Territory", type: "bar", dimension: "territory", measure: { agg: "sum", field: "outstanding_amount" } },
  ],
};

// ========================================================================
// 8. JUDGMENT / ORDER REPORT
// ========================================================================
export const judgmentOrderDataset: ExplorerDatasetDescriptor<any> = {
  key: "lg.judgmentOrder",
  title: "Judgment / Order Report",
  subtitle: "Court orders and judgments issued",
  module: "legal",
  breadcrumbs: brdc("Judgments & Orders"),
  queryKey: ["lg-explorer-judgment-order"],
  fetcher: fetchOrders,
  rowKey: "id",
  serverFilterFields: ["dateRange", "territory", "officer"],
  aiInsights: true, scheduling: true, savedViews: true,
  rowNavigate: (r) => `/legal/lg/cases/${r.lg_case_id}`,
  columns: [
    { accessorKey: "order_no", header: "Order No", meta: { label: "Order No", pinLeft: true } },
    caseNoLink,
    { accessorKey: "order_type_code", header: "Type", meta: { label: "Type" } },
    { accessorKey: "order_date", header: "Order Date", meta: { label: "Order Date" } },
    { accessorKey: "compliance_date", header: "Comply By", meta: { label: "Comply By" } },
    { accessorKey: "amount_ordered", header: "Amount", meta: { label: "Amount", align: "right" }, cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "status_code", header: "Status", meta: { label: "Status" }, cell: ({ getValue }) => <LgStatusBadge status={(getValue() as string) || "-"} /> },
    { accessorKey: "court_name", header: "Court", meta: { label: "Court" } },
    { accessorKey: "territory", header: "Territory", meta: { label: "Territory" } },
  ],
  timeline: { dateField: "order_date", titleField: "order_no" },
  kpis: [
    { id: "total", label: "Orders", compute: (r) => ({ value: r.length }) },
    { id: "amount", label: "Total Ordered", format: "currency", compute: (r) => ({ value: r.reduce((s: number, x: any) => s + Number(x.amount_ordered || 0), 0) }) },
    { id: "pending", label: "Pending Compliance", tone: "warning",
      compute: (r) => { const today = new Date().toISOString().slice(0, 10);
        return { value: r.filter((x: any) => x.compliance_date && x.compliance_date >= today).length }; } },
  ],
  charts: [
    { id: "byType", title: "By Type", type: "donut", dimension: "order_type_code", measure: { agg: "count" }, crossFilterField: "order_type_code" },
    { id: "byCourt", title: "By Court", type: "bar", dimension: "court_name", measure: { agg: "count" }, limit: 10 },
  ],
};

// ========================================================================
// 9. REFERRAL SOURCE REPORT
// ========================================================================
export const referralSourceDataset: ExplorerDatasetDescriptor<any> = {
  key: "lg.referralSource",
  title: "Referral Source Report",
  subtitle: "Intake volume, conversion and exposure by source",
  module: "legal",
  breadcrumbs: brdc("Referral Source"),
  queryKey: ["lg-explorer-referral-source"],
  fetcher: fetchIntake,
  rowKey: "id",
  serverFilterFields: ["dateRange", "territory"],
  aiInsights: true, scheduling: true, savedViews: true,
  columns: [
    { accessorKey: "reference_no", header: "Ref No", meta: { label: "Ref No", pinLeft: true } },
    { accessorKey: "source_module", header: "Source Module", meta: { label: "Source Module" } },
    { accessorKey: "source_type", header: "Source Type", meta: { label: "Source Type" } },
    { accessorKey: "intake_status", header: "Status", meta: { label: "Status" } },
    { accessorKey: "exposure_amount", header: "Exposure", meta: { label: "Exposure", align: "right" }, cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
    { accessorKey: "country_code", header: "Territory", meta: { label: "Territory" } },
    { accessorKey: "submitted_at", header: "Submitted", meta: { label: "Submitted" } },
  ],
  kpis: [
    { id: "total", label: "Intake Total", compute: (r) => ({ value: r.length }) },
    { id: "sources", label: "Sources", compute: (r) => ({ value: new Set(r.map((x: any) => x.source_module).filter(Boolean)).size }) },
    { id: "exposure", label: "Total Exposure", format: "currency", compute: (r) => ({ value: r.reduce((s: number, x: any) => s + Number(x.exposure_amount || 0), 0) }) },
    { id: "accepted", label: "Accepted", tone: "success", compute: (r) => ({ value: r.filter((x: any) => ["ACCEPTED", "CONVERTED"].includes((x.intake_status || "").toUpperCase())).length }) },
    { id: "rejected", label: "Rejected", tone: "danger", compute: (r) => ({ value: r.filter((x: any) => (x.intake_status || "").toUpperCase() === "REJECTED").length }) },
  ],
  charts: [
    { id: "bySource", title: "By Source Module", type: "bar", dimension: "source_module", measure: { agg: "count" }, crossFilterField: "source_module" },
    { id: "byStatus", title: "By Status", type: "donut", dimension: "intake_status", measure: { agg: "count" }, crossFilterField: "intake_status" },
  ],
};

// ========================================================================
// 10. CLOSED CASES REPORT
// ========================================================================
export const closedCasesDataset: ExplorerDatasetDescriptor<any> = {
  key: "lg.closedCases",
  title: "Closed Cases Report",
  subtitle: "Closed cases with duration and closure reason",
  module: "legal",
  breadcrumbs: brdc("Closed Cases"),
  queryKey: ["lg-explorer-closed-cases"],
  fetcher: async (f) => {
    const rows = await fetchCases({ ...f, status: "CLOSED" });
    return rows.map((c: any) => ({ ...c, duration_days: c.opened_date && c.closed_date ? daysBetween(c.opened_date, c.closed_date) : 0 }));
  },
  rowKey: "id",
  serverFilterFields: ["dateRange", "territory", "officer"],
  aiInsights: true, scheduling: true, savedViews: true,
  rowNavigate: (r) => `/legal/lg/cases/${r.id}`,
  columns: [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true } },
    { accessorKey: "opened_date", header: "Opened", meta: { label: "Opened" } },
    { accessorKey: "closed_date", header: "Closed", meta: { label: "Closed" } },
    { accessorKey: "duration_days", header: "Days Open", meta: { label: "Days Open", align: "right" } },
    { accessorKey: "closure_reason_code", header: "Closure Reason", meta: { label: "Closure Reason" } },
    { accessorKey: "country_code", header: "Territory", meta: { label: "Territory" } },
    { accessorKey: "claim_amount", header: "Claim", meta: { label: "Claim", align: "right" }, cell: ({ getValue }) => `EC$${Number(getValue() || 0).toLocaleString()}` },
  ],
  timeline: { dateField: "closed_date", titleField: "lg_case_no" },
  kpis: [
    { id: "total", label: "Closed", compute: (r) => ({ value: r.length }) },
    { id: "avgDur", label: "Avg Days Open", format: "duration", compute: (r) => ({ value: r.length ? Math.round(r.reduce((s: number, x: any) => s + (x.duration_days || 0), 0) / r.length) : 0 }) },
    { id: "totalClaim", label: "Total Claim", format: "currency", compute: (r) => ({ value: r.reduce((s: number, x: any) => s + Number(x.claim_amount || 0), 0) }) },
  ],
  charts: [
    { id: "byReason", title: "Closure Reasons", type: "donut", dimension: "closure_reason_code", measure: { agg: "count" }, crossFilterField: "closure_reason_code" },
    { id: "avgDur", title: "Avg Duration by Territory", type: "bar", dimension: "country_code", measure: { agg: "avg", field: "duration_days" } },
  ],
};

// ========================================================================
// 11. PENDING ACTION REPORT
// ========================================================================
export const pendingActionDataset: ExplorerDatasetDescriptor<any> = {
  key: "lg.pendingAction",
  title: "Pending Action Report",
  subtitle: "Open cases with next-action pending",
  module: "legal",
  breadcrumbs: brdc("Pending Actions"),
  queryKey: ["lg-explorer-pending-action"],
  fetcher: async (f) => {
    const today = new Date().toISOString().slice(0, 10);
    return (await fetchCases(f))
      .filter((c: any) => c.status_code !== "CLOSED" && (c.next_action || c.next_action_due_date))
      .map((c: any) => ({
        ...c,
        due_in_days: c.next_action_due_date ? Math.floor((new Date(c.next_action_due_date).getTime() - Date.now()) / 86_400_000) : null,
        is_overdue: c.next_action_due_date && c.next_action_due_date < today ? "OVERDUE" : "ON_TIME",
      }));
  },
  rowKey: "id",
  serverFilterFields: ["territory", "officer", "status", "stage"],
  aiInsights: true, scheduling: true, savedViews: true,
  rowNavigate: (r) => `/legal/lg/cases/${r.id}`,
  columns: [
    { accessorKey: "lg_case_no", header: "Case No", meta: { label: "Case No", pinLeft: true } },
    { accessorKey: "next_action", header: "Pending Action", meta: { label: "Pending Action" } },
    { accessorKey: "next_action_due_date", header: "Due Date", meta: { label: "Due Date" } },
    { accessorKey: "due_in_days", header: "Due In (d)", meta: { label: "Due In (d)", align: "right" },
      cell: ({ row, getValue }) => {
        const v = getValue() as number | null;
        if (v === null) return "-";
        if (row.original.is_overdue === "OVERDUE") return <Badge variant="destructive">{v}</Badge>;
        return v;
      } },
    { accessorKey: "current_stage_code", header: "Stage", meta: { label: "Stage" } },
    { accessorKey: "status_code", header: "Status", meta: { label: "Status" } },
    { accessorKey: "country_code", header: "Territory", meta: { label: "Territory" } },
  ],
  timeline: { dateField: "next_action_due_date", titleField: "next_action" },
  kanban: { groupBy: "is_overdue", titleField: "lg_case_no", subtitleField: "next_action" },
  kpis: [
    { id: "total", label: "Pending", compute: (r) => ({ value: r.length }) },
    { id: "overdue", label: "Overdue", tone: "danger", compute: (r) => ({ value: r.filter((x: any) => x.is_overdue === "OVERDUE").length }) },
    { id: "week", label: "Due this week", tone: "warning", compute: (r) => ({ value: r.filter((x: any) => x.due_in_days != null && x.due_in_days >= 0 && x.due_in_days <= 7).length }) },
  ],
  charts: [
    { id: "byStatus", title: "By Overdue State", type: "donut", dimension: "is_overdue", measure: { agg: "count" }, crossFilterField: "is_overdue" },
    { id: "byStage", title: "By Stage", type: "bar", dimension: "current_stage_code", measure: { agg: "count" }, crossFilterField: "current_stage_code" },
  ],
};

// ========================================================================
export const LEGAL_DATASETS: Record<string, ExplorerDatasetDescriptor<any>> = {
  casesByStage: casesByStageDataset,
  casesByOfficer: casesByOfficerDataset,
  casesByTerritory: casesByTerritoryDataset,
  ageing: ageingDataset,
  overdueHearings: overdueHearingsDataset,
  slaBreach: slaBreachDataset,
  recovery: recoveryDataset,
  judgmentOrder: judgmentOrderDataset,
  referralSource: referralSourceDataset,
  closedCases: closedCasesDataset,
  pendingAction: pendingActionDataset,
};
