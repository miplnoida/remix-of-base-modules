import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  autoApplyForEvent,
  applyBundle,
  addManualFee,
  postFeeCharge,
} from "@/services/legal/lgFeeEngineService";
import {
  listWaivers,
  requestWaiver,
  approveWaiver,
  rejectWaiver,
} from "@/services/legal/lgFeeWaiverService";
import {
  listFeeRules,
  upsertFeeRule,
  setRuleStatus,
  listFeeBundles,
  upsertBundle,
  setBundleItems,
  listBundlesForCase,
} from "@/services/legal/lgFeeRuleService";

const sb = supabase as any;

export function useFeeBundlesForCase(caseTypeCode?: string | null) {
  return useQuery({
    queryKey: ["lg_fee_bundle_active", caseTypeCode ?? "ALL"],
    queryFn: () => listBundlesForCase(caseTypeCode ?? null),
  });
}

export function useApplyBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lgCaseId, bundleId, userCode }: { lgCaseId: string; bundleId: string; userCode?: string | null }) =>
      applyBundle(lgCaseId, bundleId, userCode ?? null),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["lg_fee_charge", v.lgCaseId] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", v.lgCaseId] });
    },
  });
}

export function useAddManualFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof addManualFee>[0]) => addManualFee(input),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["lg_fee_charge", v.lgCaseId] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", v.lgCaseId] });
    },
  });
}

export function usePostFeeCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chargeId, userCode }: { chargeId: string; userCode: string | null }) => postFeeCharge(chargeId, userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_fee_charge"] });
      qc.invalidateQueries({ queryKey: ["lg_fee_waiver"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity"] });
    },
  });
}

export function useAutoApplyForEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lgCaseId, eventCode, userCode }: { lgCaseId: string; eventCode: string; userCode?: string | null }) =>
      autoApplyForEvent(lgCaseId, eventCode, userCode ?? null),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["lg_fee_charge", v.lgCaseId] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity", v.lgCaseId] });
    },
  });
}

export function useWaivers(lgCaseId: string | undefined) {
  return useQuery({
    queryKey: ["lg_fee_waiver", lgCaseId],
    queryFn: () => listWaivers(lgCaseId as string),
    enabled: !!lgCaseId,
  });
}

export function useRequestWaiver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: requestWaiver,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_fee_waiver"] });
      qc.invalidateQueries({ queryKey: ["lg_fee_charge"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity"] });
    },
  });
}

export function useApproveWaiver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ waiverId, userCode }: { waiverId: string; userCode: string | null }) => approveWaiver(waiverId, userCode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_fee_waiver"] });
      qc.invalidateQueries({ queryKey: ["lg_fee_charge"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity"] });
    },
  });
}

export function useRejectWaiver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ waiverId, userCode, reason }: { waiverId: string; userCode: string | null; reason?: string }) =>
      rejectWaiver(waiverId, userCode, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_fee_waiver"] });
      qc.invalidateQueries({ queryKey: ["lg_fee_charge"] });
      qc.invalidateQueries({ queryKey: ["lg_case_activity"] });
    },
  });
}

export function useLedgerEntry(ledgerEntryId: string | null | undefined) {
  return useQuery({
    queryKey: ["ce_ledger_entry", ledgerEntryId],
    enabled: !!ledgerEntryId,
    queryFn: async () => {
      const { data, error } = await sb.from("ce_employer_financial_ledger").select("*").eq("id", ledgerEntryId).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useWaiverReasons() {
  return useQuery({
    queryKey: ["ref_LG_WAIVER_REASON"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_reference_value")
        .select("value_code, value_label, core_reference_group!inner(group_code)")
        .eq("core_reference_group.group_code", "LG_WAIVER_REASON")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFeeEvents() {
  return useQuery({
    queryKey: ["ref_LG_FEE_EVENT"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_reference_value")
        .select("value_code, value_label, core_reference_group!inner(group_code)")
        .eq("core_reference_group.group_code", "LG_FEE_EVENT")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Admin
export function useFeeRules() {
  return useQuery({ queryKey: ["lg_fee_rule_all"], queryFn: listFeeRules });
}
export function useUpsertFeeRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ row, userCode }: { row: any; userCode: string | null }) => upsertFeeRule(row, userCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_fee_rule_all"] }),
  });
}
export function useSetRuleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, userCode }: { id: string; status: "ACTIVE" | "INACTIVE" | "DRAFT"; userCode: string | null }) =>
      setRuleStatus(id, status, userCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_fee_rule_all"] }),
  });
}
export function useFeeBundlesAdmin() {
  return useQuery({ queryKey: ["lg_fee_bundle_all"], queryFn: listFeeBundles });
}
export function useUpsertBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ row, userCode }: { row: any; userCode: string | null }) => upsertBundle(row, userCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_fee_bundle_all"] }),
  });
}
export function useSetBundleItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bundleId, items }: { bundleId: string; items: any[] }) => setBundleItems(bundleId, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lg_fee_bundle_all"] }),
  });
}
