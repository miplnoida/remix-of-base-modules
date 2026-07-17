/**
 * Award 360 permission resolver — BN-AWARD360-B3.
 *
 * Rebuilt around a typed capability registry (`award360Capabilities.ts`) that
 * binds every UI capability to a *canonical* live `app_modules.name` +
 * `module_actions.action_name` pair. Generic non-registered names like
 * `bn_awards`, `bn_audit`, `bn_payments`, `bn_communications` are removed.
 *
 * When a module or action is missing from the registry the resolver:
 *   1. Denies the capability.
 *   2. Records a diagnostic `reason`.
 *   3. Emits a `console.warn` in non-production / test environments.
 *
 * The public API preserves the boolean flags previously consumed by Award 360
 * tabs (`canViewAward`, `canServicePayments`, etc.) so existing callers do not
 * need to change. New callers should read from `capabilities` directly.
 */
import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { fetchAllUserPermissions } from '@/lib/permissions/fetchAllUserPermissions';
import { isFeatureEnabled } from '@/lib/bn/featureToggles';
import {
  AWARD_360_CAPABILITY_REGISTRY,
  type Award360Capability,
  type Award360CapabilityResult,
  type Award360ModuleRegistryState,
  type Award360RegistryDiagnostics,
  type RegistrySnapshot,
  type UserPermissionRecord,
  resolveAward360Capabilities,
} from './award360Capabilities';

export interface Award360Permissions {
  // Legacy flag surface (preserved for existing tab consumers).
  canViewAward: boolean;
  canViewCentralAudit: boolean;
  canPropose: boolean;
  canApprove: boolean;
  canServiceLifeCert: boolean;
  canServiceMedical: boolean;
  canServiceOverpayment: boolean;
  canServiceSuspension: boolean;
  canServicePayments: boolean;
  canServiceCommunications: boolean;
  /** Communication *content* (rendered subject/body). Always false — no dedicated action registered. */
  canViewCommunicationContent: boolean;
  canViewSensitiveMedical: boolean;
  isLoading: boolean;
  /** True once every dependency (admin RPC, registry, user permissions) has resolved. */
  isReady: boolean;

  // Admin diagnostics — BN-AWARD360-ADMIN-1.
  admin: {
    isAdmin: boolean;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
  };

  // BN-AWARD360-ADMIN-2 — permission-resolution error surface.
  registryError: Error | null;
  userPermissionsError: Error | null;
  hasPermissionResolutionError: boolean;
  refetchAllPermissions: () => Promise<void>;

  // New: typed capability map with diagnostics.
  capabilities: Record<Award360Capability, Award360CapabilityResult>;
  registryDiagnostics?: Award360RegistryDiagnostics | null;
}

export interface Award360FeatureFlags {
  lifeCert: boolean;
  medicalReview: boolean;
  overpayment: boolean;
  awardSuspension: boolean;
  payments: boolean;
}

export {
  EXPECTED_AWARD360_PROJECT_REF,
  getSupabaseProjectRef,
  fetchAllPages,
  fetchAllPagesWithCount,
  fetchRegistrySnapshot,
  getRequiredModuleNames,
} from './award360RegistryService';
import { fetchRegistrySnapshot } from './award360RegistryService';

const emittedWarnings = new Set<string>();
function warnOnce(msg: string) {
  if (emittedWarnings.has(msg)) return;
  emittedWarnings.add(msg);
  // eslint-disable-next-line no-console
  console.warn(msg);
}

