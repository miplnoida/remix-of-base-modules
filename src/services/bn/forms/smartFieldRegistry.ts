/**
 * BN Smart Field Registry
 *
 * Catalogue of "smart" field types for benefit application forms. Unlike a plain
 * <input>, a smart field knows:
 *   - what authoritative source it reads from (adapter / RPC / lookup)
 *   - whether public users may edit it
 *   - whether staff may override (and under what audit / permission rule)
 *   - what shape the rendered control takes
 *
 * The registry is consumed by:
 *   - SmartBenefitFormRenderer (UI)
 *   - formDefinitionService (mapping bn_field_metadata → smart types)
 *   - validators (block public free-text entry of verified identity)
 *
 * Rule of thumb (from product spec):
 *   "Public users cannot manually type name, DOB, age, contribution weeks, or
 *    employer name if lookup exists."
 *   "Verified fields display as read-only. Only claim-specific facts are editable."
 */

import type { FormChannel } from './sectionCatalogue';

export type SmartFieldType =
  | 'SSN_LOOKUP'
  | 'PERSON_SUMMARY'
  | 'PERSON_READONLY_FIELD'
  | 'EMPLOYER_LOOKUP'
  | 'EMPLOYER_SUMMARY'
  | 'CONTRIBUTION_SUMMARY'
  | 'DEPENDANT_SELECTOR'
  | 'CLAIM_EVENT_DATE'
  | 'DOCUMENT_UPLOAD_CHECKLIST'
  | 'BANK_ACCOUNT_CAPTURE'
  | 'RELATIONSHIP_SELECTOR'
  | 'MEDICAL_CERTIFICATE_UPLOAD'
  | 'DECLARATION_CHECKBOX'
  | 'INTERNAL_NOTES'
  | 'LEGACY_LOOKUP'
  | 'OVERRIDE_REQUEST'
  | 'WORKFLOW_ROUTING';

export type SmartFieldCategory =
  | 'identity'       // SSN / person identity
  | 'employer'       // employer identity
  | 'contribution'   // wage / weeks
  | 'family'         // dependants, relationships
  | 'event'          // claim event facts
  | 'evidence'       // documents
  | 'payment'        // bank capture
  | 'governance'     // notes, declarations, routing, overrides
  | 'legacy';        // historical inquiry lookup

export type SmartFieldEditability =
  /** Field is auto-populated by lookup and may never be edited from the UI. */
  | 'AUTO_READONLY'
  /** Auto-populated, but staff with permission may override (with audit). */
  | 'AUTO_OVERRIDE_STAFF'
  /** Always user-entered (claim-specific facts). */
  | 'USER_ENTRY'
  /** Special interactive controls (uploads, declarations, selectors). */
  | 'INTERACTIVE';

export interface SmartFieldDescriptor {
  type: SmartFieldType;
  category: SmartFieldCategory;
  editability: SmartFieldEditability;
  /** Channels where the field is meaningful. */
  channels: FormChannel[];
  /** Public users may NOT free-text these — must come from lookup. */
  publicFreeTextForbidden: boolean;
  /** Permission required for staff override (where applicable). */
  staffOverridePermission?: string;
  /** Required to write an audit row when staff overrides verified data. */
  overrideAudited: boolean;
  /** Adapter / service hint (informational; renderer wires actual calls). */
  source: string;
  /** Short description shown in dev tooling / catalogue browser. */
  description: string;
}

const ALL: FormChannel[] = ['INTERNAL', 'ASSISTED_OFFLINE', 'PUBLIC'];
const STAFF: FormChannel[] = ['INTERNAL', 'ASSISTED_OFFLINE'];

