/**
 * Dev-only diagnostic for permission pagination correctness.
 *
 * Run from the browser console after logging in:
 *
 *   import('@/lib/permissions/permissionAudit').then(m => m.auditCurrentUserPermissions())
 *
 * Or call auditUserPermissions(userId) directly with a known UAT user id.
 *
 * Verifies:
 *  - the paginated helper returns the FULL permission set (not capped at 1000),
 *  - compares against a single unpaginated RPC call to surface truncation,
 *  - lists distinct modules and reports presence of expected compliance modules.
 */
import { supabase } from '@/integrations/supabase/client';
import { fetchAllUserPermissions } from './fetchAllUserPermissions';

const EXPECTED_COMPLIANCE_MODULES = [
  'ce_violations',
  'ce_waivers',
  'ce_waiver_requests',
  'ce_cases',
  'ce_feature_toggles',
];

export interface PermissionAuditReport {
  userId: string;
  paginatedCount: number;
  unpaginatedCount: number;
  truncationDetected: boolean;
  distinctModuleCount: number;
  hasComplianceModules: Record<string, boolean>;
  exceedsPostgrestCap: boolean;
}

export async function auditUserPermissions(userId: string): Promise<PermissionAuditReport> {
  const paginated = await fetchAllUserPermissions(userId);
  const { data: rawData, error } = await (supabase.rpc as any)('get_user_permissions', { _user_id: userId });
  if (error) throw error;
  const unpaginatedCount = (rawData || []).length;

  const modules = new Set(paginated.map((p) => p.module_name));
  const hasComplianceModules: Record<string, boolean> = {};
  for (const m of EXPECTED_COMPLIANCE_MODULES) hasComplianceModules[m] = modules.has(m);

  const report: PermissionAuditReport = {
    userId,
    paginatedCount: paginated.length,
    unpaginatedCount,
    truncationDetected: unpaginatedCount < paginated.length,
    distinctModuleCount: modules.size,
    exceedsPostgrestCap: paginated.length > 1000,
    hasComplianceModules,
  };
  // eslint-disable-next-line no-console
  console.table(report);
  // eslint-disable-next-line no-console
  console.log('[permissionAudit] compliance modules:', hasComplianceModules);
  return report;
}

export async function auditCurrentUserPermissions(): Promise<PermissionAuditReport | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user?.id) {
    // eslint-disable-next-line no-console
    console.warn('[permissionAudit] no authenticated user');
    return null;
  }
  return auditUserPermissions(data.user.id);
}

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).__auditPermissions = auditCurrentUserPermissions;
}
