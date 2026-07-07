/**
 * Epic OM-9.7 — Department Profile Field Classification Model.
 *
 * Single source of truth used by the Department Profile UI, health checks,
 * and backfill service to decide how each configurable value is stored,
 * inherited, overridden, reset, and previewed.
 *
 * Categories:
 *  - ORG_INHERITABLE     Value has an Organisation-level default; department may inherit or override.
 *  - SCOPED_ASSIGNMENT   Value resolved via `core_configuration_assignment` (OM-6/OM-7).
 *                        Department override = DEPARTMENT-scope assignment.
 *  - DEPARTMENT_ONLY     Value belongs only to the department (contact info, manager, notes, etc.).
 *  - PLANNED             Not yet safely configurable; UI shows it as deferred, never silently hidden.
 *
 * Adding a new department-configurable value: append an entry here. The UI,
 * health check, and backfill routines will pick it up automatically.
 */
export type DeptFieldCategory =
  | 'ORG_INHERITABLE'
  | 'SCOPED_ASSIGNMENT'
  | 'DEPARTMENT_ONLY'
  | 'PLANNED';

export type DeptFieldResourceType =
  | 'LOCATION'
  | 'LETTERHEAD'
  | 'EMAIL_SIGNATURE'
  | 'DISCLAIMER'
  | 'PRINT_FOOTER'
  | 'LOGO'
  | 'SEAL'
  | 'WATERMARK'
  | 'LANGUAGE'
  | 'OUTPUT_CHANNEL'
  | 'DOCUMENT_TEMPLATE'
  | 'NOTIFICATION_TEMPLATE'
  | 'TEXT_BLOCK'
  | 'RETENTION_POLICY'
  | 'APPROVAL_WORKFLOW'
  | 'PERSON'
  | 'CONTACT'
  | 'WORKBASKET'
  | 'TEAM'
  | 'QUEUE'
  | 'TEXT'
  | 'DMS_FOLDER'
  | 'AI_SETTINGS';

export interface DeptProfileFieldDescriptor {
  fieldKey: string;
  label: string;
  category: DeptFieldCategory;
  resourceType?: DeptFieldResourceType;
  supportsOverride: boolean;
  supportsReset: boolean;
  /** Column on `core_department_profile` that toggles inheritance, if any. */
  deptInheritFlag?: string;
  /** Column on `core_department_profile` that holds the override value, if any. */
  deptOverrideColumn?: string;
  /** Column on `core_organization` that holds the Organisation default, if any. */
  orgDefaultColumn?: string;
  /** Free-text description of where the value comes from — shown in UI tooltips. */
  sourceDescription: string;
  /** Health rules the UI + release-readiness checks apply to this field. */
  healthRules: Array<
    | 'REQUIRED_EFFECTIVE_VALUE'
    | 'REFERENCED_RESOURCE_ACTIVE'
    | 'OVERRIDE_INHERIT_FLAG_CONSISTENT'
    | 'WARN_IF_MISSING_ONLY'
    | 'ASSIGNMENT_TARGET_ACTIVE'
  >;
  /** UI tab this field belongs to. */
  uiTab:
    | 'INHERITED_DEFAULTS'
    | 'DEPARTMENT_OVERRIDES'
    | 'DEPARTMENT_ONLY'
    | 'PEOPLE_AND_CONTACT'
    | 'OFFICE_AND_LOCATION'
    | 'ADVANCED';
  /** For PLANNED entries: successor epic name / note. */
  plannedIn?: string;
  note?: string;
}

