/**
 * Epic OM-6 — Canonical effective-settings resolver.
 *
 * `resolveEffectiveSettingsBundle(context)` is the SINGLE public contract that
 * business modules AND the Department Profile "Effective Preview" tab should
 * use. It composes the existing lower-level resolvers so runtime and preview
 * cannot silently disagree:
 *
 *   - department overrides / org defaults (departmentEffectiveResolver)
 *   - communication runtime context   (communicationResolver)
 *   - generic scope-precedence lookups (configuration/resolver)
 *
 * The response includes the effective value, its source label, an
 * inheritance mode (INHERIT/OVERRIDE/MISSING/CONFLICT), a fallback chain,
 * per-setting health status and human-friendly warnings — never raw table
 * names.
 *
 * This module intentionally does NOT define new tables or a new
 * configuration engine (OM-6 constraint).
 */
import { supabase } from '@/integrations/supabase/client';
import {
  resolveDepartmentEffective,
  type DepartmentEffectiveResult,
  type ResolutionTraceEntry,
} from '@/lib/comm/departmentEffectiveResolver';
import { resolveConfiguration, type ScopeHints } from '@/lib/configuration/resolver';
import { coreAuditService } from '@/platform/audit/auditService';
import { SETTING_KEYS, findSettingKey, type SettingKeyDescriptor } from './settingKeys';
import { INHERITANCE_EVENTS } from './inheritanceEvents';

const db = supabase as any;

export type InheritanceMode = 'INHERIT' | 'OVERRIDE' | 'RESET_TO_DEFAULT' | 'MISSING' | 'CONFLICT';
export type EffectiveHealth = 'OK' | 'WARN' | 'ERROR' | 'MISSING';
export type EffectiveSource =
  | 'USER_OVERRIDE' | 'WORKFLOW_STAGE_OVERRIDE' | 'WORKFLOW_OVERRIDE'
  | 'LOCATION_OVERRIDE' | 'DEPARTMENT_OVERRIDE' | 'MODULE_DEFAULT'
  | 'ORGANIZATION_DEFAULT' | 'GLOBAL_DEFAULT' | 'MISSING' | 'DEFERRED';

const SOURCE_LABEL: Record<EffectiveSource, string> = {
  USER_OVERRIDE: 'User Override',
  WORKFLOW_STAGE_OVERRIDE: 'Workflow Stage Override',
  WORKFLOW_OVERRIDE: 'Workflow Override',
  LOCATION_OVERRIDE: 'Location Override',
  DEPARTMENT_OVERRIDE: 'Department Override',
  MODULE_DEFAULT: 'Module Default',
  ORGANIZATION_DEFAULT: 'Organization Default',
  GLOBAL_DEFAULT: 'Global Default',
  MISSING: 'Missing',
  DEFERRED: 'Not currently configurable',
};

export interface EffectiveSettingsContext {
  moduleCode?: string | null;
  departmentCode?: string | null;
  locationId?: string | null;
  workflowCode?: string | null;
  workflowStageCode?: string | null;
  businessEventCode?: string | null;
  recipientType?: string | null;
  languageCode?: string | null;
  userId?: string | null;
  organizationId?: string | null;
}

export interface EffectiveSettingResult {
  key: string;
  label: string;
  status: SettingKeyDescriptor['status'];
  effectiveValue: string | null;
  effectiveLabel: string;
  source: EffectiveSource;
  sourceLabel: string;
  inheritanceMode: InheritanceMode;
  isInherited: boolean;
  isOverride: boolean;
  health: EffectiveHealth;
  warnings: string[];
  fallbackChain: string[];
  note?: string;
}

export interface EffectiveSettingsBundle {
  context: EffectiveSettingsContext;
  settings: Record<string, EffectiveSettingResult>;
  ordered: EffectiveSettingResult[];
  warnings: string[];
  missingConfiguration: string[];
  resolvedAt: string;
  /** Underlying department result — exposed so preview reuses the same source data. */
  departmentEffective?: DepartmentEffectiveResult;
}

