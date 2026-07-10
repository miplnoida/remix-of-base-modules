import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLgOrders,
  createLgOrder,
  updateLgOrder,
  changeLgOrderStatus,
  type LgOrderInsert,
  type LgOrderUpdate,
} from "@/services/legal/lgOrderService";
import type { LgOrderStatus } from "@/services/legal/lgOrderStateMachine";
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
      qc.invalidateQueries({ queryKey: ["lg_order_all"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", d.lg_case_id] });
    },
  });
}
export function useUpdateLgOrder(caseId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch, userCode }: { id: string; patch: LgOrderUpdate; userCode?: string | null }) =>
      updateLgOrder(id, patch, userCode),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["lg_order", caseId ?? d.lg_case_id] });
      qc.invalidateQueries({ queryKey: ["lg_order_all"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", caseId ?? d.lg_case_id] });
    },
  });
}
export function useChangeLgOrderStatus(caseId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, toStatus, userCode, note, enforcementRef, paymentArrangementId }: {
      id: string;
      toStatus: LgOrderStatus;
      userCode?: string | null;
      note?: string | null;
      enforcementRef?: string | null;
      paymentArrangementId?: string | null;
    }) => changeLgOrderStatus(id, toStatus, { userCode, note, enforcementRef, paymentArrangementId }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["lg_order", caseId ?? d.lg_case_id] });
      qc.invalidateQueries({ queryKey: ["lg_order_all"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", caseId ?? d.lg_case_id] });
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
      // EPIC L7A — refresh header + activity + assignment history + notices card.
      qc.invalidateQueries({ queryKey: ["lg_case", "detail", v.lg_case_id] });
      qc.invalidateQueries({ queryKey: ["lg_case"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", v.lg_case_id] });
      qc.invalidateQueries({ queryKey: ["lg-assignment-history", v.lg_case_id] });
      qc.invalidateQueries({ queryKey: ["legal-case-comm-hub-notices", v.lg_case_id] });
    },
  });
}
