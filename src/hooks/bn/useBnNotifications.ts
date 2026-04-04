/**
 * BN Notification Integration Hooks
 * 
 * React hooks for dispatching and querying BN lifecycle notifications
 * through the existing enterprise notification system.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  dispatchBnNotification,
  getClaimNotificationHistory,
  getBatchNotificationStats,
  retryFailedNotification,
  type BnNotificationDispatchRequest,
} from '@/services/bn/bnNotificationIntegrationService';

// ─── Dispatch Hook ─────────────────────────────────────────────────

export function useBnNotificationDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BnNotificationDispatchRequest) => {
      return dispatchBnNotification(request);
    },
    onSuccess: (result, request) => {
      if (result.dispatched) {
        const successCount = result.channels.filter(c => c.success).length;
        if (!result.workflowGoverned) {
          toast.success(`Notification sent (${successCount} channel${successCount !== 1 ? 's' : ''})`);
        }
      } else {
        const errors = result.channels.filter(c => !c.success).map(c => c.error).join('; ');
        toast.error('Notification dispatch failed', { description: errors || 'Unknown error' });
      }
      // Invalidate notification history
      queryClient.invalidateQueries({ queryKey: ['bn-notification-history'] });
      queryClient.invalidateQueries({ queryKey: ['in-app-notifications'] });
    },
    onError: (error: any) => {
      toast.error('Notification error', { description: error.message });
    },
  });
}

// ─── Notification History ──────────────────────────────────────────

export function useBnNotificationHistory(claimId?: string) {
  return useQuery({
    queryKey: ['bn-notification-history', claimId],
    queryFn: () => getClaimNotificationHistory(claimId!),
    enabled: !!claimId,
    staleTime: 30_000,
  });
}

// ─── Batch Notification Stats ──────────────────────────────────────

export function useBnBatchNotificationStats(batchId?: string) {
  return useQuery({
    queryKey: ['bn-batch-notification-stats', batchId],
    queryFn: () => getBatchNotificationStats(batchId!),
    enabled: !!batchId,
    staleTime: 30_000,
  });
}

// ─── Retry Failed ──────────────────────────────────────────────────

export function useBnNotificationRetry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ logId, retriedBy }: { logId: string; retriedBy: string }) => {
      const success = await retryFailedNotification(logId, retriedBy);
      if (!success) throw new Error('Notification not found or not in failed status');
      return success;
    },
    onSuccess: () => {
      toast.success('Notification retry queued');
      queryClient.invalidateQueries({ queryKey: ['bn-notification-history'] });
    },
    onError: (error: any) => {
      toast.error('Retry failed', { description: error.message });
    },
  });
}
