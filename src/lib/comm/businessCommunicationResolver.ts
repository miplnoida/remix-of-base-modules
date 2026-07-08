/**
 * Epic OM-9.7.4 — Canonical business-module Communication resolver.
 *
 * Single entrypoint every business module (Legal, Benefits, Compliance,
 * Finance, HR, Procurement, etc.) should call when generating a letter,
 * notice, email, PDF, or any communication.
 *
 * It composes:
 *   1. `resolveEffectiveSettingsBundle` — canonical Department/Org
 *      inheritance model (letterhead, signature, disclaimer, footer,
 *      location, default_document_template, notification template, …).
 *   2. `coreTemplateResolverService.resolveRenderContext` — template body,
 *      version, layout, and channel-aware sub-blocks. When a template code
 *      is not supplied, we use the effective `default_document_template`
 *      resolved from `core_configuration_assignment` for
 *      (moduleCode, departmentCode, businessEventCode).
 *
 * Modules should NOT read `core_department_profile.*_id` or `comm_letterhead`
 * directly. Explicit `templateCode` overrides are allowed and audited via the
 * standard render audit event.
 */
import {
  resolveEffectiveSettingsBundle,
  type EffectiveSettingsBundle,
  type EffectiveSettingsContext,
} from '@/platform/organization-settings/effectiveSettingsResolver';
import {
  coreTemplateResolverService,
  type RenderContext,
  type RenderContextInput,
} from '@/services/coreTemplateResolverService';

export interface BusinessCommunicationInput {
  moduleCode: string;
  departmentCode?: string | null;
  businessEventCode?: string | null;
  workflowCode?: string | null;
  workflowStageCode?: string | null;
  languageCode?: string | null;
  channel?: string | null;
  /** Explicit template code (overrides the effective default_document_template). Audited. */
  templateCode?: string | null;
  /** Optional per-transaction overrides passed straight through. */
  letterheadOverrideId?: string | null;
  signatureOverrideAssetId?: string | null;
  footerOverrideId?: string | null;
  disclaimerOverrideId?: string | null;
  country?: string;
}

export interface BusinessCommunicationContext {
  input: BusinessCommunicationInput;
  effective: EffectiveSettingsBundle;
  render: RenderContext | null;
  resolvedTemplateCode: string | null;
  templateSource: 'EXPLICIT' | 'EFFECTIVE_DEFAULT' | 'NONE';
  warnings: string[];
}

/**
 * Resolve the full render + inheritance context a business module needs.
 * Returns `render = null` (with warnings) when no template can be resolved.
 */
