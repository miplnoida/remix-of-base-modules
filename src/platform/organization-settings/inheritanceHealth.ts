/**
 * Epic OM-6 — Inheritance/override health checks and mutation helpers.
 */
import { supabase } from '@/integrations/supabase/client';
import { logOrgMutation } from '@/platform/organization/orgMutations';
// Permission is enforced by the calling UI via <OrgActionGate permission="departments.manage">.
// These helpers are server-facing and should only be invoked from gated handlers.
import { INHERITANCE_EVENTS } from './inheritanceEvents';
import { SETTING_KEYS, findSettingKey } from './settingKeys';
import { resolveEffectiveSettingsBundle, type EffectiveSettingsBundle } from './effectiveSettingsResolver';

const db = supabase as any;

export interface HealthFinding {
  severity: 'info' | 'warning' | 'error';
  departmentCode?: string | null;
  settingKey?: string;
  message: string;
}

export interface HealthReport {
  ranAt: string;
  scannedDepartments: number;
  findings: HealthFinding[];
  summary: { errors: number; warnings: number; ok: number };
}

/**
 * Scan every active department and report inheritance/override mismatches,
 * missing effective values, and inactive references.
 * Uses the SAME canonical resolver runtime consumers do, so preview and
 * runtime cannot silently disagree.
 */
export async function validateInheritanceHealth(filters?: {
  departmentCodes?: string[];
}): Promise<HealthReport> {
  const findings: HealthFinding[] = [];
  const { data: rows, error } = await db
    .from('core_department_profile')
    .select('department_code');
  if (error) {
    return {
      ranAt: new Date().toISOString(), scannedDepartments: 0,
      findings: [{ severity: 'error', message: `Could not load departments: ${error.message}` }],
      summary: { errors: 1, warnings: 0, ok: 0 },
    };
  }
  const codes = (rows ?? [])
    .map((r: any) => r.department_code)
    .filter((c: any) => !!c)
    .filter((c: string) => !filters?.departmentCodes?.length || filters.departmentCodes.includes(c));

  let ok = 0;
  for (const code of codes) {
    let bundle: EffectiveSettingsBundle;
    try {
      bundle = await resolveEffectiveSettingsBundle({ departmentCode: code });
    } catch (e: any) {
      findings.push({ severity: 'error', departmentCode: code, message: `Resolver failed: ${e?.message ?? 'unknown error'}` });
      continue;
    }
    let deptHasIssue = false;
    for (const s of bundle.ordered) {
      if (s.status === 'PLANNED') continue;
      if (s.inheritanceMode === 'CONFLICT') {
        findings.push({ severity: 'error', departmentCode: code, settingKey: s.key,
          message: `${s.label}: this department selected a custom value, but it is still marked as inheriting from Organization.` });
        deptHasIssue = true;
      }
      for (const w of s.warnings) {
        findings.push({ severity: s.health === 'ERROR' ? 'error' : 'warning', departmentCode: code, settingKey: s.key, message: `${s.label}: ${w}` });
        deptHasIssue = true;
      }
    }
    if (!deptHasIssue) ok += 1;
  }

  const summary = {
    errors: findings.filter((f) => f.severity === 'error').length,
    warnings: findings.filter((f) => f.severity === 'warning').length,
    ok,
  };

  void logOrgMutation({
    eventCode: INHERITANCE_EVENTS.healthCheckRun,
    kind: 'RUN',
    entityType: 'inheritance_health',
    entityDisplayName: `${codes.length} departments`,
    outcome: summary.errors ? 'PARTIAL' : 'SUCCESS',
    metadata: summary,
  }).catch(() => undefined);

  if (summary.errors) {
    void logOrgMutation({
      eventCode: INHERITANCE_EVENTS.mismatchDetected,
      kind: 'RUN',
      entityType: 'inheritance_health',
      entityDisplayName: `${summary.errors} mismatch(es)`,
      outcome: 'PARTIAL',
      metadata: { errors: summary.errors, warnings: summary.warnings },
    }).catch(() => undefined);
  }

  return { ranAt: new Date().toISOString(), scannedDepartments: codes.length, findings, summary };
}

/**
 * Set a department override for one of the supported department-profile-backed
 * settings. Automatically flips the matching inherit flag to false.
 * Audited and permission-gated.
 */
