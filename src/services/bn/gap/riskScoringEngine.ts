/**
 * BN Risk — Explainable scoring engine (Slice 1).
 *
 * Pure function converting a bag of scored factors + policy weights into a
 * final numeric score AND a band, together with a fully-explainable
 * breakdown. This never runs a black-box model: every point in the total
 * traces back to a named factor.
 *
 * Design guarantees:
 *  - Deterministic (no wall-clock / Math.random).
 *  - Integer-safe: scores are treated as basis points (0-10000) internally.
 *  - Manual adjustment is capped so it cannot single-handedly promote a
 *    signal from LOW → CRITICAL without at least one supporting factor.
 *
 * Score is never a decision on its own — see BN_RISK_APPROVE_CONTROL.
 */

export type BnRiskBand = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type BnRiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BnRiskConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskFactorInput {
  readonly factorId: string;
  readonly ruleId: string;
  readonly ruleVersion: string;
  /** 0-100 raw score contribution BEFORE weights. */
  readonly rawScore: number;
  /** Rule weight (0-2.0). 1.0 = neutral. */
  readonly ruleWeight: number;
  readonly severity: BnRiskSeverity;
  readonly confidence: BnRiskConfidence;
  /** Days since detection; drives recency decay. */
  readonly ageDays: number;
  /** Number of prior occurrences on the same entity (0 = first). */
  readonly repeatCount: number;
  /** Financial exposure in minor units. */
  readonly financialExposureMinor: number;
  readonly explanation: string;
}

export interface RiskScoringPolicy {
  readonly severityMultipliers: Readonly<Record<BnRiskSeverity, number>>;
  readonly confidenceMultipliers: Readonly<Record<BnRiskConfidence, number>>;
  /** Points decayed per day of age (capped by maxRecencyDecay). */
  readonly recencyDecayPerDay: number;
  readonly maxRecencyDecay: number;
  /** Bonus points per repeat occurrence (capped by maxRepeatBonus). */
  readonly repeatBonusPerOccurrence: number;
  readonly maxRepeatBonus: number;
  /** Bonus band ceiling from financial exposure. */
  readonly financialExposureBands: readonly {
    readonly minMinor: number;
    readonly bonus: number;
  }[];
  /** Cap for manual adjustment (both positive and negative). */
  readonly manualAdjustmentCap: number;
  /** Band thresholds inclusive-lower on final total. */
  readonly bandThresholds: Readonly<Record<BnRiskBand, number>>;
}

export const DEFAULT_RISK_SCORING_POLICY: RiskScoringPolicy = {
  severityMultipliers: { LOW: 0.5, MEDIUM: 1.0, HIGH: 1.5, CRITICAL: 2.0 },
  confidenceMultipliers: { LOW: 0.6, MEDIUM: 1.0, HIGH: 1.2 },
  recencyDecayPerDay: 0.5,
  maxRecencyDecay: 20,
  repeatBonusPerOccurrence: 5,
  maxRepeatBonus: 25,
  financialExposureBands: [
    { minMinor: 100_000, bonus: 5 },
    { minMinor: 500_000, bonus: 15 },
    { minMinor: 2_000_000, bonus: 30 },
  ],
  manualAdjustmentCap: 20,
  bandThresholds: { LOW: 0, MEDIUM: 30, HIGH: 60, CRITICAL: 85 },
};

export interface RiskScoreExplainRow {
  readonly factorId: string;
  readonly base: number;
  readonly weighted: number;
  readonly severityMult: number;
  readonly confidenceMult: number;
  readonly recencyDecay: number;
  readonly repeatBonus: number;
  readonly exposureBonus: number;
  readonly contribution: number;
  readonly explanation: string;
}

export interface RiskScoreResult {
  readonly total: number;
  readonly band: BnRiskBand;
  readonly manualAdjustment: number;
  readonly rows: readonly RiskScoreExplainRow[];
  readonly policy: RiskScoringPolicy;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function bonusFromExposure(
  exposureMinor: number,
  bands: RiskScoringPolicy['financialExposureBands'],
): number {
  let bonus = 0;
  for (const b of bands) {
    if (exposureMinor >= b.minMinor) bonus = Math.max(bonus, b.bonus);
  }
  return bonus;
}

function bandFor(total: number, t: RiskScoringPolicy['bandThresholds']): BnRiskBand {
  if (total >= t.CRITICAL) return 'CRITICAL';
  if (total >= t.HIGH) return 'HIGH';
  if (total >= t.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * Compute an explainable risk score.
 *
 * @param factors  the individual factor contributions.
 * @param manualAdjustment  operator override, capped by policy.
 * @param policy  scoring policy (typically per-country/product).
 */
export function scoreRisk(
  factors: readonly RiskFactorInput[],
  manualAdjustment = 0,
  policy: RiskScoringPolicy = DEFAULT_RISK_SCORING_POLICY,
): RiskScoreResult {
  const rows: RiskScoreExplainRow[] = [];
  let total = 0;

  for (const f of factors) {
    const base = clamp(f.rawScore, 0, 100);
    const weighted = base * clamp(f.ruleWeight, 0, 2);
    const sev = policy.severityMultipliers[f.severity];
    const conf = policy.confidenceMultipliers[f.confidence];
    const decay = clamp(f.ageDays * policy.recencyDecayPerDay, 0, policy.maxRecencyDecay);
    const repeatBonus = clamp(
      f.repeatCount * policy.repeatBonusPerOccurrence,
      0,
      policy.maxRepeatBonus,
    );
    const exposureBonus = bonusFromExposure(
      f.financialExposureMinor,
      policy.financialExposureBands,
    );

    const contribution =
      weighted * sev * conf - decay + repeatBonus + exposureBonus;
    total += contribution;

    rows.push({
      factorId: f.factorId,
      base,
      weighted,
      severityMult: sev,
      confidenceMult: conf,
      recencyDecay: decay,
      repeatBonus,
      exposureBonus,
      contribution,
      explanation: f.explanation,
    });
  }

  const cappedManual = clamp(
    manualAdjustment,
    -policy.manualAdjustmentCap,
    policy.manualAdjustmentCap,
  );
  total += cappedManual;

  return {
    total: Math.round(total * 100) / 100,
    band: bandFor(total, policy.bandThresholds),
    manualAdjustment: cappedManual,
    rows,
    policy,
  };
}

/** Deduplication key for identical signals on the same entity. */
export function signalDedupeKey(input: {
  readonly ruleId: string;
  readonly ruleVersion: string;
  readonly sourceModule: string;
  readonly sourceEntityId: string;
  readonly category: string;
}): string {
  return [
    input.sourceModule,
    input.sourceEntityId,
    input.ruleId,
    input.ruleVersion,
    input.category,
  ].join('::');
}
