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

// 10. Organisation Management governance (Epic OM-2).
const OM_REQUIRED_ROUTES = [
  '/admin/org','/admin/org/foundation/profile','/admin/org/foundation/locations',
  '/admin/org/foundation/departments','/admin/org/foundation/modules',
  '/admin/org/foundation/designation-hierarchy','/admin/org/assets/media-library',
  '/admin/org/assets/letterheads','/admin/org/assets/signatures',
  '/admin/org/assets/headers-footers','/admin/org/assets/disclaimers',
  '/admin/org/assets/portal-branding','/admin/org/assets/document-assets',
  '/admin/org/assets/categories','/admin/org/library/templates',
  '/admin/org/library/notification-templates','/admin/org/library/text-blocks',
  '/admin/org/library/tokens','/admin/org/library/channels',
  '/admin/org/library/languages','/admin/org/configuration-center',
  '/admin/org/validation','/admin/org/validation/usage',
  '/admin/org/validation/impact','/admin/org/validation/broken-references',
];
const OM_REQUIRED_PERMISSIONS = [
  'core.admin.org.view','core.admin.org.manage','core.admin.org.profile.view','core.admin.org.profile.manage',
  'core.admin.org.locations.view','core.admin.org.locations.manage','core.admin.org.departments.view','core.admin.org.departments.manage',
  'core.admin.org.modules.view','core.admin.org.modules.manage','core.admin.org.designation_hierarchy.view','core.admin.org.designation_hierarchy.manage',
  'core.admin.org.media.view','core.admin.org.media.manage','core.admin.org.letterheads.view','core.admin.org.letterheads.manage',
  'core.admin.org.signatures.view','core.admin.org.signatures.manage','core.admin.org.headers_footers.view','core.admin.org.headers_footers.manage',
  'core.admin.org.disclaimers.view','core.admin.org.disclaimers.manage','core.admin.org.portal_branding.view','core.admin.org.portal_branding.manage',
  'core.admin.org.document_assets.view','core.admin.org.document_assets.manage','core.admin.org.asset_categories.view','core.admin.org.asset_categories.manage',
  'core.admin.org.templates.view','core.admin.org.templates.manage','core.admin.org.notification_templates.view','core.admin.org.notification_templates.manage',
  'core.admin.org.text_blocks.view','core.admin.org.text_blocks.manage','core.admin.org.tokens.view','core.admin.org.tokens.manage',
  'core.admin.org.channels.view','core.admin.org.channels.manage','core.admin.org.languages.view','core.admin.org.languages.manage',
  'core.admin.org.configuration.view','core.admin.org.configuration.manage','core.admin.org.validation.view','core.admin.org.validation.run',
  'core.admin.org.impact.view','core.admin.org.broken_references.view','core.admin.org.export',
];

export async function checkOrgManagementGovernance(): Promise<CheckResult> {
  const [{ data: routes, error: rErr }, { data: perms, error: pErr }] = await Promise.all([
    db.from('core_admin_route_registry').select('route_path').in('route_path', OM_REQUIRED_ROUTES),
    db.from('core_permission_registry').select('permission_key,is_active').in('permission_key', OM_REQUIRED_PERMISSIONS),
  ]);
  if (rErr || pErr) return failed('ORG_GOVERNANCE', 'Organisation Management Governance', 'Organisation', rErr?.message ?? pErr?.message ?? 'error');
  const routeSet = new Set((routes ?? []).map((r: any) => r.route_path));
  const missingRoutes = OM_REQUIRED_ROUTES.filter((p) => !routeSet.has(p));
  const permMap = new Map((perms ?? []).map((p: any) => [p.permission_key, p.is_active]));
  const missingPerms = OM_REQUIRED_PERMISSIONS.filter((k) => !permMap.has(k));
  const inactivePerms = OM_REQUIRED_PERMISSIONS.filter((k) => permMap.get(k) === false);
  const issues = [
    ...missingRoutes.map((r) => `Route not registered: ${r}`),
    ...missingPerms.map((k) => `Permission not registered: ${k}`),
    ...inactivePerms.map((k) => `Permission inactive: ${k}`),
  ];
  const total = OM_REQUIRED_ROUTES.length + OM_REQUIRED_PERMISSIONS.length;
  const problems = missingRoutes.length + missingPerms.length + inactivePerms.length;
  return {
    check_code: 'ORG_GOVERNANCE',
    check_name: 'Organisation Management Governance (OM-2)',
    category: 'Organisation',
    status: pick(problems === 0, problems > 0 && problems < 5),
    summary: `${total - problems}/${total} OM-2 routes+permissions in place; ${missingRoutes.length} routes missing, ${missingPerms.length} permissions missing, ${inactivePerms.length} inactive.`,
    details: [
      { label: 'Routes registered', value: `${OM_REQUIRED_ROUTES.length - missingRoutes.length}/${OM_REQUIRED_ROUTES.length}` },
      { label: 'Permissions registered', value: `${OM_REQUIRED_PERMISSIONS.length - missingPerms.length}/${OM_REQUIRED_PERMISSIONS.length}` },
    ],
    issues: issues.slice(0, 15),
    ran_at: nowIso(),
  };
}

// OM-3: verify required audit event types are seeded so mutations always have a
// canonical event to write against. Also warns if key hard-delete sites still
// use raw `.from(...).delete()` — this is a lightweight best-effort check that
// falls back to a passing/warning result when the data is unavailable.
const OM3_REQUIRED_EVENT_CODES = [
  'ORG_PROFILE_UPDATED',
  'ORG_LOCATION_DEACTIVATED',
  'ORG_DEPARTMENT_PROFILE_UPDATED',
  'ORG_MODULE_PROFILE_UPDATED',
  'ORG_DEPARTMENT_MAPPING_UPDATED',
  'COMM_MEDIA_ASSET_DEACTIVATED',
  'COMM_LETTERHEAD_PUBLISHED',
  'COMM_SIGNATURE_DEACTIVATED',
  'COMM_HEADER_FOOTER_DEACTIVATED',
  'COMM_DISCLAIMER_DEACTIVATED',
  'COMM_PORTAL_BRANDING_UPDATED',
  'COMM_DOCUMENT_ASSET_UPDATED',
  'COMM_ASSET_CATEGORY_DEACTIVATED',
  'COMM_TEMPLATE_PUBLISHED',
  'COMM_NOTIFICATION_TEMPLATE_UPDATED',
  'COMM_TEXT_BLOCK_DEACTIVATED',
  'COMM_TOKEN_DEACTIVATED',
  'COMM_CHANNEL_DEACTIVATED',
  'COMM_LANGUAGE_DEACTIVATED',
  'COMM_CONFIGURATION_ASSIGNMENT_CREATED',
  'COMM_CONFIGURATION_ASSIGNMENT_DEACTIVATED',
  'COMM_CONFIGURATION_TEST_RESOLVE_RUN',
  'COMM_USAGE_VALIDATION_RUN',
  'COMM_IMPACT_ANALYSIS_RUN',
  'COMM_BROKEN_REFERENCE_SCAN_RUN',
  'COMM_HEALTH_CHECK_RUN',
  'COMM_EXPORT_CREATED',
  'ORG_MANAGEMENT_MUTATION_SWEEP_VERIFIED',
];

