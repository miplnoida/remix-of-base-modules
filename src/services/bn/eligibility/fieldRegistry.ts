/**
 * BN Eligibility Field Registry
 *
 * Controlled catalogue of business-safe field keys used by the eligibility
 * rule builder and the calculation engine. Free-text table/column names are
 * NOT permitted — every rule must reference one of these keys so that the
 * engine can resolve the actual value through the correct adapter.
 */

export type EligibilityValueType = 'number' | 'string' | 'boolean' | 'date';
export type EligibilityOperator =
  | '>='
  | '>'
  | '<='
  | '<'
  | '=='
  | '!='
  | 'IN'
  | 'BETWEEN';

export type EligibilityCategory =
  | 'CONTRIBUTION'
  | 'PERSON'
  | 'EMPLOYER'
  | 'EVIDENCE'
  | 'CLAIM';

export type EligibilityWindowType =
  | 'LIFETIME'
  | 'LAST_52_WEEKS'
  | 'LAST_3_YEARS'
  | 'CUSTOM_DATE_RANGE'
  | 'NONE';

export interface EligibilityFieldDef {
  /** Stable key persisted into bn_eligibility_rule.rule_definition.field_key */
  key: string;
  label: string;
  category: EligibilityCategory;
  /** Human-readable description of where the value comes from. */
  dataSource: string;
  valueType: EligibilityValueType;
  operators: EligibilityOperator[];
  /** Internal resolver discriminator — engine maps this to adapter call. */
  resolver:
    | 'contribution.totalWeeks'
    | 'contribution.totalWages'
    | 'contribution.avgWeeklyWage'
    | 'person.ageAtClaim'
    | 'person.status'
    | 'person.deceased'
    | 'employer.status'
    | 'evidence.requiredDocsComplete'
    | 'evidence.documentVerified'
    | 'claim.hasDuplicateActiveClaim'
    | 'claim.claimDate'
    | 'claim.benefitType'
    | 'participant.deceasedRelationship';
  /** Whether a contribution window selector should be exposed on the rule. */
  supportsWindow?: boolean;
  /** Whether a document_type_code selector should be exposed. */
  supportsDocumentType?: boolean;
  helpText: string;
}

