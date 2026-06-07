/**
 * Eligibility Fact Registry — the single source of truth for facts the rule
 * engine and rule builder UI can reference.
 *
 * Every fact maps to:
 *   • A real source table/column in the BN platform (audit trail / explainability)
 *   • A resolver function name (registered in `eligibilityFactResolver.ts`)
 *   • The data type + allowed operators (drives the UI dropdowns)
 *   • The products it applies to (`['*']` = all products)
 *
 * Free-text facts are not permitted. The product activation validator rejects
 * any rule whose `fact_key` is not in this registry.
 */

import type {
  EligibilityDataType,
  EligibilityOperator,
} from './operators';

export type EligibilityCategory =
  | 'PERSON'
  | 'CONTRIBUTION'
  | 'EMPLOYER'
  | 'CLAIM_EVENT'
  | 'MEDICAL'
  | 'DOCUMENTS'
  | 'EXISTING_BENEFITS'
  | 'PAYMENT_AWARD'
  | 'SPECIAL';

export interface EligibilityFact {
  fact_key: string;
  label: string;
  category: EligibilityCategory;
  description: string;
  /** Primary source table for traceability (shown in rule preview). */
  source_table: string;
  /** Primary source column. Use `*` when the value is derived. */
  source_column: string;
  /** Name of the resolver function in `eligibilityFactResolver.ts`. */
  resolver_function: string;
  data_type: EligibilityDataType;
  allowed_operators: EligibilityOperator[];
  /** For enum/bool facts — list of legal expected values. */
  allowed_values?: Array<string | number | boolean>;
  /** Benefit codes this fact applies to. `['*']` = all. */
  applicable_products: string[];
  /** Example used in rule preview. */
  example_value: string | number | boolean;
}

export const CATEGORY_LABELS: Record<EligibilityCategory, string> = {
  PERSON: 'Person',
  CONTRIBUTION: 'Contribution',
  EMPLOYER: 'Employer',
  CLAIM_EVENT: 'Claim Event',
  MEDICAL: 'Medical',
  DOCUMENTS: 'Documents',
  EXISTING_BENEFITS: 'Existing Benefits',
  PAYMENT_AWARD: 'Payment / Award',
  SPECIAL: 'Special',
};

const ALL: string[] = ['*'];

