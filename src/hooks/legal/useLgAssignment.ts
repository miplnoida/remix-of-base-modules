import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignCase,
  listAssignmentHistory,
  listStaffWorkload,
  resolveRoute,
  type AssignCaseInput,
  type ResolveRouteInput,
} from "@/services/legal/lgAssignmentService";

export function useResolveRoute(input: ResolveRouteInput | null, enabled = true) {
  return useQuery({
    queryKey: ["lg-resolve-route", input],
    queryFn: () => resolveRoute(input as ResolveRouteInput),
    enabled: enabled && !!input?.source_code && !!input?.case_type_code,
    staleTime: 30_000,
  });
}

export function useAssignmentHistory(caseId: string | null | undefined) {
  return useQuery({
    queryKey: ["lg-assignment-history", caseId],
    queryFn: () => listAssignmentHistory(caseId as string),
    enabled: !!caseId,
  });
}

export function useStaffWorkload(teamId?: string | null) {
  return useQuery({
    queryKey: ["lg-staff-workload", teamId ?? null],
    queryFn: () => listStaffWorkload(teamId ?? null),
    staleTime: 15_000,
  });
}

export function useAssignCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignCaseInput) => assignCase(input),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["lg-assignment-history", vars.lg_case_id] });
      qc.invalidateQueries({ queryKey: ["lg-case", vars.lg_case_id] });
      qc.invalidateQueries({ queryKey: ["lg-staff-workload"] });
    },
  });
}
