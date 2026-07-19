/**
 * AW360-WAVE-1 Stage S1 — Scenario manifest.
 *
 * The manifest is the SOURCE OF TRUTH for expected outcomes. Business
 * tables must never carry expected results; those live here so integrity
 * validation can compare "what the fixture should imply" against "what
 * the framework generated".
 *
 * Scenarios are produced deterministically from the benefit catalogue and
 * a fixed set of variant matrices (contribution profiles, claim states,
 * award lifecycle states, payment states, pilot-action states).
 */

import type { BenefitType } from '@/types/newBenefit';
import type { BenefitCatalogueEntry } from './seedCatalogue';
import { CANONICAL_BENEFIT_CATALOGUE } from './seedCatalogue';
import { AWARD_PILOT_SCOPE_FREEZE, APPROVED_PILOT_ACTIONS } from '../pilot/awardPilotScopeFreeze';
import { deterministicId, type SeedExecutionRequest, type SeedProvenance, buildProvenance } from './seedTenantGuard';
import type { AwardActionKey } from '../awardActionAvailability';
import { AWARD_ACTION_CATALOG } from '../awardActionCatalog';

// -----------------------------------------------------------------------------
// Variant matrices
// -----------------------------------------------------------------------------

export const CONTRIBUTION_PROFILES = [
  'FULLY_ELIGIBLE',
  'EXACTLY_AT_THRESHOLD',
  'ONE_BELOW_THRESHOLD',
  'CONTRIBUTION_GAPS',
  'LATE_CONTRIBUTION',
  'REVERSED_CONTRIBUTION',
  'DUPLICATE_ATTEMPT',
  'MULTIPLE_EMPLOYERS',
  'CHANGED_EMPLOYER',
  'SELF_EMPLOYED',
  'VOLUNTARY_CONTRIBUTOR',
  'UNDER_INVESTIGATION',
  'MAX_EARNINGS',
  'ZERO_EARNINGS',
  'RETROACTIVE_ADJUSTMENT',
] as const;
export type ContributionProfile = (typeof CONTRIBUTION_PROFILES)[number];

export const CLAIM_STATES = [
  'HAPPY_PATH_ELIGIBLE',
  'INELIGIBLE',
  'RULE_BOUNDARY_EXACT',
  'RULE_BOUNDARY_BELOW',
  'MISSING_MANDATORY_DOCUMENT',
  'INVALID_DOCUMENT',
  'CONTRIBUTION_VERIFICATION_PENDING',
  'EMPLOYER_RESPONSE_PENDING',
  'MEDICAL_ASSESSMENT_PENDING',
  'DUPLICATE_CLAIM',
  'LATE_CLAIM',
  'WITHDRAWN_CLAIM',
  'REJECTED_CLAIM',
  'APPEAL_PENDING',
  'RECONSIDERATION_PENDING',
  'APPROVED_NO_AWARD',
  'APPROVED_WITH_AWARD',
] as const;
export type ClaimState = (typeof CLAIM_STATES)[number];

export const AWARD_LIFECYCLE_STATES = [
  'APPROVED_NOT_COMMENCED',
  'ACTIVE',
  'ACTIVE_REGULAR_SCHEDULE',
  'ACTIVE_WITH_ARREARS',
  'RETROACTIVELY_ADJUSTED',
  'PAYMENT_HELD',
  'LIFE_CERT_DUE',
  'LIFE_CERT_OVERDUE',
  'LIFE_CERT_RECEIVED',
  'MEDICAL_REVIEW_DUE',
  'MEDICAL_REVIEW_OVERDUE',
  'SUSPENSION_PROPOSED',
  'SUSPENDED',
  'RESUMPTION_PROPOSED',
  'RESUMED',
  'CESSATION_PROPOSED',
  'CEASED',
  'DEATH_RECORDED',
  'UNDER_APPEAL',
  'OVERPAYMENT_REVIEW',
  'RECOVERY_ARRANGEMENT',
  'CORRECTED',
  'SUPERSEDED',
  'PROPOSAL_WITHDRAWN',
] as const;
export type AwardLifecycleState = (typeof AWARD_LIFECYCLE_STATES)[number];

export const PAYMENT_STATES = [
  'REGULAR',
  'FIRST_PAYMENT',
  'ARREARS',
  'PARTIAL_PERIOD',
  'RETROACTIVE',
  'HELD',
  'REJECTED',
  'RETURNED_BANK',
  'REVERSAL',
  'REISSUE',
  'DEDUCTION',
  'OVERPAYMENT',
  'RECOVERY_INSTALMENT',
  'RECOVERY_COMPLETED',
  'ZERO_NET_LEGAL',
  'LUMP_SUM_GRANT',
  'DISABLEMENT_GRANT',
  'RECURRING_PENSION',
  'REIMBURSEMENT_APPROVED',
  'REIMBURSEMENT_REJECTED',
] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

