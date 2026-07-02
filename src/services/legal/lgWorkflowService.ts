import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LgHearing = Database["public"]["Tables"]["lg_hearing"]["Row"];
export type LgHearingInsert = Database["public"]["Tables"]["lg_hearing"]["Insert"];
export type LgHearingUpdate = Database["public"]["Tables"]["lg_hearing"]["Update"];
export type LgTask = Database["public"]["Tables"]["lg_case_task"]["Row"];
export type LgTaskInsert = Database["public"]["Tables"]["lg_case_task"]["Insert"];
export type LgTaskUpdate = Database["public"]["Tables"]["lg_case_task"]["Update"];
export type LgDeadline = Database["public"]["Tables"]["lg_case_deadline"]["Row"];
export type LgDeadlineInsert = Database["public"]["Tables"]["lg_case_deadline"]["Insert"];

export interface HearingRange {
  from?: string;
  to?: string;
  officerId?: string;
  caseId?: string;
  status?: string;
}

export async function listLgHearings(range: HearingRange = {}): Promise<LgHearing[]> {
  let q = supabase
    .from("lg_hearing")
    .select("*, lg_case:lg_case_id(id, lg_case_no, assigned_legal_officer_id, assigned_team_code, summary)")
    .order("hearing_date", { ascending: true })
    .limit(1000);
  if (range.from) q = q.gte("hearing_date", range.from);
  if (range.to) q = q.lte("hearing_date", range.to);
  if (range.caseId) q = q.eq("lg_case_id", range.caseId);
  if (range.status) q = q.eq("status", range.status);
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as any[];
  if (range.officerId) {
    rows = rows.filter((h) => h.lg_case?.assigned_legal_officer_id === range.officerId);
  }
  return rows as LgHearing[];
}

export async function createLgHearing(input: Omit<LgHearingInsert, "scheduled_at"> & { scheduled_at?: string }): Promise<LgHearing> {
  const scheduled_at =
    input.scheduled_at ??
    (input.hearing_date
      ? new Date(`${input.hearing_date}T${input.hearing_time ?? "09:00"}:00`).toISOString()
      : new Date().toISOString());
  const { data, error } = await supabase
    .from("lg_hearing")
    .insert({ ...input, scheduled_at, status: input.status ?? "SCHEDULED" })
    .select("*")
    .single();
  if (error) throw error;
  // Fire-and-forget: auto-apply fees mapped to HEARING_SCHEDULED
  try {
    const { autoApplyForEvent } = await import("@/services/legal/lgFeeEngineService");
    if (data.lg_case_id) autoApplyForEvent(data.lg_case_id, "HEARING_SCHEDULED", (input as any).created_by ?? null).catch(() => {});
  } catch { /* non-blocking */ }
  return data;
}

