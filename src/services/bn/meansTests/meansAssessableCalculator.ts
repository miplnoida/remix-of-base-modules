/**
 * BN Means-Test — Assessable-value calculator (pure).
 *
 * Slice 1 of the Means-Test Assessment epic. Zero I/O, deterministic.
 *
 * Responsibilities:
 *   • Normalise income to an annualised value (frequency-aware)
 *   • Apply per-item disregards (fixed amount or percentage)
 *   • Aggregate assessable income, assets, and deductions
 *   • Resolve household threshold with per-person adjustment
 *   • Compute excess/shortfall vs threshold
 *   • Determine PASS/FAIL/REFER outcome
 *
 * All money is expressed in the policy currency's MINOR UNITS
 * (integer cents) to avoid IEEE-754 error. Rounding precision is
 * driven by the policy configuration.
 */

export type BnMeansIncomeFrequency =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUALLY'
  | 'ONE_OFF';

export interface BnMeansIncomeInput {
  readonly memberId: string;
  readonly category: string;
  readonly grossMinor: number;
  readonly frequency: BnMeansIncomeFrequency;
  /** Fixed disregard in minor units (per annualised amount). */
  readonly disregardFixedMinor?: number;
  /** Percentage disregard in [0, 100]. */
  readonly disregardPercent?: number;
}

export interface BnMeansAssetInput {
  readonly memberId: string;
  readonly category: string;
  readonly grossMinor: number;
  readonly disregardFixedMinor?: number;
  readonly disregardPercent?: number;
}

export interface BnMeansDeductionInput {
  readonly category: string;
  readonly amountMinor: number;
}

export interface BnMeansThresholdInput {
  readonly baseMinor: number;
  readonly perPersonAdjustmentMinor: number;
  /** Optional hard ceiling on assessable assets. */
  readonly maxAssetsMinor?: number;
}

export interface BnMeansCalculatorPolicy {
  readonly currency: string;
  /** Precision in minor units — 100 = round to the nearest whole currency unit. */
  readonly roundingMinor: number;
  /** If total assessable assets exceeds this, result is FAIL regardless of income. */
  readonly assetCeilingMinor?: number;
  /** Assessments requiring supervisor review yield `REFER` when true. */
  readonly requiresReviewOnCloseness?: number; // minor-units window either side of threshold
}

export interface BnMeansCalculatorInput {
  readonly householdSize: number;
  readonly incomes: readonly BnMeansIncomeInput[];
  readonly assets: readonly BnMeansAssetInput[];
  readonly deductions: readonly BnMeansDeductionInput[];
  readonly threshold: BnMeansThresholdInput;
  readonly policy: BnMeansCalculatorPolicy;
}

export interface BnMeansCalculationTraceEntry {
  readonly step: string;
  readonly detail: string;
  readonly valueMinor?: number;
}

export interface BnMeansCalculationOutput {
  readonly grossHouseholdIncomeMinor: number;
  readonly disregardedIncomeMinor: number;
  readonly assessableIncomeMinor: number;
  readonly grossAssetsMinor: number;
  readonly disregardedAssetsMinor: number;
  readonly assessableAssetsMinor: number;
  readonly allowableDeductionsMinor: number;
  readonly householdSize: number;
  readonly thresholdMinor: number;
  readonly excessMinor: number;
  readonly result: 'PASS' | 'FAIL' | 'REFER';
  readonly trace: readonly BnMeansCalculationTraceEntry[];
}

// ── Frequency normalisation ────────────────────────────────────────────
// Deterministic integer math. Weekly and biweekly use ISO-standard
// factors (52, 26) rather than 365/7 to keep whole-cent totals stable.
const FREQUENCY_MULTIPLIER: Readonly<Record<BnMeansIncomeFrequency, number>> = {
  WEEKLY:    52,
  BIWEEKLY:  26,
  MONTHLY:   12,
  QUARTERLY: 4,
  ANNUALLY:  1,
  ONE_OFF:   1, // treated as a single annualised amount
};

export function annualiseMinor(grossMinor: number, frequency: BnMeansIncomeFrequency): number {
  return Math.trunc(grossMinor * FREQUENCY_MULTIPLIER[frequency]);
}

/** Apply fixed + percentage disregard, clamped so assessable never goes negative. */
export function applyDisregardMinor(
  grossMinor: number,
  fixedMinor: number,
  percent: number,
): { assessableMinor: number; disregardedMinor: number } {
  const pct = Math.max(0, Math.min(100, percent));
  const pctDisregard = Math.trunc((grossMinor * pct) / 100);
  const rawDisregard = Math.max(0, fixedMinor) + pctDisregard;
  const disregarded = Math.min(grossMinor, rawDisregard);
  return {
    assessableMinor: grossMinor - disregarded,
    disregardedMinor: disregarded,
  };
}

