/**
 * Epic OM-7 — Configuration Center v2 shared types & vocabulary.
 * Guided setting keys, resource types, scope levels, validation results.
 * Does NOT introduce a new resolver — Test Resolve delegates to OM-6.
 */
import type { ScopeLevel } from '@/lib/configuration/resolver';

export type ConfigResourceType =
  | 'DOCUMENT_TEMPLATE'
  | 'NOTIFICATION_TEMPLATE'
  | 'LETTERHEAD'
  | 'EMAIL_SIGNATURE'
  | 'DISCLAIMER'
  | 'PRINT_FOOTER'
  | 'TEXT_BLOCK'
  | 'OUTPUT_CHANNEL'
  | 'LANGUAGE'
  | 'APPROVAL_WORKFLOW'
  | 'DMS_FOLDER'
  | 'MEDIA_ASSET';

export interface GuidedSettingKeyDef {
  key: string;
  label: string;
  resourceType: ConfigResourceType;
  /** Domain used when writing into core_configuration_assignment. */
  domain: 'communication' | 'workflow' | 'branding' | 'reporting' | 'numbering' | 'ai';
  /** Underlying resource table + code column used by the selector. */
  resourceTable?: string;
  resourceLabelColumn?: string;
  resourceCodeColumn?: string;
  status: 'AVAILABLE' | 'PARTIAL' | 'PLANNED';
  plannedIn?: string;
  note?: string;
}

/**
 * Guided keys — kept aligned with OM-6 settingKeys but expressed as
 * assignment inputs (resource-type + selector metadata).
 */
export const GUIDED_SETTING_KEYS: GuidedSettingKeyDef[] = [
  { key: 'default_document_template',   label: 'Default Document Template',   resourceType: 'DOCUMENT_TEMPLATE',   domain: 'communication', resourceTable: 'core_template',        resourceLabelColumn: 'name',        resourceCodeColumn: 'code',        status: 'AVAILABLE' },
  { key: 'default_notification_template', label: 'Default Notification Template', resourceType: 'NOTIFICATION_TEMPLATE', domain: 'communication', resourceTable: 'notification_templates', resourceLabelColumn: 'name',    resourceCodeColumn: 'code',        status: 'AVAILABLE' },
  { key: 'default_letterhead',          label: 'Default Letterhead',          resourceType: 'LETTERHEAD',          domain: 'branding',      resourceTable: 'comm_letterhead',      resourceLabelColumn: 'name',        resourceCodeColumn: 'code',        status: 'AVAILABLE' },
  { key: 'default_email_signature',     label: 'Default Email Signature',     resourceType: 'EMAIL_SIGNATURE',     domain: 'communication', resourceTable: 'comm_email_signature', resourceLabelColumn: 'name',        resourceCodeColumn: 'code',        status: 'AVAILABLE' },
  { key: 'default_disclaimer',          label: 'Default Disclaimer',          resourceType: 'DISCLAIMER',          domain: 'communication', resourceTable: 'comm_disclaimer',      resourceLabelColumn: 'name',        resourceCodeColumn: 'code',        status: 'AVAILABLE' },
  { key: 'default_print_footer',        label: 'Default Print Footer',        resourceType: 'PRINT_FOOTER',        domain: 'communication', resourceTable: 'comm_print_footer',    resourceLabelColumn: 'name',        resourceCodeColumn: 'code',        status: 'AVAILABLE' },
  { key: 'default_text_block',          label: 'Default Text Block',          resourceType: 'TEXT_BLOCK',          domain: 'communication', resourceTable: 'core_text_block',      resourceLabelColumn: 'name',        resourceCodeColumn: 'code',        status: 'PARTIAL',   note: 'Slot-specific text blocks are configured on the department profile.' },
  { key: 'default_output_channel',      label: 'Default Output Channel',      resourceType: 'OUTPUT_CHANNEL',      domain: 'communication', resourceTable: 'core_template_channel', resourceLabelColumn: 'channel_name', resourceCodeColumn: 'channel_code', status: 'AVAILABLE' },
  { key: 'default_language',            label: 'Default Language',            resourceType: 'LANGUAGE',            domain: 'communication', resourceTable: 'core_language',        resourceLabelColumn: 'language_name', resourceCodeColumn: 'language_code', status: 'AVAILABLE' },
  { key: 'default_approval_workflow',   label: 'Default Approval Workflow',   resourceType: 'APPROVAL_WORKFLOW',   domain: 'workflow',      resourceTable: 'core_workflow_definition', resourceLabelColumn: 'workflow_name', resourceCodeColumn: 'workflow_code', status: 'PARTIAL' },
  { key: 'default_dms_folder',          label: 'Default DMS Folder',          resourceType: 'DMS_FOLDER',          domain: 'communication', status: 'PARTIAL',   note: 'DMS folder selector arrives with the DMS governance epic.' },
  { key: 'default_retention_policy',    label: 'Default Retention Policy',    resourceType: 'DMS_FOLDER',          domain: 'communication', status: 'PLANNED',   plannedIn: 'OM-8' },
];