export const SMART_FIELD_REGISTRY: Record<SmartFieldType, SmartFieldDescriptor> = {
  SSN_LOOKUP: {
    type: 'SSN_LOOKUP',
    category: 'identity',
    editability: 'INTERACTIVE',
    channels: ALL,
    publicFreeTextForbidden: false, // SSN itself is the lookup key
    overrideAudited: false,
    source: 'formLookupService.lookupPersonBySSN → personAdapter → ip_master',
    description: 'SSN entry box with debounced lookup; on hit, hydrates Person fields.',
  },
  PERSON_SUMMARY: {
    type: 'PERSON_SUMMARY',
    category: 'identity',
    editability: 'AUTO_READONLY',
    channels: ALL,
    publicFreeTextForbidden: true,
    overrideAudited: false,
    source: 'personAdapter (read-only card view)',
    description: 'Read-only summary card of the resolved person (name, DOB, status, address).',
  },
  PERSON_READONLY_FIELD: {
    type: 'PERSON_READONLY_FIELD',
    category: 'identity',
    editability: 'AUTO_OVERRIDE_STAFF',
    channels: ALL,
    publicFreeTextForbidden: true,
    staffOverridePermission: 'benefits.override_person_field',
    overrideAudited: true,
    source: 'personAdapter (individual attribute)',
    description: 'Single person attribute (name / DOB / gender / address) shown read-only; staff with permission can request override.',
  },
  EMPLOYER_LOOKUP: {
    type: 'EMPLOYER_LOOKUP',
    category: 'employer',
    editability: 'INTERACTIVE',
    channels: ALL,
    publicFreeTextForbidden: false,
    overrideAudited: false,
    source: 'formLookupService.lookupEmployerByRegNo → employerAdapter → er_master',
    description: 'Employer registration number entry; on hit, hydrates Employer fields.',
  },
  EMPLOYER_SUMMARY: {
    type: 'EMPLOYER_SUMMARY',
    category: 'employer',
    editability: 'AUTO_READONLY',
    channels: ALL,
    publicFreeTextForbidden: true,
    overrideAudited: false,
    source: 'employerAdapter (read-only card view)',
    description: 'Read-only employer card (name, status, industry, address).',
  },
  CONTRIBUTION_SUMMARY: {
    type: 'CONTRIBUTION_SUMMARY',
    category: 'contribution',
    editability: 'AUTO_READONLY',
    channels: STAFF, // public sees a soft summary at most; weeks/wages not entered
    publicFreeTextForbidden: true,
    overrideAudited: false,
    source: 'formLookupService.getContributionSummary → contributionAdapter → ip_wages',
    description: 'Contribution window summary: total weeks, paid weeks, credited weeks, average weekly wage.',
  },
  DEPENDANT_SELECTOR: {
    type: 'DEPENDANT_SELECTOR',
    category: 'family',
    editability: 'INTERACTIVE',
    channels: ALL,
    publicFreeTextForbidden: true,
    overrideAudited: false,
    source: 'formLookupService.getDependants → personAdapter (ip_depend)',
    description: 'Pick registered dependants. Add-new requires staff workflow.',
  },
  CLAIM_EVENT_DATE: {
    type: 'CLAIM_EVENT_DATE',
    category: 'event',
    editability: 'USER_ENTRY',
    channels: ALL,
    publicFreeTextForbidden: false,
    overrideAudited: false,
    source: 'user input',
    description: 'Claim-specific event date (illness start, accident date, confinement, etc.).',
  },
  DOCUMENT_UPLOAD_CHECKLIST: {
    type: 'DOCUMENT_UPLOAD_CHECKLIST',
    category: 'evidence',
    editability: 'INTERACTIVE',
    channels: ALL,
    publicFreeTextForbidden: false,
    overrideAudited: false,
    source: 'formLookupService.getRequiredDocuments → bn_doc_requirement',
    description: 'Materialized evidence checklist from product version + channel.',
  },
  BANK_ACCOUNT_CAPTURE: {
    type: 'BANK_ACCOUNT_CAPTURE',
    category: 'payment',
    editability: 'INTERACTIVE',
    channels: ALL,
    publicFreeTextForbidden: false,
    overrideAudited: false,
    source: 'user input (validated against bank code list)',
    description: 'Bank code + account number with format validation.',
  },
  RELATIONSHIP_SELECTOR: {
    type: 'RELATIONSHIP_SELECTOR',
    category: 'family',
    editability: 'INTERACTIVE',
    channels: ALL,
    publicFreeTextForbidden: true,
    overrideAudited: false,
    source: 'tb_dependent_relation lookup',
    description: 'Choose relationship from controlled list (SPOUSE, CHILD, …).',
  },
  MEDICAL_CERTIFICATE_UPLOAD: {
    type: 'MEDICAL_CERTIFICATE_UPLOAD',
    category: 'evidence',
    editability: 'INTERACTIVE',
    channels: ALL,
    publicFreeTextForbidden: false,
    overrideAudited: false,
    source: 'documentAdapter (medical_certificate category)',
    description: 'Medical certificate upload with practitioner metadata.',
  },
  DECLARATION_CHECKBOX: {
    type: 'DECLARATION_CHECKBOX',
    category: 'governance',
    editability: 'INTERACTIVE',
    channels: ALL,
    publicFreeTextForbidden: false,
    overrideAudited: false,
    source: 'user input (declaration text from product version)',
    description: 'Mandatory declaration / consent acceptance.',
  },
  INTERNAL_NOTES: {
    type: 'INTERNAL_NOTES',
    category: 'governance',
    editability: 'USER_ENTRY',
    channels: STAFF,
    publicFreeTextForbidden: false,
    overrideAudited: false,
    source: 'bn_claim_note',
    description: 'Free-text internal notes (staff only).',
  },
  LEGACY_LOOKUP: {
    type: 'LEGACY_LOOKUP',
    category: 'legacy',
    editability: 'INTERACTIVE',
    channels: STAFF,
    publicFreeTextForbidden: true,
    overrideAudited: false,
    source: 'historicalInquiryAdapter → cl_head (legacy claims)',
    description: 'Search legacy claims (cl_head) and link to current application.',
  },
  OVERRIDE_REQUEST: {
    type: 'OVERRIDE_REQUEST',
    category: 'governance',
    editability: 'INTERACTIVE',
    channels: STAFF,
    publicFreeTextForbidden: false,
    staffOverridePermission: 'benefits.request_override',
    overrideAudited: true,
    source: 'bn_override_policy',
    description: 'Raise an override request against a verified field with justification + audit.',
  },
  WORKFLOW_ROUTING: {
    type: 'WORKFLOW_ROUTING',
    category: 'governance',
    editability: 'INTERACTIVE',
    channels: STAFF,
    publicFreeTextForbidden: false,
    overrideAudited: false,
    source: 'workflowAdapter (template + workbasket)',
    description: 'Routing controls: priority, assigned-to, workbasket override.',
  },
};

