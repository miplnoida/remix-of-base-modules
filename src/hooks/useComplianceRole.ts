import { useMemo } from 'react';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import type { ComplianceOperationalRole } from '@/lib/compliance/capabilities';

/**
 * Derives the user's operational role inside the Compliance & Enforcement module.
 * Resolution priority: ComplianceHead > SeniorInspector > ComplianceInspector > other.
 *
 * Reads role names from the auth context. Tolerant of multiple shapes:
 *   - profile.roles: string[]
 *   - profile.role_names: string[]
 *   - profile.role: string
 */
export function useComplianceRole(): ComplianceOperationalRole {
  const { profile } = useSupabaseAuth() as any;

  return useMemo<ComplianceOperationalRole>(() => {
    const collected: string[] = [];
    if (Array.isArray(profile?.roles)) collected.push(...profile.roles);
    if (Array.isArray(profile?.role_names)) collected.push(...profile.role_names);
    if (typeof profile?.role === 'string') collected.push(profile.role);
    if (typeof profile?.role_name === 'string') collected.push(profile.role_name);

    const names = collected.map((r) => String(r).toLowerCase());

    if (names.some((n) => n.includes('compliancehead') || n === 'compliance head')) return 'head';
    if (names.some((n) => n.includes('seniorinspector') || n === 'senior inspector')) return 'senior';
    if (names.some((n) => n.includes('complianceinspector') || n === 'compliance inspector')) {
      return 'inspector';
    }
    return 'other';
  }, [profile]);
}
