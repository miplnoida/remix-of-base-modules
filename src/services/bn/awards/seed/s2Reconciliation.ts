/**
 * AW360-WAVE-1 Stage S2 — Catalogue reconciliation + scenario-constraint engine.
 *
 * (1) Reconciles the TypeScript BenefitType canonical catalogue against a
 *     UAT-shaped bn_product catalogue overlay. When the DB overlay is
 *     supplied it is authoritative; when absent, reconciliation runs
 *     against the canonical catalogue alone.
 *
 * (2) Classifies every S1-generated scenario as
 *     VALID_PROCESS_SCENARIO | VALID_NEGATIVE_SCENARIO |
 *     INTENTIONALLY_NOT_APPLICABLE | INVALID_COMBINATION
 *     so the materialiser only persists valid process + valid negative
 *     scenarios and reports exclusions by reason.
 */

import { CANONICAL_BENEFIT_CATALOGUE, type BenefitCatalogueEntry } from './seedCatalogue';
import type { ScenarioRecord, ScenarioManifest } from './seedScenarioManifest';
import type { BenefitType } from '@/types/newBenefit';

// ─────────────────────────── Reconciliation ────────────────────────────

export interface DbBenefitOverlay {
  readonly benefit_code: BenefitType;
  readonly is_enabled: boolean;
  readonly has_calculation_rule: boolean;
  readonly required_documents: readonly string[];
  readonly supports_life_certificate?: boolean;
  readonly supports_medical_review?: boolean;
  readonly supports_suspension?: boolean;
  readonly supports_resumption?: boolean;
  readonly payment_frequency?: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY';
}

export interface CatalogueReconciliationIssue {
  readonly code:
    | 'DB_ENABLED_MISSING_FROM_TS'
    | 'TS_ACTIVE_MISSING_FROM_DB'
    | 'MISSING_CALCULATION_RULE'
    | 'MISSING_REQUIRED_DOCUMENTS'
    | 'CAPABILITY_DISAGREEMENT'
    | 'PAYMENT_FREQUENCY_DISAGREEMENT';
  readonly benefit: BenefitType;
  readonly detail: string;
}

export interface CatalogueReconciliationReport {
  readonly asOfDate: string;
  readonly tsActive: readonly BenefitType[];
  readonly dbEnabled: readonly BenefitType[];
  readonly authoritativeCatalogue: readonly BenefitCatalogueEntry[];
  readonly issues: readonly CatalogueReconciliationIssue[];
  readonly blockingIssueCount: number;
  readonly canProceed: boolean;
  readonly fingerprint: string;
}

function fp(entries: readonly BenefitCatalogueEntry[]): string {
  const parts = entries
    .map((e) =>
      [
        e.code,
        e.classification,
        e.paymentType,
        e.paymentFrequency,
        e.contributionCondition,
        e.requiresLifeCertificate ? 'LC' : '-',
        e.requiresPeriodicReview ? 'MR' : '-',
        e.supportsSuspension ? 'S' : '-',
        e.supportsResumption ? 'R' : '-',
      ].join(':'),
    )
    .sort()
    .join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < parts.length; i++) {
    h ^= parts.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `cat-${h.toString(16).padStart(8, '0')}`;
}

