/**
 * Epic BM-SET-1 — Canonical Business Module Settings service.
 *
 * SINGLE entry-point for every business module (Employer, Insured Person,
 * Contributions, Benefits, Compliance, Legal, Finance, Reporting, …) to
 * consume centralized organisation, department, template, communication,
 * workflow, and governance settings.
 *
 * IMPORTANT — this module NEVER queries raw tables. It composes:
 *   - `resolveEffectiveSettingsBundle` (OM-6 canonical inheritance)
 *   - `resolveBusinessCommunicationContext` (OM-9.7.4 business comm resolver)
 *   - `previewBusinessCommunication`
 *
 * Business modules MUST NOT read `core_department_profile`, `core_organization`,
 * `comm_letterhead`, `comm_email_signature`, `comm_disclaimer`,
 * `comm_print_footer`, `notification_templates`, or `core_configuration_assignment`
 * directly — use this service.
 */
import {
  resolveEffectiveSettingsBundle,
  type EffectiveSettingsBundle,
  type EffectiveSettingsContext,
  type EffectiveSettingResult,
  type EffectiveHealth,
} from '@/platform/organization-settings/effectiveSettingsResolver';
import {
  resolveBusinessCommunicationContext,
  previewBusinessCommunication,
  type BusinessCommunicationInput,
  type BusinessCommunicationContext,
} from '@/lib/comm/businessCommunicationResolver';
import { logAction } from '@/platform/audit/auditService';
import {
  findRequirement,
  assertValidSettingKeys,
} from './businessEventSettingsRegistry';
import type {
  BusinessModuleSettingsContext,
  BusinessModuleRelevantSettings,
  BusinessModuleReadinessResult,
  BusinessModuleHealthStatus,
  BusinessModuleSourceTraceEntry,
  RelevantSettingsGroup,
} from './businessModuleSettingsTypes';

/* -------------------------------------------------------------------------- */
/* Audit event codes                                                          */
/* -------------------------------------------------------------------------- */
export const BUSINESS_MODULE_SETTINGS_EVENTS = {
  resolved: 'BUSINESS_MODULE_SETTINGS_RESOLVED',
  previewed: 'BUSINESS_MODULE_SETTINGS_PREVIEWED',
  readinessChecked: 'BUSINESS_MODULE_SETTINGS_READINESS_CHECKED',
  commResolved: 'BUSINESS_COMMUNICATION_CONTEXT_RESOLVED',
  commFailed: 'BUSINESS_COMMUNICATION_CONTEXT_FAILED',
  templateOverride: 'BUSINESS_COMMUNICATION_TEMPLATE_OVERRIDE_USED',
  missingRequired: 'BUSINESS_COMMUNICATION_MISSING_REQUIRED_SETTING',
} as const;

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                           */
/* -------------------------------------------------------------------------- */
function toEffectiveContext(ctx: BusinessModuleSettingsContext): EffectiveSettingsContext {
  return {
    moduleCode: ctx.moduleCode,
    departmentCode: ctx.departmentCode ?? null,
    locationId: ctx.locationId ?? null,
    workflowCode: ctx.workflowCode ?? null,
    workflowStageCode: ctx.workflowStageCode ?? null,
    businessEventCode: ctx.businessEventCode ?? null,
    languageCode: ctx.languageCode ?? null,
    recipientType: ctx.recipientType ?? null,
    userId: ctx.userId ?? null,
    organizationId: ctx.organizationId ?? null,
  };
}

function pickHealth(bundle: EffectiveSettingsBundle): BusinessModuleHealthStatus {
  const worst: EffectiveHealth = bundle.ordered.reduce<EffectiveHealth>((acc, s) => {
    if (acc === 'ERROR' || s.health === 'ERROR') return 'ERROR';
    if (acc === 'MISSING' || s.health === 'MISSING') return 'MISSING';
    if (acc === 'WARN' || s.health === 'WARN') return 'WARN';
    return acc;
  }, 'OK');
  return worst;
}

function groupRelevantSettings(bundle: EffectiveSettingsBundle): RelevantSettingsGroup {
  const s = bundle.settings;
  const get = (k: string): EffectiveSettingResult | null => s[k] ?? null;
  return {
    defaultLocation:              get('default_location'),
    defaultLetterhead:            get('default_letterhead'),
    defaultEmailSignature:        get('default_email_signature'),
    defaultDisclaimer:            get('default_disclaimer'),
    defaultPrintFooter:           get('default_print_footer'),
    defaultLogo:                  get('default_logo'),
    defaultSeal:                  get('default_seal'),
    defaultWatermark:             get('default_watermark'),
    defaultLanguage:              get('default_language'),
    defaultTextBlock:             get('default_text_block'),
    defaultDmsFolder:             get('default_dms_folder'),
    defaultDocumentTemplate:      get('default_document_template'),
    defaultNotificationTemplate:  get('default_notification_template'),
    defaultOutputChannel:         get('default_output_channel'),
    defaultRetentionPolicy:       get('default_retention_policy'),
    defaultApprovalWorkflow:      get('default_approval_workflow'),
  };
}

