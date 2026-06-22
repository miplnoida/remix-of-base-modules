import { useQuery } from "@tanstack/react-query";
import { listTeams, listTeamMembers, listWorkbasketRoles } from "@/services/legal/lgTeamService";
import { supabase } from "@/integrations/supabase/client";

export function useLegalTeams() {
  return useQuery({ queryKey: ["lg_team"], queryFn: listTeams, staleTime: 5 * 60_000 });
}

export function useLegalTeamMembers(teamId?: string) {
  return useQuery({
    queryKey: ["lg_team_member", teamId ?? "all"],
    queryFn: () => listTeamMembers(teamId),
    staleTime: 60_000,
    enabled: !!teamId,
  });
}

export function useLegalWorkbasketRoles() {
  return useQuery({ queryKey: ["lg_workbasket_role"], queryFn: listWorkbasketRoles, staleTime: 5 * 60_000 });
}

/** Active case counts per team_code — used in the teams grid. */
export function useTeamActiveCaseCounts() {
  return useQuery<Record<string, number>>({
    queryKey: ["lg_team_active_case_counts"],
    staleTime: 60_000,
    queryFn: async () => {
      const sb = supabase as any;
      const { data, error } = await sb
        .from("lg_case")
        .select("assigned_team_code, status_code")
        .not("assigned_team_code", "is", null);
      if (error) return {};
      const closedStatuses = new Set(["CLOSED", "WITHDRAWN", "DISMISSED", "RESOLVED"]);
      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        if (closedStatuses.has(String(r.status_code ?? "").toUpperCase())) continue;
        const k = r.assigned_team_code;
        counts[k] = (counts[k] ?? 0) + 1;
      }
      return counts;
    },
  });
}