export function reconcileBenefitCatalogue(opts: {
  readonly asOfDate: string;
  readonly overlay?: readonly DbBenefitOverlay[];
}): CatalogueReconciliationReport {
  const tsActive = CANONICAL_BENEFIT_CATALOGUE.filter((e) => e.active);
  const tsMap = new Map(tsActive.map((e) => [e.code, e]));
  const issues: CatalogueReconciliationIssue[] = [];

  const overlay = opts.overlay ?? [];
  const dbEnabled = overlay.filter((o) => o.is_enabled).map((o) => o.benefit_code);

  // (a) DB enabled but missing from TS.
  for (const b of dbEnabled) {
    if (!tsMap.has(b)) {
      issues.push({
        code: 'DB_ENABLED_MISSING_FROM_TS',
        benefit: b,
        detail: `DB catalogue enables ${b} but TypeScript catalogue does not.`,
      });
    }
  }
  // (b) TS active but missing from DB (only if overlay was supplied).
  if (overlay.length > 0) {
    const dbSet = new Set(dbEnabled);
    for (const e of tsActive) {
      if (!dbSet.has(e.code)) {
        issues.push({
          code: 'TS_ACTIVE_MISSING_FROM_DB',
          benefit: e.code,
          detail: `TS catalogue marks ${e.code} active but DB does not enable it.`,
        });
      }
    }
  }

  // (c) Per-benefit configuration integrity.
  for (const e of tsActive) {
    if (e.requiredDocuments.length === 0) {
      issues.push({
        code: 'MISSING_REQUIRED_DOCUMENTS',
        benefit: e.code,
        detail: 'No required documents configured.',
      });
    }
    const dbRow = overlay.find((o) => o.benefit_code === e.code);
    if (dbRow) {
      if (!dbRow.has_calculation_rule) {
        issues.push({
          code: 'MISSING_CALCULATION_RULE',
          benefit: e.code,
          detail: 'DB row lacks a calculation rule binding.',
        });
      }
      const disagreements: string[] = [];
      if (dbRow.supports_life_certificate !== undefined &&
        dbRow.supports_life_certificate !== e.requiresLifeCertificate) disagreements.push('life_certificate');
      if (dbRow.supports_medical_review !== undefined &&
        dbRow.supports_medical_review !== e.requiresPeriodicReview) disagreements.push('medical_review');
      if (dbRow.supports_suspension !== undefined &&
        dbRow.supports_suspension !== e.supportsSuspension) disagreements.push('suspension');
      if (dbRow.supports_resumption !== undefined &&
        dbRow.supports_resumption !== e.supportsResumption) disagreements.push('resumption');
      if (disagreements.length) {
        issues.push({
          code: 'CAPABILITY_DISAGREEMENT',
          benefit: e.code,
          detail: `TS↔DB disagree on: ${disagreements.join(',')}`,
        });
      }
      if (dbRow.payment_frequency && dbRow.payment_frequency !== e.paymentFrequency) {
        issues.push({
          code: 'PAYMENT_FREQUENCY_DISAGREEMENT',
          benefit: e.code,
          detail: `TS=${e.paymentFrequency} DB=${dbRow.payment_frequency}`,
        });
      }
    }
  }

  // Authoritative catalogue: when overlay is present, restrict TS to the DB enabled set.
  const authoritative =
    overlay.length > 0
      ? tsActive.filter((e) => dbEnabled.includes(e.code))
      : tsActive;

  const blocking = issues.filter(
    (i) =>
      i.code === 'DB_ENABLED_MISSING_FROM_TS' ||
      i.code === 'TS_ACTIVE_MISSING_FROM_DB' ||
      i.code === 'MISSING_CALCULATION_RULE' ||
      i.code === 'MISSING_REQUIRED_DOCUMENTS' ||
      i.code === 'CAPABILITY_DISAGREEMENT' ||
      i.code === 'PAYMENT_FREQUENCY_DISAGREEMENT',
  );

  return {
    asOfDate: opts.asOfDate,
    tsActive: tsActive.map((e) => e.code),
    dbEnabled,
    authoritativeCatalogue: authoritative,
    issues,
    blockingIssueCount: blocking.length,
    canProceed: blocking.length === 0,
    fingerprint: fp(authoritative),
  };
}

// ─────────────────────────── Constraint engine ─────────────────────────

export type ScenarioClassification =
  | 'VALID_PROCESS_SCENARIO'
  | 'VALID_NEGATIVE_SCENARIO'
  | 'INTENTIONALLY_NOT_APPLICABLE'
  | 'INVALID_COMBINATION';

export interface ClassifiedScenario {
  readonly scenario: ScenarioRecord;
  readonly classification: ScenarioClassification;
  readonly reason?: string;
}

export interface ConstraintReport {
  readonly total: number;
  readonly counts: Record<ScenarioClassification, number>;
  readonly excludedByReason: Record<string, number>;
  readonly classified: readonly ClassifiedScenario[];
  readonly persistable: readonly ScenarioRecord[];
}

function benefit(code: BenefitType): BenefitCatalogueEntry | undefined {
  return CANONICAL_BENEFIT_CATALOGUE.find((e) => e.code === code);
}

