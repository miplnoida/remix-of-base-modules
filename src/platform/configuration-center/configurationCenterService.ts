/**
 * Epic OM-7 — Configuration Center v2 service layer.
 *
 * - Reads/writes `core_configuration_assignment` via the guided contract.
 * - Constructs `scope_ref` / `resource_ref` / `rule_set` from typed inputs so
 *   admins never author raw JSON.
 * - Validation catches setting/resource mismatches and duplicate active rows
 *   BEFORE save; conflicts surface into the Health tab and the release check.
 * - Test Resolve delegates to OM-6 `resolveEffectiveSettingsBundle` — no
 *   competing resolver.
 * - All mutations audit via `logOrgMutation` with the OM-7 event codes.
 */
import { supabase } from '@/integrations/supabase/client';
import { logOrgMutation } from '@/platform/organization/orgMutations';
import type { ScopeLevel, AssignmentRow } from '@/lib/configuration/resolver';
import {
  resolveEffectiveSettingsBundle,
  type EffectiveSettingsBundle,
  type EffectiveSettingsContext,
} from '@/platform/organization-settings';
import { CONFIG_CENTER_EVENTS } from './configurationCenterEvents';
import {
  GUIDED_SETTING_KEYS,
  findGuidedKey,
  SCOPE_REQUIRED_KEYS,
  type GuidedAssignmentInput,
  type AssignmentValidationResult,
  type AssignmentValidationIssue,
  type AssignmentConflict,
  type ConfigHealthReport,
  type ConfigResourceType,
} from './configurationCenterTypes';

const db = supabase as any;

const VALID_RESOURCE_TYPES: ConfigResourceType[] = [
  'DOCUMENT_TEMPLATE','NOTIFICATION_TEMPLATE','LETTERHEAD','EMAIL_SIGNATURE','DISCLAIMER',
  'PRINT_FOOTER','TEXT_BLOCK','OUTPUT_CHANNEL','LANGUAGE','APPROVAL_WORKFLOW','DMS_FOLDER','RETENTION_POLICY','MEDIA_ASSET',
];

const VALID_SCOPE_LEVELS: ScopeLevel[] = [
  'USER','WORKFLOW_STAGE','WORKFLOW','LOCATION','DEPARTMENT','MODULE','ORG','GLOBAL',
];

// ---------- Read ----------

export interface AssignmentFilters {
  domain?: string;
  scopeLevel?: ScopeLevel;
  resourceType?: string;
  settingKey?: string;
  onlyActive?: boolean;
}

export async function getAssignments(filters: AssignmentFilters = {}): Promise<AssignmentRow[]> {
  let q = db.from('core_configuration_assignment').select('*');
  if (filters.domain) q = q.eq('domain', filters.domain);
  if (filters.scopeLevel) q = q.eq('scope_level', filters.scopeLevel);
  if (filters.resourceType) q = q.eq('resource_type', filters.resourceType);
  if (filters.onlyActive) q = q.eq('is_active', true);
  const { data, error } = await q.order('scope_level').order('priority', { ascending: false });
  if (error) throw error;
  let rows = (data ?? []) as AssignmentRow[];
  if (filters.settingKey) {
    rows = rows.filter((r) => (r.rule_set as any)?.setting_key === filters.settingKey);
  }
  return rows;
}

export async function getAssignment(id: string): Promise<AssignmentRow | null> {
  const { data, error } = await db.from('core_configuration_assignment').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as AssignmentRow) ?? null;
}

// ---------- Validation ----------