export function findGuidedKey(key: string): GuidedSettingKeyDef | undefined {
  return GUIDED_SETTING_KEYS.find((k) => k.key === key);
}

export const SCOPE_LEVEL_LABEL: Record<ScopeLevel, string> = {
  USER: 'User',
  WORKFLOW_STAGE: 'Workflow Stage',
  WORKFLOW: 'Workflow',
  LOCATION: 'Location',
  DEPARTMENT: 'Department',
  MODULE: 'Module',
  ORG: 'Organization',
  GLOBAL: 'Global',
};

/** Scope keys required in scope_ref for each level. */
export const SCOPE_REQUIRED_KEYS: Record<ScopeLevel, string[]> = {
  USER:            ['user_id'],
  WORKFLOW_STAGE:  ['workflow_code', 'stage_code'],
  WORKFLOW:        ['workflow_code'],
  LOCATION:        ['location_id'],
  DEPARTMENT:      ['department_code'],
  MODULE:          ['module_code'],
  ORG:             [],
  GLOBAL:          [],
};

export interface GuidedAssignmentInput {
  id?: string;
  settingKey: string;
  resourceType: ConfigResourceType;
  scopeLevel: ScopeLevel;
  scopeRef: Record<string, unknown>;
  /** Selected resource — id and optional code/name for display + resource_ref. */
  resourceId: string;
  resourceCode?: string | null;
  resourceName?: string | null;
  resourceIsActive?: boolean;
  priority?: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive?: boolean;
  description?: string | null;
  ruleSet?: Record<string, unknown>;
}

export interface AssignmentValidationIssue {
  code:
    | 'SETTING_KEY_UNKNOWN'
    | 'RESOURCE_TYPE_MISMATCH'
    | 'RESOURCE_TYPE_INVALID'
    | 'SCOPE_LEVEL_INVALID'
    | 'SCOPE_TARGET_MISSING'
    | 'RESOURCE_MISSING'
    | 'RESOURCE_INACTIVE'
    | 'DATE_RANGE_INVALID'
    | 'PRIORITY_INVALID'
    | 'DUPLICATE_ACTIVE_ASSIGNMENT'
    | 'STAGE_WITHOUT_WORKFLOW'
    | 'RAW_JSON_INVALID';
  field?: string;
  message: string;
}

export interface AssignmentValidationResult {
  valid: boolean;
  issues: AssignmentValidationIssue[];
  status: 'VALID' | 'WARN' | 'INVALID';
}

export interface AssignmentConflict {
  type:
    | 'DUPLICATE_ACTIVE'
    | 'INACTIVE_RESOURCE'
    | 'MISSING_RESOURCE'
    | 'MISSING_SCOPE_TARGET'
    | 'STAGE_WITHOUT_WORKFLOW'
    | 'DATE_OVERLAP'
    | 'UNKNOWN_SETTING'
    | 'RESOURCE_TYPE_MISMATCH'
    | 'LEGACY_REQUIRES_REVIEW';
  assignmentId: string;
  scopeLevel: ScopeLevel;
  settingKey?: string | null;
  message: string;
}

export interface ConfigHealthReport {
  totalAssignments: number;
  activeAssignments: number;
  legacyAssignments: number;
  conflicts: AssignmentConflict[];
  ranAt: string;
}
