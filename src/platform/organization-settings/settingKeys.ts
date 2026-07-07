/**
 * Epic OM-6 — Canonical registry of organisation/communication setting keys
 * that participate in the effective-settings inheritance model.
 *
 * Each entry describes:
 *   - a stable `key` used by callers
 *   - a friendly `label` for admin UI
 *   - which storage strategy provides the value today
 *   - whether the setting is currently implemented, planned, or not yet
 *     configurable — so we never silently ignore acceptance-criteria items.
 *
 * Adding a new setting: append an entry here; that is enough for
 * `resolveEffectiveSettingsBundle`, the health check and the UI overview to
 * pick it up.
 */
export type SettingStorage =
  | 'DEPARTMENT_PROFILE'         // inherit flag + override column on core_department_profile
  | 'ORG_PROFILE_ONLY'           // org-level default only, no dept override column
  | 'CONFIGURATION_ASSIGNMENT'   // resolved via core_configuration_assignment
  | 'DEFERRED';                  // documented; not yet configurable

export type SettingImplStatus = 'IMPLEMENTED' | 'PARTIAL' | 'PLANNED' | 'NOT_CONFIGURABLE';

export interface SettingKeyDescriptor {
  key: string;
  label: string;
  category: 'LOCATION' | 'BRANDING' | 'TEMPLATE' | 'COMMUNICATION' | 'TEXT' | 'OUTPUT' | 'GOVERNANCE';
  storage: SettingStorage;
  status: SettingImplStatus;
  /** Column on core_department_profile that toggles inheritance, if any. */
  deptInheritFlag?: string;
  /** Column on core_department_profile that holds the override value, if any. */
  deptOverrideColumn?: string;
  /** Column on core_organization that holds the org default, if any. */
  orgDefaultColumn?: string;
  /** Underlying resource table for the configured resource, if applicable. */
  resourceTable?: string;
  /** Reason or note surfaced in the health/overview UI when status !== IMPLEMENTED. */
  note?: string;
  /** Planned successor epic when status is PLANNED. */
  plannedIn?: string;
}

