import { useQuery } from "@tanstack/react-query";
import { listTeams, listTeamMembers, listWorkbasketRoles } from "@/services/legal/lgTeamService";

export function useLegalTeams() {
  return useQuery({ queryKey: ["lg_team"], queryFn: listTeams, staleTime: 5 * 60_000 });
}

export function useLegalTeamMembers(teamId?: string) {
  return useQuery({
    queryKey: ["lg_team_member", teamId ?? "all"],
    queryFn: () => listTeamMembers(teamId),
    staleTime: 60_000,
    enabled: teamId !== "" && teamId !== null,
  });
}

export function useLegalWorkbasketRoles() {
  return useQuery({ queryKey: ["lg_workbasket_role"], queryFn: listWorkbasketRoles, staleTime: 5 * 60_000 });
}
