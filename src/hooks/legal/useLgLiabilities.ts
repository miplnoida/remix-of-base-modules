import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listLiabilitiesForCase,
  getCaseLiabilityRollup,
  createLiability,
  updateLiability,
  deleteLiability,
  mergeLiabilities,
  splitLiability,
  listAllocations,
  allocatePayment,
} from "@/services/legal/lgLiabilityService";
import type { CreateLiabilityInput } from "@/types/legal/liability";
import { useUserCode } from "@/hooks/useUserCode";

export function useCaseLiabilities(caseId?: string) {
  return useQuery({
    queryKey: ["lg_liabilities", caseId],
    enabled: !!caseId,
    queryFn: () => listLiabilitiesForCase(caseId!),
    staleTime: 30_000,
  });
}

export function useCaseLiabilityRollup(caseId?: string) {
  return useQuery({
    queryKey: ["lg_liab_rollup", caseId],
    enabled: !!caseId,
    queryFn: () => getCaseLiabilityRollup(caseId!),
    staleTime: 30_000,
  });
}

export function useLiabilityAllocations(liabilityId?: string) {
  return useQuery({
    queryKey: ["lg_liab_allocations", liabilityId],
    enabled: !!liabilityId,
    queryFn: () => listAllocations(liabilityId!),
  });
}

export function useCreateLiability(caseId: string) {
  const qc = useQueryClient();
  const userCode = useUserCode();
  return useMutation({
    mutationFn: (input: CreateLiabilityInput) => createLiability(input, userCode ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_liabilities", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_liab_rollup", caseId] });
    },
  });
}

export function useUpdateLiability(caseId: string) {
  const qc = useQueryClient();
  const userCode = useUserCode();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreateLiabilityInput> }) =>
      updateLiability(id, patch, userCode ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_liabilities", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_liab_rollup", caseId] });
    },
  });
}

export function useDeleteLiability(caseId: string) {
  const qc = useQueryClient();
  const userCode = useUserCode();
  return useMutation({
    mutationFn: (id: string) => deleteLiability(id, userCode ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_liabilities", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_liab_rollup", caseId] });
    },
  });
}

export function useMergeLiabilities(caseId: string) {
  const qc = useQueryClient();
  const userCode = useUserCode();
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch?: Partial<CreateLiabilityInput> }) =>
      mergeLiabilities(ids, caseId, patch ?? {}, userCode ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_liabilities", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_liab_rollup", caseId] });
    },
  });
}

export function useSplitLiability(caseId: string) {
  const qc = useQueryClient();
  const userCode = useUserCode();
  return useMutation({
    mutationFn: ({ id, parts }: { id: string; parts: Array<Record<string, number | string | undefined>> }) =>
      splitLiability(id, parts as any, userCode ?? null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lg_liabilities", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_liab_rollup", caseId] });
    },
  });
}

export function useAllocatePayment(caseId: string) {
  const qc = useQueryClient();
  const userCode = useUserCode();
  return useMutation({
    mutationFn: (args: {
      liabilityId: string;
      payment_id: string;
      payment_ref?: string;
      payment_date?: string;
      allocated_amount: number;
      component?: string;
      allocation_rule?: string;
      remarks?: string;
    }) => allocatePayment(args.liabilityId, {
      payment_id: args.payment_id,
      payment_ref: args.payment_ref ?? null,
      payment_date: args.payment_date ?? null,
      allocated_amount: args.allocated_amount,
      component: (args.component as any) ?? null,
      allocation_rule: (args.allocation_rule as any) ?? null,
      remarks: args.remarks ?? null,
    }, userCode ?? null),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["lg_liab_allocations", vars.liabilityId] });
      qc.invalidateQueries({ queryKey: ["lg_liabilities", caseId] });
      qc.invalidateQueries({ queryKey: ["lg_liab_rollup", caseId] });
    },
  });
}