export async function resolveBusinessCommunicationContext(
  input: BusinessCommunicationInput,
): Promise<BusinessCommunicationContext> {
  const warnings: string[] = [];

  const settingsCtx: EffectiveSettingsContext = {
    moduleCode: input.moduleCode,
    departmentCode: input.departmentCode ?? null,
    workflowCode: input.workflowCode ?? null,
    workflowStageCode: input.workflowStageCode ?? null,
    businessEventCode: input.businessEventCode ?? null,
    languageCode: input.languageCode ?? null,
  };
  const effective = await resolveEffectiveSettingsBundle(settingsCtx);

  // Resolve template code: explicit wins, else effective default_document_template.
  let templateCode: string | null = input.templateCode ?? null;
  let templateSource: BusinessCommunicationContext['templateSource'] = templateCode ? 'EXPLICIT' : 'NONE';
  if (!templateCode) {
    const eff = effective.settings['default_document_template'];
    if (eff?.effectiveLabel && eff.effectiveLabel !== 'Not configured') {
      templateCode = eff.effectiveLabel; // resource_ref.code is stored in effectiveLabel
      templateSource = 'EFFECTIVE_DEFAULT';
    } else {
      warnings.push(
        `No effective default_document_template configured for module=${input.moduleCode}` +
          (input.businessEventCode ? `, event=${input.businessEventCode}` : ''),
      );
    }
  }

  let render: RenderContext | null = null;
  if (templateCode) {
    const renderInput: RenderContextInput = {
      template_code: templateCode,
      country: input.country,
      language: input.languageCode ?? undefined,
      channel: input.channel ?? undefined,
      module_code: input.moduleCode,
      department_code: input.departmentCode ?? null,
      business_event: input.businessEventCode ?? null,
      workflow_stage: input.workflowStageCode ?? null,
      letterhead_override_id: input.letterheadOverrideId ?? null,
      signature_override_asset_id: input.signatureOverrideAssetId ?? null,
      footer_override_id: input.footerOverrideId ?? null,
      disclaimer_override_id: input.disclaimerOverrideId ?? null,
    };
    render = await coreTemplateResolverService.resolveRenderContext(renderInput);
    if (!render) warnings.push(`Template ${templateCode} could not be resolved for country=${input.country ?? 'KN'}.`);
    else warnings.push(...render.warnings);
  }

  // Parity check: canonical effective letterhead vs resolver render letterhead.
  const effLetterheadId = effective.settings['default_letterhead']?.effectiveValue ?? null;
  if (render?.letterhead?.id && effLetterheadId && render.letterhead.id !== effLetterheadId) {
    warnings.push(
      'Renderer resolved a different letterhead than the Department Profile effective letterhead. ' +
        'This usually means a legacy comm_letterhead default is overriding the canonical setting.',
    );
  }

  return {
    input,
    effective,
    render,
    resolvedTemplateCode: templateCode,
    templateSource,
    warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* OM-9.7.6 — Additional governed convenience methods.                        */
/* Business modules should call one of these; never read comm_* / core_template
/* directly.                                                                  */
/* -------------------------------------------------------------------------- */

import { findBusinessEvent, type OutputChannel } from '@/platform/comm-template-governance/businessEventCatalogue';
import { COMM_TEMPLATE_SEEDS } from '@/platform/comm-template-governance/templateSeedCatalogue';
import { validateTemplateTokens as validateTokens } from '@/platform/comm-template-governance/tokenCatalogue';
import { runCommunicationTemplateHealth as runHealth, type CommHealthReport } from '@/platform/comm-template-governance/communicationTemplateHealth';

export interface TemplateForBusinessEventInput extends BusinessCommunicationInput {
  outputChannel?: OutputChannel;
}

/** Resolve the DOCUMENT template that a business event should render. */
export async function resolveTemplateForBusinessEvent(
  input: TemplateForBusinessEventInput,
): Promise<BusinessCommunicationContext> {
  const ctx = await resolveBusinessCommunicationContext({
    ...input,
    channel: input.channel ?? input.outputChannel ?? 'DOCUMENT',
  });
  if (!ctx.render && input.businessEventCode) {
    const seed = COMM_TEMPLATE_SEEDS.find(
      (t) => t.business_event_code === input.businessEventCode &&
             t.output_channel === (input.outputChannel ?? 'DOCUMENT'),
    );
    if (seed) {
      ctx.resolvedTemplateCode = seed.template_code;
      ctx.templateSource = 'EFFECTIVE_DEFAULT';
      ctx.warnings.push(
        `Falling back to seeded starter template ${seed.template_code} for ${input.businessEventCode}. ` +
          'Configure a template assignment to override this default.',
      );
    }
  }
  return ctx;
}

/**
 * Resolve a notification-shaped template (EMAIL/SMS/IN_APP) for a business
 * event. Uses the seeded starter template if no assignment is configured.
 */
export async function resolveNotificationTemplateForBusinessEvent(
  input: TemplateForBusinessEventInput & { channel: 'EMAIL' | 'SMS' | 'IN_APP' | 'PORTAL' },
): Promise<BusinessCommunicationContext> {
  const ctx = await resolveTemplateForBusinessEvent({ ...input, outputChannel: input.channel });
  const evt = input.businessEventCode ? findBusinessEvent(input.businessEventCode) : undefined;
  if (evt && !evt.defaultChannels.includes(input.channel)) {
    ctx.warnings.push(
      `Business event ${evt.code} does not declare ${input.channel} as a default channel; ` +
        'proceeding but this may indicate a misconfigured notification.',
    );
  }
  return ctx;
}

/** Validate that a resolved template's body only references known tokens. */
export function validateTemplateTokens(
  body: string | null | undefined,
  requiredTokens: string[] = [],
) {
  return validateTokens(body, requiredTokens);
}

/** Non-destructive preview — returns the render context + warnings only. */
export async function previewBusinessCommunication(
  input: BusinessCommunicationInput,
): Promise<BusinessCommunicationContext> {
  return resolveBusinessCommunicationContext(input);
}

/** Run the communication template health scan across the seeded catalogue. */
export function runCommunicationTemplateHealth(): CommHealthReport {
  return runHealth();
}

