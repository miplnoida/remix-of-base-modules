import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listArrangementLinks,
  linkArrangement,
  getArrangementSummary,
  detectDefaultsAndCreateTasks,
} from "@/services/legal/lgPaymentArrangementService";
import {
  listLegalFeeHeads,
  listLgFeeCharges,
  createAndPostLegalFee,
  type CreateAndPostLegalFeeInput,
} from "@/services/legal/lgFeeChargeService";

export function useLgArrangementLinks(lgCaseId: string | undefined) {
  return useQuery({
    queryKey: ["lg_arrangement_link", lgCaseId],
    queryFn: () => listArrangementLinks(lgCaseId as string),
    enabled: !!lgCaseId,
  });
}

export function useArrangementSummary(arrangementId: string | undefined) {
  return useQuery({
    queryKey: ["ce_arrangement_summary", arrangementId],
    queryFn: () => getArrangementSummary(arrangementId as string),
    enabled: !!arrangementId,
  });
}

export function useLinkArrangement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: linkArrangement,
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["lg_arrangement_link", d.lg_case_id] }),
  });
}

export function useDetectArrangementDefaults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: detectDefaultsAndCreateTasks,
    onSuccess: (_d, lgCaseId) => {
      qc.invalidateQueries({ queryKey: ["lg_case_task", lgCaseId] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", lgCaseId] });
    },
  });
}

export function useLegalFeeHeads() {
  return useQuery({
    queryKey: ["lg_fee_heads"],
    queryFn: listLegalFeeHeads,
    staleTime: 5 * 60_000,
  });
}

export function useLgFeeCharges(lgCaseId: string | undefined) {
  return useQuery({
    queryKey: ["lg_fee_charge", lgCaseId],
    queryFn: () => listLgFeeCharges(lgCaseId as string),
    enabled: !!lgCaseId,
  });
}

export function useCreateAndPostLegalFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAndPostLegalFeeInput) => createAndPostLegalFee(input),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["lg_fee_charge", d.lg_case_id] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", d.lg_case_id] });
    },
  });
}
