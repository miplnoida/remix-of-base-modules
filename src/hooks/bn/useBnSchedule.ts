/**
 * React Query hooks for Payment Schedule Management
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBlockingMutation } from '@/hooks/useBlockingMutation';
import {
  fetchScheduleRows,
  fetchScheduleSummary,
  executeScheduleRowAction,
  suspendFutureRows,
  regenerateSchedule,
  generateArrearsRows,
  type ScheduleFilters,
  type ExecuteScheduleActionParams,
} from '@/services/bn/scheduleService';
import { toast } from 'sonner';

export function useBnScheduleRows(filters: ScheduleFilters = {}) {
  return useQuery({
    queryKey: ['bn', 'schedule-rows', filters],
    queryFn: () => fetchScheduleRows(filters),
    refetchInterval: 30_000,
  });
}

export function useBnScheduleSummary(entitlementId: string | null) {
  return useQuery({
    queryKey: ['bn', 'schedule-summary', entitlementId],
    queryFn: () => fetchScheduleSummary(entitlementId!),
    enabled: !!entitlementId,
  });
}

export function useBnScheduleRowAction() {
  const qc = useQueryClient();
  return useBlockingMutation({
    mutationFn: (params: ExecuteScheduleActionParams) => executeScheduleRowAction(params),
    onSuccess: (_, vars) => {
      toast.success(`Schedule ${vars.action.toLowerCase().replace(/_/g, ' ')} completed`);
      qc.invalidateQueries({ queryKey: ['bn', 'schedule-rows'] });
      qc.invalidateQueries({ queryKey: ['bn', 'schedule-summary'] });
      qc.invalidateQueries({ queryKey: ['bn', 'payables'] });
    },
    onError: (err: any) => {
      toast.error('Action failed', { description: err.message });
    },
  }, 'Processing schedule action...');
}

export function useBnSuspendFutureRows() {
  const qc = useQueryClient();
  return useBlockingMutation({
    mutationFn: (params: { entitlementId: string; performedBy: string; narrative: string; reasonCodeId: string }) =>
      suspendFutureRows(params.entitlementId, params.performedBy, params.narrative, params.reasonCodeId),
    onSuccess: (count) => {
      toast.success(`${count} future rows suspended`);
      qc.invalidateQueries({ queryKey: ['bn', 'schedule-rows'] });
      qc.invalidateQueries({ queryKey: ['bn', 'schedule-summary'] });
    },
    onError: (err: any) => {
      toast.error('Suspend failed', { description: err.message });
    },
  }, 'Suspending future rows...');
}

export function useBnRegenerateSchedule() {
  const qc = useQueryClient();
  return useBlockingMutation({
    mutationFn: (params: { entitlementId: string; performedBy: string; narrative: string }) =>
      regenerateSchedule(params.entitlementId, params.performedBy, params.narrative),
    onSuccess: (result) => {
      toast.success(`Schedule regenerated: ${result.cancelledRows} cancelled, ${result.newRows} created`);
      qc.invalidateQueries({ queryKey: ['bn', 'schedule-rows'] });
      qc.invalidateQueries({ queryKey: ['bn', 'schedule-summary'] });
    },
    onError: (err: any) => {
      toast.error('Regeneration failed', { description: err.message });
    },
  }, 'Regenerating schedule...');
}

export function useBnGenerateArrears() {
  const qc = useQueryClient();
  return useBlockingMutation({
    mutationFn: (params: { entitlementId: string; arrearsFrom: string; arrearsTo: string; performedBy: string; narrative: string }) =>
      generateArrearsRows(params.entitlementId, params.arrearsFrom, params.arrearsTo, params.performedBy, params.narrative),
    onSuccess: (count) => {
      toast.success(`${count} arrears rows generated`);
      qc.invalidateQueries({ queryKey: ['bn', 'schedule-rows'] });
      qc.invalidateQueries({ queryKey: ['bn', 'schedule-summary'] });
    },
    onError: (err: any) => {
      toast.error('Arrears generation failed', { description: err.message });
    },
  }, 'Generating arrears...');
}
