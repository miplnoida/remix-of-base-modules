import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeCaseAction,
  createCaseActions,
  listCaseActions,
  reopenCaseAction,
  updateCaseAction,
  type LgCaseAction,
  type ActionKind,
} from "@/services/legal/lgCaseActionService";
import {
  fetchEmployerOutstanding,
  fetchEmployerOutstandingByCode,
  type ProposedAction,
} from "@/services/legal/lgActionDuesService";
import {
  linkArrangement,
  listArrangementsForCase,
  unlinkArrangement,
} from "@/services/legal/lgActionArrangementService";
import { useUserCode } from "@/hooks/useUserCode";

export function useLgCaseActions(caseId: string | undefined) {
  return useQuery<LgCaseAction[]>({
    queryKey: ["lg_case_action", caseId],
    enabled: !!caseId,
    queryFn: () => listCaseActions(caseId as string),
  });
}

export function useLgCaseArrangements(caseId: string | undefined) {
  return useQuery({
    queryKey: ["lg_case_action_arrangements", caseId],
    enabled: !!caseId,
    queryFn: () => listArrangementsForCase(caseId as string),
  });
}

export function useProposedEmployerDues(employerId: string | undefined, employerCode?: string | null) {
  return useQuery<ProposedAction[]>({
    queryKey: ["lg_action_proposed_dues", employerId, employerCode],
    enabled: !!employerId || !!employerCode,
    queryFn: async () => {
      const a = employerId ? await fetchEmployerOutstanding(employerId) : [];
      const b = employerCode ? await fetchEmployerOutstandingByCode(employerCode) : [];
      return [...a, ...b];
    },
  });
}

export function useCreateCaseActions(caseId: string | undefined) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  return useMutation({
    mutationFn: async (rows: Array<Partial<LgCaseAction> & { case_id: string; action_kind: ActionKind }>) =>
      createCaseActions(rows, userCode ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_case_action", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_case"] });
    },
  });
}

export function useUpdateCaseAction(caseId: string | undefined) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<LgCaseAction> }) =>
      updateCaseAction(id, patch, userCode ?? null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_case_action", caseId] }),
  });
}

export function useCloseCaseAction(caseId: string | undefined) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  return useMutation({
    mutationFn: async (id: string) => closeCaseAction(id, userCode ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_case_action", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_case"] });
    },
  });
}

export function useReopenCaseAction(caseId: string | undefined) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  return useMutation({
    mutationFn: async (id: string) => reopenCaseAction(id, userCode ?? null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_case_action", caseId] }),
  });
}

export function useLinkActionArrangement(caseId: string | undefined) {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  return useMutation({
    mutationFn: async (p: { actionId: string; arrangementId: string; allocated: number }) =>
      linkArrangement(p.actionId, p.arrangementId, p.allocated, userCode ?? null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_case_action_arrangements", caseId] }),
  });
}

export function useUnlinkActionArrangement(caseId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unlinkArrangement(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_case_action_arrangements", caseId] }),
  });
}
