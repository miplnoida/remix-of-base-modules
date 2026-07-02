import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listLgCases,
  getLgCase,
  createLgCase,
  updateLgCase,
  listLgReferenceValues,
  listLgNotices,
  createLgNotice,
  submitLgNoticeForApproval,
  approveLgNotice,
  dispatchLgNotice,
  cancelLgNotice,
  type LgCaseListFilters,
  type LgCaseInsert,
  type LgCaseUpdate,
  type LgNoticeInsert,
} from "@/services/legal/lgCaseService";
import { logLgActivity } from "@/services/legal/lgAuditService";


export const lgKeys = {
  cases: (f: LgCaseListFilters) => ["lg_case", "list", f] as const,
  case: (id: string) => ["lg_case", "detail", id] as const,
  ref: (g: string) => ["core_reference_value", "LEGAL", g] as const,
  notices: (caseId?: string) => ["lg_notice", "list", caseId ?? "all"] as const,
};

export function useLgCases(filters: LgCaseListFilters = {}) {
  return useQuery({ queryKey: lgKeys.cases(filters), queryFn: () => listLgCases(filters) });
}

export function useLgCase(id: string | undefined) {
  return useQuery({
    queryKey: lgKeys.case(id || ""),
    queryFn: () => getLgCase(id as string),
    enabled: !!id,
  });
}

export function useLgReference(groupCode: string) {
  return useQuery({
    queryKey: lgKeys.ref(groupCode),
    queryFn: () => listLgReferenceValues(groupCode),
    staleTime: 5 * 60_000,
  });
}

export function useCreateLgCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<LgCaseInsert, "lg_case_no"> & { lg_case_no?: string; performed_by?: string | null; remarks?: string | null }) => {
      const { performed_by, remarks, ...payload } = input as any;
      const row = await createLgCase(payload);
      if (row?.id) {
        await logLgActivity({
          lg_case_id: row.id,
          activity_type: "CASE_CREATED",
          entity_type: "LG_CASE",
          entity_id: row.id,
          description: `Case ${row.lg_case_no ?? row.id} created`,
          new_value: { case_no: row.lg_case_no, stage: row.current_stage_code },
          performed_by: performed_by ?? null,
          remarks: remarks ?? null,
        });
      }
      return row;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_case"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity"] });
    },
  });
}

export function useUpdateLgCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: LgCaseUpdate }) => updateLgCase(id, patch),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["lg_case"] });
      qc.invalidateQueries({ queryKey: lgKeys.case(v.id) });
    },
  });
}

export function useLgNotices(caseId?: string) {
  return useQuery({ queryKey: lgKeys.notices(caseId), queryFn: () => listLgNotices(caseId) });
}

export function useCreateLgNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<LgNoticeInsert, "notice_no"> & { notice_no?: string; performed_by?: string | null; remarks?: string | null }) => {
      const { performed_by, remarks, ...payload } = input as any;
      const row = await createLgNotice(payload);
      if (row?.lg_case_id) {
        await logLgActivity({
          lg_case_id: row.lg_case_id,
          activity_type: "NOTICE_GENERATED",
          entity_type: "LG_NOTICE",
          entity_id: row.id,
          description: `Notice ${row.notice_no ?? row.id} generated`,
          new_value: { notice_no: row.notice_no, notice_type: row.notice_type_code, status: row.status },
          performed_by: performed_by ?? null,
          remarks: remarks ?? null,
        });
      }
      return row;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["lg_notice"] });
      if ((r as any)?.lg_case_id) qc.invalidateQueries({ queryKey: ["lg_case_activity", (r as any).lg_case_id] });
    },
  });
}

export function useSubmitLgNoticeForApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; caseId: string; userCode: string | null; noticeNo?: string | null }) => {
      const row = await submitLgNoticeForApproval(input.id, input.userCode);
      await logLgActivity({
        lg_case_id: input.caseId,
        activity_type: "NOTICE_SUBMITTED_FOR_APPROVAL",
        description: `Notice ${input.noticeNo ?? input.id} submitted for approval`,
        performed_by: input.userCode,
      });
      return row;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["lg_notice"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", v.caseId] });
    },
  });
}

export function useApproveLgNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; caseId: string; userCode: string | null; noticeNo?: string | null }) => {
      const row = await approveLgNotice(input.id, input.userCode);
      await logLgActivity({
        lg_case_id: input.caseId,
        activity_type: "NOTICE_APPROVED",
        description: `Notice ${input.noticeNo ?? input.id} approved`,
        performed_by: input.userCode,
      });
      return row;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["lg_notice"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", v.caseId] });
    },
  });
}

export function useDispatchLgNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      caseId: string;
      channel: string;
      userCode: string | null;
      noticeNo?: string | null;
    }) => {
      const row = await dispatchLgNotice(input.id, { channel: input.channel, userCode: input.userCode });
      await logLgActivity({
        lg_case_id: input.caseId,
        activity_type: "NOTICE_DISPATCHED",
        description: `Notice ${input.noticeNo ?? input.id} dispatched via ${input.channel}`,
        performed_by: input.userCode,
      });
      return row;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["lg_notice"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", v.caseId] });
    },
  });
}

export function useCancelLgNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; caseId: string; userCode: string | null; noticeNo?: string | null }) => {
      const row = await cancelLgNotice(input.id);
      await logLgActivity({
        lg_case_id: input.caseId,
        activity_type: "NOTICE_CANCELLED",
        description: `Notice ${input.noticeNo ?? input.id} cancelled`,
        performed_by: input.userCode,
      });
      return row;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["lg_notice"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", v.caseId] });
    },
  });
}