export async function updateLgHearing(id: string, patch: LgHearingUpdate): Promise<LgHearing> {
  const next: LgHearingUpdate = { ...patch };
  if (patch.hearing_date && patch.hearing_time) {
    next.scheduled_at = new Date(`${patch.hearing_date}T${patch.hearing_time}:00`).toISOString();
  }
  const { data, error } = await supabase
    .from("lg_hearing")
    .update(next)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export interface LgTaskFilter {
  caseId?: string;
  assignedTo?: string;
  teamCode?: string;
  status?: string | string[];
  priority?: string | string[];
  slaStatus?: string | string[];
  overdueOnly?: boolean;
  activeOnly?: boolean;
  search?: string;
}

const ACTIVE_TASK_STATUSES = ["OPEN", "IN_PROGRESS", "BLOCKED", "ON_HOLD"];

export async function listLgTasks(filter: LgTaskFilter = {}): Promise<LgTask[]> {
  let q = supabase
    .from("lg_case_task")
    .select("*, lg_case:lg_case_id(id, lg_case_no, summary, assigned_team_code, assigned_legal_officer_id)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(1000);
  if (filter.caseId) q = q.eq("lg_case_id", filter.caseId);
  if (filter.assignedTo) q = q.eq("assigned_to_user_id", filter.assignedTo);
  if (filter.teamCode) q = q.eq("assigned_team_code", filter.teamCode);
  if (filter.status) q = Array.isArray(filter.status) ? q.in("status", filter.status) : q.eq("status", filter.status);
  if (filter.priority) q = Array.isArray(filter.priority) ? q.in("priority_code", filter.priority) : q.eq("priority_code", filter.priority);
  if (filter.slaStatus) q = Array.isArray(filter.slaStatus) ? q.in("sla_status", filter.slaStatus) : q.eq("sla_status", filter.slaStatus);
  if (filter.activeOnly) q = q.in("status", ACTIVE_TASK_STATUSES);
  if (filter.overdueOnly) {
    q = q.in("status", ACTIVE_TASK_STATUSES).lt("due_date", new Date().toISOString().slice(0, 10));
  }
  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim().replace(/[%_]/g, "");
    q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LgTask[];
}

export async function createLgTask(input: LgTaskInsert): Promise<LgTask> {
  const payload: LgTaskInsert = {
    status: "OPEN",
    priority_code: "MEDIUM",
    ...input,
  };
  const { data, error } = await supabase.from("lg_case_task").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateLgTask(id: string, patch: LgTaskUpdate): Promise<LgTask> {
  const { data, error } = await supabase
    .from("lg_case_task")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function assignLgTask(
  id: string,
  args: { userId?: string | null; teamCode?: string | null; actor?: string | null; note?: string | null }
): Promise<LgTask> {
  const { data, error } = await supabase
    .from("lg_case_task")
    .update({
      assigned_to_user_id: args.userId ?? null,
      assigned_team_code: args.teamCode ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  if (args.note) {
    await supabase.from("lg_case_task_audit").insert({
      task_id: id,
      lg_case_id: data.lg_case_id,
      action: "ASSIGN_NOTE",
      note: args.note,
      performed_by: args.actor ?? null,
    });
  }
  return data;
}

export async function escalateLgTask(
  id: string,
  args: { reason: string; actor?: string | null; toUserId?: string | null; toTeamCode?: string | null }
): Promise<LgTask> {
  const { data: current, error: fErr } = await supabase
    .from("lg_case_task")
    .select("escalation_level, lg_case_id, status")
    .eq("id", id)
    .single();
  if (fErr) throw fErr;
  if (["COMPLETED", "DONE", "CLOSED", "CANCELLED"].includes(current.status)) {
    throw new Error("Cannot escalate a closed task");
  }
  const patch: LgTaskUpdate = {
    escalation_level: (current.escalation_level ?? 0) + 1,
    escalated_at: new Date().toISOString(),
    escalated_by: args.actor ?? null,
    escalation_reason: args.reason,
    updated_at: new Date().toISOString(),
  };
  if (args.toUserId !== undefined) patch.assigned_to_user_id = args.toUserId;
  if (args.toTeamCode !== undefined) patch.assigned_team_code = args.toTeamCode;
  const { data, error } = await supabase
    .from("lg_case_task")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function completeLgTask(id: string, userCode?: string | null): Promise<LgTask> {
  const { data, error } = await supabase
    .from("lg_case_task")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
      completed_by: userCode ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function closeLgTask(
  id: string,
  args: { reason?: string | null; actor?: string | null; status?: "CLOSED" | "CANCELLED" }
): Promise<LgTask> {
  const targetStatus = args.status ?? "CLOSED";
  const { data, error } = await supabase
    .from("lg_case_task")
    .update({
      status: targetStatus,
      closed_at: new Date().toISOString(),
      closed_by: args.actor ?? null,
      close_reason: args.reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function reopenLgTask(id: string, actor?: string | null): Promise<LgTask> {
  const { data, error } = await supabase
    .from("lg_case_task")
    .update({
      status: "OPEN",
      completed_at: null,
      completed_by: null,
      closed_at: null,
      closed_by: null,
      close_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  await supabase.from("lg_case_task_audit").insert({
    task_id: id,
    lg_case_id: data.lg_case_id,
    action: "REOPENED",
    performed_by: actor ?? null,
  });
  return data;
}

export interface LgTaskAuditRow {
  id: string;
  task_id: string;
  lg_case_id: string;
  action: string;
  from_value: any;
  to_value: any;
  note: string | null;
  performed_by: string | null;
  performed_at: string;
}

export async function listLgTaskAudit(taskId: string): Promise<LgTaskAuditRow[]> {
  const { data, error } = await supabase
    .from("lg_case_task_audit")
    .select("*")
    .eq("task_id", taskId)
    .order("performed_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as LgTaskAuditRow[];
}

/**
 * Batch recompute of SLA status by re-saving each active task – triggers on the
 * table recompute `sla_status`. Safe to call on demand from list screens if the
 * user leaves the tab open for a long time and dates roll over.
 */
export async function refreshLgTaskSla(caseId?: string): Promise<number> {
  let q = supabase
    .from("lg_case_task")
    .select("id")
    .in("status", ACTIVE_TASK_STATUSES);
  if (caseId) q = q.eq("lg_case_id", caseId);
  const { data, error } = await q.limit(1000);
  if (error) throw error;
  const ids = (data ?? []).map((r: any) => r.id);
  if (!ids.length) return 0;
  const { error: uErr } = await supabase
    .from("lg_case_task")
    .update({ updated_at: new Date().toISOString() })
    .in("id", ids);
  if (uErr) throw uErr;
  return ids.length;
}

export async function listLgDeadlines(caseId?: string): Promise<LgDeadline[]> {
  let q = supabase.from("lg_case_deadline").select("*").order("due_date", { ascending: true }).limit(500);
  if (caseId) q = q.eq("lg_case_id", caseId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createLgDeadline(input: LgDeadlineInsert): Promise<LgDeadline> {
  const { data, error } = await supabase.from("lg_case_deadline").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

// Dashboard aggregations
export interface LgDashboardStats {
  open_cases: number;
  cases_by_stage: { code: string; count: number }[];
  my_assigned_cases: number;
  hearings_today: number;
  hearings_this_week: number;
  hearings_next_30_days: number;
  overdue_tasks: number;
  payment_arrangement_defaults: number;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function getLgDashboardStats(officerId?: string): Promise<LgDashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  const in30 = new Date(today);
  in30.setDate(today.getDate() + 30);
  const t0 = isoDate(today);
  const t7 = isoDate(endOfWeek);
  const t30 = isoDate(in30);

  const [cases, hearings, tasks, defaults] = await Promise.all([
    supabase.from("lg_case").select("status_code, current_stage_code, assigned_legal_officer_id").limit(5000),
    supabase
      .from("lg_hearing")
      .select("id, hearing_date, status, lg_case:lg_case_id(assigned_legal_officer_id)")
      .eq("status", "SCHEDULED")
      .gte("hearing_date", t0)
      .lte("hearing_date", t30)
      .limit(2000),
    supabase
      .from("lg_case_task")
      .select("id, status, due_date, assigned_to_user_id")
      .in("status", ["OPEN", "IN_PROGRESS"])
      .lt("due_date", t0)
      .limit(2000),
    supabase
      .from("ce_payment_arrangements")
      .select("id", { count: "exact", head: true })
      .in("status", ["DEFAULTED", "BREACHED"]),
  ]);

  const caseRows = (cases.data ?? []) as any[];
  const hearingRows = (hearings.data ?? []) as any[];
  const taskRows = (tasks.data ?? []) as any[];

  const open = caseRows.filter((c) => !["CLOSED", "SETTLED", "WITHDRAWN"].includes(c.status_code)).length;

  const stageMap = new Map<string, number>();
  caseRows.forEach((c) => stageMap.set(c.current_stage_code, (stageMap.get(c.current_stage_code) ?? 0) + 1));

  const myAssigned = officerId
    ? caseRows.filter(
        (c) => c.assigned_legal_officer_id === officerId && !["CLOSED", "SETTLED"].includes(c.status_code)
      ).length
    : 0;

  const relevantHearings = officerId
    ? hearingRows.filter((h) => h.lg_case?.assigned_legal_officer_id === officerId)
    : hearingRows;

  const hToday = relevantHearings.filter((h) => h.hearing_date === t0).length;
  const hWeek = relevantHearings.filter((h) => h.hearing_date && h.hearing_date <= t7).length;
  const h30 = relevantHearings.length;

  const overdue = officerId
    ? taskRows.filter((t) => t.assigned_to_user_id === officerId).length
    : taskRows.length;

  return {
    open_cases: open,
    cases_by_stage: Array.from(stageMap.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count),
    my_assigned_cases: myAssigned,
    hearings_today: hToday,
    hearings_this_week: hWeek,
    hearings_next_30_days: h30,
    overdue_tasks: overdue,
    payment_arrangement_defaults: defaults.count ?? 0,
  };
}
