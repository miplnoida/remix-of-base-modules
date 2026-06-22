import { useQuery } from "@tanstack/react-query";
import { listCaseTeamSummary, listTeamMetrics } from "@/services/legal/lgTeamMetricsService";

export function useLgTeamMetrics() {
  return useQuery({ queryKey: ["lg-team-metrics"], queryFn: listTeamMetrics, staleTime: 30_000 });
}

export function useLgCaseTeamSummary() {
  return useQuery({ queryKey: ["lg-case-team-summary"], queryFn: listCaseTeamSummary, staleTime: 30_000 });
}