export function getSmartFieldDescriptor(type: SmartFieldType): SmartFieldDescriptor {
  const d = SMART_FIELD_REGISTRY[type];
  if (!d) throw new Error(`Unknown smart field type: ${type}`);
  return d;
}

export function listSmartFieldTypes(): SmartFieldType[] {
  return Object.keys(SMART_FIELD_REGISTRY) as SmartFieldType[];
}

/**
 * Decide if a field is effectively read-only for a given channel + capability set.
 * - AUTO_READONLY → always read-only
 * - AUTO_OVERRIDE_STAFF → read-only for public, editable for staff with permission
 * - USER_ENTRY / INTERACTIVE → editable
 */
export function resolveSmartFieldReadOnly(
  type: SmartFieldType,
  channel: FormChannel,
  hasPermission: (perm: string) => boolean = () => false,
): boolean {
  const d = getSmartFieldDescriptor(type);
  if (d.editability === 'AUTO_READONLY') return true;
  if (d.editability === 'AUTO_OVERRIDE_STAFF') {
    if (channel === 'PUBLIC') return true;
    if (!d.staffOverridePermission) return false;
    return !hasPermission(d.staffOverridePermission);
  }
  return false;
}

/**
 * Validate that a public submission does not contain free-text values for
 * fields whose data should come from authoritative lookup. Returns the field
 * codes that violate the rule.
 */
export function findPublicFreeTextViolations(
  fieldsBySmartType: Array<{ fieldCode: string; type: SmartFieldType; lookupHydrated: boolean; value: any }>,
  channel: FormChannel,
): string[] {
  if (channel !== 'PUBLIC') return [];
  const violations: string[] = [];
  for (const f of fieldsBySmartType) {
    const d = getSmartFieldDescriptor(f.type);
    if (!d.publicFreeTextForbidden) continue;
    if (f.lookupHydrated) continue;
    if (f.value === undefined || f.value === null || f.value === '') continue;
    violations.push(f.fieldCode);
  }
  return violations;
}

/**
 * Inference helper: map legacy bn_field_metadata field_code → smart field type
 * for the canonical fields already in sectionCatalogue. Returns null if no
 * smart mapping (renderer falls back to the plain field renderer).
 */
export function inferSmartType(fieldCode: string): SmartFieldType | null {
  const c = fieldCode.toLowerCase();
  if (c === 'ssn') return 'SSN_LOOKUP';
  if (c === 'claimant_first_name' || c === 'claimant_last_name') return 'PERSON_READONLY_FIELD';
  if (c === 'employer_regno') return 'EMPLOYER_LOOKUP';
  if (c === 'bank_account' || c === 'bank_routing_number') return 'BANK_ACCOUNT_CAPTURE';
  if (c === 'declaration') return 'DECLARATION_CHECKBOX';
  if (c === 'internal_notes') return 'INTERNAL_NOTES';
  if (c === 'legacy_claim_ref') return 'LEGACY_LOOKUP';
  if (c === 'priority' || c === 'assigned_to') return 'WORKFLOW_ROUTING';
  if (
    c === 'illness_start_date' || c === 'accident_datetime' || c === 'expected_confinement_date' ||
    c === 'actual_confinement_date' || c === 'date_of_death' || c === 'retirement_date' ||
    c === 'incapacity_start_date' || c === 'treatment_start' || c === 'treatment_end' ||
    c === 'last_worked_date'
  ) return 'CLAIM_EVENT_DATE';
  if (c === 'relationship_to_deceased' || c === 'survivor_category') return 'RELATIONSHIP_SELECTOR';
  return null;
}
