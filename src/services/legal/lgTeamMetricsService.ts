import { supabase } from "@/integrations/supabase/client";
const sb = supabase as any;

export interface TeamMetricsRow {
  team_id: string;
  team_code: string;
  team_name: string;
  manager_user_id: string | null;
  open_cases: number;
  assigned_cases: number;
  unassigned_cases: number;
  high_priority_cases: number;
  avg_age_days: number;
  total_capacity: number;
  current_load: number;
  capacity_pct: number;
}

export async function listTeamMetrics(): Promise<TeamMetricsRow[]> {
  const { data, error } = await sb
    .from("lg_team_metrics")
    .select("*")
    .order("capacity_pct", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TeamMetricsRow[];
}

export interface CaseSummaryRow {
  assigned_team_code: string | null;
  assigned_legal_officer_id: string | null;
  status_code: string;
  priority_code: string;
  case_count: number;
}

export async function listCaseTeamSummary(): Promise<CaseSummaryRow[]> {
  const { data, error } = await sb.from("lg_case_team_summary").select("*");
  if (error) throw error;
  return (data ?? []) as CaseSummaryRow[];
}