export const ELIGIBILITY_FACTS: EligibilityFact[] = [
  // ───────────────────── Person ─────────────────────
  {
    fact_key: 'person.age_at_claim_date',
    label: 'Age at claim date',
    category: 'PERSON',
    description: 'Claimant age in completed years on the claim date.',
    source_table: 'ip_master',
    source_column: 'date_of_birth',
    resolver_function: 'resolvePersonAge',
    data_type: 'number',
    allowed_operators: ['>=', '<=', '=', '!=', 'between'],
    applicable_products: ALL,
    example_value: 62,
  },
  {
    fact_key: 'person.gender',
    label: 'Gender',
    category: 'PERSON',
    description: 'Stored gender of the claimant (M / F / N).',
    source_table: 'ip_master',
    source_column: 'gender',
    resolver_function: 'resolvePersonGender',
    data_type: 'enum',
    allowed_operators: ['=', '!=', 'in'],
    allowed_values: ['M', 'F', 'N'],
    applicable_products: ALL,
    example_value: 'F',
  },
  {
    fact_key: 'person.alive_status',
    label: 'Alive / deceased status',
    category: 'PERSON',
    description: 'Whether the contributor is alive or deceased.',
    source_table: 'ip_master',
    source_column: 'status',
    resolver_function: 'resolvePersonAlive',
    data_type: 'enum',
    allowed_operators: ['=', '!=', 'in'],
    allowed_values: ['ALIVE', 'DECEASED'],
    applicable_products: ALL,
    example_value: 'DECEASED',
  },

  // ───────────────── Contribution ─────────────────
  {
    fact_key: 'contribution.total_weeks',
    label: 'Total contribution weeks',
    category: 'CONTRIBUTION',
    description: 'Paid + credited weeks across the claimant history.',
    source_table: 'bn_claim_contribution_snapshot / ip_wages',
    source_column: 'total_weeks',
    resolver_function: 'resolveContribTotalWeeks',
    data_type: 'number',
    allowed_operators: ['>=', '<=', '=', '!=', 'between'],
    applicable_products: ALL,
    example_value: 500,
  },
  {
    fact_key: 'contribution.paid_weeks',
    label: 'Paid contribution weeks',
    category: 'CONTRIBUTION',
    description: 'Weeks with actually paid contributions.',
    source_table: 'bn_claim_contribution_snapshot / ip_wages',
    source_column: 'paid_weeks',
    resolver_function: 'resolveContribPaidWeeks',
    data_type: 'number',
    allowed_operators: ['>=', '<=', '=', '!=', 'between'],
    applicable_products: ALL,
    example_value: 150,
  },
  {
    fact_key: 'contribution.recent_weeks',
    label: 'Recent contribution weeks',
    category: 'CONTRIBUTION',
    description: 'Weeks in the most recent qualifying window (e.g. last 13 weeks).',
    source_table: 'bn_claim_contribution_snapshot / ip_wages',
    source_column: 'recent_weeks',
    resolver_function: 'resolveContribRecentWeeks',
    data_type: 'number',
    allowed_operators: ['>=', '<=', '=', '!=', 'between'],
    applicable_products: ALL,
    example_value: 8,
  },
  {
    fact_key: 'contribution.average_weekly_wage',
    label: 'Average weekly wage',
    category: 'CONTRIBUTION',
    description: 'Average weekly insurable wage used for benefit calculation.',
    source_table: 'bn_claim_contribution_snapshot',
    source_column: 'average_weekly_wage',
    resolver_function: 'resolveContribAvgWage',
    data_type: 'number',
    allowed_operators: ['>=', '<=', '=', '!=', 'between'],
    applicable_products: ALL,
    example_value: 500,
  },
  {
    fact_key: 'contribution.last_contribution_date',
    label: 'Last contribution date',
    category: 'CONTRIBUTION',
    description: 'Most recent week for which a contribution exists.',
    source_table: 'ip_wages',
    source_column: 'week_end_date',
    resolver_function: 'resolveContribLastDate',
    data_type: 'date',
    allowed_operators: ['>=', '<=', '=', '!=', 'exists', 'between'],
    applicable_products: ALL,
    example_value: '2026-01-01',
  },

  // ───────────────────── Employer ─────────────────
  {
    fact_key: 'employer.exists',
    label: 'Employer on record',
    category: 'EMPLOYER',
    description: 'Whether the claimant has an employer registered.',
    source_table: 'er_master',
    source_column: '*',
    resolver_function: 'resolveEmployerExists',
    data_type: 'bool',
    allowed_operators: ['=', 'exists'],
    allowed_values: [true, false],
    applicable_products: ALL,
    example_value: true,
  },
  {
    fact_key: 'employer.status',
    label: 'Employer status',
    category: 'EMPLOYER',
    description: 'Current employer status (Active / Ceased / Pending).',
    source_table: 'er_master',
    source_column: 'status',
    resolver_function: 'resolveEmployerStatus',
    data_type: 'enum',
    allowed_operators: ['=', '!=', 'in'],
    allowed_values: ['ACTIVE', 'CEASED', 'PENDING'],
    applicable_products: ALL,
    example_value: 'ACTIVE',
  },
  {
    fact_key: 'employer.active_on_injury_date',
    label: 'Employer active on injury date',
    category: 'EMPLOYER',
    description: 'Whether the employer was active on the claim injury date.',
    source_table: 'er_master + bn_claim',
    source_column: '*',
    resolver_function: 'resolveEmployerActiveOnInjuryDate',
    data_type: 'bool',
    allowed_operators: ['=', 'exists'],
    allowed_values: [true, false],
    applicable_products: ['SKN-EI', 'SKN-EI-DIS', 'SKN-EI-MED'],
    example_value: true,
  },

  // ─────────────────── Claim Event ────────────────
  {
    fact_key: 'claim.injury_date',
    label: 'Injury date',
    category: 'CLAIM_EVENT',
    description: 'Date of the workplace injury.',
    source_table: 'bn_claim',
    source_column: 'event_date',
    resolver_function: 'resolveClaimInjuryDate',
    data_type: 'date',
    allowed_operators: ['exists', '>=', '<=', 'between'],
    applicable_products: ['SKN-EI', 'SKN-EI-DIS', 'SKN-EI-MED'],
    example_value: '2026-01-15',
  },
  {
    fact_key: 'claim.submission_date',
    label: 'Submission date',
    category: 'CLAIM_EVENT',
    description: 'When the application was submitted.',
    source_table: 'bn_claim',
    source_column: 'created_at',
    resolver_function: 'resolveClaimSubmissionDate',
    data_type: 'date',
    allowed_operators: ['exists', '>=', '<=', 'between'],
    applicable_products: ALL,
    example_value: '2026-02-01',
  },
  {
    fact_key: 'claim.days_since_event',
    label: 'Days since event',
    category: 'CLAIM_EVENT',
    description: 'Days between the claim event date and submission date.',
    source_table: 'bn_claim (derived)',
    source_column: '*',
    resolver_function: 'resolveClaimDaysSinceEvent',
    data_type: 'number',
    allowed_operators: ['>=', '<=', '=', 'between'],
    applicable_products: ALL,
    example_value: 90,
  },
  {
    fact_key: 'claim.application_channel',
    label: 'Application channel',
    category: 'CLAIM_EVENT',
    description: 'Channel the application was received through.',
    source_table: 'bn_claim_application',
    source_column: 'application_channel',
    resolver_function: 'resolveClaimChannel',
    data_type: 'enum',
    allowed_operators: ['=', '!=', 'in'],
    allowed_values: ['PUBLIC_ONLINE', 'STAFF_OFFLINE', 'ASSISTED_COUNTER', 'CLAIMANT_PORTAL'],
    applicable_products: ALL,
    example_value: 'STAFF_OFFLINE',
  },

  // ─────────────────── Documents ──────────────────
  {
    fact_key: 'document.medical_certificate_received',
    label: 'Medical certificate received',
    category: 'DOCUMENTS',
    description: 'Whether a medical certificate document is attached to the claim.',
    source_table: 'bn_claim_document',
    source_column: 'document_type_code',
    resolver_function: 'resolveDocMedicalCert',
    data_type: 'bool',
    allowed_operators: ['=', 'exists'],
    allowed_values: [true, false],
    applicable_products: ALL,
    example_value: true,
  },
  {
    fact_key: 'document.death_certificate_received',
    label: 'Death certificate received',
    category: 'DOCUMENTS',
    description: 'Whether a death certificate is attached.',
    source_table: 'bn_claim_document',
    source_column: 'document_type_code',
    resolver_function: 'resolveDocDeathCert',
    data_type: 'bool',
    allowed_operators: ['=', 'exists'],
    allowed_values: [true, false],
    applicable_products: ['SKN-FUN', 'SKN-SURV'],
    example_value: true,
  },
  {
    fact_key: 'document.birth_certificate_received',
    label: 'Birth certificate received',
    category: 'DOCUMENTS',
    description: 'Whether a birth certificate is attached.',
    source_table: 'bn_claim_document',
    source_column: 'document_type_code',
    resolver_function: 'resolveDocBirthCert',
    data_type: 'bool',
    allowed_operators: ['=', 'exists'],
    allowed_values: [true, false],
    applicable_products: ALL,
    example_value: true,
  },
  {
    fact_key: 'document.employer_report_received',
    label: 'Employer report received',
    category: 'DOCUMENTS',
    description: 'Whether the employer accident report is attached.',
    source_table: 'bn_claim_document',
    source_column: 'document_type_code',
    resolver_function: 'resolveDocEmployerReport',
    data_type: 'bool',
    allowed_operators: ['=', 'exists'],
    allowed_values: [true, false],
    applicable_products: ['SKN-EI', 'SKN-EI-DIS', 'SKN-EI-MED'],
    example_value: true,
  },

  // ─────────────── Existing Benefits ─────────────
  {
    fact_key: 'existing.active_award',
    label: 'Active award exists',
    category: 'EXISTING_BENEFITS',
    description: 'Whether the claimant has an active award (for life cert / school cert / EFT update flows).',
    source_table: 'bn_award',
    source_column: 'status',
    resolver_function: 'resolveActiveAward',
    data_type: 'bool',
    allowed_operators: ['=', 'exists'],
    allowed_values: [true, false],
    applicable_products: ALL,
    example_value: true,
  },
  {
    fact_key: 'existing.duplicate_claim_same_period',
    label: 'Duplicate claim in same period',
    category: 'EXISTING_BENEFITS',
    description: 'Whether an overlapping claim exists for the same product/period.',
    source_table: 'bn_claim',
    source_column: '*',
    resolver_function: 'resolveDuplicateClaim',
    data_type: 'bool',
    allowed_operators: ['=', 'not_exists'],
    allowed_values: [true, false],
    applicable_products: ALL,
    example_value: false,
  },
  {
    fact_key: 'existing.previous_maternity_claim',
    label: 'Previous maternity claim exists',
    category: 'EXISTING_BENEFITS',
    description: 'Whether a previous maternity claim exists in the look-back window.',
    source_table: 'bn_claim',
    source_column: '*',
    resolver_function: 'resolvePreviousMaternity',
    data_type: 'bool',
    allowed_operators: ['=', 'exists', 'not_exists'],
    allowed_values: [true, false],
    applicable_products: ['SKN-MAT', 'SKN-MAT-GRANT'],
    example_value: false,
  },
];

