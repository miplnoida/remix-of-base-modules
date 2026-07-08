/**
 * Epic BM-SET-1 — React Query hooks for business modules.
 *
 * Business pages should call these hooks and never call the low-level
 * resolvers directly. All hooks memoize the query key on the caller's
 * context so switching module / event refetches cleanly.
 */
import { useQuery } from '@tanstack/react-query';
import {
  resolveRelevantSettingsForModule,
  resolveBusinessModuleCommunicationContext,
  validateBusinessModuleSettingsReadiness,
} from './businessModuleSettingsService';
import type {
  BusinessModuleSettingsContext,
  BusinessModuleRelevantSettings,
  BusinessModuleReadinessResult,
} from './businessModuleSettingsTypes';
import type {
  BusinessCommunicationInput,
  BusinessCommunicationContext,
} from '@/lib/comm/businessCommunicationResolver';

const BASE_KEY = ['business-settings'] as const;

export function useRelevantSettingsForModule(context: BusinessModuleSettingsContext | null) {
  const query = useQuery<BusinessModuleRelevantSettings>({
    queryKey: [...BASE_KEY, 'relevant', context],
    queryFn: () => resolveRelevantSettingsForModule(context as BusinessModuleSettingsContext),
    enabled: !!context?.moduleCode,
    staleTime: 30_000,
  });
  return {
    ...query,
    warnings: query.data?.warnings ?? [],
    healthStatus: query.data?.healthStatus ?? 'MISSING',
  };
}

export function useBusinessModuleCommunicationContext(input: BusinessCommunicationInput | null) {
  const query = useQuery<BusinessCommunicationContext>({
    queryKey: [...BASE_KEY, 'communication', input],
    queryFn: () => resolveBusinessModuleCommunicationContext(input as BusinessCommunicationInput),
    enabled: !!input?.moduleCode,
    staleTime: 15_000,
  });
  return {
    ...query,
    warnings: query.data?.warnings ?? [],
  };
}

export function useBusinessModuleSettingsReadiness(
  context: BusinessModuleSettingsContext | null,
  requiredSettingKeys?: string[],
) {
  const query = useQuery<BusinessModuleReadinessResult>({
    queryKey: [...BASE_KEY, 'readiness', context, requiredSettingKeys ?? null],
    queryFn: () =>
      validateBusinessModuleSettingsReadiness(
        context as BusinessModuleSettingsContext,
        requiredSettingKeys,
      ),
    enabled: !!context?.moduleCode,
    staleTime: 15_000,
  });
  return {
    ...query,
    warnings: query.data?.warnings ?? [],
    healthStatus: query.data?.healthStatus ?? 'MISSING',
  };
}
