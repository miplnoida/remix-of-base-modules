import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserCode } from "@/hooks/useUserCode";
import type { WorkbenchScope } from "@/components/enterprise-workbench";

const sb = supabase as any;

/**
 * Resolves the current user's assignment scope used by the Enterprise Workbench:
 *   - team codes they belong to (via lg_team_member → lg_team)
 *   - workbasket codes their teams own (via lg_team_workbasket)
 *
 * Falls back to empty arrays for unauthenticated or non-legal users —
 * "My / Team / Workbasket Queue" simply show 0 in that case.
 */
export function useLegalAssignmentScope(): WorkbenchScope {
  const { userCode, userId } = useUserCode();

  const { data } = useQuery({
    queryKey: ["legal-assignment-scope", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: members } = await sb
        .from("lg_team_member")
        .select("team_id, is_active, lg_team:team_id(team_code,is_active)")
        .eq("user_id", userId)
        .eq("is_active", true);

      const teamRows = (members ?? [])
        .map((m: any) => m.lg_team)
        .filter((t: any) => t && t.is_active);
      const teamCodes: string[] = Array.from(
        new Set(teamRows.map((t: any) => t.team_code).filter(Boolean))
      );

      let workbasketCodes: string[] = [];
      if (teamCodes.length) {
        const { data: tw } = await sb
          .from("lg_team_workbasket")
          .select("workbasket_code, team_code, is_active")
          .in("team_code", teamCodes)
          .eq("is_active", true);
        workbasketCodes = Array.from(
          new Set((tw ?? []).map((r: any) => r.workbasket_code).filter(Boolean))
        );
      }

      return { teamCodes, workbasketCodes };
    },
  });

  return {
    userCode: userCode ?? null,
    userId: userId ?? null,
    teamCodes: data?.teamCodes ?? [],
    workbasketCodes: data?.workbasketCodes ?? [],
  };
}