function sourceFromTrace(t: ResolutionTraceEntry | undefined): EffectiveSource {
  if (!t) return 'MISSING';
  switch (t.source) {
    case 'department_override': return 'DEPARTMENT_OVERRIDE';
    case 'organization_default': return 'ORGANIZATION_DEFAULT';
    case 'module_default': return 'MODULE_DEFAULT';
    case 'workflow_default': return 'WORKFLOW_OVERRIDE';
    case 'event_default': return 'GLOBAL_DEFAULT';
    case 'template_override': return 'DEPARTMENT_OVERRIDE';
    default: return 'MISSING';
  }
}

function buildFromDeptTrace(
  desc: SettingKeyDescriptor,
  trace: ResolutionTraceEntry | undefined,
  dept: any,
  org: any,
): EffectiveSettingResult {
  const overrideId = desc.deptOverrideColumn && dept ? dept[desc.deptOverrideColumn] ?? null : null;
  const orgDefaultId = desc.orgDefaultColumn && org ? org[desc.orgDefaultColumn] ?? null : null;
  const inheritFlag = desc.deptInheritFlag && dept ? dept[desc.deptInheritFlag] !== false : true;
  const source = sourceFromTrace(trace);
  const isOverride = source === 'DEPARTMENT_OVERRIDE';
  const isInherited = !isOverride && trace?.effectiveId != null;
  let mode: InheritanceMode = 'INHERIT';
  if (isOverride) mode = 'OVERRIDE';
  else if (!trace?.effectiveId) mode = 'MISSING';
  // Mismatch: inherit flag says inherit but override id is present, or vice versa.
  const warnings: string[] = [];
  if (desc.deptInheritFlag && overrideId && inheritFlag) {
    warnings.push('An override value is selected, but this setting is still marked as inheriting from the Organization.');
    mode = 'CONFLICT';
  }
  if (desc.deptInheritFlag && !inheritFlag && !overrideId) {
    warnings.push('Override enabled but no value selected — resolver will fall back to the Organization default.');
  }
  if (trace?.effectiveId && !trace.active) {
    warnings.push(`${desc.label} references an inactive resource.`);
  }
  if (!trace?.effectiveId) {
    warnings.push(`${desc.label} is not configured at any level.`);
  }
  const fallback: string[] = [];
  if (overrideId) fallback.push(`Department override → ${overrideId}`);
  if (orgDefaultId) fallback.push(`Organization default → ${orgDefaultId}`);
  fallback.push('Global default');
  const health: EffectiveHealth =
    !trace?.effectiveId ? 'MISSING' :
    warnings.length && mode === 'CONFLICT' ? 'ERROR' :
    warnings.length ? 'WARN' : 'OK';
  return {
    key: desc.key,
    label: desc.label,
    status: desc.status,
    effectiveValue: trace?.effectiveId ?? null,
    effectiveLabel: trace?.effectiveName || (trace?.effectiveId ?? 'Not configured'),
    source,
    sourceLabel: SOURCE_LABEL[source],
    inheritanceMode: mode,
    isInherited,
    isOverride,
    health,
    warnings,
    fallbackChain: fallback,
    note: desc.note,
  };
}

function deferredResult(desc: SettingKeyDescriptor): EffectiveSettingResult {
  return {
    key: desc.key,
    label: desc.label,
    status: desc.status,
    effectiveValue: null,
    effectiveLabel: 'Not currently configurable',
    source: 'DEFERRED',
    sourceLabel: desc.plannedIn ? `Planned for ${desc.plannedIn}` : 'Not currently configurable',
    inheritanceMode: 'MISSING',
    isInherited: false,
    isOverride: false,
    health: 'MISSING',
    warnings: [],
    fallbackChain: [],
    note: desc.note,
  };
}

