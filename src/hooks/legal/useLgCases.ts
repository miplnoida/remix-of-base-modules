import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listLgCases,
  getLgCase,
  createLgCase,
  updateLgCase,
  listLgReferenceValues,
  listLgNotices,
  createLgNotice,
  type LgCaseListFilters,
  type LgCaseInsert,
  type LgCaseUpdate,
  type LgNoticeInsert,
} from "@/services/legal/lgCaseService";

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
    mutationFn: (input: Omit<LgCaseInsert, "lg_case_no"> & { lg_case_no?: string }) => createLgCase(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_case"] }),
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
    mutationFn: (input: Omit<LgNoticeInsert, "notice_no"> & { notice_no?: string }) => createLgNotice(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_notice"] }),
  });
}
