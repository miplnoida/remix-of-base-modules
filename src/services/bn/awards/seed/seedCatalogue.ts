/**
 * AW360-WAVE-1 Stage S1 — Benefit catalogue discovery.
 *
 * This module DISCOVERS the canonical benefit-type catalogue that the seed
 * framework will cover. It does NOT introduce a second, hand-maintained
 * benefit-type list — the shape is derived from the enabled configured
 * benefit programmes already declared in the application (see
 * `src/types/newBenefit.ts` — `BenefitType`). Additional configuration is
 * expected to arrive via the live `bn_product` catalogue at run time; the
 * discovery function accepts an optional live-catalogue overlay so callers
 * can substitute the DB-driven list once available.
 *
 * The discovery report intentionally lives in TypeScript so the framework
 * can run in tests without touching Lovable Cloud.
 */

import type { BenefitType } from '@/types/newBenefit';

export type BenefitClassification = 'SHORT_TERM' | 'LONG_TERM';
export type PaymentType = 'LUMP_SUM' | 'PENSION' | 'PERIODIC' | 'REIMBURSEMENT';
export type PaymentFrequency = 'ONE_TIME' | 'WEEKLY' | 'MONTHLY';
export type ContributionConditionType =
  | 'NONE'
  | 'CONTRIBUTION_WEEKS'
  | 'CONTRIBUTIONS_IN_PRECEDING_PERIOD'
  | 'AGE_ONLY'
  | 'MEANS_TESTED';

export interface BenefitCatalogueEntry {
  readonly code: BenefitType;
  readonly name: string;
  readonly classification: BenefitClassification;
  readonly claimantType: 'INSURED' | 'DEPENDANT' | 'SURVIVOR' | 'CLAIMANT';
  readonly eligibleContributorClasses: readonly ('EMPLOYEE' | 'SELF_EMPLOYED' | 'VOLUNTARY' | 'NON_CONTRIBUTORY')[];
  readonly contributionCondition: ContributionConditionType;
  readonly requiresMedicalAssessment: boolean;
  readonly requiresDependants: boolean;
  readonly paymentType: PaymentType;
  readonly paymentFrequency: PaymentFrequency;
  readonly requiresLifeCertificate: boolean;
  readonly requiresPeriodicReview: boolean;
  readonly supportsSuspension: boolean;
  readonly supportsResumption: boolean;
  readonly supportsCessation: boolean;
  readonly requiredDocuments: readonly string[];
  readonly calculationMethod:
    | 'FIXED'
    | 'AVERAGE_INSURABLE_EARNINGS'
    | 'FLAT_RATE'
    | 'FUNERAL_GRANT_SCHEDULE'
    | 'DEPENDANT_PRO_RATA'
    | 'REIMBURSEMENT_LIMITS';
  readonly active: boolean;
}

/**
 * The canonical enabled catalogue. Keeping this derived from the shared
 * `BenefitType` union guarantees a compile-time error if the union ever
 * drifts from the seed coverage matrix.
 */