/** Resolve a single setting via core_configuration_assignment. */
async function resolveViaConfigAssignment(
  desc: SettingKeyDescriptor,
  ctx: EffectiveSettingsContext,
): Promise<EffectiveSettingResult> {
  const resourceType =
    desc.key === 'default_document_template' ? 'TEMPLATE' :
    desc.key === 'default_notification_template' ? 'NOTIFICATION_TEMPLATE' :
    desc.key === 'default_output_channel' ? 'CHANNEL' :
    desc.key === 'default_approval_workflow' ? 'WORKFLOW_TEMPLATE' :
    'SETTING';
  const hints: ScopeHints = {
    userId: ctx.userId ?? undefined,
    workflowCode: ctx.workflowCode ?? undefined,
    stageCode: ctx.workflowStageCode ?? undefined,
    locationId: ctx.locationId ?? undefined,
    departmentCode: ctx.departmentCode ?? undefined,
    moduleCode: ctx.moduleCode ?? undefined,
    organizationId: ctx.organizationId ?? undefined,
  };
  try {
    const res = await resolveConfiguration({
      domain: 'communication',
      businessEvent: ctx.businessEventCode ?? '',
      resourceType,
      scopeHints: hints,
    });
    const winner = res.winner;
    const src: EffectiveSource = !winner ? 'MISSING' : ({
      USER: 'USER_OVERRIDE',
      WORKFLOW_STAGE: 'WORKFLOW_STAGE_OVERRIDE',
      WORKFLOW: 'WORKFLOW_OVERRIDE',
      LOCATION: 'LOCATION_OVERRIDE',
      DEPARTMENT: 'DEPARTMENT_OVERRIDE',
      MODULE: 'MODULE_DEFAULT',
      ORG: 'ORGANIZATION_DEFAULT',
      GLOBAL: 'GLOBAL_DEFAULT',
    } as const)[winner.scope_level] ?? 'MISSING';
    const warnings: string[] = [];
    if (!winner) warnings.push(`No effective ${desc.label.toLowerCase()} is configured for this business event.`);
    return {
      key: desc.key,
      label: desc.label,
      status: desc.status,
      effectiveValue: (winner?.resource_ref as any)?.id ?? null,
      effectiveLabel: (winner?.resource_ref as any)?.code ?? (winner ? 'Configured' : 'Not configured'),
      source: src,
      sourceLabel: SOURCE_LABEL[src],
      inheritanceMode: !winner ? 'MISSING' : (src === 'DEPARTMENT_OVERRIDE' || src === 'USER_OVERRIDE' || src === 'LOCATION_OVERRIDE' || src === 'WORKFLOW_OVERRIDE' || src === 'WORKFLOW_STAGE_OVERRIDE') ? 'OVERRIDE' : 'INHERIT',
      isInherited: !!winner && (src === 'ORGANIZATION_DEFAULT' || src === 'MODULE_DEFAULT' || src === 'GLOBAL_DEFAULT'),
      isOverride: !!winner && (src === 'DEPARTMENT_OVERRIDE' || src === 'USER_OVERRIDE' || src === 'LOCATION_OVERRIDE' || src === 'WORKFLOW_OVERRIDE' || src === 'WORKFLOW_STAGE_OVERRIDE'),
      health: !winner ? 'MISSING' : 'OK',
      warnings,
      fallbackChain: res.trace.filter((t) => t.matched).map((t) => `${t.tier}${t.winnerId ? ' → ' + t.winnerId : ''}`),
      note: desc.note,
    };
  } catch (e: any) {
    return {
      key: desc.key, label: desc.label, status: desc.status,
      effectiveValue: null, effectiveLabel: 'Resolver error',
      source: 'MISSING', sourceLabel: SOURCE_LABEL.MISSING,
      inheritanceMode: 'MISSING', isInherited: false, isOverride: false,
      health: 'ERROR', warnings: [e?.message ?? 'Configuration resolver failed'],
      fallbackChain: [], note: desc.note,
    };
  }
}

/**
 * Public: resolve the effective settings bundle for a context.
 * Business modules should call this — NOT raw tables.
 */