export async function validateAssignment(
  input: GuidedAssignmentInput,
  opts: { excludeId?: string } = {},
): Promise<AssignmentValidationResult> {
  const issues: AssignmentValidationIssue[] = [];
  const key = findGuidedKey(input.settingKey);
  if (!key) {
    issues.push({ code: 'SETTING_KEY_UNKNOWN', field: 'settingKey', message: `Unknown setting key: ${input.settingKey}` });
  } else if (input.resourceType !== key.resourceType) {
    issues.push({
      code: 'RESOURCE_TYPE_MISMATCH', field: 'resourceType',
      message: `${key.label} requires a ${key.resourceType.replace(/_/g, ' ').toLowerCase()} resource.`,
    });
  } else if (key.status === 'PLANNED') {
    // OM-8: DMS folder catalogue is not available yet — block save with a clear message.
    issues.push({
      code: 'RESOURCE_TYPE_INVALID', field: 'resourceType',
      message: key.resourceType === 'DMS_FOLDER'
        ? 'DMS folder catalogue is not available yet. This setting will be enabled once a DMS folder model ships.'
        : `${key.label} is planned${key.plannedIn ? ` for ${key.plannedIn}` : ''} and cannot be assigned yet.`,
    });
  }
  if (!VALID_RESOURCE_TYPES.includes(input.resourceType)) {
    issues.push({ code: 'RESOURCE_TYPE_INVALID', field: 'resourceType', message: `Unsupported resource type: ${input.resourceType}` });
  }
  if (!VALID_SCOPE_LEVELS.includes(input.scopeLevel)) {
    issues.push({ code: 'SCOPE_LEVEL_INVALID', field: 'scopeLevel', message: `Invalid scope level: ${input.scopeLevel}` });
  } else {
    const req = SCOPE_REQUIRED_KEYS[input.scopeLevel];
    for (const rk of req) {
      if (!(input.scopeRef ?? {})[rk]) {
        issues.push({
          code: 'SCOPE_TARGET_MISSING', field: 'scopeRef',
          message: `Please select a target for the ${input.scopeLevel.toLowerCase()} scope (missing ${rk}).`,
        });
      }
    }
    if (input.scopeLevel === 'WORKFLOW_STAGE' && !input.scopeRef?.workflow_code) {
      issues.push({ code: 'STAGE_WITHOUT_WORKFLOW', field: 'scopeRef', message: 'Workflow stage selected without a workflow.' });
    }
  }
  if (!input.resourceId) {
    issues.push({ code: 'RESOURCE_MISSING', field: 'resourceId', message: 'Please select a resource for this assignment.' });
  } else if (input.resourceIsActive === false) {
    issues.push({ code: 'RESOURCE_INACTIVE', field: 'resourceId', message: 'This resource is inactive and cannot be assigned.' });
  }
  if (input.effectiveFrom && input.effectiveTo && new Date(input.effectiveTo) < new Date(input.effectiveFrom)) {
    issues.push({ code: 'DATE_RANGE_INVALID', field: 'effectiveTo', message: 'Effective To cannot be earlier than Effective From.' });
  }
  if (input.priority != null && (!Number.isFinite(input.priority) || input.priority < 0)) {
    issues.push({ code: 'PRIORITY_INVALID', field: 'priority', message: 'Priority must be a non-negative number.' });
  }
  // Duplicate active check (same setting_key + scope_level + scope_ref + resource_type, active).
  if (key && input.resourceId && issues.length === 0) {
    const dup = await findDuplicateActive(input, opts.excludeId);
    if (dup) issues.push({
      code: 'DUPLICATE_ACTIVE_ASSIGNMENT',
      message: `An active assignment already exists for this ${input.scopeLevel.toLowerCase()} scope and setting.`,
    });
  }
  return {
    valid: issues.length === 0,
    issues,
    status: issues.length === 0 ? 'VALID' : 'INVALID',
  };
}

async function findDuplicateActive(input: GuidedAssignmentInput, excludeId?: string): Promise<AssignmentRow | null> {
  const rows = await getAssignments({ resourceType: input.resourceType, scopeLevel: input.scopeLevel, onlyActive: true });
  for (const r of rows) {
    if (excludeId && r.id === excludeId) continue;
    if ((r.rule_set as any)?.setting_key !== input.settingKey) continue;
    if (JSON.stringify(r.scope_ref ?? {}) === JSON.stringify(input.scopeRef ?? {})) return r;
  }
  return null;
}

// ---------- Mutations ----------

function buildPayload(input: GuidedAssignmentInput) {
  const key = findGuidedKey(input.settingKey);
  const ruleSet: Record<string, unknown> = {
    ...(input.ruleSet ?? {}),
    setting_key: input.settingKey,
    guided: true,
  };
  if (input.description) ruleSet.description = input.description;
  const resourceRef: Record<string, unknown> = {
    id: input.resourceId,
    code: input.resourceCode ?? null,
    name: input.resourceName ?? null,
  };
  return {
    domain: key?.domain ?? 'communication',
    business_event: null as string | null,
    scope_level: input.scopeLevel,
    scope_ref: input.scopeRef ?? {},
    resource_type: input.resourceType,
    resource_ref: resourceRef,
    rule_set: ruleSet,
    priority: input.priority ?? 0,
    effective_from: input.effectiveFrom || null,
    effective_to: input.effectiveTo || null,
    is_active: input.isActive !== false,
    notes: input.description || null,
  };
}

