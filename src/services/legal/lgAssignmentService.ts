import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface ResolveRouteInput {
  source_code: string;
  case_type_code: string;
  stage_code?: string | null;
  priority_code?: string | null;
  office_code?: string | null;
  jurisdiction?: string | null;
}

export interface ResolveRouteResult {
  route_id?: string;
  team_code?: string | null;
  workbasket_code?: string | null;
  assignment_strategy?: string;
  escalation_team_code?: string | null;
  backup_team_code?: string | null;
  required_skill?: string | null;
  validation_status: "OK" | "WARNING" | "ERROR";
  reasons: string[];
}

export async function resolveRoute(input: ResolveRouteInput): Promise<ResolveRouteResult> {
  const { data, error } = await sb.rpc("lg_resolve_route", {
    p_source: input.source_code,
    p_case_type: input.case_type_code,
    p_stage: input.stage_code ?? null,
    p_priority: input.priority_code ?? "MEDIUM",
    p_office: input.office_code ?? null,
    p_jurisdiction: input.jurisdiction ?? null,
  });
  if (error) throw error;
  return data as ResolveRouteResult;
}

export interface AssignCaseInput {
  lg_case_id: string;
  actor_user_code: string;
  reason?: "intake" | "reassign" | "escalation" | "workload" | "override" | "queue";
  override_user_id?: string | null;
  override_team_code?: string | null;
}

export interface AssignCaseResult {
  ok: boolean;
  team_code?: string | null;
  workbasket_code?: string | null;
  strategy?: string | null;
  assigned_to_user_id?: string | null;
  assigned_user_code?: string | null;
  reason?: string;
  queued?: boolean;
  route?: ResolveRouteResult;
}

export async function assignCase(input: AssignCaseInput): Promise<AssignCaseResult> {
  const { data, error } = await sb.rpc("lg_assign_case", {
    p_case_id: input.lg_case_id,
    p_actor_user_code: input.actor_user_code,
    p_reason: input.reason ?? "intake",
    p_override_user_id: input.override_user_id ?? null,
    p_override_team: input.override_team_code ?? null,
  });
  if (error) throw error;
  return data as AssignCaseResult;
}

export interface AssignmentHistoryRow {
  id: string;
  lg_case_id: string;
  assigned_from_user_id: string | null;
  assigned_to_user_id: string | null;
  assigned_team_code: string | null;
  workbasket_code: string | null;
  strategy: string | null;
  reason: string;
  notes: string | null;
  assigned_by: string | null;
  created_at: string;
}

export async function listAssignmentHistory(caseId: string): Promise<AssignmentHistoryRow[]> {
  const { data, error } = await sb
    .from("lg_case_assignment_history")
    .select("*")
    .eq("lg_case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AssignmentHistoryRow[];
}

export interface StaffWorkloadRow {
  staff_id: string;
  user_id: string;
  user_code: string | null;
  full_name: string;
  team_id: string | null;
  max_active_cases: number;
  max_high_priority_cases: number;
  availability: string;
  active_cases: number;
  high_priority_cases: number;
  capacity_pct: number;
}

export async function listStaffWorkload(teamId?: string | null): Promise<StaffWorkloadRow[]> {
  let q = sb.from("lg_staff_workload").select("*").order("capacity_pct", { ascending: true });
  if (teamId) q = q.eq("team_id", teamId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as StaffWorkloadRow[];
}