export const PILOT_ACTION_STATES = [
  'ALLOWED',
  'PERMISSION_DENIED',
  'BUSINESS_INELIGIBLE',
  'STALE_VERSION',
  'KILL_SWITCH_OFF',
  'OUTSIDE_COHORT',
  'IDEMPOTENT_REPLAY',
] as const;
export type PilotActionState = (typeof PILOT_ACTION_STATES)[number];

// -----------------------------------------------------------------------------
// Scenario record
// -----------------------------------------------------------------------------

export interface ScenarioActor {
  readonly role:
    | 'CLAIMANT'
    | 'CLAIMS_OFFICER'
    | 'MEDICAL_PRACTITIONER'
    | 'MEDICAL_BOARD'
    | 'EXAMINER'
    | 'SENIOR_EXAMINER'
    | 'APPROVER'
    | 'FINANCE'
    | 'AUDITOR'
    | 'EMPLOYER'
    | 'DEPENDANT';
  readonly personId: string;
}

export interface ScenarioRecord {
  readonly scenarioKey: string;
  readonly title: string;
  readonly purpose: string;
  readonly benefitType: BenefitType;
  readonly expectedLifecycleState?: AwardLifecycleState;
  readonly claimState?: ClaimState;
  readonly contributionProfile?: ContributionProfile;
  readonly paymentState?: PaymentState;
  readonly pilotActionState?: PilotActionState;
  readonly actor: ScenarioActor;
  readonly claimantClass:
    | 'EMPLOYEE'
    | 'SELF_EMPLOYED'
    | 'VOLUNTARY'
    | 'NON_CONTRIBUTORY'
    | 'DEPENDANT'
    | 'SURVIVOR';
  readonly requiredDocuments: readonly string[];
  readonly expectedEligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING';
  readonly expectedAwardOutcome:
    | 'NONE'
    | 'APPROVED_NOT_COMMENCED'
    | 'ACTIVE'
    | 'REJECTED'
    | 'SUSPENDED'
    | 'CEASED';
  readonly expectedPaymentOutcome:
    | 'NONE'
    | 'PAYABLE'
    | 'HELD'
    | 'REVERSED'
    | 'RECOVERED'
    | 'LUMP_SUM'
    | 'REIMBURSEMENT';
  readonly expectedAvailableActions: readonly AwardActionKey[];
  readonly expectedBlockedActions: readonly {
    readonly action: AwardActionKey;
    readonly reasonCode: string;
  }[];
  readonly expectedAuditEvents: readonly string[];
  readonly expectedCommunicationEvents: readonly string[];
  readonly cleanupOwnership: 'SEED_FRAMEWORK';
  readonly provenance: SeedProvenance;
  readonly identifiers: {
    readonly personId: string;
    readonly claimId: string;
    readonly awardId?: string;
    readonly paymentId?: string;
  };
}

// -----------------------------------------------------------------------------
// Scenario generation
// -----------------------------------------------------------------------------

function selectClaimStatesForBenefit(entry: BenefitCatalogueEntry): readonly ClaimState[] {
  // Every benefit gets a common core; medical-required benefits add pending.
  const base: ClaimState[] = [
    'HAPPY_PATH_ELIGIBLE',
    'INELIGIBLE',
    'RULE_BOUNDARY_EXACT',
    'RULE_BOUNDARY_BELOW',
    'MISSING_MANDATORY_DOCUMENT',
    'INVALID_DOCUMENT',
    'CONTRIBUTION_VERIFICATION_PENDING',
    'DUPLICATE_CLAIM',
    'LATE_CLAIM',
    'WITHDRAWN_CLAIM',
    'REJECTED_CLAIM',
    'APPEAL_PENDING',
    'RECONSIDERATION_PENDING',
    'APPROVED_NO_AWARD',
    'APPROVED_WITH_AWARD',
  ];
  if (entry.requiresMedicalAssessment) base.push('MEDICAL_ASSESSMENT_PENDING');
  if (entry.eligibleContributorClasses.includes('EMPLOYEE')) base.push('EMPLOYER_RESPONSE_PENDING');
  return base;
}