/** Map for O(1) lookup. */
export const FACT_INDEX: Map<string, EligibilityFact> = new Map(
  ELIGIBILITY_FACTS.map((f) => [f.fact_key, f]),
);

export function getFact(factKey: string): EligibilityFact | undefined {
  return FACT_INDEX.get(factKey);
}

export function factsForCategory(cat: EligibilityCategory): EligibilityFact[] {
  return ELIGIBILITY_FACTS.filter((f) => f.category === cat);
}

export function factsForProduct(productCode: string | null): EligibilityFact[] {
  if (!productCode) return ELIGIBILITY_FACTS;
  return ELIGIBILITY_FACTS.filter(
    (f) => f.applicable_products.includes('*') || f.applicable_products.includes(productCode),
  );
}

/** Rule grouping (separate from category — drives the UI sectioning). */
export type RuleGroupCode =
  | 'CORE_IDENTITY'
  | 'CONTRIBUTION'
  | 'EMPLOYMENT'
  | 'EVENT'
  | 'EVIDENCE'
  | 'EXISTING_BENEFIT'
  | 'SPECIAL';

export const RULE_GROUPS: Array<{ code: RuleGroupCode; label: string; description: string }> = [
  { code: 'CORE_IDENTITY', label: 'Core Identity', description: 'Contributor existence, age, gender, alive/deceased.' },
  { code: 'CONTRIBUTION', label: 'Contribution Conditions', description: 'Paid weeks, credited weeks, recent weeks, average wage.' },
  { code: 'EMPLOYMENT', label: 'Employment Conditions', description: 'Employer existence and active status.' },
  { code: 'EVENT', label: 'Event Conditions', description: 'Injury / sickness / death date and reporting window.' },
  { code: 'EVIDENCE', label: 'Evidence Conditions', description: 'Required documents on the claim.' },
  { code: 'EXISTING_BENEFIT', label: 'Existing Benefit Conditions', description: 'Duplicate prevention, prior-award requirements.' },
  { code: 'SPECIAL', label: 'Special Conditions', description: 'Means tests, student status, guardian/payee, etc.' },
];

/** Default group suggestion for a fact (used by the rule builder). */
export function defaultGroupForFact(factKey: string): RuleGroupCode {
  const fact = getFact(factKey);
  if (!fact) return 'SPECIAL';
  switch (fact.category) {
    case 'PERSON': return 'CORE_IDENTITY';
    case 'CONTRIBUTION': return 'CONTRIBUTION';
    case 'EMPLOYER': return 'EMPLOYMENT';
    case 'CLAIM_EVENT': return 'EVENT';
    case 'MEDICAL':
    case 'DOCUMENTS': return 'EVIDENCE';
    case 'EXISTING_BENEFITS':
    case 'PAYMENT_AWARD': return 'EXISTING_BENEFIT';
    case 'SPECIAL': return 'SPECIAL';
  }
}
