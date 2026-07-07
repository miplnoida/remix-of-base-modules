import { supabase } from '@/integrations/supabase/client';
import type { CheckResult, CheckStatus } from './types';

const db = supabase as any;

const nowIso = () => new Date().toISOString();

function pick(passed: boolean, warn = false): CheckStatus {
  if (passed) return 'PASSED';
  return warn ? 'WARNING' : 'FAILED';
}

// 1. Route health — every registered admin route should have requires_permission set and be active.
export async function checkRouteHealth(): Promise<CheckResult> {
  const { data, error } = await db
    .from('core_admin_route_registry')
    .select('route_path, canonical_status, requires_permission, is_active');
  if (error) return failed('ROUTE_HEALTH', 'Route Health', 'Routes', error.message);
  const rows = (data ?? []) as any[];
  const canonical = rows.filter((r) => r.canonical_status === 'CANONICAL' && r.is_active);
  const missingPerm = canonical.filter((r) => !r.requires_permission);
  const inactive = rows.filter((r) => !r.is_active).length;
  const issues = missingPerm.map((r) => `${r.route_path} — missing requires_permission`);
  return {
    check_code: 'ROUTE_HEALTH',
    check_name: 'Route Registry Health',
    category: 'Routes',
    status: pick(missingPerm.length === 0, missingPerm.length > 0 && missingPerm.length < 3),
    summary: `${canonical.length} canonical routes, ${missingPerm.length} without permission binding, ${inactive} inactive.`,
    details: [
      { label: 'Total routes', value: rows.length },
      { label: 'Canonical & active', value: canonical.length },
      { label: 'Missing permission', value: missingPerm.length },
    ],
    issues,
    ran_at: nowIso(),
  };
}

// 2. Table registry completeness — public tables should be registered.
export async function checkTableRegistry(): Promise<CheckResult> {
  const { data, error, count } = await db
    .from('core_table_registry')
    .select('table_name, module_code, lifecycle_status', { count: 'exact' });
  if (error) return failed('TABLE_REGISTRY', 'Table Registry Completeness', 'Tables', error.message);
  const rows = (data ?? []) as any[];
  const unclassified = rows.filter((r) => !r.module_code || r.module_code === 'UNKNOWN').length;
  return {
    check_code: 'TABLE_REGISTRY',
    check_name: 'Table Registry Completeness',
    category: 'Tables',
    status: pick(unclassified === 0, unclassified > 0 && unclassified < 20),
    summary: `${count ?? rows.length} tables registered, ${unclassified} without module classification.`,
    details: [
      { label: 'Registered', value: count ?? rows.length },
      { label: 'Unclassified', value: unclassified },
    ],
    ran_at: nowIso(),
  };
}

// 3. Permission registry / source sync — every registry entry is active.
export async function checkPermissionRegistrySync(): Promise<CheckResult> {
  const { data, error } = await db
    .from('core_permission_registry')
    .select('permission_key, is_active, module_code');
  if (error) return failed('PERMISSION_SYNC', 'Permission Registry Sync', 'Permissions', error.message);
  const rows = (data ?? []) as any[];
  const inactive = rows.filter((r) => !r.is_active).length;
  return {
    check_code: 'PERMISSION_SYNC',
    check_name: 'Permission Registry / Source Sync',
    category: 'Permissions',
    status: pick(inactive < 5, inactive < 25),
    summary: `${rows.length} permissions registered, ${inactive} inactive.`,
    details: [
      { label: 'Total', value: rows.length },
      { label: 'Inactive', value: inactive },
    ],
    ran_at: nowIso(),
  };
}

// 4. Admin menu visibility — routes marked show_in_platform_admin actually have an app_module.
export async function checkAdminMenuVisibility(): Promise<CheckResult> {
  const { data: routes, error: rErr } = await db
    .from('core_admin_route_registry')
    .select('route_path, show_in_platform_admin')
    .eq('show_in_platform_admin', true)
    .eq('is_active', true);
  if (rErr) return failed('ADMIN_MENU', 'Admin Menu Visibility', 'Menus', rErr.message);
  const { data: modules, error: mErr } = await db
    .from('app_modules')
    .select('route')
    .eq('show_in_menu', true);
  if (mErr) return failed('ADMIN_MENU', 'Admin Menu Visibility', 'Menus', mErr.message);
  const moduleRoutes = new Set((modules ?? []).map((m: any) => m.route).filter(Boolean));
  const rows = (routes ?? []) as any[];
  const missing = rows.filter((r) => !moduleRoutes.has(r.route_path));
  return {
    check_code: 'ADMIN_MENU',
    check_name: 'Admin Menu Visibility',
    category: 'Menus',
    status: pick(missing.length === 0, missing.length < 5),
    summary: `${rows.length} routes flagged for admin menu; ${missing.length} without matching navigation module.`,
    issues: missing.map((r) => `${r.route_path} — no matching app_modules entry`),
    ran_at: nowIso(),
  };
}

// 5. Audit integration — recent audit events exist.
export async function checkAuditIntegration(): Promise<CheckResult> {
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { count, error } = await db
    .from('core_audit_log')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);
  if (error) return failed('AUDIT_INTEGRATION', 'Audit Integration', 'Audit', error.message);
  const c = count ?? 0;
  return {
    check_code: 'AUDIT_INTEGRATION',
    check_name: 'Audit Integration Activity',
    category: 'Audit',
    status: pick(c > 5, c > 0),
    summary: `${c} audit events in last 7 days.`,
    details: [{ label: 'Events (7d)', value: c }],
    ran_at: nowIso(),
  };
}