export const ELIGIBILITY_FIELD_REGISTRY: EligibilityFieldDef[] = [
  {
    key: 'contribution.total_weeks',
    label: 'Total contribution weeks',
    category: 'CONTRIBUTION',
    dataSource: 'ip_wages via bn_get_contribution_summary RPC',
    valueType: 'number',
    operators: ['>=', '>', '<=', '<', '==', '!=', 'BETWEEN'],
    resolver: 'contribution.totalWeeks',
    supportsWindow: true,
    helpText: 'Number of qualifying contribution weeks within the chosen window.',
  },
  {
    key: 'contribution.total_wages',
    label: 'Total wages',
    category: 'CONTRIBUTION',
    dataSource: 'ip_wages via bn_get_contribution_summary RPC',
    valueType: 'number',
    operators: ['>=', '>', '<=', '<', '==', '!=', 'BETWEEN'],
    resolver: 'contribution.totalWages',
    supportsWindow: true,
    helpText: 'Sum of insurable wages within the chosen window.',
  },
  {
    key: 'contribution.avg_weekly_wage',
    label: 'Average weekly wage',
    category: 'CONTRIBUTION',
    dataSource: 'ip_wages via bn_get_contribution_summary RPC',
    valueType: 'number',
    operators: ['>=', '>', '<=', '<', '==', '!=', 'BETWEEN'],
    resolver: 'contribution.avgWeeklyWage',
    supportsWindow: true,
    helpText: 'Average insurable weekly wage within the chosen window.',
  },
  {
    key: 'person.age_at_claim_date',
    label: 'Age at claim date',
    category: 'PERSON',
    dataSource: 'ip_master.dob (via personAdapter)',
    valueType: 'number',
    operators: ['>=', '>', '<=', '<', '==', '!=', 'BETWEEN'],
    resolver: 'person.ageAtClaim',
    helpText: 'Computed from the person\'s DOB and the claim date.',
  },
  {
    key: 'person.status',
    label: 'Person status',
    category: 'PERSON',
    dataSource: 'ip_master.status (via personAdapter)',
    valueType: 'string',
    operators: ['==', '!=', 'IN'],
    resolver: 'person.status',
    helpText: 'Normalised status: active | suspended | deceased | pending.',
  },
  {
    key: 'person.deceased',
    label: 'Person deceased flag',
    category: 'PERSON',
    dataSource: 'ip_master.status (via personAdapter)',
    valueType: 'boolean',
    operators: ['==', '!='],
    resolver: 'person.deceased',
    helpText: 'True when the person\'s normalised status is "deceased".',
  },
  {
    key: 'employer.status',
    label: 'Employer status',
    category: 'EMPLOYER',
    dataSource: 'er_master.status (via employerAdapter)',
    valueType: 'string',
    operators: ['==', '!=', 'IN'],
    resolver: 'employer.status',
    helpText: 'Status of the claim\'s primary employer.',
  },
  {
    key: 'evidence.required_docs_complete',
    label: 'Required documents complete',
    category: 'EVIDENCE',
    dataSource: 'bn_evidence_checklist via evidenceService',
    valueType: 'boolean',
    operators: ['==', '!='],
    resolver: 'evidence.requiredDocsComplete',
    helpText: 'True when all blocking checklist items are fulfilled.',
  },
  {
    key: 'evidence.document_verified',
    label: 'Document verified',
    category: 'EVIDENCE',
    dataSource: 'bn_claim_evidence.status',
    valueType: 'boolean',
    operators: ['==', '!='],
    resolver: 'evidence.documentVerified',
    supportsDocumentType: true,
    helpText: 'True when a verified evidence row exists for the chosen document type.',
  },
  {
    key: 'claim.has_duplicate_active_claim',
    label: 'Has duplicate active claim',
    category: 'CLAIM',
    dataSource: 'bn_claim + legacy cl_head (via historicalInquiryAdapter)',
    valueType: 'boolean',
    operators: ['==', '!='],
    resolver: 'claim.hasDuplicateActiveClaim',
    helpText: 'True when an active claim for the same person/benefit already exists in BN or legacy.',
  },
  {
    key: 'claim.claim_date',
    label: 'Claim date',
    category: 'CLAIM',
    dataSource: 'Calculation engine input',
    valueType: 'date',
    operators: ['>=', '>', '<=', '<', '==', '!=', 'BETWEEN'],
    resolver: 'claim.claimDate',
    helpText: 'The claim/effective date passed into the engine.',
  },
  {
    key: 'claim.benefit_type',
    label: 'Benefit type',
    category: 'CLAIM',
    dataSource: 'Calculation engine input',
    valueType: 'string',
    operators: ['==', '!=', 'IN'],
    resolver: 'claim.benefitType',
    helpText: 'Benefit type code from the claim being evaluated.',
  },
  {
    key: 'participant.deceased_relationship',
    label: 'Deceased — relationship to insured',
    category: 'CLAIM',
    dataSource: 'bn_claim_participant.relationship_to_insured (DECEASED_INSURED_PERSON)',
    valueType: 'string',
    operators: ['==', '!=', 'IN'],
    resolver: 'participant.deceasedRelationship',
    helpText: 'Relationship of the deceased participant to the insured person (e.g. INSURED, SPOUSE, DEPENDENT_CHILD).',
  },
];


export function getFieldDef(key: string | undefined | null): EligibilityFieldDef | undefined {
  if (!key) return undefined;
  return ELIGIBILITY_FIELD_REGISTRY.find((f) => f.key === key);
}

export const ELIGIBILITY_WINDOW_OPTIONS: { value: EligibilityWindowType; label: string }[] = [
  { value: 'LIFETIME', label: 'Lifetime' },
  { value: 'LAST_52_WEEKS', label: 'Last 52 weeks' },
  { value: 'LAST_3_YEARS', label: 'Last 3 years' },
  { value: 'CUSTOM_DATE_RANGE', label: 'Custom date range' },
];

export const ELIGIBILITY_OPERATOR_LABELS: Record<EligibilityOperator, string> = {
  '>=': '≥ (at least)',
  '>': '> (greater than)',
  '<=': '≤ (at most)',
  '<': '< (less than)',
  '==': '= (equals)',
  '!=': '≠ (not equal)',
  IN: 'IN (one of)',
  BETWEEN: 'BETWEEN',
};
