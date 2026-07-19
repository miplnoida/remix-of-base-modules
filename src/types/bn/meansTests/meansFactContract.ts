/**
 * BN Means-Test — Canonical eligibility fact contract.
 *
 * Slice 1 of the Means-Test Assessment epic.
 *
 * The Means-Test module does NOT operate a second eligibility engine.
 * Approved assessments publish these canonical facts into the existing
 * Benefits eligibility engine. The engine consumes them via a resolver
 * (Slice 3) that refuses to treat any expired or unapproved assessment
 * as `passed`.
 */

import {
  BN_MEANS_FACT_PUBLISHABLE_STATES,
  type BnMeansAssessmentStatus,
  type BnMeansResult,
} from './meansStateMachine';

/** Canonical means-test fact keys published to the eligibility engine. */
export const BN_MEANS_FACT_KEYS = [
  'means.assessment_id',
  'means.assessment_status',
  'means.policy_version',
  'means.assessable_income',
  'means.assessable_assets',
  'means.household_size',
  'means.threshold',
  'means.excess_amount',
  'means.passed',
  'means.valid_until',
  'means.reassessment_due',
] as const;

export type BnMeansFactKey = (typeof BN_MEANS_FACT_KEYS)[number];

/** The immutable payload published as an eligibility fact bundle. */
export interface BnMeansFactBundle {
  readonly 'means.assessment_id': string;
  readonly 'means.assessment_status': BnMeansAssessmentStatus;
  readonly 'means.policy_version': string;
  readonly 'means.assessable_income': number;
  readonly 'means.assessable_assets': number;
  readonly 'means.household_size': number;
  readonly 'means.threshold': number;
  readonly 'means.excess_amount': number;
  readonly 'means.passed': boolean;
  readonly 'means.valid_until': string; // ISO date
  readonly 'means.reassessment_due': string | null; // ISO date or null
}

/** Reason codes returned when the resolver refuses to publish a fact. */
export type BnMeansFactRefusalReason =
  | 'NO_APPROVED_ASSESSMENT'
  | 'ASSESSMENT_EXPIRED'
  | 'ASSESSMENT_STATUS_INVALID'
  | 'POLICY_VERSION_RETIRED'
  | 'RESULT_NOT_PASS';

export interface BnMeansFactResolution {
  readonly published: boolean;
  readonly bundle?: BnMeansFactBundle;
  readonly refusalReason?: BnMeansFactRefusalReason;
  readonly diagnostic?: string;
}

export interface BnMeansFactInputs {
  readonly assessmentId: string;
  readonly status: BnMeansAssessmentStatus;
  readonly result: BnMeansResult;
  readonly policyVersion: string;
  readonly assessableIncome: number;
  readonly assessableAssets: number;
  readonly householdSize: number;
  readonly threshold: number;
  readonly excessAmount: number;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly reassessmentDue: string | null;
  /** Current wall-clock ISO date (injected for determinism in tests). */
  readonly asOf: string;
  /** Optional flag set to true if the policy version is retired. */
  readonly policyVersionRetired?: boolean;
}

/**
 * Pure resolver — decides whether a candidate assessment may be published
 * as an eligibility fact and returns the bundle when it may. The
 * eligibility engine must reuse this function; it MUST refuse anything
 * that is not simultaneously ACTIVE (or REASSESSMENT_DUE) AND unexpired.
 */
export function resolveMeansFacts(input: BnMeansFactInputs): BnMeansFactResolution {
  if (!BN_MEANS_FACT_PUBLISHABLE_STATES.includes(input.status)) {
    return {
      published: false,
      refusalReason: 'ASSESSMENT_STATUS_INVALID',
      diagnostic: `status=${input.status} is not fact-publishable`,
    };
  }
  if (input.policyVersionRetired === true) {
    return {
      published: false,
      refusalReason: 'POLICY_VERSION_RETIRED',
      diagnostic: `policy_version=${input.policyVersion} is retired`,
    };
  }
  if (input.result !== 'PASS') {
    return {
      published: false,
      refusalReason: 'RESULT_NOT_PASS',
      diagnostic: `result=${input.result}`,
    };
  }
  if (input.validUntil < input.asOf) {
    return {
      published: false,
      refusalReason: 'ASSESSMENT_EXPIRED',
      diagnostic: `valid_until=${input.validUntil} < asOf=${input.asOf}`,
    };
  }
  const bundle: BnMeansFactBundle = {
    'means.assessment_id':     input.assessmentId,
    'means.assessment_status': input.status,
    'means.policy_version':    input.policyVersion,
    'means.assessable_income': input.assessableIncome,
    'means.assessable_assets': input.assessableAssets,
    'means.household_size':    input.householdSize,
    'means.threshold':         input.threshold,
    'means.excess_amount':     input.excessAmount,
    'means.passed':            true,
    'means.valid_until':       input.validUntil,
    'means.reassessment_due':  input.reassessmentDue,
  };
  return { published: true, bundle };
}

/**
 * The placeholder key that Slice 5 will DELETE from the eligibility engine.
 * Kept here so contract tests can guard against re-introduction.
 */
export const LEGACY_MEANS_PLACEHOLDER_FACT = 'MEANS_TEST_PASSED' as const;