export const DEPARTMENT_PROFILE_FIELD_MODEL: DeptProfileFieldDescriptor[] = [
  // ------------------------------------------------------------------
  // A. ORG_INHERITABLE — Organisation default, department can inherit or override.
  // ------------------------------------------------------------------
  {
    fieldKey: 'default_location', label: 'Default Location',
    category: 'ORG_INHERITABLE', resourceType: 'LOCATION',
    supportsOverride: true, supportsReset: true,
    deptInheritFlag: 'inherit_location_from_org',
    deptOverrideColumn: 'primary_location_id',
    orgDefaultColumn: 'default_location_id',
    sourceDescription: 'Falls back to Organisation Default Location unless overridden.',
    healthRules: ['REQUIRED_EFFECTIVE_VALUE', 'REFERENCED_RESOURCE_ACTIVE', 'OVERRIDE_INHERIT_FLAG_CONSISTENT'],
    uiTab: 'OFFICE_AND_LOCATION',
  },
  {
    fieldKey: 'default_letterhead', label: 'Default Letterhead',
    category: 'ORG_INHERITABLE', resourceType: 'LETTERHEAD',
    supportsOverride: true, supportsReset: true,
    deptInheritFlag: 'inherit_letterhead_from_org',
    deptOverrideColumn: 'default_letterhead_id',
    orgDefaultColumn: 'default_letterhead_id',
    sourceDescription: 'Falls back to Organisation Default Letterhead unless overridden.',
    healthRules: ['REQUIRED_EFFECTIVE_VALUE', 'REFERENCED_RESOURCE_ACTIVE', 'OVERRIDE_INHERIT_FLAG_CONSISTENT'],
    uiTab: 'INHERITED_DEFAULTS',
  },
  {
    fieldKey: 'default_email_signature', label: 'Default Email Signature',
    category: 'ORG_INHERITABLE', resourceType: 'EMAIL_SIGNATURE',
    supportsOverride: true, supportsReset: true,
    deptInheritFlag: 'inherit_email_signature_from_org',
    deptOverrideColumn: 'default_email_signature_id',
    orgDefaultColumn: 'default_email_signature_id',
    sourceDescription: 'Falls back to Organisation Default Email Signature unless overridden.',
    healthRules: ['REQUIRED_EFFECTIVE_VALUE', 'REFERENCED_RESOURCE_ACTIVE', 'OVERRIDE_INHERIT_FLAG_CONSISTENT'],
    uiTab: 'INHERITED_DEFAULTS',
  },
  {
    fieldKey: 'default_disclaimer', label: 'Default Disclaimer',
    category: 'ORG_INHERITABLE', resourceType: 'DISCLAIMER',
    supportsOverride: true, supportsReset: true,
    deptInheritFlag: 'inherit_disclaimer_from_org',
    deptOverrideColumn: 'default_disclaimer_id',
    orgDefaultColumn: 'default_disclaimer_id',
    sourceDescription: 'Falls back to Organisation Default Disclaimer unless overridden.',
    healthRules: ['REQUIRED_EFFECTIVE_VALUE', 'REFERENCED_RESOURCE_ACTIVE', 'OVERRIDE_INHERIT_FLAG_CONSISTENT'],
    uiTab: 'INHERITED_DEFAULTS',
  },
  {
    fieldKey: 'default_print_footer', label: 'Default Print Footer',
    category: 'ORG_INHERITABLE', resourceType: 'PRINT_FOOTER',
    supportsOverride: true, supportsReset: true,
    deptInheritFlag: 'inherit_print_footer_from_org',
    deptOverrideColumn: 'default_print_footer_id',
    orgDefaultColumn: 'default_print_footer_id',
    sourceDescription: 'Falls back to Organisation Default Print Footer unless overridden.',
    healthRules: ['REQUIRED_EFFECTIVE_VALUE', 'REFERENCED_RESOURCE_ACTIVE', 'OVERRIDE_INHERIT_FLAG_CONSISTENT'],
    uiTab: 'INHERITED_DEFAULTS',
  },
  {
    fieldKey: 'default_logo', label: 'Default Logo',
    category: 'ORG_INHERITABLE', resourceType: 'LOGO',
    supportsOverride: true, supportsReset: true,
    deptInheritFlag: 'inherit_logo_from_org',
    deptOverrideColumn: 'default_logo_asset_id',
    sourceDescription: 'Falls back to Organisation logo (Portal Branding) unless overridden.',
    healthRules: ['REFERENCED_RESOURCE_ACTIVE', 'OVERRIDE_INHERIT_FLAG_CONSISTENT'],
    uiTab: 'INHERITED_DEFAULTS',
  },
  {
    fieldKey: 'default_seal', label: 'Default Seal',
    category: 'ORG_INHERITABLE', resourceType: 'SEAL',
    supportsOverride: true, supportsReset: true,
    deptInheritFlag: 'inherit_seal_from_org',
    deptOverrideColumn: 'default_seal_asset_id',
    sourceDescription: 'Falls back to Organisation seal unless overridden.',
    healthRules: ['REFERENCED_RESOURCE_ACTIVE', 'OVERRIDE_INHERIT_FLAG_CONSISTENT'],
    uiTab: 'INHERITED_DEFAULTS',
  },
  {
    fieldKey: 'default_watermark', label: 'Default Watermark',
    category: 'ORG_INHERITABLE', resourceType: 'WATERMARK',
    supportsOverride: true, supportsReset: true,
    deptOverrideColumn: 'default_watermark_asset_id',
    sourceDescription: 'Optional watermark for department outputs; inherits Organisation default when unset.',
    healthRules: ['REFERENCED_RESOURCE_ACTIVE'],
    uiTab: 'INHERITED_DEFAULTS',
  },
  {
    fieldKey: 'default_language', label: 'Default Language',
    category: 'ORG_INHERITABLE', resourceType: 'LANGUAGE',
    supportsOverride: true, supportsReset: true,
    deptOverrideColumn: 'default_language',
    orgDefaultColumn: 'default_language',
    sourceDescription: 'Falls back to Organisation default language unless overridden.',
    healthRules: ['REQUIRED_EFFECTIVE_VALUE'],
    uiTab: 'INHERITED_DEFAULTS',
  },
  {
    fieldKey: 'default_output_channel', label: 'Default Output Channel',
    category: 'ORG_INHERITABLE', resourceType: 'OUTPUT_CHANNEL',
    supportsOverride: true, supportsReset: true,
    sourceDescription: 'Falls back to Organisation default output channel unless overridden.',
    healthRules: ['REQUIRED_EFFECTIVE_VALUE'],
    uiTab: 'INHERITED_DEFAULTS',
  },

  // ------------------------------------------------------------------
  // B. SCOPED_ASSIGNMENT — Resolved via core_configuration_assignment.
  // ------------------------------------------------------------------
  {
    fieldKey: 'default_document_template', label: 'Default Document Template',
    category: 'SCOPED_ASSIGNMENT', resourceType: 'DOCUMENT_TEMPLATE',
    supportsOverride: true, supportsReset: true,
    sourceDescription: 'Resolved per event via Configuration Center. Department override = DEPARTMENT-scope assignment; reset falls back to Module/Org/Global.',
    healthRules: ['ASSIGNMENT_TARGET_ACTIVE'],
    uiTab: 'INHERITED_DEFAULTS',
  },
  {
    fieldKey: 'default_notification_template', label: 'Default Notification Template',
    category: 'SCOPED_ASSIGNMENT', resourceType: 'NOTIFICATION_TEMPLATE',
    supportsOverride: true, supportsReset: true,
    sourceDescription: 'Resolved per notification via Configuration Center; department scope wins over module/org.',
    healthRules: ['ASSIGNMENT_TARGET_ACTIVE'],
    uiTab: 'INHERITED_DEFAULTS',
  },
  {
    fieldKey: 'default_text_block', label: 'Default Text Block',
    category: 'SCOPED_ASSIGNMENT', resourceType: 'TEXT_BLOCK',
    supportsOverride: true, supportsReset: true,
    sourceDescription: 'Slot-agnostic default text block, scope-aware via Configuration Center.',
    healthRules: ['ASSIGNMENT_TARGET_ACTIVE'],
    uiTab: 'INHERITED_DEFAULTS',
  },
  {
    fieldKey: 'default_retention_policy', label: 'Default Retention Policy',
    category: 'SCOPED_ASSIGNMENT', resourceType: 'RETENTION_POLICY',
    supportsOverride: true, supportsReset: true,
    sourceDescription: 'Applied to generated documents/emails; department scope overrides organisation policy.',
    healthRules: ['ASSIGNMENT_TARGET_ACTIVE'],
    uiTab: 'INHERITED_DEFAULTS',
  },
  {
    fieldKey: 'default_approval_workflow', label: 'Default Approval Workflow',
    category: 'SCOPED_ASSIGNMENT', resourceType: 'APPROVAL_WORKFLOW',
    supportsOverride: true, supportsReset: true,
    sourceDescription: 'Approval workflow selected per business event; department scope preferred when present.',
    healthRules: ['ASSIGNMENT_TARGET_ACTIVE'],
    uiTab: 'INHERITED_DEFAULTS',
  },

  // ------------------------------------------------------------------
  // C. DEPARTMENT_ONLY — Values that belong only to the department.
  // ------------------------------------------------------------------
  { fieldKey: 'department_manager',    label: 'Department Manager',   category: 'DEPARTMENT_ONLY', resourceType: 'PERSON',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Named manager of this department. Not inheritable from Organisation.',
    healthRules: ['WARN_IF_MISSING_ONLY'], uiTab: 'PEOPLE_AND_CONTACT' },
  { fieldKey: 'deputy_manager',        label: 'Deputy Manager',       category: 'DEPARTMENT_ONLY', resourceType: 'PERSON',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Deputy contact for this department.', healthRules: ['WARN_IF_MISSING_ONLY'], uiTab: 'PEOPLE_AND_CONTACT' },
  { fieldKey: 'escalation_contact',    label: 'Escalation Contact',   category: 'DEPARTMENT_ONLY', resourceType: 'PERSON',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Escalation point of contact when SLAs breach.', healthRules: ['WARN_IF_MISSING_ONLY'], uiTab: 'PEOPLE_AND_CONTACT' },
  { fieldKey: 'default_document_owner',label: 'Default Document Owner', category: 'DEPARTMENT_ONLY', resourceType: 'PERSON',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Owner attributed to documents generated for this department.', healthRules: ['WARN_IF_MISSING_ONLY'], uiTab: 'PEOPLE_AND_CONTACT' },
  { fieldKey: 'contact_email',         label: 'Department Email',     category: 'DEPARTMENT_ONLY', resourceType: 'CONTACT',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Public-facing email for this department.', healthRules: ['WARN_IF_MISSING_ONLY'], uiTab: 'PEOPLE_AND_CONTACT' },
  { fieldKey: 'contact_phone',         label: 'Department Phone',     category: 'DEPARTMENT_ONLY', resourceType: 'CONTACT',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Public-facing phone for this department.', healthRules: ['WARN_IF_MISSING_ONLY'], uiTab: 'PEOPLE_AND_CONTACT' },
  { fieldKey: 'contact_fax',           label: 'Department Fax',       category: 'DEPARTMENT_ONLY', resourceType: 'CONTACT',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Optional department fax.', healthRules: [], uiTab: 'PEOPLE_AND_CONTACT' },
  { fieldKey: 'website',               label: 'Department Website',   category: 'DEPARTMENT_ONLY', resourceType: 'CONTACT',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Optional public URL for this department.', healthRules: [], uiTab: 'PEOPLE_AND_CONTACT' },
  { fieldKey: 'office_hours',          label: 'Office Hours',         category: 'DEPARTMENT_ONLY', resourceType: 'TEXT',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Operating hours displayed on department outputs.', healthRules: [], uiTab: 'PEOPLE_AND_CONTACT' },
  { fieldKey: 'workbasket',            label: 'Workbasket',           category: 'DEPARTMENT_ONLY', resourceType: 'WORKBASKET',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Assigned workbasket for departmental tasks.', healthRules: [], uiTab: 'DEPARTMENT_ONLY' },
  { fieldKey: 'team',                  label: 'Team',                 category: 'DEPARTMENT_ONLY', resourceType: 'TEAM',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Team assigned to this department.', healthRules: [], uiTab: 'DEPARTMENT_ONLY' },
  { fieldKey: 'department_notes',      label: 'Department Notes',     category: 'DEPARTMENT_ONLY', resourceType: 'TEXT',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Free-form operating notes for this department.', healthRules: [], uiTab: 'DEPARTMENT_ONLY' },
  { fieldKey: 'ai_prompt_prefix',      label: 'AI Prompt Prefix',     category: 'DEPARTMENT_ONLY', resourceType: 'AI_SETTINGS',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Department-scoped AI prompt prefix used by module AI helpers.', healthRules: [], uiTab: 'DEPARTMENT_ONLY' },
  { fieldKey: 'dms_folder_id',         label: 'Department DMS Folder',category: 'DEPARTMENT_ONLY', resourceType: 'DMS_FOLDER',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Department-specific DMS folder when no Organisation DMS catalogue exists.',
    healthRules: [], uiTab: 'DEPARTMENT_ONLY' },

  // ------------------------------------------------------------------
  // D. PLANNED — Not yet safely configurable; UI marks these as deferred.
  // ------------------------------------------------------------------
  { fieldKey: 'default_dms_folder_catalogue', label: 'Organisation DMS Folder Catalogue',
    category: 'PLANNED', resourceType: 'DMS_FOLDER',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Awaiting a governed DMS folder catalogue at the Organisation level.',
    plannedIn: 'OM-9+', healthRules: [], uiTab: 'ADVANCED' },
  { fieldKey: 'ai_governance_settings', label: 'AI Governance Settings',
    category: 'PLANNED', resourceType: 'AI_SETTINGS',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Awaiting a governed AI settings model shared across the platform.',
    plannedIn: 'OM-10+', healthRules: [], uiTab: 'ADVANCED' },
  { fieldKey: 'default_queue', label: 'Default Queue',
    category: 'PLANNED', resourceType: 'QUEUE',
    supportsOverride: false, supportsReset: false,
    sourceDescription: 'Awaiting a canonical queue catalogue before department-level assignment is enabled.',
    plannedIn: 'OM-10+', healthRules: [], uiTab: 'DEPARTMENT_ONLY' },
];

export const DEPARTMENT_PROFILE_FIELD_KEYS: string[] =
  DEPARTMENT_PROFILE_FIELD_MODEL.map((f) => f.fieldKey);

export function findDeptProfileField(key: string): DeptProfileFieldDescriptor | undefined {
  return DEPARTMENT_PROFILE_FIELD_MODEL.find((f) => f.fieldKey === key);
}

export function deptProfileFieldsByCategory(category: DeptFieldCategory): DeptProfileFieldDescriptor[] {
  return DEPARTMENT_PROFILE_FIELD_MODEL.filter((f) => f.category === category);
}

export function deptProfileFieldsByTab(
  tab: DeptProfileFieldDescriptor['uiTab'],
): DeptProfileFieldDescriptor[] {
  return DEPARTMENT_PROFILE_FIELD_MODEL.filter((f) => f.uiTab === tab);
}

export const DEPT_PROFILE_INHERIT_FLAGS: string[] = DEPARTMENT_PROFILE_FIELD_MODEL
  .map((f) => f.deptInheritFlag)
  .filter((v): v is string => !!v);
