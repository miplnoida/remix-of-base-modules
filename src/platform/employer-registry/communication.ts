/**
 * Employer Registry — Communication & Settings adapter (BM-SET-1 adoption).
 *
 * This is the ONLY sanctioned way for Employer Registry code (services,
 * pages, components, hooks) to obtain organisation/department/template/
 * letterhead/disclaimer/signature/print-footer/text-block/notification
 * settings and to render employer-facing communications.
 *
 * It is a thin adapter that follows the reference pattern from
 * `src/platform/business-settings/examples/employerSettingsExample.ts`:
 * it contains NO inheritance logic and NO raw-table access — every call
 * is forwarded to the central `business-settings` service, which in turn
 * delegates to the canonical OM-6 / OM-9.7.4 resolvers.
 *
 * ❌ Do not read `comm_letterhead`, `comm_email_signature`, `comm_disclaimer`,
 *    `comm_print_footer`, `comm_text_block`, `comm_asset`,
 *    `notification_templates`, `core_configuration_assignment`,
 *    `core_department_profile`, or `core_organization` from Employer module code.
 * ✅ Import from this file (or `@/platform/business-settings`) instead.
 */
import {
  resolveRelevantSettingsForModule,
  resolveRequiredSettingsForBusinessEvent,
  resolveBusinessModuleCommunicationContext,
  previewBusinessModuleCommunication,
  validateBusinessModuleSettingsReadiness,
} from '@/platform/business-settings/businessModuleSettingsService';
import type {
  BusinessModuleSettingsContext,
  BusinessModuleRelevantSettings,
  BusinessModuleReadinessResult,
} from '@/platform/business-settings/businessModuleSettingsTypes';
import type {
  BusinessCommunicationInput,
  BusinessCommunicationContext,
} from '@/lib/comm/businessCommunicationResolver';

const MODULE_CODE = 'EMPLOYER' as const;

/**
 * Canonical Employer Registry business events. Callers should always use a
 * value from this map instead of hardcoding event strings, so that the
 * central `BUSINESS_EVENT_SETTINGS_REGISTRY` remains the single source of
 * truth for required settings per event.
 */
export const EMPLOYER_REGISTRY_BUSINESS_EVENTS = {
  registrationSubmitted: 'EMPLOYER_REGISTRATION_SUBMITTED',
  registrationApproved: 'EMPLOYER_REGISTRATION_APPROVED',
  registrationRejected: 'EMPLOYER_REGISTRATION_REJECTED',
  registryCreated: 'EMPLOYER_REGISTRY_CREATED',
  registryUpdated: 'EMPLOYER_REGISTRY_UPDATED',
  registryDeactivated: 'EMPLOYER_REGISTRY_DEACTIVATED',
  statusChanged: 'EMPLOYER_STATUS_CHANGED',
  complianceWarning: 'EMPLOYER_COMPLIANCE_WARNING',
} as const;

export type EmployerRegistryBusinessEvent =
  (typeof EMPLOYER_REGISTRY_BUSINESS_EVENTS)[keyof typeof EMPLOYER_REGISTRY_BUSINESS_EVENTS];

type EmployerCtx = Omit<BusinessModuleSettingsContext, 'moduleCode'>;
type EmployerCommInput = Omit<BusinessCommunicationInput, 'moduleCode'>;

function withModule(ctx: EmployerCtx): BusinessModuleSettingsContext {
  return { ...ctx, moduleCode: MODULE_CODE };
}

/** Resolve effective settings for an Employer Registry surface (list, detail, action). */
export function resolveEmployerRegistrySettings(
  ctx: EmployerCtx,
): Promise<BusinessModuleRelevantSettings> {
  return resolveRelevantSettingsForModule(withModule(ctx));
}

/** Resolve + verify the required setting keys for a specific business event. */
export function resolveEmployerRegistryRequiredSettings(
  ctx: EmployerCtx,
  requiredSettingKeys: string[],
): Promise<BusinessModuleRelevantSettings> {
  return resolveRequiredSettingsForBusinessEvent(withModule(ctx), requiredSettingKeys);
}

/**
 * Resolve the full communication context (template, letterhead, signature,
 * disclaimer, footer, language, output channel, tokens) for an Employer
 * Registry business event — the only sanctioned way to render employer
 * letters, notices, emails, SMS, or PDFs from this module.
 */
export function resolveEmployerRegistryCommunication(
  input: EmployerCommInput,
): Promise<BusinessCommunicationContext> {
  return resolveBusinessModuleCommunicationContext({ ...input, moduleCode: MODULE_CODE });
}

/** Non-destructive preview of an employer communication — audited as preview. */
export function previewEmployerRegistryCommunication(
  input: EmployerCommInput,
): Promise<BusinessCommunicationContext> {
  return previewBusinessModuleCommunication({ ...input, moduleCode: MODULE_CODE });
}

/**
 * Readiness check gate. Call before dispatching an employer communication.
 * When `requiredSettingKeys` is omitted, the central registry-driven required
 * keys for the business event are used.
 */
export function validateEmployerRegistryReadiness(
  ctx: EmployerCtx,
  requiredSettingKeys?: string[],
): Promise<BusinessModuleReadinessResult> {
  return validateBusinessModuleSettingsReadiness(withModule(ctx), requiredSettingKeys);
}