function toSourceTrace(bundle: EffectiveSettingsBundle): BusinessModuleSourceTraceEntry[] {
  return bundle.ordered.map((s) => ({
    key: s.key,
    label: s.label,
    source: s.source,
    sourceLabel: s.sourceLabel,
    isInherited: s.isInherited,
    isOverride: s.isOverride,
  }));
}

function buildRelevant(
  context: BusinessModuleSettingsContext,
  bundle: EffectiveSettingsBundle,
  requiredKeys: string[] = [],
): BusinessModuleRelevantSettings {
  const group = groupRelevantSettings(bundle);
  const missing = requiredKeys.filter((k) => {
    const s = bundle.settings[k];
    return !s || s.health === 'MISSING' || !s.effectiveValue;
  });
  return {
    context,
    relevantSettings: group,
    communicationDefaults: {
      letterhead: group.defaultLetterhead,
      emailSignature: group.defaultEmailSignature,
      disclaimer: group.defaultDisclaimer,
      printFooter: group.defaultPrintFooter,
      language: group.defaultLanguage,
      outputChannel: group.defaultOutputChannel,
    },
    templateDefaults: {
      documentTemplate: group.defaultDocumentTemplate,
      notificationTemplate: group.defaultNotificationTemplate,
      textBlock: group.defaultTextBlock,
    },
    governanceDefaults: {
      retentionPolicy: group.defaultRetentionPolicy,
      approvalWorkflow: group.defaultApprovalWorkflow,
      dmsFolder: group.defaultDmsFolder,
    },
    sourceTrace: toSourceTrace(bundle),
    warnings: bundle.warnings,
    missingRequiredSettings: missing,
    healthStatus: missing.length ? 'MISSING' : pickHealth(bundle),
    resolvedAt: bundle.resolvedAt,
    bundle,
  };
}