function selectAwardStatesForBenefit(entry: BenefitCatalogueEntry): readonly AwardLifecycleState[] {
  const base: AwardLifecycleState[] = [
    'APPROVED_NOT_COMMENCED',
    'ACTIVE',
    'ACTIVE_REGULAR_SCHEDULE',
    'ACTIVE_WITH_ARREARS',
    'RETROACTIVELY_ADJUSTED',
    'PAYMENT_HELD',
    'OVERPAYMENT_REVIEW',
    'RECOVERY_ARRANGEMENT',
    'CORRECTED',
    'SUPERSEDED',
    'UNDER_APPEAL',
  ];
  if (entry.requiresLifeCertificate) base.push('LIFE_CERT_DUE', 'LIFE_CERT_OVERDUE', 'LIFE_CERT_RECEIVED');
  if (entry.requiresPeriodicReview) base.push('MEDICAL_REVIEW_DUE', 'MEDICAL_REVIEW_OVERDUE');
  if (entry.supportsSuspension) base.push('SUSPENSION_PROPOSED', 'SUSPENDED', 'PROPOSAL_WITHDRAWN');
  if (entry.supportsResumption) base.push('RESUMPTION_PROPOSED', 'RESUMED');
  if (entry.supportsCessation) base.push('CESSATION_PROPOSED', 'CEASED', 'DEATH_RECORDED');
  return base;
}

function selectPaymentStatesForBenefit(entry: BenefitCatalogueEntry): readonly PaymentState[] {
  if (entry.paymentType === 'LUMP_SUM') {
    return ['LUMP_SUM_GRANT', 'RETROACTIVE', 'REJECTED', 'REVERSAL', 'ZERO_NET_LEGAL'];
  }
  if (entry.paymentType === 'REIMBURSEMENT') {
    return ['REIMBURSEMENT_APPROVED', 'REIMBURSEMENT_REJECTED', 'PARTIAL_PERIOD'];
  }
  const base: PaymentState[] = [
    'REGULAR',
    'FIRST_PAYMENT',
    'ARREARS',
    'PARTIAL_PERIOD',
    'RETROACTIVE',
    'HELD',
    'REJECTED',
    'RETURNED_BANK',
    'REVERSAL',
    'REISSUE',
    'DEDUCTION',
    'OVERPAYMENT',
    'RECOVERY_INSTALMENT',
    'RECOVERY_COMPLETED',
    'ZERO_NET_LEGAL',
  ];
  if (entry.paymentType === 'PENSION') base.push('RECURRING_PENSION');
  return base;
}

function pickClaimantClass(entry: BenefitCatalogueEntry): ScenarioRecord['claimantClass'] {
  if (entry.claimantType === 'SURVIVOR') return 'SURVIVOR';
  if (entry.claimantType === 'DEPENDANT') return 'DEPENDANT';
  const c = entry.eligibleContributorClasses[0];
  if (c === 'EMPLOYEE') return 'EMPLOYEE';
  if (c === 'SELF_EMPLOYED') return 'SELF_EMPLOYED';
  if (c === 'VOLUNTARY') return 'VOLUNTARY';
  return 'NON_CONTRIBUTORY';
}

function makeScenario(
  req: SeedExecutionRequest,
  entry: BenefitCatalogueEntry,
  variant: string,
  partial: Partial<ScenarioRecord>,
): ScenarioRecord {
  const scenarioKey = `${entry.code}::${variant}`;
  const provenance = buildProvenance(req, scenarioKey);
  const personId = deterministicId(req.tenant.tenantId, req.seedVersion, scenarioKey, 'PERSON');
  const claimId = deterministicId(req.tenant.tenantId, req.seedVersion, scenarioKey, 'CLAIM');
  return {
    scenarioKey,
    title: `${entry.name} — ${variant}`,
    purpose: `Certifies ${entry.name} handling under ${variant}`,
    benefitType: entry.code,
    actor: { role: 'CLAIMS_OFFICER', personId: `synthetic:officer:${entry.code}` },
    claimantClass: pickClaimantClass(entry),
    requiredDocuments: entry.requiredDocuments,
    expectedEligibility: 'PENDING',
    expectedAwardOutcome: 'NONE',
    expectedPaymentOutcome: 'NONE',
    expectedAvailableActions: [],
    expectedBlockedActions: [],
    expectedAuditEvents: ['SCENARIO_SEEDED'],
    expectedCommunicationEvents: [],
    cleanupOwnership: 'SEED_FRAMEWORK',
    provenance,
    identifiers: { personId, claimId },
    ...partial,
  };
}