export const SETTING_KEYS: SettingKeyDescriptor[] = [
  { key: 'default_location',            label: 'Default Location',            category: 'LOCATION', storage: 'DEPARTMENT_PROFILE', status: 'IMPLEMENTED',
    deptInheritFlag: 'inherit_location_from_org', deptOverrideColumn: 'primary_location_id', orgDefaultColumn: 'default_location_id', resourceTable: 'office_locations' },
  { key: 'default_letterhead',          label: 'Default Letterhead',          category: 'BRANDING', storage: 'DEPARTMENT_PROFILE', status: 'IMPLEMENTED',
    deptInheritFlag: 'inherit_letterhead_from_org', deptOverrideColumn: 'default_letterhead_id', orgDefaultColumn: 'default_letterhead_id', resourceTable: 'comm_letterhead' },
  { key: 'default_email_signature',     label: 'Default Email Signature',     category: 'COMMUNICATION', storage: 'DEPARTMENT_PROFILE', status: 'IMPLEMENTED',
    deptInheritFlag: 'inherit_email_signature_from_org', deptOverrideColumn: 'default_email_signature_id', orgDefaultColumn: 'default_email_signature_id', resourceTable: 'comm_email_signature' },
  { key: 'default_disclaimer',          label: 'Default Disclaimer',          category: 'COMMUNICATION', storage: 'DEPARTMENT_PROFILE', status: 'IMPLEMENTED',
    deptInheritFlag: 'inherit_disclaimer_from_org', deptOverrideColumn: 'default_disclaimer_id', orgDefaultColumn: 'default_disclaimer_id', resourceTable: 'comm_disclaimer' },
  { key: 'default_print_footer',        label: 'Default Print Footer',        category: 'COMMUNICATION', storage: 'DEPARTMENT_PROFILE', status: 'IMPLEMENTED',
    deptInheritFlag: 'inherit_print_footer_from_org', deptOverrideColumn: 'default_print_footer_id', orgDefaultColumn: 'default_print_footer_id', resourceTable: 'comm_print_footer' },
  { key: 'default_logo',                label: 'Default Logo',                category: 'BRANDING', storage: 'DEPARTMENT_PROFILE', status: 'IMPLEMENTED',
    deptOverrideColumn: 'default_logo_asset_id', resourceTable: 'comm_media_asset',
    note: 'Organisation-level logo is configured via Portal Branding; department override is used when present.' },
  { key: 'default_seal',                label: 'Default Seal',                category: 'BRANDING', storage: 'DEPARTMENT_PROFILE', status: 'IMPLEMENTED',
    deptOverrideColumn: 'default_seal_asset_id', resourceTable: 'comm_media_asset' },
  { key: 'default_watermark',           label: 'Default Watermark',           category: 'BRANDING', storage: 'DEPARTMENT_PROFILE', status: 'IMPLEMENTED',
    deptOverrideColumn: 'default_watermark_asset_id', resourceTable: 'comm_media_asset' },
  { key: 'default_language',            label: 'Default Language',            category: 'OUTPUT', storage: 'DEPARTMENT_PROFILE', status: 'IMPLEMENTED',
    deptOverrideColumn: 'default_language', orgDefaultColumn: 'default_language', resourceTable: 'core_language' },
  { key: 'default_text_block',          label: 'Default Text Blocks',         category: 'TEXT',     storage: 'CONFIGURATION_ASSIGNMENT', status: 'PARTIAL',
    resourceTable: 'core_text_block',
    note: 'OM-8: default text block is now scope-aware via core_configuration_assignment (resource_type=TEXT_BLOCK). Slot-specific text-block codes on the department profile still take precedence for named slots.' },
  { key: 'default_dms_folder',          label: 'Default DMS Folder',          category: 'GOVERNANCE', storage: 'DEPARTMENT_PROFILE', status: 'IMPLEMENTED',
    deptOverrideColumn: 'dms_folder_id', orgDefaultColumn: 'default_dms_folder_id' },
  { key: 'default_document_template',   label: 'Default Document Template',   category: 'TEMPLATE', storage: 'CONFIGURATION_ASSIGNMENT', status: 'IMPLEMENTED',
    resourceTable: 'core_template',
    note: 'Distinct from letterhead. Resolved per business event via core_configuration_assignment (resource_type=DOCUMENT_TEMPLATE / TEMPLATE).' },
  { key: 'default_notification_template', label: 'Default Notification Template', category: 'TEMPLATE', storage: 'CONFIGURATION_ASSIGNMENT', status: 'IMPLEMENTED',
    resourceTable: 'notification_templates',
    note: 'OM-8: scope-aware via core_configuration_assignment (resource_type=NOTIFICATION_TEMPLATE).' },
  { key: 'default_output_channel',      label: 'Default Output Channel',      category: 'OUTPUT', storage: 'CONFIGURATION_ASSIGNMENT', status: 'PARTIAL',
    note: 'Resolved per business event via core_configuration_assignment (resource_type=CHANNEL).' },
  { key: 'default_retention_policy',    label: 'Default Retention Policy',    category: 'GOVERNANCE', storage: 'CONFIGURATION_ASSIGNMENT', status: 'IMPLEMENTED',
    resourceTable: 'core_retention_policy',
    note: 'OM-8: canonical retention policy catalogue (core_retention_policy); scope-aware via core_configuration_assignment (resource_type=RETENTION_POLICY).' },
  { key: 'default_approval_workflow',   label: 'Default Approval Workflow',   category: 'GOVERNANCE', storage: 'CONFIGURATION_ASSIGNMENT', status: 'IMPLEMENTED',
    resourceTable: 'core_workflow_definition',
    note: 'OM-8: selector completed. Resolved via core_configuration_assignment (resource_type=APPROVAL_WORKFLOW).' },
  { key: 'default_dms_folder_setting',  label: 'Scoped DMS Folder Setting',   category: 'GOVERNANCE', storage: 'DEFERRED', status: 'PLANNED', plannedIn: 'OM-9+',
    note: 'OM-8: DMS folder catalogue is not yet available. Guided assignment blocks save with a clear message; department-level folder overrides remain available.' },
];

export function findSettingKey(key: string): SettingKeyDescriptor | undefined {
  return SETTING_KEYS.find((s) => s.key === key);
}

export const SETTING_KEY_CODES: string[] = SETTING_KEYS.map((s) => s.key);
