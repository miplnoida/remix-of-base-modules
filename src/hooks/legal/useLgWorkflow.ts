import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listLgHearings,
  createLgHearing,
  updateLgHearing,
  listLgTasks,
  createLgTask,
  updateLgTask,
  assignLgTask,
  escalateLgTask,
  completeLgTask,
  closeLgTask,
  reopenLgTask,
  listLgTaskAudit,
  listLgDeadlines,
  createLgDeadline,
  getLgDashboardStats,
  type HearingRange,
  type LgHearingInsert,
  type LgHearingUpdate,
  type LgTaskInsert,
  type LgTaskUpdate,
  type LgTaskFilter,
  type LgDeadlineInsert,
} from "@/services/legal/lgWorkflowService";

export const lgWfKeys = {
  hearings: (r: HearingRange) => ["lg_hearing", "list", r] as const,
  tasks: (f: object) => ["lg_case_task", "list", f] as const,
  taskAudit: (taskId: string) => ["lg_case_task_audit", taskId] as const,
  deadlines: (caseId?: string) => ["lg_case_deadline", "list", caseId ?? "all"] as const,
  dashboard: (officerId?: string) => ["lg_dashboard", officerId ?? "all"] as const,
};

export function useLgHearings(range: HearingRange = {}) {
  return useQuery({ queryKey: lgWfKeys.hearings(range), queryFn: () => listLgHearings(range) });
}

export function useCreateLgHearing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<LgHearingInsert, "scheduled_at"> & { scheduled_at?: string; performed_by?: string | null; remarks?: string | null }) => {
      const { performed_by, remarks, ...payload } = input as any;
      const row = await createLgHearing(payload);
      const { logLgActivity } = await import("@/services/legal/lgAuditService");
      if (row?.lg_case_id) {
        await logLgActivity({
          lg_case_id: row.lg_case_id,
          activity_type: "HEARING_ADDED",
          entity_type: "LG_HEARING",
          entity_id: row.id,
          description: `Hearing scheduled ${row.hearing_date ?? ""} ${row.hearing_time ?? ""}`.trim(),
          new_value: { hearing_date: row.hearing_date, hearing_time: row.hearing_time, status: row.status },
          performed_by: performed_by ?? null,
          remarks: remarks ?? null,
        });
      }
      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_hearing"] });
      qc.invalidateQueries({ queryKey: ["lg_case"] });
      qc.invalidateQueries({ queryKey: ["lg_dashboard"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity"] });
    },
  });
}

export function useUpdateLgHearing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch, previous, performed_by, remarks }: { id: string; patch: LgHearingUpdate; previous?: Partial<LgHearingUpdate>; performed_by?: string | null; remarks?: string | null }) => {
      const row = await updateLgHearing(id, patch);
      const { logLgActivity } = await import("@/services/legal/lgAuditService");
      if (row?.lg_case_id) {
        await logLgActivity({
          lg_case_id: row.lg_case_id,
          activity_type: "HEARING_UPDATED",
          entity_type: "LG_HEARING",
          entity_id: id,
          description: `Hearing updated`,
          old_value: previous ?? null,
          new_value: patch,
          performed_by: performed_by ?? null,
          remarks: remarks ?? null,
        });
      }
      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_hearing"] });
      qc.invalidateQueries({ queryKey: ["lg_case"] });
      qc.invalidateQueries({ queryKey: ["lg_dashboard"] });
      qc.invalidateQueries({ queryKey: ["lg_case_task"] });
      qc.invalidateQueries({ queryKey: ["lg_case_deadline"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity"] });
    },
  });
}

export function useLgTasks(filter: LgTaskFilter = {}) {
  return useQuery({ queryKey: lgWfKeys.tasks(filter), queryFn: () => listLgTasks(filter), staleTime: 15_000 });
}

function invalidateTasks(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["lg_case_task"] });
  qc.invalidateQueries({ queryKey: ["lg_dashboard"] });
  qc.invalidateQueries({ queryKey: ["lg_case_activity"] });
  qc.invalidateQueries({ queryKey: ["lg_case_task_audit"] });
}

export function useCreateLgTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LgTaskInsert) => createLgTask(input),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useUpdateLgTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: LgTaskUpdate }) => updateLgTask(id, patch),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useAssignLgTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; userId?: string | null; teamCode?: string | null; actor?: string | null; note?: string | null }) =>
      assignLgTask(args.id, { userId: args.userId, teamCode: args.teamCode, actor: args.actor, note: args.note }),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useEscalateLgTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; reason: string; actor?: string | null; toUserId?: string | null; toTeamCode?: string | null }) =>
      escalateLgTask(args.id, { reason: args.reason, actor: args.actor, toUserId: args.toUserId, toTeamCode: args.toTeamCode }),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useCompleteLgTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userCode }: { id: string; userCode?: string | null }) => completeLgTask(id, userCode),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useCloseLgTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; reason?: string | null; actor?: string | null; status?: "CLOSED" | "CANCELLED" }) =>
      closeLgTask(args.id, { reason: args.reason, actor: args.actor, status: args.status }),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useReopenLgTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actor }: { id: string; actor?: string | null }) => reopenLgTask(id, actor),
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useLgTaskAudit(taskId: string | null | undefined) {
  return useQuery({
    queryKey: lgWfKeys.taskAudit(taskId ?? ""),
    enabled: !!taskId,
    queryFn: () => listLgTaskAudit(taskId as string),
    staleTime: 10_000,
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
