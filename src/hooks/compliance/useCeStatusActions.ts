/**
 * useCeStatusActions
 *
 * Thin React hook that surfaces the workflow-driven status actions available
 * for a Compliance entity, and exposes a `transition()` mutation that routes
 * through the existing workflow engine + ce_apply_status_transition RPC.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ceWorkflowStatusService,
  type CeEntityType,
  type AvailableAction,
  type TransitionResult,
} from '@/services/ceWorkflowStatusService';
import { useUserCode } from '@/hooks/useUserCode';
import { toast } from 'sonner';

export interface UseCeStatusActionsOptions {
  entityType: CeEntityType;
  recordId: string | null | undefined;
  fromStatus: string | null | undefined;
  /** Query keys to invalidate after a successful APPLIED transition. */
  invalidateKeys?: unknown[][];
}

export function useCeStatusActions(opts: UseCeStatusActionsOptions) {
  const queryClient = useQueryClient();
  const { userCode } = useUserCode();
  const { entityType, recordId, fromStatus, invalidateKeys = [] } = opts;

  const actionsQuery = useQuery<AvailableAction[]>({
    queryKey: ['ce-status-actions', entityType, fromStatus],
    queryFn: () => ceWorkflowStatusService.listAllowedActions(entityType, fromStatus!),
    enabled: !!fromStatus,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation<TransitionResult, Error, { actionCode: string; notes?: string }>({
    mutationFn: async ({ actionCode, notes }) => {
      if (!recordId) throw new Error('Missing record id');
      return ceWorkflowStatusService.requestTransition({
        entityType,
        recordId,
        actionCode,
        userCode: userCode || 'UNKNOWN',
        notes,
      });
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error('Transition failed', { description: result.error });
        return;
      }
      if (result.mode === 'WORKFLOW_REQUIRED') {
        toast.info('Approval workflow started', {
          description: 'This transition requires approval before it takes effect.',
        });
      } else {
        toast.success(
          `Status updated: ${result.toStatus?.replace(/_/g, ' ')}`,
          { description: result.fromStatus ? `From ${result.fromStatus.replace(/_/g, ' ')}` : undefined }
        );
      }
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    },
    onError: (err) => {
      toast.error('Transition failed', { description: err.message });
    },
  });

  return {
    availableActions: actionsQuery.data ?? [],
    isLoadingActions: actionsQuery.isLoading,
    actionsError: actionsQuery.error as Error | null,
    transition: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