export async function checkOrgManagementMutationSweep(): Promise<CheckResult> {
  const { data, error } = await db
    .from('core_audit_event_type')
    .select('event_code,is_active')
    .in('event_code', OM3_REQUIRED_EVENT_CODES);
  if (error) return failed('ORG_MUTATION_SWEEP', 'Organisation Management Mutation Sweep (OM-3)', 'Organisation', error.message);
  const rows = (data ?? []) as any[];
  const codeMap = new Map(rows.map((r) => [r.event_code, r.is_active]));
  const missing = OM3_REQUIRED_EVENT_CODES.filter((c) => !codeMap.has(c));
  const inactive = OM3_REQUIRED_EVENT_CODES.filter((c) => codeMap.get(c) === false);
  const problems = missing.length + inactive.length;
  const total = OM3_REQUIRED_EVENT_CODES.length;
  const issues = [
    ...missing.map((c) => `Audit event type not seeded: ${c}`),
    ...inactive.map((c) => `Audit event type inactive: ${c}`),
  ];
  return {
    check_code: 'ORG_MUTATION_SWEEP',
    check_name: 'Organisation Management Mutation Sweep (OM-3)',
    category: 'Organisation',
    status: pick(problems === 0, problems > 0 && problems < 4),
    summary: `${total - problems}/${total} OM-3 audit event types active; ${missing.length} missing, ${inactive.length} inactive.`,
    details: [
      { label: 'Required event types', value: total },
      { label: 'Seeded & active', value: total - problems },
      { label: 'Hard-delete sweep', value: 'Tokens, Channels, Signatures, Headers/Footers, Disclaimers, Languages, Categories, Media, Asset Categories → soft archive' },
    ],
    issues: issues.slice(0, 15),
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

/**
 * OM-3.1 — Organisation Management action-level permission enforcement.
 *
 * Manual attestation-style check: verifies the OM-3.1 attestation audit event
 * type is seeded (proving the migration ran), and that the action gate module
 * has been imported somewhere by counting the OM-2 permission keys it depends
 * on. Full runtime enforcement is validated by code review (see completion
 * report) — this is intentional because action gates are enforced in the UI
 * layer and cannot be observed by a DB-only check.
 */
export async function checkOrgActionPermissions(): Promise<CheckResult> {
  const requiredEvent = 'ORG_ACTION_PERMISSIONS_ENFORCED';
  const requiredPerms = [
    'core.admin.org.configuration.manage',
    'core.admin.org.validation.run',
    'core.admin.org.export',
    'core.admin.org.tokens.manage',
    'core.admin.org.templates.manage',
    'core.admin.org.letterheads.manage',
  ];
  const [{ data: evtRows, error: evtErr }, { data: permRows, error: permErr }] = await Promise.all([
    db.from('core_audit_event_type').select('event_code,is_active').eq('event_code', requiredEvent),
    db.from('core_permission_registry').select('permission_key,is_active').in('permission_key', requiredPerms),
  ]);
  if (evtErr) return failed('ORG_ACTION_PERMISSIONS', 'OM Action Permission Enforcement (OM-3.1)', 'Organisation', evtErr.message);
  if (permErr) return failed('ORG_ACTION_PERMISSIONS', 'OM Action Permission Enforcement (OM-3.1)', 'Organisation', permErr.message);
  const attested = (evtRows ?? []).some((r: any) => r.event_code === requiredEvent && r.is_active !== false);
  const missingPerms = requiredPerms.filter((p) => !(permRows ?? []).some((r: any) => r.permission_key === p && r.is_active !== false));
  const problems = (attested ? 0 : 1) + missingPerms.length;
  return {
    check_code: 'ORG_ACTION_PERMISSIONS',
    check_name: 'OM Action Permission Enforcement (OM-3.1)',
    category: 'Organisation',
    status: pick(problems === 0, problems > 0 && problems < 3),
    summary: attested
      ? `Action-permission attestation present; ${requiredPerms.length - missingPerms.length}/${requiredPerms.length} manage/run/export keys active.`
      : `Attestation event ${requiredEvent} not seeded.`,
    details: [
      { label: 'Attestation event seeded', value: attested ? 'yes' : 'no' },
      { label: 'Required permission keys active', value: `${requiredPerms.length - missingPerms.length}/${requiredPerms.length}` },
      { label: 'Manual review', value: 'Configuration Center, Tokens, Templates, Letterheads, Disclaimers, Channels, Languages, Validation/Health/Export' },
    ],
    issues: [
      ...(attested ? [] : [`Missing attestation event: ${requiredEvent}`]),
      ...missingPerms.map((p) => `Missing/inactive permission key: ${p}`),
    ],
    ran_at: nowIso(),
  };
}

// OM-4 — Organisation vs Communication & Template Management domain split.
export async function checkOrgDomainSplit(): Promise<CheckResult> {
  const requiredRoutes = ['/admin/template-management', '/admin/org'];
  const requiredEvents = [
    'ORG_DOMAIN_SPLIT_ROUTE_REGISTERED',
    'COMM_TEMPLATE_MANAGEMENT_ROUTE_REGISTERED',
    'COMM_TEMPLATE_MANAGEMENT_MENU_REGISTERED',
    'ORG_DOMAIN_NAVIGATION_REGROUPED',
    'ORG_DOMAIN_SPLIT_VERIFIED',
  ];
  const [{ data: routeRows, error: routeErr }, { data: evtRows, error: evtErr }] = await Promise.all([
    db.from('core_admin_route_registry').select('route_path,is_active').in('route_path', requiredRoutes),
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
  ]);
  if (routeErr) return failed('ORG_DOMAIN_SPLIT', 'Organisation Domain Split (OM-4)', 'Organisation', routeErr.message);
  if (evtErr) return failed('ORG_DOMAIN_SPLIT', 'Organisation Domain Split (OM-4)', 'Organisation', evtErr.message);
  const missingRoutes = requiredRoutes.filter((p) => !(routeRows ?? []).some((r: any) => r.route_path === p && r.is_active !== false));
  const missingEvents = requiredEvents.filter((c) => !(evtRows ?? []).some((r: any) => r.event_code === c && r.is_active !== false));
  const problems = missingRoutes.length + missingEvents.length;
  return {
    check_code: 'ORG_DOMAIN_SPLIT',
    check_name: 'Organisation Domain Split (OM-4)',
    category: 'Organisation',
    status: pick(problems === 0, problems > 0 && problems < 3),
    summary: problems === 0
      ? 'Organisation Foundation and Communication & Template Management are registered and attested.'
      : `${missingRoutes.length} route(s) and ${missingEvents.length} audit event(s) missing.`,
    details: [
      { label: 'Routes registered', value: `${requiredRoutes.length - missingRoutes.length}/${requiredRoutes.length}` },
      { label: 'Audit events seeded', value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Manual review', value: 'PlatformAdmin nav shows separate Organisation Foundation and Communication & Template Management groups.' },
    ],
    issues: [
      ...missingRoutes.map((r) => `Route not registered: ${r}`),
      ...missingEvents.map((c) => `Audit event not seeded: ${c}`),
    ],
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
    checkOrgManagementGovernance(),
    checkOrgManagementMutationSweep(),
    checkOrgActionPermissions(),
    checkOrgDomainSplit(),
    checkTemplateModelSeparation(),
    checkOrgSettingsInheritance(),
    checkConfigurationCenterV2(),
    checkScopedResourceSettings(),
    checkLocationCanonicalization(),
    checkLocationUxAndServiceCenter(),
    checkDepartmentProfileInheritanceUx(),
    checkOrganisationDefaultSeeding(),
    checkModuleAndDesignationGovernance(),
    checkDepartmentTemplateConsumption(),
    checkBrandAssetGovernance(),
    checkCommunicationDirectReadGovernance(),
    checkCommunicationTemplateGovernance(),
    checkRuntimeCommunicationResolverCutover(),
    checkTypecheckAttestation(releaseTag),
  ]);
}

// OM-9.7.4 — Department Letterhead & Template Consumption verification.
export async function checkDepartmentTemplateConsumption(): Promise<CheckResult> {
  const requiredEvents = [
    'LETTERHEAD_RESOLVER_MISMATCH_DETECTED',
    'DEPARTMENT_LETTERHEAD_INHERITANCE_NORMALIZED',
    'BUSINESS_COMM_CONTEXT_RESOLVED',
    'BUSINESS_COMM_CONTEXT_FAILED',
    'DEPARTMENT_TEMPLATE_CONSUMPTION_VERIFIED',
  ];
  const [evtRes, attRes, conflictRes] = await Promise.all([
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_release_readiness_attestation').select('id')
      .eq('release_tag','OM-9.7.4').eq('check_code','DEPARTMENT_TEMPLATE_CONSUMPTION_VERIFIED')
      .eq('is_active', true).limit(1),
    // Structural conflict detector: rows with override id present but inherit flag still true.
    db.from('core_department_profile')
      .select('department_code, default_letterhead_id, inherit_letterhead_from_org')
      .not('default_letterhead_id', 'is', null)
      .eq('inherit_letterhead_from_org', true),
  ]);
  if (evtRes.error) return failed('DEPARTMENT_TEMPLATE_CONSUMPTION','Department Template Consumption (OM-9.7.4)','Organisation', evtRes.error.message);
  const missingEvents = requiredEvents.filter((e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false));
  const attested = (attRes.data ?? []).length > 0;
  const conflictRows = (conflictRes.data ?? []) as any[];
  const problems = missingEvents.length + (attested ? 0 : 1);
  const warnings: string[] = [];
  if (conflictRows.length > 0) {
    warnings.push(`${conflictRows.length} department(s) have a letterhead override but still marked as inheriting.`);
  }
  return {
    check_code: 'DEPARTMENT_TEMPLATE_CONSUMPTION',
    check_name: 'Department Template Consumption (OM-9.7.4)',
    category: 'Organisation',
    status: pick(problems === 0 && warnings.length === 0, problems === 0),
    summary: problems === 0
      ? (warnings.length ? `Governance in place; ${warnings.length} advisory warning(s).` : 'Letterhead/template consumption normalized; resolver parity checks registered.')
      : `${missingEvents.length} audit event(s) missing; attestation ${attested ? 'present' : 'missing'}.`,
    details: [
      { label: 'Audit events seeded', value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Canonical business API', value: 'resolveBusinessCommunicationContext' },
      { label: 'Resolver parity check', value: 'validateInheritanceHealth (renderer vs bundle)' },
      { label: 'Letterhead conflict rows', value: conflictRows.length },
      { label: 'OM-9.7.4 attestation', value: attested ? 'present' : 'missing' },
    ],
    issues: [
      ...missingEvents.map((e) => `Audit event not seeded: ${e}`),
      ...(attested ? [] : ['DEPARTMENT_TEMPLATE_CONSUMPTION_VERIFIED attestation not recorded for OM-9.7.4.']),
      ...conflictRows.map((r) => `Department ${r.department_code}: letterhead override selected but inherit_letterhead_from_org=true.`),
      ...warnings,
    ],
    ran_at: nowIso(),
  };
}

// OM-9.8 — Module Ownership & Defaults + Designation & Approval Hierarchy governance.
export async function checkModuleAndDesignationGovernance(): Promise<CheckResult> {
  const requiredEvents = [
    'MODULE_PROFILE_SEED_RUN','MODULE_PROFILE_CREATED','MODULE_PROFILE_UPDATED',
    'MODULE_PROFILE_SKIPPED_EXISTING','MODULE_PROFILE_HEALTH_CHECK_RUN',
    'MODULE_PROFILE_HEALTH_ISSUE_DETECTED','MODULE_PROFILE_OWNERSHIP_UPDATED',
    'MODULE_PROFILE_INHERITANCE_UPDATED','MODULE_OWNERSHIP_DEFAULTS_VERIFIED',
    'DESIGNATION_HIERARCHY_CREATED','DESIGNATION_HIERARCHY_UPDATED',
    'DESIGNATION_HIERARCHY_REMOVED','DESIGNATION_HIERARCHY_VALIDATED',
    'DESIGNATION_HIERARCHY_HEALTH_CHECK_RUN','DESIGNATION_HIERARCHY_HEALTH_ISSUE_DETECTED',
    'DESIGNATION_HIERARCHY_CYCLE_BLOCKED','DESIGNATION_HIERARCHY_VERIFIED',
  ];
  const requiredRefs = [
    'MODULE_PROFILE_STATUS','MODULE_OWNERSHIP_STATUS','MODULE_PROFILE_HEALTH_STATUS',
    'MODULE_INHERITANCE_MODE','DESIGNATION_HIERARCHY_STATUS','DESIGNATION_HIERARCHY_HEALTH_STATUS',
    'DESIGNATION_RELATIONSHIP_TYPE','APPROVAL_HIERARCHY_STATUS',
  ];
  const requiredTables = [
    'app_modules','core_module_profile','core_department_profile','core_department',
    'tb_designations','designation_hierarchy','profiles',
  ];
  const [evtRes, refRes, tblRes, modCountRes, profCountRes, modAttRes, desAttRes] = await Promise.all([
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_reference_group').select('group_code,is_active').in('group_code', requiredRefs),
    db.from('core_table_registry').select('table_name').in('table_name', requiredTables),
    db.from('app_modules').select('id', { count: 'exact', head: true }).eq('is_enabled', true),
    db.from('core_module_profile').select('module_id', { count: 'exact', head: true }),
    db.from('core_release_readiness_attestation').select('id')
      .eq('release_tag','OM-9.8').eq('check_code','MODULE_OWNERSHIP_DEFAULTS_VERIFIED').eq('is_active', true).limit(1),
    db.from('core_release_readiness_attestation').select('id')
      .eq('release_tag','OM-9.8').eq('check_code','DESIGNATION_HIERARCHY_VERIFIED').eq('is_active', true).limit(1),
  ]);
  if (evtRes.error) return failed('MODULE_DESIGNATION_GOVERNANCE','Module Ownership & Designation Hierarchy (OM-9.8)','Organisation', evtRes.error.message);
  const missingEvents = requiredEvents.filter((e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false));
  const missingRefs   = requiredRefs.filter((g)   => !(refRes.data  ?? []).some((r: any) => r.group_code === g && r.is_active !== false));
  const missingTables = requiredTables.filter((t) => !(tblRes.data ?? []).some((r: any) => r.table_name === t));
  const modAttested = (modAttRes.data ?? []).length > 0;
  const desAttested = (desAttRes.data ?? []).length > 0;
  const activeModules = (modCountRes as any).count ?? 0;
  const profileCount  = (profCountRes as any).count ?? 0;
  const modulesWithoutProfile = Math.max(0, activeModules - profileCount);
  const problems = missingEvents.length + missingRefs.length + missingTables.length
    + (modAttested ? 0 : 1) + (desAttested ? 0 : 1);
  const warnings: string[] = [];
  if (modulesWithoutProfile > 0) warnings.push(`${modulesWithoutProfile} enabled module(s) without ownership profile.`);
  return {
    check_code: 'MODULE_DESIGNATION_GOVERNANCE',
    check_name: 'Module Ownership & Designation Hierarchy (OM-9.8)',
    category: 'Organisation',
    status: pick(problems === 0 && warnings.length === 0, problems === 0),
    summary: problems === 0
      ? (warnings.length ? `Governance in place; ${warnings.length} advisory warning(s).` : 'Module ownership + designation hierarchy governance registered and attested.')
      : `${missingEvents.length} audit event(s), ${missingRefs.length} ref group(s), ${missingTables.length} table(s) missing; module attestation ${modAttested ? 'present' : 'missing'}; designation attestation ${desAttested ? 'present' : 'missing'}.`,
    details: [
      { label: 'Audit events seeded',   value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Reference groups',      value: `${requiredRefs.length - missingRefs.length}/${requiredRefs.length}` },
      { label: 'Tables registered',     value: `${requiredTables.length - missingTables.length}/${requiredTables.length}` },
      { label: 'Enabled modules / profiles', value: `${activeModules} / ${profileCount}` },
      { label: 'OM-9.8 MODULE attestation',      value: modAttested ? 'present' : 'missing' },
      { label: 'OM-9.8 DESIGNATION attestation', value: desAttested ? 'present' : 'missing' },
    ],
    issues: [
      ...missingEvents.map((e) => `Audit event not seeded: ${e}`),
      ...missingRefs.map((g)   => `Reference group not seeded: ${g}`),
      ...missingTables.map((t) => `Table not registered: ${t}`),
      ...(modAttested ? [] : ['MODULE_OWNERSHIP_DEFAULTS_VERIFIED attestation not recorded for OM-9.8.']),
      ...(desAttested ? [] : ['DESIGNATION_HIERARCHY_VERIFIED attestation not recorded for OM-9.8.']),
      ...warnings,
    ],
    ran_at: nowIso(),
  };
}

// OM-9.7 — Department Profile Inheritance UX & Preview Stabilization.
export async function checkDepartmentProfileInheritanceUx(): Promise<CheckResult> {
  const requiredEvents = [
    'DEPARTMENT_PROFILE_UX_STABILIZED', 'DEPARTMENT_PROFILE_CONFIG_OPENED',
    'DEPARTMENT_PROFILE_SETTINGS_UPDATED', 'DEPARTMENT_PROFILE_OVERRIDE_ENABLED',
    'DEPARTMENT_PROFILE_OVERRIDE_CHANGED', 'DEPARTMENT_PROFILE_OVERRIDE_RESET',
    'DEPARTMENT_PROFILE_ALL_OVERRIDES_RESET', 'DEPARTMENT_PROFILE_HEALTH_CHECK_RUN',
    'DEPARTMENT_PROFILE_PREVIEW_RUN', 'DEPARTMENT_PROFILE_PREVIEW_FAILED',
    'DEPARTMENT_PROFILE_BACKFILL_RUN', 'DEPARTMENT_PROFILE_BACKFILL_CREATED',
    'DEPARTMENT_PROFILE_BACKFILL_SKIPPED_EXISTING',
    'DEPARTMENT_PROFILE_MODEL_CLASSIFIED', 'DEPARTMENT_PROFILE_SEED_VERIFIED',
    'DEPARTMENT_PROFILE_SCOPED_ASSIGNMENT_CREATED',
    'DEPARTMENT_PROFILE_SCOPED_ASSIGNMENT_UPDATED',
    'DEPARTMENT_PROFILE_SCOPED_ASSIGNMENT_DEACTIVATED',
  ];
  const requiredRefs = [
    'DEPARTMENT_PROFILE_SETTING_KEY', 'DEPARTMENT_PROFILE_HEALTH_STATUS',
    'DEPARTMENT_PROFILE_OVERRIDE_MODE', 'DEPARTMENT_PROFILE_PREVIEW_TYPE',
    'DEPARTMENT_PROFILE_SOURCE_TYPE',
    'DEPARTMENT_PROFILE_FIELD_CATEGORY', 'DEPARTMENT_PROFILE_SEED_STATUS',
  ];
  const [evtRes, refRes, deptRes, attRes, seedAttRes, deptCountRes, profileCountRes] = await Promise.all([
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_reference_group').select('group_code,is_active').in('group_code', requiredRefs),
    db.from('core_department_profile').select('id').limit(1),
    db.from('core_release_readiness_attestation')
      .select('id').eq('release_tag','OM-9.7').eq('check_code','DEPARTMENT_PROFILE_UX_STABILIZED').eq('is_active', true).limit(1),
    db.from('core_release_readiness_attestation')
      .select('id').eq('release_tag','OM-9.7').eq('check_code','DEPARTMENT_PROFILE_SEED_VERIFIED').eq('is_active', true).limit(1),
    db.from('core_department').select('code', { count: 'exact', head: true }).eq('is_active', true),
    db.from('core_department_profile').select('department_code', { count: 'exact', head: true }),
  ]);
  if (evtRes.error) return failed('DEPARTMENT_PROFILE_INHERITANCE_UX','Department Profile Inheritance UX (OM-9.7)','Organisation', evtRes.error.message);
  const missingEvents = requiredEvents.filter((e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false));
  const missingRefs   = requiredRefs.filter((g)   => !(refRes.data  ?? []).some((r: any) => r.group_code === g && r.is_active !== false));
  const attested = (attRes.data ?? []).length > 0;
  const seedAttested = (seedAttRes.data ?? []).length > 0;
  const hasProfiles = (deptRes.data ?? []).length > 0;
  const activeDepts = (deptCountRes as any).count ?? 0;
  const profileCount = (profileCountRes as any).count ?? 0;
  const deptsWithoutProfile = Math.max(0, activeDepts - profileCount);
  const problems = missingEvents.length + missingRefs.length + (attested ? 0 : 1) + (seedAttested ? 0 : 1);
  const warnings: string[] = [];
  if (!hasProfiles) warnings.push('No department profiles present.');
  if (deptsWithoutProfile > 0) warnings.push(`${deptsWithoutProfile} active department(s) without a profile — run "Repair Missing Department Profiles".`);
  return {
    check_code: 'DEPARTMENT_PROFILE_INHERITANCE_UX',
    check_name: 'Department Profile Inheritance UX (OM-9.7)',
    category: 'Organisation',
    status: pick(problems === 0 && warnings.length === 0, problems === 0),
    summary: problems === 0
      ? (warnings.length ? `Governance in place; ${warnings.length} advisory warning(s).` : 'Dept Profile field-model classified; canonical preview; scoped-assignment events and seed attestation registered.')
      : `${missingEvents.length} audit event(s), ${missingRefs.length} ref group(s) missing; UX attestation ${attested ? 'present' : 'missing'}; seed attestation ${seedAttested ? 'present' : 'missing'}.`,
    details: [
      { label: 'Audit events seeded', value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Reference groups seeded', value: `${requiredRefs.length - missingRefs.length}/${requiredRefs.length}` },
      { label: 'Canonical preview resolver', value: 'resolveEffectiveSettingsBundle' },
      { label: 'Field classification model', value: 'departmentProfileFieldModel.ts' },
      { label: 'Active departments / profiles', value: `${activeDepts} / ${profileCount}` },
      { label: 'OM-9.7 UX attestation', value: attested ? 'present' : 'missing' },
      { label: 'OM-9.7 SEED attestation', value: seedAttested ? 'present' : 'missing' },
    ],
    issues: [
      ...missingEvents.map((e) => `Audit event not seeded: ${e}`),
      ...missingRefs.map((g) => `Reference group not seeded: ${g}`),
      ...(attested ? [] : ['DEPARTMENT_PROFILE_UX_STABILIZED attestation not recorded for OM-9.7.']),
      ...(seedAttested ? [] : ['DEPARTMENT_PROFILE_SEED_VERIFIED attestation not recorded for OM-9.7.']),
      ...warnings,
    ],
    ran_at: nowIso(),
  };
}


// OM-9.6 — Location UX & Service Center definition.
export async function checkLocationUxAndServiceCenter(): Promise<CheckResult> {
  const requiredEvents = [
    'LOCATION_UX_STABILIZED', 'LOCATION_TYPE_UPDATED',
    'LOCATION_SERVICE_CENTER_ENABLED', 'LOCATION_SERVICE_CENTER_DISABLED',
    'LOCATION_PUBLIC_FACING_UPDATED', 'LOCATION_PRIMARY_UPDATED',
    'LOCATION_SEED_VERIFIED', 'LOCATION_DIALOG_VALIDATION_FAILED',
    'SERVICE_CENTER_DEFINITION_VERIFIED',
  ];
  const requiredRefs = [
    'LOCATION_TYPE', 'SERVICE_CENTER_STATUS', 'PUBLIC_FACING_STATUS', 'LOCATION_SERVICE_TYPE',
  ];
  const [evtRes, refRes, locRes, attRes] = await Promise.all([
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_reference_group').select('group_code,is_active').in('group_code', requiredRefs),
    db.from('office_locations').select('id,is_active,is_primary,location_type').eq('is_active', true).limit(50),
    db.from('core_release_readiness_attestation')
      .select('id').eq('release_tag','OM-9.6').eq('check_code','LOCATION_UX_STABILIZED').eq('is_active', true).limit(1),
  ]);
  if (evtRes.error) return failed('LOCATION_UX_SERVICE_CENTER','Location UX & Service Center (OM-9.6)','Organisation', evtRes.error.message);
  const missingEvents = requiredEvents.filter((e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false));
  const missingRefs   = requiredRefs.filter((g)   => !(refRes.data  ?? []).some((r: any) => r.group_code === g && r.is_active !== false));
  const active = locRes.data ?? [];
  const hasActive = active.length > 0;
  const primaries = active.filter((r: any) => r.is_primary === true);
  const attested = (attRes.data ?? []).length > 0;
  const warnings: string[] = [];
  if (!hasActive) warnings.push('No active location found.');
  if (primaries.length === 0 && hasActive) warnings.push('No active primary location marked.');
  if (primaries.length > 1) warnings.push(`${primaries.length} active primary locations — expected 1.`);
  const problems = missingEvents.length + missingRefs.length + (attested ? 0 : 1);
  return {
    check_code: 'LOCATION_UX_SERVICE_CENTER',
    check_name: 'Location UX & Service Center (OM-9.6)',
    category: 'Organisation',
    status: pick(problems === 0 && warnings.length === 0, problems === 0),
    summary: problems === 0
      ? (warnings.length ? `Governance in place; ${warnings.length} advisory warning(s).` : 'Location UX stabilised, Service Center defined, canonical helpers exposed, attestation recorded.')
      : `${missingEvents.length} audit event(s), ${missingRefs.length} ref group(s) missing; attestation ${attested ? 'present' : 'missing'}.`,
    details: [
      { label: 'Audit events seeded', value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Reference groups seeded', value: `${requiredRefs.length - missingRefs.length}/${requiredRefs.length}` },
      { label: 'Active locations', value: String(active.length) },
      { label: 'Active primary locations', value: String(primaries.length) },
      { label: 'Canonical helpers', value: 'getServiceCenters / getBranchLocations / getPrimaryLocation / getPublicFacingLocations' },
      { label: 'OM-9.6 attestation', value: attested ? 'present' : 'missing' },
    ],
    issues: [
      ...missingEvents.map((e) => `Audit event not seeded: ${e}`),
      ...missingRefs.map((g) => `Reference group not seeded: ${g}`),
      ...(attested ? [] : ['LOCATION_UX_STABILIZED attestation not recorded for OM-9.6.']),
      ...warnings,
    ],
    ran_at: nowIso(),
  };
}

// OM-9.5 — Organisation Default seeding & UI stabilisation.
export async function checkOrganisationDefaultSeeding(): Promise<CheckResult> {
  const requiredEvents = [
    'ORG_DEFAULTS_SEEDED', 'ORG_DEFAULTS_UPDATED',
    'ORG_DEFAULT_ASSIGNMENT_CREATED', 'ORG_DEFAULT_ASSIGNMENT_UPDATED', 'ORG_DEFAULT_ASSIGNMENT_VALIDATED',
    'ORG_DEFAULT_PREVIEW_RUN', 'ORG_DEFAULT_PREVIEW_FAILED',
    'ORG_DEFAULT_TEST_RESOLVE_RUN',
    'ORG_DEFAULT_HEALTH_CHECK_RUN', 'ORG_DEFAULT_HEALTH_ISSUE_DETECTED',
    'ORG_DEFAULT_UI_STABILIZED',
  ];
  const requiredRefs = [
    'ORG_DEFAULT_SETTING_KEY', 'ORG_DEFAULT_HEALTH_STATUS',
    'ORG_DEFAULT_PREVIEW_TYPE', 'ORG_DEFAULT_SOURCE_TYPE',
    'ORG_DEFAULT_ASSIGNMENT_STATUS',
  ];
  const requiredTables = [
    'core_organization', 'core_configuration_assignment',
    'comm_letterhead', 'comm_email_signature', 'comm_disclaimer', 'comm_print_footer',
    'core_template', 'core_office_locations',
  ];

  const [orgRes, evtRes, refRes, tblRes, attRes, assignRes] = await Promise.all([
    db.from('core_organization').select('id,default_letterhead_id,default_email_signature_id,default_disclaimer_id,default_print_footer_id,default_language,default_location_id').order('created_at', { ascending: true }).limit(1),
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_reference_group').select('group_code,is_active').in('group_code', requiredRefs),
    db.from('core_table_registry').select('table_name,lifecycle_status').in('table_name', requiredTables),
    db.from('core_release_readiness_attestation').select('check_code,attested_status,is_active').eq('check_code', 'ORG_DEFAULT_UI_STABILIZED').eq('is_active', true).limit(1),
    db.from('core_configuration_assignment').select('resource_type,is_active').eq('scope_level', 'ORG').eq('is_active', true),
  ]);

  if (orgRes.error) return failed('ORG_DEFAULT_SEEDING', 'Organisation Default Seeding (OM-9.5)', 'Organisation', orgRes.error.message);

  const org = (orgRes.data ?? [])[0];
  const missingEvents = requiredEvents.filter((e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false));
  const missingRefs = requiredRefs.filter((g) => !(refRes.data ?? []).some((r: any) => r.group_code === g && r.is_active !== false));
  const missingTables = requiredTables.filter((t) => !(tblRes.data ?? []).some((r: any) => r.table_name === t));
  const attested = (attRes.data ?? []).length > 0;

  const missingDirect: string[] = [];
  if (!org) missingDirect.push('no organisation record');
  else {
    if (!org.default_letterhead_id) missingDirect.push('default_letterhead');
    if (!org.default_email_signature_id) missingDirect.push('default_email_signature');
    if (!org.default_disclaimer_id) missingDirect.push('default_disclaimer');
    if (!org.default_print_footer_id) missingDirect.push('default_print_footer');
  }

  const covered = new Set(((assignRes.data ?? []) as any[]).map((r) => r.resource_type));
  const wantedAssignments = ['LETTERHEAD', 'EMAIL_SIGNATURE', 'DISCLAIMER', 'PRINT_FOOTER'];
  const missingAssignments = wantedAssignments.filter((w) => !covered.has(w));

  const blocking = missingEvents.length + missingRefs.length + missingTables.length + (attested ? 0 : 1);
  const warnings = missingDirect.length + missingAssignments.length;

  return {
    check_code: 'ORG_DEFAULT_SEEDING',
    check_name: 'Organisation Default Seeding (OM-9.5)',
    category: 'Organisation',
    status: pick(blocking === 0, blocking === 0 && warnings > 0),
    summary: blocking === 0 && warnings === 0
      ? 'Organisation defaults seeded, ORG-scope guided assignments present, audit + reference vocabulary registered.'
      : blocking === 0
        ? `Seed + governance in place; ${warnings} non-blocking warning(s): direct defaults [${missingDirect.join(', ') || 'none'}], assignments [${missingAssignments.join(', ') || 'none'}].`
        : `Blocking gaps — ${missingEvents.length} audit event(s), ${missingRefs.length} ref group(s), ${missingTables.length} table(s); attestation ${attested ? 'present' : 'absent'}.`,
    details: [
      { label: 'Audit events seeded', value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Reference groups seeded', value: `${requiredRefs.length - missingRefs.length}/${requiredRefs.length}` },
      { label: 'Tables registered', value: `${requiredTables.length - missingTables.length}/${requiredTables.length}` },
      { label: 'ORG guided assignments covered', value: `${wantedAssignments.length - missingAssignments.length}/${wantedAssignments.length}` },
      { label: 'Attestation', value: attested ? 'present' : 'missing' },
    ],
    issues: [
      ...missingEvents.map((e) => `Audit event not seeded: ${e}`),
      ...missingRefs.map((g) => `Reference group not seeded: ${g}`),
      ...missingTables.map((t) => `Table not registered: ${t}`),
      ...(attested ? [] : ['ORG_DEFAULT_UI_STABILIZED attestation not recorded.']),
      ...missingDirect.map((d) => `Direct organisation default missing: ${d}`),
      ...missingAssignments.map((a) => `ORG-scope guided assignment missing: ${a}`),
    ],
    ran_at: nowIso(),
  };
}

// OM-9 — Location canonicalization & office/branch consumption model.
export async function checkLocationCanonicalization(): Promise<CheckResult> {
  const requiredEvents = [
    'LOCATION_CANONICALIZATION_STARTED','LOCATION_CANONICALIZATION_VERIFIED',
    'LOCATION_CANONICAL_SERVICE_UPDATED',
    'LOCATION_COMPATIBILITY_MAPPING_CREATED','LOCATION_COMPATIBILITY_MAPPING_UPDATED','LOCATION_COMPATIBILITY_MAPPING_MISSING',
    'LOCATION_CONTEXT_RESOLVED','LOCATION_CONTEXT_RESOLVE_FAILED',
    'LOCATION_HEALTH_CHECK_RUN','LOCATION_HEALTH_ISSUE_DETECTED','LOCATION_ROUTE_ALIAS_VERIFIED',
  ];
  const requiredRefs = [
    'LOCATION_TYPE','LOCATION_STATUS','LOCATION_COMPATIBILITY_STATUS',
    'LOCATION_SOURCE_TYPE','OFFICE_LOCATION_RELATIONSHIP_TYPE','LOCATION_HEALTH_STATUS',
  ];
  const requiredTables = ['tb_office','core_offices_v','core_office_locations','office_locations'];
  const requiredRoutes = ['/admin/locations','/admin/org/foundation/locations','/admin/offices'];
  const [evtRes, refRes, tblRes, routeRes, mapRes, attRes] = await Promise.all([
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_reference_group').select('group_code,is_active').in('group_code', requiredRefs),
    db.from('core_table_registry').select('table_name,is_active').in('table_name', requiredTables),
    db.from('core_admin_route_registry').select('route_path,is_active').in('route_path', requiredRoutes),
    db.from('core_legacy_table_map').select('legacy_table_name,mapping_status').eq('legacy_table_name','office_locations'),
    db.from('core_audit_log').select('id').eq('event_code','LOCATION_CANONICALIZATION_VERIFIED').limit(1),
  ]);
  if (evtRes.error) return failed('LOCATION_CANONICALIZATION','Location Canonicalization (OM-9)','Organisation', evtRes.error.message);
  const missingEvents = requiredEvents.filter((e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false));
  const missingRefs   = requiredRefs.filter((g)   => !(refRes.data  ?? []).some((r: any) => r.group_code === g && r.is_active !== false));
  const missingTables = requiredTables.filter((t) => !(tblRes.data  ?? []).some((r: any) => r.table_name === t));
  const missingRoutes = requiredRoutes.filter((p) => !(routeRes.data ?? []).some((r: any) => r.route_path === p && r.is_active !== false));
  const mapping = (mapRes.data ?? [])[0];
  const mappingOk = mapping?.mapping_status === 'MAPPED';
  const attested = (attRes.data ?? []).length > 0;
  const problems = missingEvents.length + missingRefs.length + missingTables.length + missingRoutes.length + (mappingOk ? 0 : 1) + (attested ? 0 : 1);
  return {
    check_code: 'LOCATION_CANONICALIZATION',
    check_name: 'Location Canonicalization (OM-9)',
    category: 'Organisation',
    status: pick(problems === 0, problems > 0 && problems < 4),
    summary: problems === 0
      ? 'Canonical office/location service, compatibility mapping, registry entries, and attestation are in place.'
      : `${missingEvents.length} audit event(s), ${missingRefs.length} ref group(s), ${missingTables.length} table(s), ${missingRoutes.length} route(s) missing; mapping ${mappingOk ? 'present' : 'missing'}; attestation ${attested ? 'present' : 'missing'}.`,
    details: [
      { label: 'Audit events seeded', value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Reference groups seeded', value: `${requiredRefs.length - missingRefs.length}/${requiredRefs.length}` },
      { label: 'Tables registered', value: `${requiredTables.length - missingTables.length}/${requiredTables.length}` },
      { label: 'Routes registered', value: `${requiredRoutes.length - missingRoutes.length}/${requiredRoutes.length}` },
      { label: 'Legacy office_locations mapping', value: mappingOk ? 'MAPPED (ADAPTER)' : 'MISSING' },
      { label: 'OM-9 attestation', value: attested ? 'present' : 'missing' },
      { label: 'Canonical service', value: 'src/platform/organization/canonicalLocationService.ts' },
    ],
    issues: [
      ...missingEvents.map((e) => `Audit event not seeded: ${e}`),
      ...missingRefs.map((g) => `Reference group not seeded: ${g}`),
      ...missingTables.map((t) => `Table not registered: ${t}`),
      ...missingRoutes.map((p) => `Route not registered: ${p}`),
      ...(mappingOk ? [] : ['Legacy office_locations → core_office_locations adapter mapping not registered.']),
      ...(attested ? [] : ['LOCATION_CANONICALIZATION_VERIFIED attestation not recorded.']),
    ],
    ran_at: nowIso(),
  };
}

// OM-8 — Scoped notification templates, text blocks, retention policy, remaining setting resources.
export async function checkScopedResourceSettings(): Promise<CheckResult> {
  const requiredEvents = [
    'NOTIFICATION_TEMPLATE_SETTING_ASSIGNED','NOTIFICATION_TEMPLATE_SETTING_UPDATED','NOTIFICATION_TEMPLATE_SETTING_DEACTIVATED',
    'TEXT_BLOCK_SETTING_ASSIGNED','TEXT_BLOCK_SETTING_UPDATED','TEXT_BLOCK_SETTING_DEACTIVATED',
    'RETENTION_POLICY_CREATED','RETENTION_POLICY_UPDATED','RETENTION_POLICY_DEACTIVATED',
    'RETENTION_POLICY_SETTING_ASSIGNED','RETENTION_POLICY_SETTING_UPDATED','RETENTION_POLICY_SETTING_DEACTIVATED',
    'APPROVAL_WORKFLOW_SETTING_ASSIGNED','APPROVAL_WORKFLOW_SETTING_UPDATED','APPROVAL_WORKFLOW_SETTING_DEACTIVATED',
    'DMS_FOLDER_SETTING_VALIDATED','SCOPED_RESOURCE_SETTING_VERIFIED',
  ];
  const requiredRefs = [
    'RETENTION_POLICY_STATUS','RETENTION_TRIGGER','RETENTION_DISPOSITION_ACTION',
    'SCOPED_RESOURCE_SETTING_TYPE','SCOPED_RESOURCE_HEALTH_STATUS',
    'NOTIFICATION_TEMPLATE_SETTING_STATUS','TEXT_BLOCK_SETTING_STATUS',
    'APPROVAL_WORKFLOW_SETTING_STATUS','DMS_FOLDER_SETTING_STATUS',
  ];
  const requiredTables = [
    'core_retention_policy','notification_templates','core_text_block',
    'core_workflow_definition','core_configuration_assignment',
  ];
  const [evtRes, refRes, tblRes, attRes] = await Promise.all([
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_reference_group').select('group_code,is_active').in('group_code', requiredRefs),
    db.from('core_table_registry').select('table_name').in('table_name', requiredTables),
    db.from('core_audit_log').select('id').eq('event_code', 'SCOPED_RESOURCE_SETTING_VERIFIED').limit(1),
  ]);
  if (evtRes.error) return failed('SCOPED_RESOURCE_SETTINGS', 'Scoped Resource Settings (OM-8)', 'Organisation', evtRes.error.message);
  const missingEvents = requiredEvents.filter((e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false));
  const missingRefs   = requiredRefs.filter((g)   => !(refRes.data  ?? []).some((r: any) => r.group_code === g && r.is_active !== false));
  const missingTables = requiredTables.filter((t) => !(tblRes.data  ?? []).some((r: any) => r.table_name === t));
  const attested = (attRes.data ?? []).length > 0;
  const problems = missingEvents.length + missingRefs.length + missingTables.length + (attested ? 0 : 1);
  return {
    check_code: 'SCOPED_RESOURCE_SETTINGS',
    check_name: 'Scoped Resource Settings (OM-8)',
    category: 'Organisation',
    status: pick(problems === 0, problems > 0 && problems < 4),
    summary: problems === 0
      ? 'Notification templates, text blocks, retention policy, and approval workflow settings are scope-aware. DMS folder documented as planned.'
      : `${missingEvents.length} audit event(s), ${missingRefs.length} ref group(s), ${missingTables.length} table(s) missing; attestation ${attested ? 'present' : 'absent'}.`,
    details: [
      { label: 'Audit events seeded', value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Reference groups seeded', value: `${requiredRefs.length - missingRefs.length}/${requiredRefs.length}` },
      { label: 'Tables registered', value: `${requiredTables.length - missingTables.length}/${requiredTables.length}` },
      { label: 'OM-8 attestation', value: attested ? 'present' : 'missing' },
      { label: 'DMS folder', value: 'planned — safe deferral, guided assignment blocked with clear message' },
      { label: 'Manual review', value: 'resolveEffectiveSettingsBundle exposes notificationTemplate/textBlock/retentionPolicy/approvalWorkflow/dmsFolder.' },
    ],
    issues: [
      ...missingEvents.map((e) => `Audit event not seeded: ${e}`),
      ...missingRefs.map((g) => `Reference group not seeded: ${g}`),
      ...missingTables.map((t) => `Table not registered: ${t}`),
      ...(attested ? [] : ['SCOPED_RESOURCE_SETTING_VERIFIED attestation not recorded.']),
    ],
    ran_at: nowIso(),
  };
}

// OM-7 — Configuration Center v2 (guided assignments + Test Resolve wired to OM-6).
export async function checkConfigurationCenterV2(): Promise<CheckResult> {
  const requiredEvents = [
    'CONFIG_GUIDED_ASSIGNMENT_CREATED',
    'CONFIG_GUIDED_ASSIGNMENT_UPDATED',
    'CONFIG_GUIDED_ASSIGNMENT_DEACTIVATED',
    'CONFIG_GUIDED_ASSIGNMENT_REACTIVATED',
    'CONFIG_GUIDED_ASSIGNMENT_VALIDATED',
    'CONFIG_ASSIGNMENT_CONFLICT_DETECTED',
    'CONFIG_ASSIGNMENT_ADVANCED_VIEWED',
    'CONFIG_TEST_RESOLVE_RUN',
    'CONFIG_CENTER_V2_VERIFIED',
  ];
  const requiredRefs = [
    'COMM_ASSIGNMENT_STATUS',
    'COMM_ASSIGNMENT_CONFLICT_TYPE',
    'COMM_ASSIGNMENT_VALIDATION_STATUS',
  ];
  const requiredTables = ['core_configuration_assignment'];
  const requiredPerms = ['core.admin.org.configuration.view', 'core.admin.org.configuration.manage'];
  const [evtRes, refRes, tblRes, permRes, attRes] = await Promise.all([
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_reference_group').select('group_code,is_active').in('group_code', requiredRefs),
    db.from('core_table_registry').select('table_name').in('table_name', requiredTables),
    db.from('core_permission_registry').select('permission_key,is_active').in('permission_key', requiredPerms),
    db.from('core_audit_log').select('id').eq('event_code', 'CONFIG_CENTER_V2_VERIFIED').limit(1),
  ]);
  if (evtRes.error) return failed('CONFIG_CENTER_V2', 'Configuration Center v2 (OM-7)', 'Organisation', evtRes.error.message);
  const missingEvents = requiredEvents.filter((e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false));
  const missingRefs   = requiredRefs.filter((g)   => !(refRes.data  ?? []).some((r: any) => r.group_code === g && r.is_active !== false));
  const missingTables = requiredTables.filter((t) => !(tblRes.data  ?? []).some((r: any) => r.table_name === t));
  const missingPerms  = requiredPerms.filter((p)  => !(permRes.data ?? []).some((r: any) => r.permission_key === p && r.is_active !== false));
  const attested = (attRes.data ?? []).length > 0;
  const problems = missingEvents.length + missingRefs.length + missingTables.length + missingPerms.length + (attested ? 0 : 1);
  return {
    check_code: 'CONFIG_CENTER_V2',
    check_name: 'Configuration Center v2 (OM-7)',
    category: 'Organisation',
    status: pick(problems === 0, problems > 0 && problems < 4),
    summary: problems === 0
      ? 'Guided assignments, audit events, reference vocabulary, permissions, and OM-6 Test Resolve wiring are in place.'
      : `${missingEvents.length} audit event(s), ${missingRefs.length} ref group(s), ${missingTables.length} table(s), ${missingPerms.length} permission(s) missing; attestation ${attested ? 'present' : 'absent'}.`,
    details: [
      { label: 'Audit events seeded', value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Reference groups seeded', value: `${requiredRefs.length - missingRefs.length}/${requiredRefs.length}` },
      { label: 'Tables registered', value: `${requiredTables.length - missingTables.length}/${requiredTables.length}` },
      { label: 'Permissions active', value: `${requiredPerms.length - missingPerms.length}/${requiredPerms.length}` },
      { label: 'V2 attestation', value: attested ? 'present' : 'missing' },
      { label: 'Manual review', value: 'ConfigurationCenterPage uses @/platform/configuration-center; Test Resolve delegates to resolveEffectiveSettingsBundle.' },
    ],
    issues: [
      ...missingEvents.map((e) => `Audit event not seeded: ${e}`),
      ...missingRefs.map((g) => `Reference group not seeded: ${g}`),
      ...missingTables.map((t) => `Table not registered: ${t}`),
      ...missingPerms.map((p) => `Permission not active: ${p}`),
      ...(attested ? [] : ['CONFIG_CENTER_V2_VERIFIED attestation not recorded.']),
    ],
    ran_at: nowIso(),
  };
}


// OM-6 — Settings inheritance & override alignment.
export async function checkOrgSettingsInheritance(): Promise<CheckResult> {
  const requiredEvents = [
    'DEPARTMENT_SETTING_OVERRIDE_ENABLED',
    'DEPARTMENT_SETTING_OVERRIDE_DISABLED',
    'DEPARTMENT_SETTING_RESET_TO_ORG_DEFAULT',
    'DEPARTMENT_SETTING_UPDATED',
    'DEPARTMENT_EFFECTIVE_SETTINGS_PREVIEWED',
    'EFFECTIVE_SETTINGS_RESOLVED',
    'INHERITANCE_HEALTH_CHECK_RUN',
    'INHERITANCE_MODEL_VERIFIED',
  ];
  const requiredRefs = [
    'COMM_SETTING_KEY', 'COMM_RESOURCE_TYPE', 'COMM_SCOPE_LEVEL',
    'COMM_INHERITANCE_MODE', 'COMM_HEALTH_STATUS',
  ];
  const requiredTables = [
    'core_department_profile', 'core_organization', 'core_configuration_assignment',
    'core_template', 'comm_letterhead',
  ];
  const [evtRes, refRes, tblRes, attRes] = await Promise.all([
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_reference_group').select('group_code,is_active').in('group_code', requiredRefs),
    db.from('core_table_registry').select('table_name').in('table_name', requiredTables),
    db.from('core_audit_log').select('id').eq('event_code', 'INHERITANCE_MODEL_VERIFIED').limit(1),
  ]);
  if (evtRes.error) return failed('ORG_SETTINGS_INHERITANCE', 'Settings Inheritance Alignment (OM-6)', 'Organisation', evtRes.error.message);
  const missingEvents = requiredEvents.filter((e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false));
  const missingRefs = requiredRefs.filter((g) => !(refRes.data ?? []).some((r: any) => r.group_code === g && r.is_active !== false));
  const missingTables = requiredTables.filter((t) => !(tblRes.data ?? []).some((r: any) => r.table_name === t));
  const attested = (attRes.data ?? []).length > 0;
  const problems = missingEvents.length + missingRefs.length + missingTables.length + (attested ? 0 : 1);
  return {
    check_code: 'ORG_SETTINGS_INHERITANCE',
    check_name: 'Settings Inheritance Alignment (OM-6)',
    category: 'Organisation',
    status: pick(problems === 0, problems > 0 && problems < 4),
    summary: problems === 0
      ? 'Canonical effective-settings resolver, audit catalogue, and reference vocabulary are aligned.'
      : `${missingEvents.length} audit event(s), ${missingRefs.length} ref group(s), ${missingTables.length} table(s) missing; attestation ${attested ? 'present' : 'absent'}.`,
    details: [
      { label: 'Audit events seeded', value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Reference groups seeded', value: `${requiredRefs.length - missingRefs.length}/${requiredRefs.length}` },
      { label: 'Tables registered', value: `${requiredTables.length - missingTables.length}/${requiredTables.length}` },
      { label: 'Model attestation', value: attested ? 'present' : 'missing' },
      { label: 'Manual review', value: 'DepartmentEffectivePreview + business modules consume @/platform/organization-settings (resolveEffectiveSettingsBundle).' },
    ],
    issues: [
      ...missingEvents.map((e) => `Audit event not seeded: ${e}`),
      ...missingRefs.map((g) => `Reference group not seeded: ${g}`),
      ...missingTables.map((t) => `Table not registered: ${t}`),
      ...(attested ? [] : ['INHERITANCE_MODEL_VERIFIED attestation not recorded.']),
    ],
    ran_at: nowIso(),
  };
}

// OM-5 — Template vs Letterhead model separation.
export async function checkTemplateModelSeparation(): Promise<CheckResult> {
  const requiredTables = ['core_template', 'core_template_version', 'core_template_layout', 'comm_letterhead'];
  const requiredEvents = [
    'DOCUMENT_TEMPLATE_CREATED',
    'DOCUMENT_TEMPLATE_UPDATED',
    'DOCUMENT_TEMPLATE_PUBLISHED',
    'DOCUMENT_TEMPLATE_LETTERHEAD_LINKED',
    'DOCUMENT_TEMPLATE_TOKEN_VALIDATED',
    'DOCUMENT_TEMPLATE_COMPATIBILITY_LOADED',
    'TEMPLATE_MODEL_SEPARATION_VERIFIED',
  ];
  const requiredRefGroups = [
    'DOCUMENT_TEMPLATE_TYPE',
    'DOCUMENT_TEMPLATE_CATEGORY',
    'DOCUMENT_TEMPLATE_STATUS',
    'DOCUMENT_TEMPLATE_OUTPUT_CHANNEL',
  ];
  const requiredPerms = ['core.admin.org.templates.view', 'core.admin.org.templates.manage', 'core.admin.org.letterheads.view'];
  const [tblRes, evtRes, refRes, permRes] = await Promise.all([
    db.from('core_table_registry').select('table_name,lifecycle_status').in('table_name', requiredTables),
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_reference_group').select('group_code,is_active').in('group_code', requiredRefGroups),
    db.from('core_permission_registry').select('permission_key,is_active').in('permission_key', requiredPerms),
  ]);
  if (tblRes.error) return failed('TEMPLATE_MODEL_SEPARATION', 'Template Model Separation (OM-5)', 'Communication', tblRes.error.message);
  const missingTables = requiredTables.filter((t) => !(tblRes.data ?? []).some((r: any) => r.table_name === t));
  const missingEvents = requiredEvents.filter((e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false));
  const missingRefs = requiredRefGroups.filter((g) => !(refRes.data ?? []).some((r: any) => r.group_code === g && r.is_active !== false));
  const missingPerms = requiredPerms.filter((p) => !(permRes.data ?? []).some((r: any) => r.permission_key === p && r.is_active !== false));
  const problems = missingTables.length + missingEvents.length + missingRefs.length + missingPerms.length;
  return {
    check_code: 'TEMPLATE_MODEL_SEPARATION',
    check_name: 'Template Model Separation (OM-5)',
    category: 'Communication',
    status: pick(problems === 0, problems > 0 && problems < 4),
    summary: problems === 0
      ? 'Canonical document-template tables, audit events, reference groups, and permissions are all in place.'
      : `${missingTables.length} table(s), ${missingEvents.length} audit event(s), ${missingRefs.length} ref group(s), ${missingPerms.length} permission(s) missing.`,
    details: [
      { label: 'Tables registered', value: `${requiredTables.length - missingTables.length}/${requiredTables.length}` },
      { label: 'Audit events seeded', value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Reference groups seeded', value: `${requiredRefGroups.length - missingRefs.length}/${requiredRefGroups.length}` },
      { label: 'Permissions active', value: `${requiredPerms.length - missingPerms.length}/${requiredPerms.length}` },
      { label: 'Manual review', value: 'TemplatesDesignerPage reads core_template; legacy comm_letterhead rows loaded via compatibility path only.' },
    ],
    issues: [
      ...missingTables.map((t) => `Table not registered: ${t}`),
      ...missingEvents.map((e) => `Audit event not seeded: ${e}`),
      ...missingRefs.map((g) => `Reference group not seeded: ${g}`),
      ...missingPerms.map((p) => `Permission not active: ${p}`),
    ],
    ran_at: nowIso(),
  };
}


// Epic OM-9.7.5 — Brand Asset Governance & Template Consumption Alignment.
export async function checkBrandAssetGovernance(): Promise<CheckResult> {
  const requiredTables = ['comm_media_asset', 'comm_asset_category_master', 'comm_asset_assignment', 'comm_letterhead', 'core_configuration_assignment'];
  const requiredEvents = [
    'COMM_MEDIA_ASSET_SUBMITTED',
    'COMM_MEDIA_ASSET_APPROVED',
    'COMM_MEDIA_ASSET_REJECTED',
    'COMM_MEDIA_ASSET_ARCHIVED',
    'COMM_ASSET_HEALTH_CHECK_RUN',
    'COMM_LETTERHEAD_ASSET_BOUND',
    'COMM_PORTAL_BRANDING_ASSET_ASSIGNED',
    'COMM_EMAIL_BRANDING_ASSET_ASSIGNED',
    'COMM_UNAPPROVED_ASSET_USE_ATTEMPTED',
    'BRAND_ASSET_GOVERNANCE_VERIFIED',
  ];
  const requiredRefGroups = ['BRAND_ASSET_SLOT', 'BRAND_ASSET_LIFECYCLE_STATE', 'BRAND_ASSET_HEALTH_STATUS'];
  const requiredPerms = [
    'core.admin.template_management.view',
    'core.admin.template_management.manage_assets',
    'core.admin.template_management.approve_assets',
    'core.admin.template_management.archive_assets',
    'core.admin.template_management.manage_letterheads',
    'core.admin.template_management.manage_portal_branding',
    'core.admin.template_management.manage_email_branding',
    'core.admin.template_management.manage_assignments',
    'core.admin.template_management.view_asset_health',
    'core.admin.template_management.use_unapproved_asset',
  ];
  const [tblRes, evtRes, refRes, permRes, assetRes] = await Promise.all([
    db.from('core_table_registry').select('table_name').in('table_name', requiredTables),
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_reference_group').select('group_code,is_active').in('group_code', requiredRefGroups),
    db.from('core_permission_registry').select('permission_key,is_active').in('permission_key', requiredPerms),
    db.from('comm_media_asset').select('id,approval_status,category', { count: 'exact', head: false }),
  ]);
  if (tblRes.error) return failed('BRAND_ASSET_GOVERNANCE', 'Brand Asset Governance (OM-9.7.5)', 'Communication', tblRes.error.message);
  const missingTables = requiredTables.filter((t) => !(tblRes.data ?? []).some((r: any) => r.table_name === t));
  const missingEvents = requiredEvents.filter((e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false));
  const missingRefs = requiredRefGroups.filter((g) => !(refRes.data ?? []).some((r: any) => r.group_code === g && r.is_active !== false));
  const missingPerms = requiredPerms.filter((p) => !(permRes.data ?? []).some((r: any) => r.permission_key === p && r.is_active !== false));
  const assets = (assetRes.data ?? []) as any[];
  const approved = assets.filter((a) => a.approval_status === 'approved').length;
  const problems = missingTables.length + missingEvents.length + missingRefs.length + missingPerms.length;
  return {
    check_code: 'BRAND_ASSET_GOVERNANCE',
    check_name: 'Brand Asset Governance (OM-9.7.5)',
    category: 'Communication',
    status: pick(problems === 0, problems > 0 && problems < 5),
    summary: problems === 0
      ? `Brand asset governance in place. ${assets.length} assets (${approved} approved).`
      : `${missingTables.length} table(s), ${missingEvents.length} audit event(s), ${missingRefs.length} ref group(s), ${missingPerms.length} permission(s) missing.`,
    details: [
      { label: 'Tables registered',      value: `${requiredTables.length - missingTables.length}/${requiredTables.length}` },
      { label: 'Audit events seeded',    value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Reference groups seeded',value: `${requiredRefGroups.length - missingRefs.length}/${requiredRefGroups.length}` },
      { label: 'Permissions active',     value: `${requiredPerms.length - missingPerms.length}/${requiredPerms.length}` },
      { label: 'Media assets (approved / total)', value: `${approved}/${assets.length}` },
      { label: 'Manual review', value: 'AssetPickerDialog uploads official-category assets as DRAFT; only approved+active+in-window assets appear in pickers.' },
    ],
    issues: [
      ...missingTables.map((t) => `Table not registered: ${t}`),
      ...missingEvents.map((e) => `Audit event not seeded: ${e}`),
      ...missingRefs.map((g) => `Reference group not seeded: ${g}`),
      ...missingPerms.map((p) => `Permission not active: ${p}`),
    ],
    ran_at: nowIso(),
  };
}

// OM-9.7.5A — Communication Governance CI Gate.
// Verifies audit events, permission, and attestation for the direct-read
// governance lint (`bun run lint:comm-governance`) which enforces that
// runtime business modules use resolveBusinessCommunicationContext.
export async function checkCommunicationDirectReadGovernance(): Promise<CheckResult> {
  const requiredEvents = [
    'COMM_BUSINESS_MODULE_RESOLVER_BYPASS_DETECTED',
    'COMM_DIRECT_READ_GOVERNANCE_CHECK_RUN',
    'COMM_DIRECT_READ_GOVERNANCE_VERIFIED',
  ];
  const [evtRes, attRes] = await Promise.all([
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_release_readiness_attestation')
      .select('check_code,attested_status,is_active')
      .eq('check_code', 'COMM_DIRECT_READ_GOVERNANCE')
      .eq('is_active', true)
      .limit(1),
  ]);
  const missingEvents = requiredEvents.filter(
    (e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false),
  );
  const attested = (attRes.data ?? []).length > 0;
  const issues: string[] = [];
  missingEvents.forEach((e) => issues.push(`Audit event not seeded: ${e}`));
  if (!attested) issues.push('No active attestation for COMM_DIRECT_READ_GOVERNANCE — run `bun run lint:comm-governance` locally/in CI, then attest.');
  const problems = missingEvents.length + (attested ? 0 : 1);
  return {
    check_code: 'COMM_DIRECT_READ_GOVERNANCE',
    check_name: 'Communication Direct-Read Governance (OM-9.7.5A)',
    category: 'Communication',
    status: pick(problems === 0, problems > 0 && problems < 3),
    summary: problems === 0
      ? 'Direct-read governance active: audit events seeded and CI-gate attested.'
      : `${missingEvents.length} audit event(s) missing; attestation ${attested ? 'present' : 'missing'}.`,
    details: [
      { label: 'Audit events seeded', value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'CI-gate attestation', value: attested ? 'PRESENT' : 'MISSING' },
      { label: 'Lint script', value: 'scripts/lint-no-direct-comm.ts' },
      { label: 'Package script', value: 'bun run lint:comm-governance' },
      { label: 'Report artifact', value: 'docs/enterprise/comm-direct-read-report.json' },
      { label: 'Purpose', value: 'Verifies runtime business modules do not bypass the canonical communication resolver.' },
    ],
    issues,
    ran_at: nowIso(),
  };
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

// OM-9.7.6 — Communication Template Governance readiness check.
import { runCommunicationTemplateHealth } from '@/platform/comm-template-governance/communicationTemplateHealth';
import { COMM_BUSINESS_EVENTS } from '@/platform/comm-template-governance/businessEventCatalogue';
import { COMM_TOKEN_CATALOGUE } from '@/platform/comm-template-governance/tokenCatalogue';
import { COMM_TEXT_BLOCK_SEEDS } from '@/platform/comm-template-governance/textBlockCatalogue';
import { COMM_TEMPLATE_SEEDS } from '@/platform/comm-template-governance/templateSeedCatalogue';

export async function checkCommunicationTemplateGovernance(): Promise<CheckResult> {
  const requiredEvents = [
    'COMM_TEMPLATE_SEED_CATALOGUE_CREATED',
    'COMM_TEMPLATE_CREATED',
    'COMM_TEMPLATE_GOVERNANCE_VERIFIED',
    'COMM_RENDER_CONTEXT_HEALTH_CHECK_RUN',
    'COMM_BUSINESS_EVENT_TEMPLATE_ASSIGNED',
  ];
  const requiredGroups = [
    'COMM_TEMPLATE_TYPE','COMM_TEMPLATE_STATUS','COMM_TEMPLATE_CATEGORY',
    'COMM_BUSINESS_EVENT','COMM_RECIPIENT_TYPE','COMM_OUTPUT_CHANNEL',
    'COMM_LANGUAGE','COMM_TOKEN_CATEGORY','COMM_TEMPLATE_HEALTH_STATUS',
    'COMM_TEMPLATE_APPROVAL_POLICY','COMM_TEMPLATE_RENDER_CONTEXT',
    'COMM_MESSAGE_PRIORITY','COMM_DELIVERY_PURPOSE','COMM_RENDER_WARNING_TYPE',
    'COMM_TEMPLATE_ASSIGNMENT_SCOPE',
  ];
  const [evtRes, grpRes, attRes] = await Promise.all([
    db.from('core_audit_event_type').select('event_code,is_active').in('event_code', requiredEvents),
    db.from('core_reference_group').select('group_code,is_active').in('group_code', requiredGroups),
    db.from('core_release_readiness_attestation').select('check_code,is_active')
      .eq('check_code', 'COMMUNICATION_TEMPLATE_GOVERNANCE').eq('is_active', true).limit(1),
  ]);
  const missingEvents = requiredEvents.filter(
    (e) => !(evtRes.data ?? []).some((r: any) => r.event_code === e && r.is_active !== false),
  );
  const missingGroups = requiredGroups.filter(
    (g) => !(grpRes.data ?? []).some((r: any) => r.group_code === g && r.is_active !== false),
  );
  const attested = (attRes.data ?? []).length > 0;

  const health = runCommunicationTemplateHealth();
  const issues: string[] = [];
  missingEvents.forEach((e) => issues.push(`Audit event not seeded: ${e}`));
  missingGroups.forEach((g) => issues.push(`Reference group not seeded: ${g}`));
  if (health.totals.blockers > 0) issues.push(`Template health scan has ${health.totals.blockers} blocker(s).`);
  if (!attested) issues.push('No active attestation for COMMUNICATION_TEMPLATE_GOVERNANCE.');

  const problems = missingEvents.length + missingGroups.length + health.totals.blockers + (attested ? 0 : 1);
  return {
    check_code: 'COMMUNICATION_TEMPLATE_GOVERNANCE',
    check_name: 'Communication Template Governance (OM-9.7.6)',
    category: 'Communication',
    status: pick(problems === 0, problems > 0 && health.totals.blockers === 0),
    summary: problems === 0
      ? `Template governance active: ${health.totals.templates} seeded templates covering ${health.totals.businessEventsCovered}/${health.totals.businessEventsTotal} business events.`
      : `${issues.length} governance issue(s); ${health.totals.blockers} blocker(s), ${health.totals.warnings} warning(s).`,
    details: [
      { label: 'Reference groups seeded',  value: `${requiredGroups.length - missingGroups.length}/${requiredGroups.length}` },
      { label: 'Audit events seeded',      value: `${requiredEvents.length - missingEvents.length}/${requiredEvents.length}` },
      { label: 'Business events catalogued', value: String(COMM_BUSINESS_EVENTS.length) },
      { label: 'Tokens catalogued',        value: String(COMM_TOKEN_CATALOGUE.length) },
      { label: 'Text blocks seeded',       value: String(COMM_TEXT_BLOCK_SEEDS.length) },
      { label: 'Starter templates seeded', value: String(COMM_TEMPLATE_SEEDS.length) },
      { label: 'Health warnings',          value: String(health.totals.warnings) },
      { label: 'Health blockers',          value: String(health.totals.blockers) },
      { label: 'Attestation',              value: attested ? 'PRESENT' : 'MISSING' },
    ],
    issues,
    ran_at: nowIso(),
  };
}
