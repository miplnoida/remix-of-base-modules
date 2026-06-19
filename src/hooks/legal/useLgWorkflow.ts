import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listLgHearings,
  createLgHearing,
  updateLgHearing,
  listLgTasks,
  createLgTask,
  completeLgTask,
  listLgDeadlines,
  createLgDeadline,
  getLgDashboardStats,
  type HearingRange,
  type LgHearingInsert,
  type LgHearingUpdate,
  type LgTaskInsert,
  type LgDeadlineInsert,
} from "@/services/legal/lgWorkflowService";

export const lgWfKeys = {
  hearings: (r: HearingRange) => ["lg_hearing", "list", r] as const,
  tasks: (f: object) => ["lg_case_task", "list", f] as const,
  deadlines: (caseId?: string) => ["lg_case_deadline", "list", caseId ?? "all"] as const,
  dashboard: (officerId?: string) => ["lg_dashboard", officerId ?? "all"] as const,
};

export function useLgHearings(range: HearingRange = {}) {
  return useQuery({ queryKey: lgWfKeys.hearings(range), queryFn: () => listLgHearings(range) });
}

export function useCreateLgHearing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<LgHearingInsert, "scheduled_at"> & { scheduled_at?: string }) => createLgHearing(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_hearing"] });
      qc.invalidateQueries({ queryKey: ["lg_case"] });
      qc.invalidateQueries({ queryKey: ["lg_dashboard"] });
    },
  });
}

export function useUpdateLgHearing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: LgHearingUpdate }) => updateLgHearing(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_hearing"] });
      qc.invalidateQueries({ queryKey: ["lg_case"] });
      qc.invalidateQueries({ queryKey: ["lg_dashboard"] });
      qc.invalidateQueries({ queryKey: ["lg_case_task"] });
      qc.invalidateQueries({ queryKey: ["lg_case_deadline"] });
    },
  });
}

export function useLgTasks(filter: { caseId?: string; assignedTo?: string; status?: string; overdueOnly?: boolean } = {}) {
  return useQuery({ queryKey: lgWfKeys.tasks(filter), queryFn: () => listLgTasks(filter) });
}

export function useCreateLgTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LgTaskInsert) => createLgTask(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_case_task"] }),
  });
}

export function useCompleteLgTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userCode }: { id: string; userCode?: string | null }) => completeLgTask(id, userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_case_task"] });
      qc.invalidateQueries({ queryKey: ["lg_dashboard"] });
    },
  });
}

export function useLgDeadlines(caseId?: string) {
  return useQuery({ queryKey: lgWfKeys.deadlines(caseId), queryFn: () => listLgDeadlines(caseId) });
}

export function useCreateLgDeadline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LgDeadlineInsert) => createLgDeadline(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_case_deadline"] }),
  });
}

export function useLgDashboard(officerId?: string) {
  return useQuery({
    queryKey: lgWfKeys.dashboard(officerId),
    queryFn: () => getLgDashboardStats(officerId),
    staleTime: 30_000,
  });
}