export function classifyScenarios(manifest: ScenarioManifest): ConstraintReport {
  const counts: Record<ScenarioClassification, number> = {
    VALID_PROCESS_SCENARIO: 0,
    VALID_NEGATIVE_SCENARIO: 0,
    INTENTIONALLY_NOT_APPLICABLE: 0,
    INVALID_COMBINATION: 0,
  };
  const excluded: Record<string, number> = {};
  const classified: ClassifiedScenario[] = [];

  for (const s of manifest.scenarios) {
    const entry = benefit(s.benefitType);
    let cls: ScenarioClassification = 'VALID_PROCESS_SCENARIO';
    let reason: string | undefined;

    if (!entry) {
      cls = 'INVALID_COMBINATION';
      reason = 'unknown_benefit_type';
    } else {
      // Rule 1: rejected claim with active award — invalid.
      if (s.claimState === 'REJECTED_CLAIM' && s.expectedAwardOutcome === 'ACTIVE') {
        cls = 'INVALID_COMBINATION';
        reason = 'rejected_claim_with_active_award';
      }
      // Rule 2: grant/lump-sum with recurring pension payment state.
      else if (entry.paymentType === 'LUMP_SUM' && s.paymentState === 'RECURRING_PENSION') {
        cls = 'INVALID_COMBINATION';
        reason = 'lump_sum_benefit_with_recurring_pension';
      }
      // Rule 3: short-term benefit + life-certificate lifecycle state.
      else if (
        !entry.requiresLifeCertificate &&
        (s.expectedLifecycleState === 'LIFE_CERT_DUE' ||
          s.expectedLifecycleState === 'LIFE_CERT_OVERDUE' ||
          s.expectedLifecycleState === 'LIFE_CERT_RECEIVED')
      ) {
        cls = 'INTENTIONALLY_NOT_APPLICABLE';
        reason = 'life_cert_state_on_non_lc_benefit';
      }
      // Rule 4: ceased/death with future regular payments.
      else if (
        (s.expectedLifecycleState === 'CEASED' || s.expectedLifecycleState === 'DEATH_RECORDED') &&
        s.paymentState === 'REGULAR'
      ) {
        cls = 'INVALID_COMBINATION';
        reason = 'ceased_award_with_future_regular_payment';
      }
      // Rule 5: resumption without suspension support.
      else if (
        !entry.supportsResumption &&
        (s.expectedLifecycleState === 'RESUMED' || s.expectedLifecycleState === 'RESUMPTION_PROPOSED')
      ) {
        cls = 'INTENTIONALLY_NOT_APPLICABLE';
        reason = 'resumption_on_non_resumable_benefit';
      }
      // Rule 6: medical-review state on non-medical benefit.
      else if (
        !entry.requiresPeriodicReview &&
        (s.expectedLifecycleState === 'MEDICAL_REVIEW_DUE' ||
          s.expectedLifecycleState === 'MEDICAL_REVIEW_OVERDUE')
      ) {
        cls = 'INTENTIONALLY_NOT_APPLICABLE';
        reason = 'medical_review_on_non_medical_benefit';
      }
      // Rule 7: payment without approved payable award.
      else if (
        s.paymentState &&
        s.expectedAwardOutcome !== 'ACTIVE' &&
        s.expectedAwardOutcome !== 'APPROVED_NOT_COMMENCED' &&
        s.expectedPaymentOutcome === 'PAYABLE' &&
        !s.identifiers.awardId
      ) {
        cls = 'INVALID_COMBINATION';
        reason = 'payment_without_approved_award';
      }
      // Rule 8: proposal fixture producing final effect.
      else if (
        s.pilotActionState === 'ALLOWED' &&
        (s.expectedLifecycleState === 'SUSPENDED' ||
          s.expectedLifecycleState === 'RESUMED' ||
          s.expectedLifecycleState === 'CEASED')
      ) {
        cls = 'INVALID_COMBINATION';
        reason = 'proposal_produced_final_effect';
      }
      // Valid negatives: intentional ineligibility / boundary / duplicate / withdrawn.
      else if (
        s.claimState === 'INELIGIBLE' ||
        s.claimState === 'REJECTED_CLAIM' ||
        s.claimState === 'DUPLICATE_CLAIM' ||
        s.claimState === 'WITHDRAWN_CLAIM' ||
        s.claimState === 'RULE_BOUNDARY_BELOW' ||
        s.paymentState === 'REJECTED' ||
        s.paymentState === 'RETURNED_BANK' ||
        s.paymentState === 'REVERSAL' ||
        s.pilotActionState === 'PERMISSION_DENIED' ||
        s.pilotActionState === 'KILL_SWITCH_OFF' ||
        s.pilotActionState === 'BUSINESS_INELIGIBLE' ||
        s.pilotActionState === 'STALE_VERSION' ||
        s.pilotActionState === 'OUTSIDE_COHORT'
      ) {
        cls = 'VALID_NEGATIVE_SCENARIO';
      }
    }

    counts[cls]++;
    if (cls !== 'VALID_PROCESS_SCENARIO' && cls !== 'VALID_NEGATIVE_SCENARIO' && reason) {
      excluded[reason] = (excluded[reason] ?? 0) + 1;
    }
    classified.push({ scenario: s, classification: cls, reason });
  }

  const persistable = classified
    .filter(
      (c) =>
        c.classification === 'VALID_PROCESS_SCENARIO' ||
        c.classification === 'VALID_NEGATIVE_SCENARIO',
    )
    .map((c) => c.scenario);

  return {
    total: manifest.scenarios.length,
    counts,
    excludedByReason: excluded,
    classified,
    persistable,
  };
}
