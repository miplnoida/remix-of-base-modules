/**
 * Epic BM-SET-1 — Business Module Relevant Settings Consumption Contract.
 *
 * Shared types for the business-module settings service. These types wrap the
 * canonical OM-6 EffectiveSettingResult / EffectiveSettingsBundle so business
 * modules receive a stable, grouped shape without any raw table names.
 *
 * DO NOT define a new inheritance model here. The service under this folder
 * always delegates to `resolveEffectiveSettingsBundle` and
 * `resolveBusinessCommunicationContext`.
 */
import type {
  EffectiveSettingResult,
  EffectiveSettingsBundle,
  EffectiveHealth,
} from '@/platform/organization-settings/effectiveSettingsResolver';

export type BusinessModuleCode =
  | 'EMPLOYER'
  | 'INSURED_PERSON'
  | 'CONTRIBUTIONS'
  | 'BENEFITS'
  | 'COMPLIANCE'
  | 'LEGAL'
  | 'FINANCE'
  | 'REPORTING'
  | (string & {});

export interface BusinessModuleSettingsContext {
  moduleCode: BusinessModuleCode;
  departmentCode?: string | null;
  locationId?: string | null;
  businessEventCode?: string | null;
  workflowCode?: string | null;
  workflowStageCode?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  languageCode?: string | null;
  recipientType?: string | null;
  channel?: string | null;
  country?: string | null;
}

/**
 * Grouped view of the OM-6 effective settings that business modules typically
 * need. Every field is an `EffectiveSettingResult` (or null) so callers can
 * render source labels, warnings, and health status without any translation.
 */
export interface RelevantSettingsGroup {
  defaultLocation: EffectiveSettingResult | null;
  defaultLetterhead: EffectiveSettingResult | null;
  defaultEmailSignature: EffectiveSettingResult | null;
  defaultDisclaimer: EffectiveSettingResult | null;
  defaultPrintFooter: EffectiveSettingResult | null;
  defaultLogo: EffectiveSettingResult | null;
  defaultSeal: EffectiveSettingResult | null;
  defaultWatermark: EffectiveSettingResult | null;
  defaultLanguage: EffectiveSettingResult | null;
  defaultTextBlock: EffectiveSettingResult | null;
  defaultDmsFolder: EffectiveSettingResult | null;
  defaultDocumentTemplate: EffectiveSettingResult | null;
  defaultNotificationTemplate: EffectiveSettingResult | null;
  defaultOutputChannel: EffectiveSettingResult | null;
  defaultRetentionPolicy: EffectiveSettingResult | null;
  defaultApprovalWorkflow: EffectiveSettingResult | null;
}

export interface BusinessModuleSourceTraceEntry {
  key: string;
  label: string;
  source: string;
  sourceLabel: string;
  isInherited: boolean;
  isOverride: boolean;
}

export type BusinessModuleHealthStatus = 'OK' | 'WARN' | 'ERROR' | 'MISSING';

export interface BusinessModuleRelevantSettings {
  context: BusinessModuleSettingsContext;
  relevantSettings: RelevantSettingsGroup;
  /** Communication-specific defaults extracted from the bundle. */
  communicationDefaults: {
    letterhead: EffectiveSettingResult | null;
    emailSignature: EffectiveSettingResult | null;
    disclaimer: EffectiveSettingResult | null;
    printFooter: EffectiveSettingResult | null;
    language: EffectiveSettingResult | null;
    outputChannel: EffectiveSettingResult | null;
  };
  templateDefaults: {
    documentTemplate: EffectiveSettingResult | null;
    notificationTemplate: EffectiveSettingResult | null;
    textBlock: EffectiveSettingResult | null;
  };
  governanceDefaults: {
    retentionPolicy: EffectiveSettingResult | null;
    approvalWorkflow: EffectiveSettingResult | null;
    dmsFolder: EffectiveSettingResult | null;
  };
  sourceTrace: BusinessModuleSourceTraceEntry[];
  warnings: string[];
  missingRequiredSettings: string[];
  healthStatus: BusinessModuleHealthStatus;
  resolvedAt: string;
  /** Raw bundle for admin/preview surfaces that need the full trace. */
  bundle: EffectiveSettingsBundle;
}

export interface BusinessModuleReadinessResult {
  ok: boolean;
  missingRequiredSettings: string[];
  warnings: string[];
  blockingIssues: string[];
  healthStatus: BusinessModuleHealthStatus;
}

export function healthFromEffective(h: EffectiveHealth): BusinessModuleHealthStatus {
  return h;
}
