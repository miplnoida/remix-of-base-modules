/**
 * Employer Registry — React hooks that consume the BM-SET-1 central
 * business-settings service via the Employer adapter. Employer pages and
 * components MUST use these hooks (or the adapter functions) rather than
 * querying raw comm_* / core_configuration_assignment tables.
 */
import { useQuery } from '@tanstack/react-query';
import {
  resolveEmployerRegistrySettings,
  resolveEmployerRegistryCommunication,
  previewEmployerRegistryCommunication,
  validateEmployerRegistryReadiness,
  type EmployerRegistryBusinessEvent,
} from './communication';
import type {
  BusinessModuleSettingsContext,
  BusinessModuleRelevantSettings,
  BusinessModuleReadinessResult,
} from '@/platform/business-settings/businessModuleSettingsTypes';
import type {
  BusinessCommunicationInput,
  BusinessCommunicationContext,
} from '@/lib/comm/businessCommunicationResolver';

type EmployerCtx = Omit<BusinessModuleSettingsContext, 'moduleCode'>;
type EmployerCommInput = Omit<BusinessCommunicationInput, 'moduleCode'>;

const KEY = ['employer-registry', 'business-settings'] as const;

export function useEmployerRegistrySettings(ctx: EmployerCtx | null) {
  return useQuery<BusinessModuleRelevantSettings>({
    queryKey: [...KEY, 'settings', ctx],
    queryFn: () => resolveEmployerRegistrySettings(ctx as EmployerCtx),
    enabled: !!ctx,
    staleTime: 30_000,
  });
}

export function useEmployerRegistryCommunication(input: (EmployerCommInput & { businessEventCode: EmployerRegistryBusinessEvent }) | null) {
  return useQuery<BusinessCommunicationContext>({
    queryKey: [...KEY, 'communication', input],
    queryFn: () => resolveEmployerRegistryCommunication(input as EmployerCommInput),
    enabled: !!input?.businessEventCode,
    staleTime: 15_000,
  });
}

export function useEmployerRegistryCommunicationPreview(input: (EmployerCommInput & { businessEventCode: EmployerRegistryBusinessEvent }) | null) {
  return useQuery<BusinessCommunicationContext>({
    queryKey: [...KEY, 'communication-preview', input],
    queryFn: () => previewEmployerRegistryCommunication(input as EmployerCommInput),
    enabled: !!input?.businessEventCode,
    staleTime: 15_000,
  });
}

export function useEmployerRegistryReadiness(
  ctx: (EmployerCtx & { businessEventCode: EmployerRegistryBusinessEvent }) | null,
  requiredSettingKeys?: string[],
) {
  return useQuery<BusinessModuleReadinessResult>({
    queryKey: [...KEY, 'readiness', ctx, requiredSettingKeys ?? null],
    queryFn: () => validateEmployerRegistryReadiness(ctx as EmployerCtx, requiredSettingKeys),
    enabled: !!ctx?.businessEventCode,
    staleTime: 15_000,
  });
}
