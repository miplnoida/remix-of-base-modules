import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onlineResponseService } from '@/services/onlineResponseService';
import type { OnlineResponseSettings, OnlineResponsePolicy } from '@/types/onlineResponse';
import { useUserCode } from '@/hooks/useUserCode';

const SETTINGS_KEY = ['online-response', 'settings'] as const;
const POLICIES_KEY = ['online-response', 'policies'] as const;

export function useOnlineResponseSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => onlineResponseService.getSettings(),
  });
}

export function useUpdateOnlineResponseSettings() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<OnlineResponseSettings> }) =>
      onlineResponseService.updateSettings(id, patch, userCode || undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

export function useOnlineResponsePolicies() {
  return useQuery({
    queryKey: POLICIES_KEY,
    queryFn: () => onlineResponseService.listPolicies(),
  });
}

export function useUpsertOnlineResponsePolicy() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  return useMutation({
    mutationFn: ({ id, patch }: { id?: string; patch: Partial<OnlineResponsePolicy> }) =>
      id
        ? onlineResponseService.updatePolicy(id, patch, userCode || undefined)
        : onlineResponseService.createPolicy(patch, userCode || undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: POLICIES_KEY }),
  });
}

export function useTogglePolicyActive() {
  const qc = useQueryClient();
  const { userCode } = useUserCode();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      onlineResponseService.setActive(id, isActive, userCode || undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: POLICIES_KEY }),
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => onlineResponseService.deletePolicy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: POLICIES_KEY }),
  });
}
