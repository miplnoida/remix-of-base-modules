/**
 * React Query hooks for the Payables Queue
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPayables,
  fetchPayableDetail,
  executePayableAction,
  executeBulkPayableAction,
  type PayableFilters,
  type ExecutePayableActionParams,
} from '@/services/bn/payablesQueueService';
import { toast } from 'sonner';

export function useBnPayables(filters: PayableFilters = {}) {
  return useQuery({
    queryKey: ['bn', 'payables', filters],
    queryFn: () => fetchPayables(filters),
    refetchInterval: 30_000,
  });
}

export function useBnPayableDetail(instructionId: string | null) {
  return useQuery({
    queryKey: ['bn', 'payable-detail', instructionId],
    queryFn: () => fetchPayableDetail(instructionId!),
    enabled: !!instructionId,
  });
}

export function useBnPayableAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: ExecutePayableActionParams) => executePayableAction(params),
    onSuccess: (_, vars) => {
      toast.success(`Payable ${vars.action.toLowerCase().replace(/_/g, ' ')} completed`);
      qc.invalidateQueries({ queryKey: ['bn', 'payables'] });
      qc.invalidateQueries({ queryKey: ['bn', 'payable-detail'] });
      qc.invalidateQueries({ queryKey: ['bn', 'entitlements'] });
    },
    onError: (err: any) => {
      toast.error('Action failed', { description: err.message });
    },
  });
}

export function useBnBulkPayableAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { ids: string[]; action: string; performedBy: string; narrative?: string }) =>
      executeBulkPayableAction(params.ids, params.action, params.performedBy, params.narrative),
    onSuccess: (result) => {
      toast.success(`Bulk action: ${result.succeeded} succeeded, ${result.failed} failed`);
      qc.invalidateQueries({ queryKey: ['bn', 'payables'] });
    },
    onError: (err: any) => {
      toast.error('Bulk action failed', { description: err.message });
    },
  });
}