export async function resolveEffectiveSettingsBundle(
  ctx: EffectiveSettingsContext,
  options: { audit?: boolean } = {},
): Promise<EffectiveSettingsBundle> {
  const departmentEffective = ctx.departmentCode
    ? await resolveDepartmentEffective(ctx.departmentCode)
    : undefined;

  const dept = departmentEffective?.raw.department ?? null;
  const org = departmentEffective?.raw.organization ?? null;
  const traceByKey = new Map<string, ResolutionTraceEntry>();
  for (const t of departmentEffective?.trace ?? []) {
    // department resolver uses 'letterhead', 'email_signature', 'disclaimer',
    // 'print_footer', 'location', 'language', 'asset.logo', 'asset.seal', 'asset.watermark'
    if (t.key === 'letterhead')            traceByKey.set('default_letterhead', t);
    else if (t.key === 'email_signature')  traceByKey.set('default_email_signature', t);
    else if (t.key === 'disclaimer')       traceByKey.set('default_disclaimer', t);
    else if (t.key === 'print_footer')     traceByKey.set('default_print_footer', t);
    else if (t.key === 'location')         traceByKey.set('default_location', t);
    else if (t.key === 'language')         traceByKey.set('default_language', t);
    else if (t.key === 'asset.logo')       traceByKey.set('default_logo', t);
    else if (t.key === 'asset.seal')       traceByKey.set('default_seal', t);
    else if (t.key === 'asset.watermark')  traceByKey.set('default_watermark', t);
  }

  const ordered: EffectiveSettingResult[] = [];
  for (const desc of SETTING_KEYS) {
    if (desc.status === 'PLANNED' || desc.storage === 'DEFERRED') {
      ordered.push(deferredResult(desc));
      continue;
    }
    if (desc.storage === 'CONFIGURATION_ASSIGNMENT') {
      ordered.push(await resolveViaConfigAssignment(desc, ctx));
      continue;
    }
    if (desc.storage === 'DEPARTMENT_PROFILE') {
      const t = traceByKey.get(desc.key);
      ordered.push(buildFromDeptTrace(desc, t, dept, org));
      continue;
    }
    if (desc.storage === 'ORG_PROFILE_ONLY') {
      const orgVal = desc.orgDefaultColumn && org ? org[desc.orgDefaultColumn] ?? null : null;
      ordered.push({
        key: desc.key, label: desc.label, status: desc.status,
        effectiveValue: orgVal, effectiveLabel: orgVal ?? 'Not configured',
        source: orgVal ? 'ORGANIZATION_DEFAULT' : 'MISSING',
        sourceLabel: orgVal ? SOURCE_LABEL.ORGANIZATION_DEFAULT : SOURCE_LABEL.MISSING,
        inheritanceMode: orgVal ? 'INHERIT' : 'MISSING',
        isInherited: !!orgVal, isOverride: false,
        health: orgVal ? 'OK' : 'MISSING', warnings: orgVal ? [] : [`${desc.label} is not configured.`],
        fallbackChain: orgVal ? [`Organization default → ${orgVal}`] : [], note: desc.note,
      });
    }
  }

  const settings = Object.fromEntries(ordered.map((s) => [s.key, s]));
  const warnings = ordered.flatMap((s) => s.warnings.map((w) => `${s.label}: ${w}`));
  const missingConfiguration = ordered.filter((s) => s.health === 'MISSING' && s.status !== 'PLANNED').map((s) => s.label);

  const bundle: EffectiveSettingsBundle = {
    context: ctx,
    settings,
    ordered,
    warnings,
    missingConfiguration,
    resolvedAt: new Date().toISOString(),
    departmentEffective,
  };

  if (options.audit) {
    void coreAuditService.logAction({
      event_code: ctx.departmentCode ? INHERITANCE_EVENTS.deptEffectivePreview : INHERITANCE_EVENTS.orgEffectivePreview,
      event_category: 'CONFIGURATION',
      module_code: 'CORE', domain_code: 'ORGANIZATION',
      action: 'EXECUTE',
      entity_type: 'effective_settings_bundle',
      entity_display_name: ctx.departmentCode ?? ctx.moduleCode ?? 'organization',
      outcome: 'SUCCESS', severity: 'INFO', risk_level: 'LOW',
      source_component: 'OM-6',
      metadata: { warnings: warnings.length, missing: missingConfiguration.length },
    }).catch(() => undefined);
  }

  return bundle;
}

export async function resolveEffectiveSetting(
  ctx: EffectiveSettingsContext,
  settingKey: string,
): Promise<EffectiveSettingResult | null> {
  const desc = findSettingKey(settingKey);
  if (!desc) return null;
  const bundle = await resolveEffectiveSettingsBundle(ctx);
  return bundle.settings[settingKey] ?? null;
}

/** Preview variant — same result, audited as a preview and never throws. */
export async function previewEffectiveSettings(
  ctx: EffectiveSettingsContext,
): Promise<EffectiveSettingsBundle> {
  return resolveEffectiveSettingsBundle(ctx, { audit: true });
}
