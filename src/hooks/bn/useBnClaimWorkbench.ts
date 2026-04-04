/**
 * Claim Workbench Hooks — Extended hooks for the full claim workbench
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchLinkedClaims,
  fetchClaimStatusHistory,
  fetchClaimDetailJson,
  upsertClaimDetailJson,
  executeClaimAction,
} from '@/services/bn/claimWorkbenchService';

export function useBnLinkedClaims(claimId: string | undefined, ssn: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'linked-claims', claimId, ssn],
    queryFn: () => fetchLinkedClaims(claimId!, ssn!),
    enabled: !!claimId && !!ssn,
  });
}

export function useBnClaimStatusHistory(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'claim-status-history', claimId],
    queryFn: () => fetchClaimStatusHistory(claimId!),
    enabled: !!claimId,
  });
}

export function useBnClaimDetailJson(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'claim-detail-json', claimId],
    queryFn: () => fetchClaimDetailJson(claimId!),
    enabled: !!claimId,
  });
}

export function useUpsertBnClaimDetail() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'claim-detail', 'upsert'],
    mutationFn: ({ claimId, detailJson, userCode }: { claimId: string; detailJson: Record<string, any>; userCode: string }) =>
      upsertClaimDetailJson(claimId, detailJson, userCode),
    onSuccess: (_, { claimId }) => {
      qc.invalidateQueries({ queryKey: ['bn', 'claim-detail-json', claimId] });
    },
  });
}

export function useExecuteClaimAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'claim-action', 'execute'],
    mutationFn: (params: {
      claimId: string;
      action: string;
      fromStatus: string;
      toStatus: string;
      userCode: string;
      narrative?: string;
      reasonCode?: string;
    }) => executeClaimAction(
      params.claimId,
      params.action,
      params.fromStatus,
      params.toStatus,
      params.userCode,
      params.narrative,
      params.reasonCode,
    ),
    onSuccess: (result, { claimId }) => {
      if (result.success) {
        qc.invalidateQueries({ queryKey: ['bn', 'claim', claimId] });
        qc.invalidateQueries({ queryKey: ['bn', 'claims'] });
        qc.invalidateQueries({ queryKey: ['bn', 'claim-events', claimId] });
        qc.invalidateQueries({ queryKey: ['bn', 'claim-status-history', claimId] });
      }
    },
  });
}