export function useAward360Permissions(): Award360Permissions {
  const { user, isAuthReady, isAuthenticated } = useSupabaseAuth();
  const admin = useAdminStatus();
  const qc = useQueryClient();
  const isAdmin = admin.isAdmin;

  const registryQ = useQuery({
    queryKey: ['award360-registry-snapshot'],
    queryFn: fetchRegistrySnapshot,
    enabled: isAuthReady && isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const userPermsQ = useQuery({
    queryKey: ['award360-user-permissions', user?.id],
    queryFn: async (): Promise<UserPermissionRecord[]> => {
      if (!user?.id) return [];
      const rows = await fetchAllUserPermissions(user.id);
      return rows
        .filter((r) => r.is_granted !== false)
        .map((r) => ({ module_name: r.module_name, action_name: r.action_name }));
    },
    enabled: isAuthReady && isAuthenticated && !!user?.id,
  });

  const isLoading = admin.isLoading || registryQ.isLoading || userPermsQ.isLoading;
  const isReady = !isLoading && !!registryQ.data && !!userPermsQ.data;

  const capabilities = useMemo(() => {
    const registry: RegistrySnapshot = registryQ.data ?? {
      modules: new Set<string>(),
      actionsByModule: new Map<string, Set<string>>(),
    };
    const userPermissions = userPermsQ.data ?? [];
    const warn = import.meta?.env?.MODE !== 'production' ? warnOnce : undefined;
    return resolveAward360Capabilities({ registry, userPermissions, isAdmin, warn });
  }, [registryQ.data, userPermsQ.data, isAdmin]);

  const suspensionPerms = useMemo(() => {
    const userPermissions = userPermsQ.data ?? [];
    const has = (mod: string, action: string) =>
      isAdmin || userPermissions.some((p) => p.module_name === mod && p.action_name === action);
    return {
      canProposeSuspension: has('bn_award_suspension', 'propose'),
      canApproveSuspension: has('bn_award_suspension', 'approve'),
    };
  }, [userPermsQ.data, isAdmin]);

  const registryError = (registryQ.error as Error | null) ?? null;
  const userPermissionsError = (userPermsQ.error as Error | null) ?? null;
  const refetchAllPermissions = async (): Promise<void> => {
    // Invalidate first so any component consuming these keys reads stale=true.
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['is-admin', user?.id] }),
      qc.invalidateQueries({ queryKey: ['award360-registry-snapshot'] }),
      qc.invalidateQueries({ queryKey: ['award360-user-permissions', user?.id] }),
    ]);
    // Then await the actual refetch of the active queries so the caller can
    // trust that the promise resolves *after* fresh data is present.
    await Promise.all([
      Promise.resolve(admin.refetch()),
      qc.refetchQueries({ queryKey: ['award360-registry-snapshot'], type: 'active' }),
      qc.refetchQueries({ queryKey: ['award360-user-permissions', user?.id], type: 'active' }),
    ]);
  };

  const g = (cap: Award360Capability) => capabilities[cap]?.permissionGranted ?? false;

  return {
    canViewAward: g('AWARD_VIEW'),
    canViewCentralAudit: g('CENTRAL_AUDIT_VIEW'),
    canPropose: suspensionPerms.canProposeSuspension,
    canApprove: suspensionPerms.canApproveSuspension,
    canServiceLifeCert: g('LIFE_CERTIFICATE_VIEW'),
    canServiceMedical: g('MEDICAL_REVIEW_VIEW'),
    canServiceOverpayment: g('OVERPAYMENT_VIEW'),
    canServiceSuspension: g('SUSPENSION_VIEW'),
    canServicePayments: g('PAYMENT_HISTORY_VIEW') || g('PAYMENT_PROFILE_VIEW'),
    canServiceCommunications: g('COMMUNICATION_METADATA_VIEW'),
    canViewCommunicationContent: false,
    canViewSensitiveMedical: g('MEDICAL_REVIEW_VIEW'),
    isLoading,
    isReady,
    admin: {
      isAdmin: admin.isAdmin,
      isLoading: admin.isLoading,
      isError: admin.isError,
      error: admin.error,
      refetch: admin.refetch,
    },
    registryError,
    userPermissionsError,
    hasPermissionResolutionError: !!(admin.isError || registryError || userPermissionsError),
    refetchAllPermissions,
    capabilities,
    registryDiagnostics: registryQ.data?.diagnostics ?? null,
  };
}


export function useAward360FeatureFlags(): Award360FeatureFlags {
  return {
    lifeCert: isFeatureEnabled('bn.servicing.lifeCert'),
    medicalReview: isFeatureEnabled('bn.servicing.medicalReview'),
    overpayment: isFeatureEnabled('bn.servicing.overpayment'),
    awardSuspension: isFeatureEnabled('bn.servicing.awardSuspension'),
    payments: isFeatureEnabled('bn.payments'),
  };
}

// Re-export capability types for consumers.
export type { Award360Capability, Award360CapabilityResult, Award360RegistryDiagnostics } from './award360Capabilities';
export { AWARD_360_CAPABILITY_REGISTRY } from './award360Capabilities';