function auditSafe(payload: Parameters<typeof logAction>[0]) {
  try { void logAction(payload); } catch { /* audit is best-effort */ }
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Resolve the effective settings for a module, using the canonical OM-6
 * bundle resolver under the hood. Business modules should call this instead
 * of reading any organisation/department/comm table.
 */
export async function resolveRelevantSettingsForModule(
  context: BusinessModuleSettingsContext,
): Promise<BusinessModuleRelevantSettings> {
  const bundle = await resolveEffectiveSettingsBundle(toEffectiveContext(context));
  const result = buildRelevant(context, bundle);
  auditSafe({
    event_code: BUSINESS_MODULE_SETTINGS_EVENTS.resolved,
    action: 'EXECUTE',
    module_code: context.moduleCode,
    domain_code: 'CONFIGURATION',
    entity_type: 'business_module_settings',
    entity_display_name: `${context.moduleCode}${context.businessEventCode ? `:${context.businessEventCode}` : ''}`,
    outcome: result.healthStatus === 'ERROR' ? 'FAILURE' : 'SUCCESS',
    metadata: {
      moduleCode: context.moduleCode,
      businessEventCode: context.businessEventCode ?? null,
      warnings: result.warnings.length,
      health: result.healthStatus,
    },
  });
  return result;
}

/**
 * Resolve settings AND check the specified required keys in one call.
 * Missing keys are surfaced in `missingRequiredSettings`.
 */
export async function resolveRequiredSettingsForBusinessEvent(
  context: BusinessModuleSettingsContext,
  requiredSettingKeys: string[],
): Promise<BusinessModuleRelevantSettings> {
  assertValidSettingKeys(requiredSettingKeys);
  const bundle = await resolveEffectiveSettingsBundle(toEffectiveContext(context));
  const result = buildRelevant(context, bundle, requiredSettingKeys);
  if (result.missingRequiredSettings.length) {
    auditSafe({
      event_code: BUSINESS_MODULE_SETTINGS_EVENTS.missingRequired,
      action: 'EXECUTE',
      module_code: context.moduleCode,
      domain_code: 'CONFIGURATION',
      entity_type: 'business_module_settings',
      outcome: 'PARTIAL',
      severity: 'WARNING',
      metadata: {
        businessEventCode: context.businessEventCode ?? null,
        missing: result.missingRequiredSettings,
      },
    });
  }
  return result;
}

/**
 * Resolve the full business communication context for rendering a document /
 * notice / email / SMS / PDF. Delegates to the OM-9.7.4 resolver — never reads
 * raw comm_* tables directly.
 */
export async function resolveBusinessModuleCommunicationContext(
  input: BusinessCommunicationInput,
): Promise<BusinessCommunicationContext> {
  try {
    const ctx = await resolveBusinessCommunicationContext(input);
    auditSafe({
      event_code:
        ctx.templateSource === 'EXPLICIT'
          ? BUSINESS_MODULE_SETTINGS_EVENTS.templateOverride
          : BUSINESS_MODULE_SETTINGS_EVENTS.commResolved,
      action: 'EXECUTE',
      module_code: input.moduleCode,
      domain_code: 'COMMUNICATION',
      entity_type: 'business_communication_context',
      entity_display_name: ctx.resolvedTemplateCode ?? input.moduleCode,
      outcome: ctx.render ? 'SUCCESS' : 'PARTIAL',
      metadata: {
        templateCode: ctx.resolvedTemplateCode,
        templateSource: ctx.templateSource,
        warnings: ctx.warnings.length,
      },
    });
    return ctx;
  } catch (err: any) {
    auditSafe({
      event_code: BUSINESS_MODULE_SETTINGS_EVENTS.commFailed,
      action: 'EXECUTE',
      module_code: input.moduleCode,
      domain_code: 'COMMUNICATION',
      entity_type: 'business_communication_context',
      outcome: 'FAILURE',
      severity: 'ERROR',
      notes: err?.message ?? 'Communication resolution failed',
    });
    throw err;
  }
}

/** Non-destructive preview — same shape, audited as a preview. */
export async function previewBusinessModuleCommunication(
  input: BusinessCommunicationInput,
): Promise<BusinessCommunicationContext> {
  const ctx = await previewBusinessCommunication(input);
  auditSafe({
    event_code: BUSINESS_MODULE_SETTINGS_EVENTS.previewed,
    action: 'PREVIEW',
    module_code: input.moduleCode,
    domain_code: 'COMMUNICATION',
    entity_type: 'business_communication_context',
    entity_display_name: ctx.resolvedTemplateCode ?? input.moduleCode,
    outcome: ctx.render ? 'SUCCESS' : 'PARTIAL',
    metadata: {
      templateCode: ctx.resolvedTemplateCode,
      templateSource: ctx.templateSource,
      warnings: ctx.warnings.length,
    },
  });
  return ctx;
}

/**
 * Readiness check. When `requiredSettingKeys` is omitted, the keys come from
 * `BUSINESS_EVENT_SETTINGS_REGISTRY` (moduleCode + businessEventCode).
 */
export async function validateBusinessModuleSettingsReadiness(
  context: BusinessModuleSettingsContext,
  requiredSettingKeys?: string[],
): Promise<BusinessModuleReadinessResult> {
  let keys = requiredSettingKeys;
  if (!keys) {
    const req =
      context.businessEventCode
        ? findRequirement(context.moduleCode, context.businessEventCode)
        : undefined;
    keys = req?.requiredSettings ?? [];
  }
  assertValidSettingKeys(keys);

  const bundle = await resolveEffectiveSettingsBundle(toEffectiveContext(context));
  const missing: string[] = [];
  const blocking: string[] = [];
  const warnings: string[] = [...bundle.warnings];

  for (const k of keys) {
    const s = bundle.settings[k];
    if (!s || s.health === 'MISSING' || !s.effectiveValue) {
      missing.push(k);
      blocking.push(`Required setting missing: ${s?.label ?? k}`);
      continue;
    }
    if (s.inheritanceMode === 'CONFLICT') {
      blocking.push(`Conflicting inheritance for ${s.label}`);
    }
    if (s.health === 'ERROR') {
      blocking.push(`Configuration error for ${s.label}`);
    }
  }

  const health: BusinessModuleHealthStatus = blocking.length
    ? (missing.length ? 'MISSING' : 'ERROR')
    : warnings.length
      ? 'WARN'
      : 'OK';

  auditSafe({
    event_code: BUSINESS_MODULE_SETTINGS_EVENTS.readinessChecked,
    action: 'HEALTH_CHECK',
    module_code: context.moduleCode,
    domain_code: 'CONFIGURATION',
    entity_type: 'business_module_settings_readiness',
    entity_display_name: context.businessEventCode ?? context.moduleCode,
    outcome: blocking.length ? 'FAILURE' : warnings.length ? 'PARTIAL' : 'SUCCESS',
    metadata: {
      requiredKeys: keys,
      missing,
      health,
    },
  });

  return {
    ok: blocking.length === 0,
    missingRequiredSettings: missing,
    warnings,
    blockingIssues: blocking,
    healthStatus: health,
  };
}

/** Convenience: just return the warnings from the current effective bundle. */
export async function getBusinessModuleSettingsWarnings(
  context: BusinessModuleSettingsContext,
): Promise<string[]> {
  const bundle = await resolveEffectiveSettingsBundle(toEffectiveContext(context));
  return bundle.warnings;
}