export async function setDepartmentSettingOverride(args: {
  departmentId: string;
  departmentCode: string;
  settingKey: string;
  value: string | null;
  reason?: string | null;
}): Promise<void> {
  const desc = findSettingKey(args.settingKey);
  if (!desc) throw new Error(`Unknown setting key: ${args.settingKey}`);
  if (desc.storage !== 'DEPARTMENT_PROFILE' || !desc.deptOverrideColumn) {
    throw new Error(`Setting ${args.settingKey} is not stored on the department profile — use Configuration Center instead.`);
  }
  assertOrgAction('departments.manage');

  const patch: Record<string, unknown> = { [desc.deptOverrideColumn]: args.value };
  if (desc.deptInheritFlag) patch[desc.deptInheritFlag] = args.value == null;

  const { data: before } = await db.from('core_department_profile').select(`${desc.deptOverrideColumn},${desc.deptInheritFlag ?? 'id'}`).eq('id', args.departmentId).maybeSingle();
  const { error } = await db.from('core_department_profile').update(patch).eq('id', args.departmentId);
  if (error) {
    await logOrgMutation({
      eventCode: INHERITANCE_EVENTS.settingUpdated, kind: 'UPDATE',
      entityType: 'core_department_profile', entityId: args.departmentId, entityDisplayName: args.departmentCode,
      before, after: patch, outcome: 'FAILURE', reason: args.reason ?? null,
      metadata: { settingKey: args.settingKey, error: error.message },
    });
    throw error;
  }

  await logOrgMutation({
    eventCode: args.value == null ? INHERITANCE_EVENTS.overrideDisabled : INHERITANCE_EVENTS.overrideEnabled,
    kind: 'UPDATE',
    entityType: 'core_department_profile',
    entityId: args.departmentId,
    entityDisplayName: args.departmentCode,
    before, after: patch, outcome: 'SUCCESS', reason: args.reason ?? null,
    metadata: { settingKey: args.settingKey, valueSet: args.value != null },
  });
}

/**
 * Reset a department setting to the organisation default: clear the override
 * value AND set the inherit flag back to true. Audited.
 */
export async function resetDepartmentSettingToInherited(args: {
  departmentId: string;
  departmentCode: string;
  settingKey: string;
  reason?: string | null;
}): Promise<void> {
  const desc = findSettingKey(args.settingKey);
  if (!desc) throw new Error(`Unknown setting key: ${args.settingKey}`);
  if (desc.storage !== 'DEPARTMENT_PROFILE' || !desc.deptOverrideColumn) {
    throw new Error(`Setting ${args.settingKey} does not have a department override to reset.`);
  }
  assertOrgAction('departments.manage');

  const patch: Record<string, unknown> = { [desc.deptOverrideColumn]: null };
  if (desc.deptInheritFlag) patch[desc.deptInheritFlag] = true;

  const { data: before } = await db.from('core_department_profile').select(`${desc.deptOverrideColumn},${desc.deptInheritFlag ?? 'id'}`).eq('id', args.departmentId).maybeSingle();
  const { error } = await db.from('core_department_profile').update(patch).eq('id', args.departmentId);
  if (error) {
    await logOrgMutation({
      eventCode: INHERITANCE_EVENTS.resetToOrgDefault, kind: 'UPDATE',
      entityType: 'core_department_profile', entityId: args.departmentId, entityDisplayName: args.departmentCode,
      before, after: patch, outcome: 'FAILURE', reason: args.reason ?? null,
      metadata: { settingKey: args.settingKey, error: error.message },
    });
    throw error;
  }
  await logOrgMutation({
    eventCode: INHERITANCE_EVENTS.resetToOrgDefault, kind: 'UPDATE',
    entityType: 'core_department_profile', entityId: args.departmentId, entityDisplayName: args.departmentCode,
    before, after: patch, outcome: 'SUCCESS', reason: args.reason ?? null,
    metadata: { settingKey: args.settingKey },
  });
}

export const SUPPORTED_RESET_KEYS = SETTING_KEYS
  .filter((s) => s.storage === 'DEPARTMENT_PROFILE' && !!s.deptOverrideColumn)
  .map((s) => s.key);