export async function createGuidedAssignment(input: GuidedAssignmentInput): Promise<AssignmentRow> {
  const validation = await validateAssignment(input);
  await logOrgMutation({
    eventCode: CONFIG_CENTER_EVENTS.guidedValidated,
    kind: 'UPDATE',
    entityType: 'core_configuration_assignment',
    entityDisplayName: `${input.settingKey}@${input.scopeLevel}`,
    metadata: { valid: validation.valid, issues: validation.issues.map((i) => i.code) },
  });
  if (!validation.valid) {
    const msg = validation.issues[0]?.message ?? 'Assignment is invalid.';
    throw new Error(msg);
  }
  const payload = buildPayload(input);
  const { data, error } = await db.from('core_configuration_assignment').insert([payload]).select('*').maybeSingle();
  if (error) {
    await logOrgMutation({
      eventCode: CONFIG_CENTER_EVENTS.guidedCreated, kind: 'CREATE',
      entityType: 'core_configuration_assignment', outcome: 'FAILURE',
      metadata: { setting_key: input.settingKey, error: error.message },
    });
    throw error;
  }
  await logOrgMutation({
    eventCode: CONFIG_CENTER_EVENTS.guidedCreated, kind: 'CREATE',
    entityType: 'core_configuration_assignment',
    entityId: (data as any)?.id, entityDisplayName: `${input.settingKey}@${input.scopeLevel}`,
    after: payload as any,
  });
  return data as AssignmentRow;
}

export async function updateGuidedAssignment(id: string, input: GuidedAssignmentInput): Promise<AssignmentRow> {
  const before = await getAssignment(id);
  const validation = await validateAssignment(input, { excludeId: id });
  if (!validation.valid) throw new Error(validation.issues[0]?.message ?? 'Assignment is invalid.');
  const payload = buildPayload(input);
  const { data, error } = await db.from('core_configuration_assignment').update(payload).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  await logOrgMutation({
    eventCode: CONFIG_CENTER_EVENTS.guidedUpdated, kind: 'UPDATE',
    entityType: 'core_configuration_assignment', entityId: id,
    entityDisplayName: `${input.settingKey}@${input.scopeLevel}`,
    before: before as any, after: payload as any,
  });
  return data as AssignmentRow;
}

export async function deactivateAssignment(id: string): Promise<void> {
  const before = await getAssignment(id);
  const { error } = await db.from('core_configuration_assignment').update({ is_active: false }).eq('id', id);
  if (error) throw error;
  await logOrgMutation({
    eventCode: CONFIG_CENTER_EVENTS.guidedDeactivated, kind: 'DEACTIVATE',
    entityType: 'core_configuration_assignment', entityId: id,
    before: before as any, after: { is_active: false },
  });
}

export async function reactivateAssignment(id: string): Promise<void> {
  const before = await getAssignment(id);
  const { error } = await db.from('core_configuration_assignment').update({ is_active: true }).eq('id', id);
  if (error) throw error;
  await logOrgMutation({
    eventCode: CONFIG_CENTER_EVENTS.guidedReactivated, kind: 'REACTIVATE',
    entityType: 'core_configuration_assignment', entityId: id,
    before: before as any, after: { is_active: true },
  });
}

// ---------- Legacy / Advanced ----------

/** A legacy row is any active row NOT tagged rule_set.guided === true. */
export function isLegacyAssignment(row: AssignmentRow): boolean {
  return !((row.rule_set as any)?.guided === true);
}

export async function getLegacyAssignments(): Promise<AssignmentRow[]> {
  const rows = await getAssignments();
  return rows.filter(isLegacyAssignment);
}

export async function logAdvancedView(id: string): Promise<void> {
  await logOrgMutation({
    eventCode: CONFIG_CENTER_EVENTS.advancedViewed, kind: 'UPDATE',
    entityType: 'core_configuration_assignment', entityId: id,
  });
}

// ---------- Conflicts / Health ----------