// 6. Workflow configuration — active workflow definitions exist.
export async function checkWorkflowConfiguration(): Promise<CheckResult> {
  const { data, error } = await db
    .from('core_workflow_definition')
    .select('id, status');
  if (error) return failed('WORKFLOW_CONFIG', 'Workflow Configuration', 'Workflow', error.message);
  const rows = (data ?? []) as any[];
  const active = rows.filter((r) => r.status === 'ACTIVE').length;
  const draft = rows.filter((r) => r.status === 'DRAFT').length;
  return {
    check_code: 'WORKFLOW_CONFIG',
    check_name: 'Workflow Configuration',
    category: 'Workflow',
    status: pick(active > 0, rows.length > 0),
    summary: `${rows.length} workflow definitions (${active} active, ${draft} draft).`,
    details: [
      { label: 'Active', value: active },
      { label: 'Draft', value: draft },
    ],
    ran_at: nowIso(),
  };
}

// 7. Reference governance — reference groups are populated.
export async function checkReferenceGovernance(): Promise<CheckResult> {
  const { count: gCount, error: gErr } = await db
    .from('core_reference_group')
    .select('id', { count: 'exact', head: true });
  const { count: vCount, error: vErr } = await db
    .from('core_reference_value')
    .select('id', { count: 'exact', head: true });
  if (gErr || vErr) return failed('REFERENCE_GOV', 'Reference Governance', 'Reference', gErr?.message ?? vErr?.message ?? 'error');
  return {
    check_code: 'REFERENCE_GOV',
    check_name: 'Reference Governance',
    category: 'Reference',
    status: pick((gCount ?? 0) > 5 && (vCount ?? 0) > 20, (gCount ?? 0) > 0),
    summary: `${gCount ?? 0} reference groups and ${vCount ?? 0} values registered.`,
    details: [
      { label: 'Groups', value: gCount ?? 0 },
      { label: 'Values', value: vCount ?? 0 },
    ],
    ran_at: nowIso(),
  };
}

// 8. Migration readiness — no critical open issues; cutover checks green.
export async function checkMigrationReadiness(): Promise<CheckResult> {
  const { data: issues } = await db
    .from('mig_migration_issue')
    .select('severity, status');
  const { data: results } = await db
    .from('mig_cutover_readiness_result')
    .select('status');
  const openCrit = (issues ?? []).filter((i: any) => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length;
  const cutoverRows = (results ?? []) as any[];
  const notReady = cutoverRows.filter((r) => r.status && r.status !== 'READY').length;
  return {
    check_code: 'MIGRATION_READY',
    check_name: 'Migration Readiness',
    category: 'Migration',
    status: pick(openCrit === 0 && notReady === 0, openCrit === 0),
    summary: `${openCrit} open critical migration issues, ${notReady} cutover checks not ready.`,
    details: [
      { label: 'Critical issues open', value: openCrit },
      { label: 'Cutover checks not ready', value: notReady },
    ],
    ran_at: nowIso(),
  };
}

// 9. Typecheck / build — manual attestation required; look up latest attestation.
export async function checkTypecheckAttestation(releaseTag: string): Promise<CheckResult> {
  const { data, error } = await db
    .from('core_release_readiness_attestation')
    .select('*')
    .eq('release_tag', releaseTag)
    .eq('check_code', 'TYPECHECK_BUILD')
    .eq('is_active', true)
    .maybeSingle();
  if (error) return failed('TYPECHECK_BUILD', 'Typecheck & Build', 'Release', error.message);
  const row = data as any;
  if (!row) {
    return {
      check_code: 'TYPECHECK_BUILD',
      check_name: 'Typecheck / Build Attestation',
      category: 'Release',
      status: 'FAILED',
      summary: `No attestation recorded for release ${releaseTag}. Run tsgo/build locally, then attest.`,
      ran_at: nowIso(),
    };
  }
  return {
    check_code: 'TYPECHECK_BUILD',
    check_name: 'Typecheck / Build Attestation',
    category: 'Release',
    status: 'ATTESTED',
    summary: `Attested ${new Date(row.attested_at).toLocaleString()} — ${row.notes ?? 'no notes'}.`,
    details: row.evidence_url ? [{ label: 'Evidence', value: row.evidence_url }] : undefined,
    ran_at: nowIso(),
  };
}

function failed(code: string, name: string, cat: string, msg: string): CheckResult {
  return {
    check_code: code,
    check_name: name,
    category: cat,
    status: 'FAILED',
    summary: `Check errored: ${msg}`,
    ran_at: nowIso(),
  };
}

export async function runAllChecks(releaseTag: string): Promise<CheckResult[]> {
  return Promise.all([
    checkRouteHealth(),
    checkTableRegistry(),
    checkPermissionRegistrySync(),
    checkAdminMenuVisibility(),
    checkAuditIntegration(),
    checkWorkflowConfiguration(),
    checkReferenceGovernance(),
    checkMigrationReadiness(),
    checkTypecheckAttestation(releaseTag),
  ]);
}

export function computeOverall(results: CheckResult[]): {
  overall_status: CheckStatus;
  passed_count: number;
  warning_count: number;
  failed_count: number;
} {
  const passed_count = results.filter((r) => r.status === 'PASSED' || r.status === 'ATTESTED').length;
  const warning_count = results.filter((r) => r.status === 'WARNING').length;
  const failed_count = results.filter((r) => r.status === 'FAILED').length;
  const overall_status: CheckStatus = failed_count > 0 ? 'FAILED' : warning_count > 0 ? 'WARNING' : 'PASSED';
  return { overall_status, passed_count, warning_count, failed_count };
}
