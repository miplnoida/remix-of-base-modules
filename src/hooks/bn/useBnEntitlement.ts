/**
 * Entitlement Management Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as svc from '@/services/bn/entitlementService';

export function useBnEntitlements(filters: svc.EntitlementFilters = {}) {
  return useQuery({
    queryKey: ['bn', 'entitlements', filters],
    queryFn: () => svc.fetchEntitlements(filters),
  });
}

export function useBnEntitlementDetail(entitlementId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'entitlement', entitlementId],
    queryFn: () => svc.fetchEntitlementDetail(entitlementId!),
    enabled: !!entitlementId,
  });
}

export function useBnEntitlementEvents(entitlementId: string | undefined) {
  return useQuery({
    queryKey: ['bn', 'entitlement-events', entitlementId],
    queryFn: () => svc.fetchEntitlementEvents(entitlementId!),
    enabled: !!entitlementId,
  });
}

export function useExecuteEntitlementAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'entitlement', 'action'],
    mutationFn: (params: svc.ExecuteEntitlementActionParams) => svc.executeEntitlementAction(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'entitlements'] });
      qc.invalidateQueries({ queryKey: ['bn', 'entitlement'] });
      qc.invalidateQueries({ queryKey: ['bn', 'claims'] });
      qc.invalidateQueries({ queryKey: ['bn', 'person360'] });
    },
  });
}

export function useUpdateEntitlementFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['bn', 'entitlement', 'update'],
    mutationFn: (params: svc.UpdateEntitlementParams) => svc.updateEntitlementFields(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bn', 'entitlements'] });
      qc.invalidateQueries({ queryKey: ['bn', 'entitlement'] });
    },
  });
}