export async function detectAssignmentConflicts(): Promise<AssignmentConflict[]> {
  const rows = await getAssignments();
  const active = rows.filter((r) => r.is_active);
  const conflicts: AssignmentConflict[] = [];

  // Duplicate active (same setting_key + scope_level + scope_ref + resource_type)
  const seen = new Map<string, AssignmentRow>();
  for (const r of active) {
    const settingKey = (r.rule_set as any)?.setting_key ?? null;
    const sig = JSON.stringify([settingKey, r.scope_level, r.resource_type, r.scope_ref ?? {}]);
    const existing = seen.get(sig);
    if (existing) {
      conflicts.push({
        type: 'DUPLICATE_ACTIVE', assignmentId: r.id, scopeLevel: r.scope_level, settingKey,
        message: `Two active assignments conflict for the same ${r.scope_level.toLowerCase()} scope and setting.`,
      });
    } else {
      seen.set(sig, r);
    }
  }

  for (const r of active) {
    const req = SCOPE_REQUIRED_KEYS[r.scope_level] ?? [];
    for (const k of req) {
      if (!(r.scope_ref ?? {})[k]) {
        conflicts.push({
          type: 'MISSING_SCOPE_TARGET', assignmentId: r.id, scopeLevel: r.scope_level,
          settingKey: (r.rule_set as any)?.setting_key ?? null,
          message: `Assignment at ${r.scope_level} scope has no ${k}.`,
        });
      }
    }
    if (r.scope_level === 'WORKFLOW_STAGE' && !(r.scope_ref as any)?.workflow_code) {
      conflicts.push({
        type: 'STAGE_WITHOUT_WORKFLOW', assignmentId: r.id, scopeLevel: r.scope_level,
        settingKey: (r.rule_set as any)?.setting_key ?? null,
        message: 'Workflow stage assignment is missing its workflow code.',
      });
    }
    const settingKey = (r.rule_set as any)?.setting_key ?? null;
    if (settingKey) {
      const def = findGuidedKey(settingKey);
      if (!def) {
        conflicts.push({
          type: 'UNKNOWN_SETTING', assignmentId: r.id, scopeLevel: r.scope_level, settingKey,
          message: `Assignment references unknown setting key: ${settingKey}.`,
        });
      } else if (def.resourceType !== r.resource_type) {
        conflicts.push({
          type: 'RESOURCE_TYPE_MISMATCH', assignmentId: r.id, scopeLevel: r.scope_level, settingKey,
          message: `${def.label} expects ${def.resourceType} but assignment uses ${r.resource_type}.`,
        });
      }
    }
    const ref = r.resource_ref as any;
    if (!ref?.id && !ref?.code) {
      conflicts.push({
        type: 'MISSING_RESOURCE', assignmentId: r.id, scopeLevel: r.scope_level,
        settingKey: (r.rule_set as any)?.setting_key ?? null,
        message: 'Assignment has no selected resource.',
      });
    }
    if (isLegacyAssignment(r)) {
      conflicts.push({
        type: 'LEGACY_REQUIRES_REVIEW', assignmentId: r.id, scopeLevel: r.scope_level,
        settingKey: (r.rule_set as any)?.setting_key ?? null,
        message: 'Legacy assignment cannot be edited in guided mode — review recommended.',
      });
    }
  }
  return conflicts;
}

export async function getConfigurationHealth(): Promise<ConfigHealthReport> {
  const rows = await getAssignments();
  const conflicts = await detectAssignmentConflicts();
  if (conflicts.length > 0) {
    void logOrgMutation({
      eventCode: CONFIG_CENTER_EVENTS.conflictDetected, kind: 'UPDATE',
      entityType: 'core_configuration_assignment',
      metadata: { count: conflicts.length, types: [...new Set(conflicts.map((c) => c.type))] },
    });
  }
  return {
    totalAssignments: rows.length,
    activeAssignments: rows.filter((r) => r.is_active).length,
    legacyAssignments: rows.filter(isLegacyAssignment).length,
    conflicts,
    ranAt: new Date().toISOString(),
  };
}

// ---------- Test Resolve (delegates to OM-6) ----------

export async function testResolve(ctx: EffectiveSettingsContext): Promise<EffectiveSettingsBundle> {
  try {
    const bundle = await resolveEffectiveSettingsBundle(ctx);
    await logOrgMutation({
      eventCode: CONFIG_CENTER_EVENTS.testResolveRun, kind: 'TEST_RESOLVE',
      entityType: 'effective_settings_bundle',
      metadata: {
        moduleCode: ctx.moduleCode ?? null, departmentCode: ctx.departmentCode ?? null,
        warnings: bundle.warnings.length, missing: bundle.missingConfiguration.length,
      },
    });
    return bundle;
  } catch (e: any) {
    await logOrgMutation({
      eventCode: CONFIG_CENTER_EVENTS.testResolveFailed, kind: 'TEST_RESOLVE',
      entityType: 'effective_settings_bundle', outcome: 'FAILURE',
      metadata: { error: e?.message },
    });
    throw e;
  }
}

// ---------- Resource selector loader ----------

export interface ResourceOption { id: string; code?: string | null; name: string; isActive: boolean }

export async function loadResourceOptions(resourceType: ConfigResourceType): Promise<ResourceOption[]> {
  const def = GUIDED_SETTING_KEYS.find((k) => k.resourceType === resourceType && k.resourceTable);
  if (!def?.resourceTable) return [];
  const codeCol = def.resourceCodeColumn ?? 'code';
  const nameCol = def.resourceLabelColumn ?? 'name';
  try {
    const { data, error } = await db.from(def.resourceTable).select(`id, ${codeCol}, ${nameCol}, is_active`).limit(500);
    if (error) return [];
    return (data ?? []).map((r: any) => ({
      id: r.id, code: r[codeCol] ?? null, name: r[nameCol] ?? r[codeCol] ?? r.id,
      isActive: r.is_active !== false,
    }));
  } catch { return []; }
}

export { GUIDED_SETTING_KEYS };
