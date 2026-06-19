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

export async function createLgHearing(input: LgHearingInsert): Promise<LgHearing> {
  // Derive scheduled_at from hearing_date/time if missing
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

export async function listLgTasks(filter: {
  caseId?: string;
  assignedTo?: string;
  status?: string;
  overdueOnly?: boolean;
} = {}): Promise<LgTask[]> {
  let q = supabase
    .from("lg_case_task")
    .select("*, lg_case:lg_case_id(id, lg_case_no, summary)")
    .order("due_date", { ascending: true })
    .limit(1000);
  if (filter.caseId) q = q.eq("lg_case_id", filter.caseId);
  if (filter.assignedTo) q = q.eq("assigned_to_user_id", filter.assignedTo);
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.overdueOnly) {
    q = q.in("status", ["OPEN", "IN_PROGRESS"]).lt("due_date", new Date().toISOString().slice(0, 10));
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LgTask[];
}

export async function createLgTask(input: LgTaskInsert): Promise<LgTask> {
  const { data, error } = await supabase.from("lg_case_task").insert(input).select("*").single();
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
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
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
