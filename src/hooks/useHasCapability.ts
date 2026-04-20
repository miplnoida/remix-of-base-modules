import { useMemo } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useComplianceRole } from './useComplianceRole';
import {
  hasCapability,
  type ComplianceCapability,
  LEGACY_PERMISSION_FALLBACK,
} from '@/lib/compliance/capabilities';

/**
 * Capability gate for Compliance & Enforcement features.
 * Returns true if the user's operational role grants the capability,
 * OR they hold the legacy `manage_compliance` permission (Phase-1 fallback).
 */
export function useHasCapability(capability: ComplianceCapability): boolean {
  const role = useComplianceRole();
  const auth = useSupabaseAuth() as any;

  return useMemo(() => {
    if (hasCapability(role, capability)) return true;

    // Legacy fallback — check user permissions list / hasPermission helper
    const perms: string[] = Array.isArray(auth?.permissions) ? auth.permissions : [];
    if (perms.includes(LEGACY_PERMISSION_FALLBACK)) return true;
    if (typeof auth?.hasPermission === 'function' && auth.hasPermission(LEGACY_PERMISSION_FALLBACK)) {
      return true;
    }
    // Admin always passes
    if (Array.isArray(auth?.roles) && auth.roles.includes('Admin')) return true;
    return false;
  }, [role, capability, auth]);
}
