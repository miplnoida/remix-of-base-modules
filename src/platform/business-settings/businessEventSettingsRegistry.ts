/**
 * Epic BM-SET-1 — Business Event → Required Settings registry.
 *
 * Source-of-truth registry used by
 * `validateBusinessModuleSettingsReadiness()` to decide whether a business
 * event has all the settings it needs to produce a compliant communication.
 *
 * Keep this as a source-code registry (no new DB table) unless a persistent
 * customer-editable configuration is later required — at which point the
 * table `core_business_event_setting_requirement` is the canonical name.
 */
import { SETTING_KEY_CODES } from '@/platform/organization-settings/settingKeys';
import type { BusinessModuleCode } from './businessModuleSettingsTypes';

export type RequiredLevel = 'REQUIRED' | 'RECOMMENDED';

export interface BusinessEventRequirement {
  moduleCode: BusinessModuleCode;
  businessEventCode: string;
  requiredSettings: string[];
  recommendedSettings?: string[];
  appliesToChannel?: string | null;
  notes?: string;
}

export const BUSINESS_EVENT_SETTINGS_REGISTRY: BusinessEventRequirement[] = [
  // Employer
  {
    moduleCode: 'EMPLOYER',
    businessEventCode: 'EMPLOYER_REGISTRATION_SUBMITTED',
    requiredSettings: ['default_document_template', 'default_letterhead', 'default_output_channel'],
    recommendedSettings: ['default_disclaimer', 'default_print_footer'],
  },
  {
    moduleCode: 'EMPLOYER',
    businessEventCode: 'EMPLOYER_REGISTRATION_APPROVED',
    requiredSettings: [
      'default_document_template',
      'default_letterhead',
      'default_disclaimer',
      'default_print_footer',
      'default_output_channel',
      'default_retention_policy',
    ],
  },
  {
    moduleCode: 'EMPLOYER',
    businessEventCode: 'EMPLOYER_REGISTRATION_REJECTED',
    requiredSettings: ['default_document_template', 'default_letterhead', 'default_output_channel'],
  },
  {
    moduleCode: 'EMPLOYER',
    businessEventCode: 'EMPLOYER_COMPLIANCE_WARNING',
    requiredSettings: [
      'default_document_template',
      'default_letterhead',
      'default_disclaimer',
      'default_notification_template',
      'default_output_channel',
    ],
  },
  // Employer Registry lifecycle events (BM-SET-1 adoption)
  {
    moduleCode: 'EMPLOYER',
    businessEventCode: 'EMPLOYER_REGISTRY_CREATED',
    requiredSettings: ['default_document_template', 'default_letterhead', 'default_output_channel'],
    recommendedSettings: ['default_disclaimer', 'default_print_footer'],
  },
  {
    moduleCode: 'EMPLOYER',
    businessEventCode: 'EMPLOYER_REGISTRY_UPDATED',
    requiredSettings: ['default_notification_template', 'default_output_channel'],
  },
  {
    moduleCode: 'EMPLOYER',
    businessEventCode: 'EMPLOYER_REGISTRY_DEACTIVATED',
    requiredSettings: [
      'default_document_template',
      'default_letterhead',
      'default_disclaimer',
      'default_output_channel',
      'default_retention_policy',
    ],
  },
  {
    moduleCode: 'EMPLOYER',
    businessEventCode: 'EMPLOYER_STATUS_CHANGED',
    requiredSettings: [
      'default_document_template',
      'default_letterhead',
      'default_notification_template',
      'default_output_channel',
    ],
  },

  // Insured Person
  {
    moduleCode: 'INSURED_PERSON',
    businessEventCode: 'IP_REGISTRATION_APPROVED',
    requiredSettings: ['default_document_template', 'default_letterhead', 'default_output_channel'],
  },
  // Benefits
  {
    moduleCode: 'BENEFITS',
    businessEventCode: 'CLAIM_RECEIVED',
    requiredSettings: ['default_notification_template', 'default_output_channel'],
  },
  {
    moduleCode: 'BENEFITS',
    businessEventCode: 'CLAIM_APPROVED',
    requiredSettings: [
      'default_document_template',
      'default_letterhead',
      'default_output_channel',
      'default_retention_policy',
    ],
  },
  {
    moduleCode: 'BENEFITS',
    businessEventCode: 'CLAIM_REJECTED',
    requiredSettings: ['default_document_template', 'default_letterhead', 'default_output_channel'],
  },
  // Contributions
  {
    moduleCode: 'CONTRIBUTIONS',
    businessEventCode: 'CONTRIBUTION_FILING_ACKNOWLEDGED',
    requiredSettings: ['default_notification_template', 'default_output_channel'],
  },
  {
    moduleCode: 'CONTRIBUTIONS',
    businessEventCode: 'CONTRIBUTION_ARREARS_NOTICE',
    requiredSettings: [
      'default_document_template',
      'default_letterhead',
      'default_disclaimer',
      'default_output_channel',
    ],
  },
  // Legal
  {
    moduleCode: 'LEGAL',
    businessEventCode: 'LEGAL_HEARING_NOTICE',
    requiredSettings: [
      'default_document_template',
      'default_letterhead',
      'default_disclaimer',
      'default_print_footer',
      'default_output_channel',
      'default_retention_policy',
      'default_approval_workflow',
    ],
  },
  // Finance
  {
    moduleCode: 'FINANCE',
    businessEventCode: 'PAYMENT_AUTHORIZATION_NOTICE',
    requiredSettings: [
      'default_document_template',
      'default_letterhead',
      'default_output_channel',
      'default_approval_workflow',
    ],
  },
];

export function findRequirement(
  moduleCode: string,
  businessEventCode: string,
): BusinessEventRequirement | undefined {
  return BUSINESS_EVENT_SETTINGS_REGISTRY.find(
    (r) => r.moduleCode === moduleCode && r.businessEventCode === businessEventCode,
  );
}

/**
 * Guard used by callers that pass their own required keys — rejects any key
 * that is not part of the canonical `SETTING_KEY_CODES` list. Prevents typos
 * and stops accidental invention of new setting keys inside business modules.
 */
export function assertValidSettingKeys(keys: string[]): void {
  const invalid = keys.filter((k) => !SETTING_KEY_CODES.includes(k));
  if (invalid.length) {
    throw new Error(
      `Unknown setting key(s): ${invalid.join(', ')}. Register them in SETTING_KEYS before use.`,
    );
  }
}
