/**
 * Approval Console Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as svc from '@/services/bn/approvalConsoleService';

export function useBnApprovalQueue(filters: svc.ApprovalFilters = {}) {
  return useQuery({
    queryKey: ['bn', 'approval-queue', filters],
    queryFn: () => svc.fetchApprovalQueue(filters),
    refetchInterval: 30000, // Auto-refresh every 30s for queue
  });
}

export function useBnApprovalCaseSummary(claimId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'approval-case', claimId],
    queryFn: () => svc.fetchApprovalCaseSummary(claimId!),
    enabled: !!claimId,
  });
}

export function useExecuteApprovalAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'approval', 'action'],
    mutationFn: (params: svc.ExecuteApprovalParams) => svc.executeApprovalAction(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'approval-queue'] });
      qc.invalidateQueries({ queryKey: ['bn', 'claims'] });
    },
  });
}

export function useBulkApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'approval', 'bulk'],
    mutationFn: (params: { claimIds: string[]; narrative: string; performedBy: string }) =>
      svc.executeBulkApproval(params.claimIds, params.narrative, params.performedBy),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'approval-queue'] });
      qc.invalidateQueries({ queryKey: ['bn', 'claims'] });
    },
  });
}