function roundMinor(value: number, roundingMinor: number): number {
  if (roundingMinor <= 1) return value;
  return Math.round(value / roundingMinor) * roundingMinor;
}

export function computeThresholdMinor(
  householdSize: number,
  t: BnMeansThresholdInput,
): number {
  const extra = Math.max(0, householdSize - 1) * t.perPersonAdjustmentMinor;
  return t.baseMinor + extra;
}

/** Deterministic pure function — the core of the assessment calculation. */
export function calculateMeansAssessment(
  input: BnMeansCalculatorInput,
): BnMeansCalculationOutput {
  const trace: BnMeansCalculationTraceEntry[] = [];

  // Income
  let grossIncome = 0;
  let disregardedIncome = 0;
  let assessableIncome = 0;
  for (const inc of input.incomes) {
    const annual = annualiseMinor(inc.grossMinor, inc.frequency);
    const { assessableMinor, disregardedMinor } = applyDisregardMinor(
      annual,
      inc.disregardFixedMinor ?? 0,
      inc.disregardPercent ?? 0,
    );
    grossIncome += annual;
    disregardedIncome += disregardedMinor;
    assessableIncome += assessableMinor;
    trace.push({
      step: 'INCOME',
      detail: `${inc.category} @ ${inc.frequency}: gross=${annual} disregarded=${disregardedMinor}`,
      valueMinor: assessableMinor,
    });
  }

  // Assets
  let grossAssets = 0;
  let disregardedAssets = 0;
  let assessableAssets = 0;
  for (const asset of input.assets) {
    const { assessableMinor, disregardedMinor } = applyDisregardMinor(
      asset.grossMinor,
      asset.disregardFixedMinor ?? 0,
      asset.disregardPercent ?? 0,
    );
    grossAssets += asset.grossMinor;
    disregardedAssets += disregardedMinor;
    assessableAssets += assessableMinor;
    trace.push({
      step: 'ASSET',
      detail: `${asset.category}: gross=${asset.grossMinor} disregarded=${disregardedMinor}`,
      valueMinor: assessableMinor,
    });
  }

  // Deductions reduce assessable income (never below zero).
  const allowableDeductions = input.deductions.reduce(
    (sum, d) => sum + Math.max(0, d.amountMinor),
    0,
  );
  const incomeAfterDeductions = Math.max(0, assessableIncome - allowableDeductions);
  trace.push({
    step: 'DEDUCTIONS',
    detail: `total deductions applied to assessable income`,
    valueMinor: allowableDeductions,
  });

  // Threshold
  const rawThreshold = computeThresholdMinor(input.householdSize, input.threshold);
  const threshold = roundMinor(rawThreshold, input.policy.roundingMinor);
  const roundedIncome = roundMinor(incomeAfterDeductions, input.policy.roundingMinor);
  const roundedAssets = roundMinor(assessableAssets, input.policy.roundingMinor);
  const excess = roundedIncome - threshold;

  trace.push({
    step: 'THRESHOLD',
    detail: `household_size=${input.householdSize} threshold=${threshold} rounded_income=${roundedIncome}`,
    valueMinor: threshold,
  });

  // Result
  let result: 'PASS' | 'FAIL' | 'REFER';
  const assetCeiling = input.policy.assetCeilingMinor ?? input.threshold.maxAssetsMinor;
  if (assetCeiling !== undefined && roundedAssets > assetCeiling) {
    result = 'FAIL';
    trace.push({ step: 'RESULT', detail: `asset ceiling breached (${roundedAssets} > ${assetCeiling})` });
  } else if (excess > 0) {
    result = 'FAIL';
    trace.push({ step: 'RESULT', detail: `excess ${excess} > 0 → FAIL` });
  } else {
    const window = input.policy.requiresReviewOnCloseness ?? 0;
    if (window > 0 && Math.abs(excess) <= window) {
      result = 'REFER';
      trace.push({ step: 'RESULT', detail: `within review window (${window}) → REFER` });
    } else {
      result = 'PASS';
      trace.push({ step: 'RESULT', detail: `excess ${excess} ≤ 0 → PASS` });
    }
  }

  return {
    grossHouseholdIncomeMinor: grossIncome,
    disregardedIncomeMinor: disregardedIncome,
    assessableIncomeMinor: roundedIncome,
    grossAssetsMinor: grossAssets,
    disregardedAssetsMinor: disregardedAssets,
    assessableAssetsMinor: roundedAssets,
    allowableDeductionsMinor: allowableDeductions,
    householdSize: input.householdSize,
    thresholdMinor: threshold,
    excessMinor: excess,
    result,
    trace,
  };
}