export const CANONICAL_BENEFIT_CATALOGUE: readonly BenefitCatalogueEntry[] = [
  {
    code: 'SICKNESS',
    name: 'Sickness Benefit',
    classification: 'SHORT_TERM',
    claimantType: 'INSURED',
    eligibleContributorClasses: ['EMPLOYEE', 'SELF_EMPLOYED'],
    contributionCondition: 'CONTRIBUTIONS_IN_PRECEDING_PERIOD',
    requiresMedicalAssessment: true,
    requiresDependants: false,
    paymentType: 'PERIODIC',
    paymentFrequency: 'WEEKLY',
    requiresLifeCertificate: false,
    requiresPeriodicReview: true,
    supportsSuspension: true,
    supportsResumption: true,
    supportsCessation: true,
    requiredDocuments: ['MEDICAL_CERTIFICATE', 'EMPLOYER_STATEMENT'],
    calculationMethod: 'AVERAGE_INSURABLE_EARNINGS',
    active: true,
  },
  {
    code: 'MATERNITY',
    name: 'Maternity Allowance & Grant',
    classification: 'SHORT_TERM',
    claimantType: 'INSURED',
    eligibleContributorClasses: ['EMPLOYEE', 'SELF_EMPLOYED'],
    contributionCondition: 'CONTRIBUTIONS_IN_PRECEDING_PERIOD',
    requiresMedicalAssessment: true,
    requiresDependants: false,
    paymentType: 'PERIODIC',
    paymentFrequency: 'WEEKLY',
    requiresLifeCertificate: false,
    requiresPeriodicReview: false,
    supportsSuspension: true,
    supportsResumption: true,
    supportsCessation: true,
    requiredDocuments: ['MEDICAL_PROOF_OF_PREGNANCY', 'BIRTH_CERTIFICATE'],
    calculationMethod: 'AVERAGE_INSURABLE_EARNINGS',
    active: true,
  },
  {
    code: 'EMPLOYMENT_INJURY',
    name: 'Employment Injury Benefit',
    classification: 'SHORT_TERM',
    claimantType: 'INSURED',
    eligibleContributorClasses: ['EMPLOYEE'],
    contributionCondition: 'NONE',
    requiresMedicalAssessment: true,
    requiresDependants: false,
    paymentType: 'PERIODIC',
    paymentFrequency: 'WEEKLY',
    requiresLifeCertificate: false,
    requiresPeriodicReview: true,
    supportsSuspension: true,
    supportsResumption: true,
    supportsCessation: true,
    requiredDocuments: ['INCIDENT_REPORT', 'MEDICAL_CERTIFICATE', 'EMPLOYER_REPORT'],
    calculationMethod: 'AVERAGE_INSURABLE_EARNINGS',
    active: true,
  },
  {
    code: 'FUNERAL_GRANT',
    name: 'Funeral Grant',
    classification: 'SHORT_TERM',
    claimantType: 'CLAIMANT',
    eligibleContributorClasses: ['EMPLOYEE', 'SELF_EMPLOYED', 'VOLUNTARY'],
    contributionCondition: 'CONTRIBUTION_WEEKS',
    requiresMedicalAssessment: false,
    requiresDependants: false,
    paymentType: 'LUMP_SUM',
    paymentFrequency: 'ONE_TIME',
    requiresLifeCertificate: false,
    requiresPeriodicReview: false,
    supportsSuspension: false,
    supportsResumption: false,
    supportsCessation: true,
    requiredDocuments: ['DEATH_CERTIFICATE', 'FUNERAL_INVOICE', 'RELATIONSHIP_PROOF'],
    calculationMethod: 'FUNERAL_GRANT_SCHEDULE',
    active: true,
  },
  {
    code: 'AGE_PENSION',
    name: 'Age Pension',
    classification: 'LONG_TERM',
    claimantType: 'INSURED',
    eligibleContributorClasses: ['EMPLOYEE', 'SELF_EMPLOYED', 'VOLUNTARY'],
    contributionCondition: 'CONTRIBUTION_WEEKS',
    requiresMedicalAssessment: false,
    requiresDependants: false,
    paymentType: 'PENSION',
    paymentFrequency: 'MONTHLY',
    requiresLifeCertificate: true,
    requiresPeriodicReview: false,
    supportsSuspension: true,
    supportsResumption: true,
    supportsCessation: true,
    requiredDocuments: ['BIRTH_CERTIFICATE', 'BANK_DETAILS'],
    calculationMethod: 'AVERAGE_INSURABLE_EARNINGS',
    active: true,
  },
  {
    code: 'AGE_GRANT',
    name: 'Age Grant',
    classification: 'LONG_TERM',
    claimantType: 'INSURED',
    eligibleContributorClasses: ['EMPLOYEE', 'SELF_EMPLOYED', 'VOLUNTARY'],
    contributionCondition: 'CONTRIBUTION_WEEKS',
    requiresMedicalAssessment: false,
    requiresDependants: false,
    paymentType: 'LUMP_SUM',
    paymentFrequency: 'ONE_TIME',
    requiresLifeCertificate: false,
    requiresPeriodicReview: false,
    supportsSuspension: false,
    supportsResumption: false,
    supportsCessation: true,
    requiredDocuments: ['BIRTH_CERTIFICATE'],
    calculationMethod: 'AVERAGE_INSURABLE_EARNINGS',
    active: true,
  },
  {
    code: 'INVALIDITY',
    name: 'Invalidity Benefit',
    classification: 'LONG_TERM',
    claimantType: 'INSURED',
    eligibleContributorClasses: ['EMPLOYEE', 'SELF_EMPLOYED'],
    contributionCondition: 'CONTRIBUTION_WEEKS',
    requiresMedicalAssessment: true,
    requiresDependants: false,
    paymentType: 'PENSION',
    paymentFrequency: 'MONTHLY',
    requiresLifeCertificate: true,
    requiresPeriodicReview: true,
    supportsSuspension: true,
    supportsResumption: true,
    supportsCessation: true,
    requiredDocuments: ['MEDICAL_BOARD_CERTIFICATE', 'DOCTOR_REPORT', 'BIRTH_CERTIFICATE'],
    calculationMethod: 'AVERAGE_INSURABLE_EARNINGS',
    active: true,
  },
  {
    code: 'SURVIVORS_PENSION',
    name: 'Survivors Pension',
    classification: 'LONG_TERM',
    claimantType: 'SURVIVOR',
    eligibleContributorClasses: ['EMPLOYEE', 'SELF_EMPLOYED', 'VOLUNTARY'],
    contributionCondition: 'CONTRIBUTION_WEEKS',
    requiresMedicalAssessment: false,
    requiresDependants: true,
    paymentType: 'PENSION',
    paymentFrequency: 'MONTHLY',
    requiresLifeCertificate: true,
    requiresPeriodicReview: true,
    supportsSuspension: true,
    supportsResumption: true,
    supportsCessation: true,
    requiredDocuments: [
      'DEATH_CERTIFICATE',
      'MARRIAGE_CERTIFICATE',
      'DEPENDANT_BIRTH_CERTIFICATES',
    ],
    calculationMethod: 'DEPENDANT_PRO_RATA',
    active: true,
  },
  {
    code: 'SURVIVORS_GRANT',
    name: 'Survivors Grant',
    classification: 'LONG_TERM',
    claimantType: 'SURVIVOR',
    eligibleContributorClasses: ['EMPLOYEE', 'SELF_EMPLOYED', 'VOLUNTARY'],
    contributionCondition: 'CONTRIBUTION_WEEKS',
    requiresMedicalAssessment: false,
    requiresDependants: true,
    paymentType: 'LUMP_SUM',
    paymentFrequency: 'ONE_TIME',
    requiresLifeCertificate: false,
    requiresPeriodicReview: false,
    supportsSuspension: false,
    supportsResumption: false,
    supportsCessation: true,
    requiredDocuments: ['DEATH_CERTIFICATE', 'RELATIONSHIP_PROOF'],
    calculationMethod: 'AVERAGE_INSURABLE_EARNINGS',
    active: true,
  },
  {
    code: 'NON_CONTRIBUTORY_PENSION',
    name: 'Non-Contributory (Assistance) Pension',
    classification: 'LONG_TERM',
    claimantType: 'INSURED',
    eligibleContributorClasses: ['NON_CONTRIBUTORY'],
    contributionCondition: 'MEANS_TESTED',
    requiresMedicalAssessment: false,
    requiresDependants: false,
    paymentType: 'PENSION',
    paymentFrequency: 'MONTHLY',
    requiresLifeCertificate: true,
    requiresPeriodicReview: true,
    supportsSuspension: true,
    supportsResumption: true,
    supportsCessation: true,
    requiredDocuments: ['BIRTH_CERTIFICATE', 'PROOF_OF_INCOME', 'PROOF_OF_RESIDENCE'],
    calculationMethod: 'FLAT_RATE',
    active: true,
  },
];

