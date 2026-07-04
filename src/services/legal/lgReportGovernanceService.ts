/**
 * EPIC-09C — Legal Report Governance Service
 *
 * CRUD + query layer for:
 *   Part 6  — Export Centre (lg_report_export_audit)
 *   Part 7  — Subscription enhancements (lg_scheduled_report + pause/clone/retry)
 *   Part 8  — Shared dashboards (lg_shared_dashboard)
 *   Part 9  — Report certification (lg_report_certification)
 *   Part 11 — Performance metrics (lg_report_performance_metric)
 *   Part 12 — Enterprise audit (lg_report_audit_event)
 *
 * Never mutates financial data or duplicates reporting logic.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

// ============================================================================
// Part 12 — Enterprise audit
// ============================================================================
export type LegalReportAuditEvent =
  | "dashboard_view" | "report_open" | "export" | "print" | "email"
  | "schedule_create" | "schedule_delete" | "dashboard_share"
  | "dashboard_modify" | "filter_change" | "drilldown" | "certification_change";

export async function recordReportAudit(input: {
  event_type: LegalReportAuditEvent;
  report_code?: string;
  dashboard_id?: string;
  target_user_id?: string;
  metadata?: Record<string, any>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await sb.from("lg_report_audit_event").insert({
    event_type: input.event_type,
    report_code: input.report_code ?? null,
    dashboard_id: input.dashboard_id ?? null,
    actor_user_id: user.id,
    target_user_id: input.target_user_id ?? null,
    metadata_json: input.metadata ?? {},
  });
}

export async function listReportAudit(params: { limit?: number; event_type?: LegalReportAuditEvent; report_code?: string } = {}) {
  let q = sb.from("lg_report_audit_event").select("*").order("occurred_at", { ascending: false }).limit(params.limit ?? 200);
  if (params.event_type) q = q.eq("event_type", params.event_type);
  if (params.report_code) q = q.eq("report_code", params.report_code);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ============================================================================
// Part 11 — Performance metrics
// ============================================================================
export async function recordPerformanceMetric(input: {
  report_code: string;
  duration_ms: number;
  row_count: number;
  cache_hit?: boolean;
  filters?: Record<string, any>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  await sb.from("lg_report_performance_metric").insert({
    report_code: input.report_code,
    user_id: user?.id ?? null,
    duration_ms: input.duration_ms,
    row_count: input.row_count,
    cache_hit: input.cache_hit ?? false,
    filters_json: input.filters ?? {},
  });
}

export interface PerformanceSummary {
  report_code: string;
  runs: number;
  avg_ms: number;
  max_ms: number;
  cache_hits: number;
  total_rows: number;
}

export async function loadPerformanceSummary(days = 30): Promise<PerformanceSummary[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await sb
    .from("lg_report_performance_metric")
    .select("report_code,duration_ms,row_count,cache_hit")
    .gte("captured_at", since)
    .limit(5000);
  if (error) throw error;
  const map = new Map<string, PerformanceSummary>();
  for (const r of data ?? []) {
    const key = r.report_code as string;
    const acc = map.get(key) ?? { report_code: key, runs: 0, avg_ms: 0, max_ms: 0, cache_hits: 0, total_rows: 0 };
    acc.runs += 1;
    acc.avg_ms += Number(r.duration_ms ?? 0);
    acc.max_ms = Math.max(acc.max_ms, Number(r.duration_ms ?? 0));
    acc.cache_hits += r.cache_hit ? 1 : 0;
    acc.total_rows += Number(r.row_count ?? 0);
    map.set(key, acc);
  }
  return Array.from(map.values())
    .map((s) => ({ ...s, avg_ms: s.runs ? Math.round(s.avg_ms / s.runs) : 0 }))
    .sort((a, b) => b.avg_ms - a.avg_ms);
}

// ============================================================================
// Part 9 — Report certification
// ============================================================================
export interface ReportCertification {
  report_code: string;
  certification_status: "certified" | "draft" | "deprecated";
  business_owner: string | null;
  financial_source: string | null;
  data_freshness_minutes: number | null;
  last_validated_at: string | null;
  last_validated_by: string | null;
  notes: string | null;
}

export async function listCertifications(): Promise<ReportCertification[]> {
  const { data, error } = await sb.from("lg_report_certification").select("*");
  if (error) throw error;
  return (data ?? []) as ReportCertification[];
}

export async function upsertCertification(input: Partial<ReportCertification> & { report_code: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  const payload: any = { ...input };
  if (input.certification_status === "certified") {
    payload.last_validated_at = new Date().toISOString();
    payload.last_validated_by = user?.id ?? null;
  }
  const { error } = await sb.from("lg_report_certification").upsert(payload, { onConflict: "report_code" });
  if (error) throw error;
  await recordReportAudit({ event_type: "certification_change", report_code: input.report_code, metadata: { status: input.certification_status } });
}

// ============================================================================
// Part 8 — Shared dashboards
// ============================================================================
export interface SharedDashboard {
  id: string;
  name: string;
  description: string | null;
  owner_user_id: string;
  scope: "private" | "team" | "department" | "organization" | "template";
  team_code: string | null;
  department_code: string | null;
  layout_json: any;
  filters_json: any;
  widgets_json: any[];
  access_mode: "read_only" | "editable";
  is_published: boolean;
  is_template: boolean;
  cloned_from: string | null;
  created_at: string;
  updated_at: string;
}

export async function listSharedDashboards(): Promise<SharedDashboard[]> {
  const { data: { user } } = await supabase.auth.getUser();
  let q = sb.from("lg_shared_dashboard").select("*").order("updated_at", { ascending: false });
  // Show anything not private, plus private ones owned by user
  if (user) {
    q = q.or(`scope.neq.private,owner_user_id.eq.${user.id}`);
  } else {
    q = q.neq("scope", "private");
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SharedDashboard[];
}

export async function saveSharedDashboard(input: Partial<SharedDashboard> & { name: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  const payload: any = {
    name: input.name,
    description: input.description ?? null,
    scope: input.scope ?? "private",
    team_code: input.team_code ?? null,
    department_code: input.department_code ?? null,
    layout_json: input.layout_json ?? {},
    filters_json: input.filters_json ?? {},
    widgets_json: input.widgets_json ?? [],
    access_mode: input.access_mode ?? "read_only",
    is_published: input.is_published ?? false,
    is_template: input.is_template ?? false,
    cloned_from: input.cloned_from ?? null,
  };
  if (input.id) {
    const { error } = await sb.from("lg_shared_dashboard").update(payload).eq("id", input.id);
    if (error) throw error;
    await recordReportAudit({ event_type: "dashboard_modify", dashboard_id: input.id });
    return input.id;
  }
  payload.owner_user_id = user?.id;
  const { data, error } = await sb.from("lg_shared_dashboard").insert(payload).select("id").single();
  if (error) throw error;
  await recordReportAudit({ event_type: "dashboard_share", dashboard_id: data.id, metadata: { scope: payload.scope } });
  return data.id as string;
}

export async function cloneSharedDashboard(id: string, newName: string) {
  const { data, error } = await sb.from("lg_shared_dashboard").select("*").eq("id", id).single();
  if (error) throw error;
  const { id: _drop, created_at, updated_at, owner_user_id, ...rest } = data as any;
  return saveSharedDashboard({ ...rest, name: newName, scope: "private", cloned_from: id });
}

export async function deleteSharedDashboard(id: string) {
  const { error } = await sb.from("lg_shared_dashboard").delete().eq("id", id);
  if (error) throw error;
}

// ============================================================================
// Part 7 — Subscription enhancements
// ============================================================================
export async function pauseSchedule(id: string) {
  const { error } = await sb.from("lg_scheduled_report").update({ paused_at: new Date().toISOString(), is_active: false }).eq("id", id);
  if (error) throw error;
}
export async function resumeSchedule(id: string) {
  const { error } = await sb.from("lg_scheduled_report").update({ paused_at: null, is_active: true }).eq("id", id);
  if (error) throw error;
}
export async function cloneSchedule(id: string) {
  const { data, error } = await sb.from("lg_scheduled_report").select("*").eq("id", id).single();
  if (error) throw error;
  const { id: _drop, created_at, updated_at, last_run_at, last_run_status, last_run_error, next_run_at, execution_history, ...rest } = data as any;
  const { data: { user } } = await supabase.auth.getUser();
  const payload = { ...rest, schedule_name: `${rest.schedule_name} (Copy)`, cloned_from: id, is_active: false, paused_at: null, created_by: user?.id, attempt_count: 0, execution_history: [] };
  const { error: e2 } = await sb.from("lg_scheduled_report").insert(payload);
  if (e2) throw e2;
}

// ============================================================================
// Part 6 — Export Centre
// ============================================================================
export async function listExports(params: { limit?: number; report_code?: string; days?: number } = {}) {
  const since = new Date(Date.now() - (params.days ?? 30) * 86_400_000).toISOString();
  let q = sb.from("lg_report_export_audit").select("*").gte("exported_at", since).order("exported_at", { ascending: false }).limit(params.limit ?? 500);
  if (params.report_code) q = q.eq("report_code", params.report_code);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