function buildClaimScenariosFor(
  req: SeedExecutionRequest,
  entry: BenefitCatalogueEntry,
): ScenarioRecord[] {
  return selectClaimStatesForBenefit(entry).map((claimState) =>
    makeScenario(req, entry, `CLAIM_${claimState}`, {
      claimState,
      expectedEligibility:
        claimState === 'HAPPY_PATH_ELIGIBLE' || claimState === 'APPROVED_WITH_AWARD'
          ? 'ELIGIBLE'
          : claimState === 'INELIGIBLE' || claimState === 'REJECTED_CLAIM'
            ? 'INELIGIBLE'
            : 'PENDING',
      expectedAwardOutcome: claimState === 'APPROVED_WITH_AWARD' ? 'ACTIVE' : 'NONE',
      expectedAuditEvents: ['CLAIM_SEEDED', `CLAIM_STATE_${claimState}`],
    }),
  );
}

function buildAwardScenariosFor(
  req: SeedExecutionRequest,
  entry: BenefitCatalogueEntry,
): ScenarioRecord[] {
  return selectAwardStatesForBenefit(entry).map((state) => {
    const awardId = deterministicId(
      req.tenant.tenantId,
      req.seedVersion,
      `${entry.code}::AWARD_${state}`,
      'AWARD',
    );
    return makeScenario(req, entry, `AWARD_${state}`, {
      expectedLifecycleState: state,
      expectedAwardOutcome:
        state === 'CEASED' || state === 'DEATH_RECORDED'
          ? 'CEASED'
          : state === 'SUSPENDED'
            ? 'SUSPENDED'
            : state === 'APPROVED_NOT_COMMENCED'
              ? 'APPROVED_NOT_COMMENCED'
              : 'ACTIVE',
      expectedPaymentOutcome:
        state === 'PAYMENT_HELD'
          ? 'HELD'
          : state === 'SUSPENDED' || state === 'CEASED' || state === 'DEATH_RECORDED'
            ? 'NONE'
            : 'PAYABLE',
      identifiers: {
        personId: deterministicId(req.tenant.tenantId, req.seedVersion, `${entry.code}::AWARD_${state}`, 'PERSON'),
        claimId: deterministicId(req.tenant.tenantId, req.seedVersion, `${entry.code}::AWARD_${state}`, 'CLAIM'),
        awardId,
      },
      expectedAuditEvents: ['AWARD_SEEDED', `AWARD_STATE_${state}`],
    });
  });
}

function buildPaymentScenariosFor(
  req: SeedExecutionRequest,
  entry: BenefitCatalogueEntry,
): ScenarioRecord[] {
  return selectPaymentStatesForBenefit(entry).map((paymentState) => {
    const paymentId = deterministicId(
      req.tenant.tenantId,
      req.seedVersion,
      `${entry.code}::PAY_${paymentState}`,
      'PAYMENT',
    );
    return makeScenario(req, entry, `PAY_${paymentState}`, {
      paymentState,
      expectedPaymentOutcome:
        paymentState === 'HELD'
          ? 'HELD'
          : paymentState === 'REVERSAL'
            ? 'REVERSED'
            : paymentState === 'RECOVERY_INSTALMENT' || paymentState === 'RECOVERY_COMPLETED'
              ? 'RECOVERED'
              : paymentState === 'LUMP_SUM_GRANT' || paymentState === 'DISABLEMENT_GRANT'
                ? 'LUMP_SUM'
                : paymentState === 'REIMBURSEMENT_APPROVED'
                  ? 'REIMBURSEMENT'
                  : paymentState === 'REJECTED' || paymentState === 'RETURNED_BANK'
                    ? 'NONE'
                    : 'PAYABLE',
      identifiers: {
        personId: deterministicId(req.tenant.tenantId, req.seedVersion, `${entry.code}::PAY_${paymentState}`, 'PERSON'),
        claimId: deterministicId(req.tenant.tenantId, req.seedVersion, `${entry.code}::PAY_${paymentState}`, 'CLAIM'),
        awardId: deterministicId(req.tenant.tenantId, req.seedVersion, `${entry.code}::PAY_${paymentState}`, 'AWARD'),
        paymentId,
      },
      expectedAuditEvents: ['PAYMENT_SEEDED', `PAYMENT_STATE_${paymentState}`],
    });
  });
}

