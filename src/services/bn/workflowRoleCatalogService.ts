/**
 * workflowRoleCatalogService — DB-backed catalogue of workflow roles.
 *
 * `public.roles` is the source of truth. The static TS list
 * `BN_WORKFLOW_ROLES` in `registries/workflowRolesRegistry.ts` is only a
 * fallback for offline / first-paint usage.
 */
import { supabase } from '@/integrations/supabase/client';
import { BN_WORKFLOW_ROLES } from './registries/workflowRolesRegistry';

const db = supabase as any;

let _cache: { at: number; roles: string[] } | null = null;
const TTL_MS = 5 * 60 * 1000;

/** Generic operational roles still permitted alongside BN_* roles. */
const GENERIC_ALLOW = new Set<string>([
  'INTAKE_OFFICER',
  'EVIDENCE_OFFICER',
  'MEDICAL_OFFICER',
  'MEDICAL_BOARD',
  'CLAIMS_SUPERVISOR',
  'FINANCE_OFFICER',
  'FINANCE_SUPERVISOR',
  'DIRECTOR',
  'COMPLIANCE_OFFICER',
]);

/** Fetch all active workflow roles (BN_* + generic operational). */
export async function fetchWorkflowRoles(force = false): Promise<string[]> {
  if (!force && _cache && Date.now() - _cache.at < TTL_MS) return _cache.roles;
  try {
    const { data, error } = await db
      .from('roles')
      .select('role_name')
      .eq('is_active', true);
    if (error) throw error;
    const fromDb: string[] = (data ?? [])
      .map((r: any) => r.role_name as string)
      .filter((n: string) => !!n && (n.startsWith('BN_') || GENERIC_ALLOW.has(n)));
    const merged = Array.from(new Set([...fromDb, ...BN_WORKFLOW_ROLES])).sort();
    _cache = { at: Date.now(), roles: merged };
    return merged;
  } catch (e) {
    console.warn('[workflowRoleCatalog] DB fetch failed, using static fallback:', e);
    return [...BN_WORKFLOW_ROLES].sort();
  }
}

/** BN-prefixed roles only. */
export async function fetchBnWorkflowRoles(): Promise<string[]> {
  const all = await fetchWorkflowRoles();
  return all.filter((r) => r.startsWith('BN_'));
}

export function invalidateWorkflowRoleCache() {
  _cache = null;
}