export interface BenefitDiscoveryReport {
  readonly asOfDate: string;
  readonly totalDiscovered: number;
  readonly totalActive: number;
  readonly entries: readonly BenefitCatalogueEntry[];
  readonly unseededActive: readonly BenefitType[];
  readonly incompleteConfiguration: readonly BenefitType[];
}

export interface DiscoveryOptions {
  readonly asOfDate: string;
  readonly overlay?: readonly BenefitCatalogueEntry[];
  readonly scenarioKeysByBenefit?: Record<string, readonly string[]>;
}

/**
 * Discover the enabled benefit catalogue. `overlay` may replace or extend
 * the canonical list once a live `bn_product` query is wired in.
 */
export function discoverBenefitCatalogue(opts: DiscoveryOptions): BenefitDiscoveryReport {
  const merged = new Map<BenefitType, BenefitCatalogueEntry>();
  for (const e of CANONICAL_BENEFIT_CATALOGUE) merged.set(e.code, e);
  for (const e of opts.overlay ?? []) merged.set(e.code, e);

  const entries = [...merged.values()];
  const active = entries.filter((e) => e.active);
  const seededMap = opts.scenarioKeysByBenefit ?? {};
  const unseeded = active
    .filter((e) => !(seededMap[e.code] && seededMap[e.code].length > 0))
    .map((e) => e.code);

  // "Incomplete configuration" = active but missing required documents / calc method.
  const incomplete = active
    .filter((e) => e.requiredDocuments.length === 0 || !e.calculationMethod)
    .map((e) => e.code);

  return {
    asOfDate: opts.asOfDate,
    totalDiscovered: entries.length,
    totalActive: active.length,
    entries,
    unseededActive: unseeded,
    incompleteConfiguration: incomplete,
  };
}