function buildContributionScenariosFor(
  req: SeedExecutionRequest,
  entry: BenefitCatalogueEntry,
): ScenarioRecord[] {
  return CONTRIBUTION_PROFILES.map((profile) =>
    makeScenario(req, entry, `CONTRIB_${profile}`, {
      contributionProfile: profile,
      expectedEligibility:
        profile === 'FULLY_ELIGIBLE' || profile === 'EXACTLY_AT_THRESHOLD' ? 'ELIGIBLE' : 'PENDING',
      expectedAuditEvents: ['CONTRIBUTIONS_SEEDED', `CONTRIB_${profile}`],
    }),
  );
}

function buildPilotActionScenarios(req: SeedExecutionRequest): ScenarioRecord[] {
  // Pilot actions target long-term awards; anchor to AGE_PENSION and INVALIDITY.
  const anchors: BenefitType[] = ['AGE_PENSION', 'INVALIDITY'];
  const out: ScenarioRecord[] = [];
  for (const bt of anchors) {
    const entry = CANONICAL_BENEFIT_CATALOGUE.find((e) => e.code === bt)!;
    for (const action of APPROVED_PILOT_ACTIONS) {
      for (const state of PILOT_ACTION_STATES) {
        // IDEMPOTENT_REPLAY only applies where the handler supports replay.
        if (state === 'IDEMPOTENT_REPLAY' && action === 'PROPOSE_RESUMPTION') continue;
        const variant = `PILOT_${action}_${state}`;
        out.push(
          makeScenario(req, entry, variant, {
            pilotActionState: state,
            expectedAvailableActions: state === 'ALLOWED' ? [action] : [],
            expectedBlockedActions:
              state === 'ALLOWED'
                ? []
                : [{ action, reasonCode: state }],
            expectedAuditEvents: ['PILOT_SCENARIO_SEEDED', `PILOT_${state}`],
            expectedCommunicationEvents:
              action === 'SEND_LIFE_CERTIFICATE_REMINDER' && state === 'ALLOWED'
                ? ['LIFE_CERT_REMINDER_QUEUED']
                : [],
          }),
        );
      }
    }
  }
  return out;
}

function buildDarkLaunchedCoverage(req: SeedExecutionRequest): ScenarioRecord[] {
  // For every non-pilot action, seed a scenario that expects the UI to expose
  // the correct unavailable state. No handler is registered or enabled.
  const nonPilot = AWARD_ACTION_CATALOG.filter(
    (a) => !APPROVED_PILOT_ACTIONS.includes(a.key),
  );
  const anchor = CANONICAL_BENEFIT_CATALOGUE.find((e) => e.code === 'AGE_PENSION')!;
  return nonPilot.map((a) =>
    makeScenario(req, anchor, `DARK_${a.key}`, {
      expectedAvailableActions: [],
      expectedBlockedActions: [{ action: a.key, reasonCode: 'DARK_LAUNCHED' }],
      expectedAuditEvents: ['DARK_LAUNCH_COVERAGE_SEEDED'],
    }),
  );
}

// -----------------------------------------------------------------------------
// Manifest assembly
// -----------------------------------------------------------------------------

export interface ScenarioManifest {
  readonly seedVersion: string;
  readonly seedBatchId: string;
  readonly tenantId: string;
  readonly asOfDate: string;
  readonly scenarios: readonly ScenarioRecord[];
  readonly scenarioKeysByBenefit: Record<string, readonly string[]>;
}

export function buildScenarioManifest(req: SeedExecutionRequest): ScenarioManifest {
  const all: ScenarioRecord[] = [];
  for (const entry of CANONICAL_BENEFIT_CATALOGUE.filter((e) => e.active)) {
    all.push(...buildContributionScenariosFor(req, entry));
    all.push(...buildClaimScenariosFor(req, entry));
    all.push(...buildAwardScenariosFor(req, entry));
    all.push(...buildPaymentScenariosFor(req, entry));
  }
  all.push(...buildPilotActionScenarios(req));
  all.push(...buildDarkLaunchedCoverage(req));

  const byBenefit: Record<string, string[]> = {};
  for (const s of all) {
    (byBenefit[s.benefitType] ??= []).push(s.scenarioKey);
  }

  return {
    seedVersion: req.seedVersion,
    seedBatchId: req.seedBatchId,
    tenantId: req.tenant.tenantId,
    asOfDate: req.asOfDate,
    scenarios: all,
    scenarioKeysByBenefit: byBenefit,
  };
}

export function scenarioSummaryByBenefit(m: ScenarioManifest): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of m.scenarios) out[s.benefitType] = (out[s.benefitType] ?? 0) + 1;
  return out;
}

// Re-export the pilot scope for callers.
export { AWARD_PILOT_SCOPE_FREEZE };
