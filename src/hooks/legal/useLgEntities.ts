import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listLgOrders, createLgOrder, type LgOrderInsert } from "@/services/legal/lgOrderService";
import {
  listLgSettlements,
  createLgSettlement,
  updateLgSettlement,
  type LgSettlementInsert,
} from "@/services/legal/lgSettlementService";
import {
  listLgParties,
  createLgParty,
  deleteLgParty,
  assignLegalOfficer,
  type LgPartyInsert,
} from "@/services/legal/lgPartyService";

// ---------- Orders ----------
export function useLgOrders(lgCaseId: string | undefined) {
  return useQuery({
    queryKey: ["lg_order", lgCaseId],
    enabled: !!lgCaseId,
    queryFn: () => listLgOrders(lgCaseId as string),
  });
}
export function useCreateLgOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LgOrderInsert) => createLgOrder(input),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["lg_order", d.lg_case_id] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", d.lg_case_id] });
    },
  });
}

// ---------- Settlements ----------
export function useLgSettlements(lgCaseId: string | undefined) {
  return useQuery({
    queryKey: ["lg_settlement", lgCaseId],
    enabled: !!lgCaseId,
    queryFn: () => listLgSettlements(lgCaseId as string),
  });
}
export function useCreateLgSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LgSettlementInsert) => createLgSettlement(input),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["lg_settlement", d.lg_case_id] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", d.lg_case_id] });
    },
  });
}
export function useUpdateLgSettlement(caseId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<LgSettlementInsert> & { status?: string; rejection_reason?: string | null; agreed_amount?: number | null } }) =>
      updateLgSettlement(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_settlement", caseId] }),
  });
}

// ---------- Parties ----------
export function useLgParties(lgCaseId: string | undefined) {
  return useQuery({
    queryKey: ["lg_case_party", lgCaseId],
    enabled: !!lgCaseId,
    queryFn: () => listLgParties(lgCaseId as string),
  });
}
export function useCreateLgParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LgPartyInsert) => createLgParty(input),
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ["lg_case_party", d.lg_case_id] }),
  });
}
export function useDeleteLgParty(caseId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLgParty(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_case_party", caseId] }),
  });
}

// ---------- Assignment ----------
export function useAssignLegalOfficer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignLegalOfficer,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["lg_case", "detail", v.lg_case_id] });
      qc.invalidateQueries({ queryKey: ["lg_case"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", v.lg_case_id] });
    },
  });
}
