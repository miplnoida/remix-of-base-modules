/**
 * BN Uprating — Pure amount calculator (Slice 1).
 *
 * Given the current award amount (integer minor units) and a policy input,
 * compute the proposed new amount plus every intermediate transformation
 * (base delta, percentage delta, min/max clamping, rounding). No IO,
 * deterministic, and safe for use in both simulation and execution paths.
 *
 * Monetary values are integer minor units to avoid FP drift. Percentages
 * are expressed as basis points (1% = 100 bp, 2.5% = 250 bp) so all
 * intermediate math is integer-safe until the final rounding step.
 *
 * The calculator NEVER decides whether to apply the increase — that is
 * the job of the run engine (exception checks, eligibility, etc.).
 */

import type {
  BnUpratingPolicyType,
  BnUpratingRoundingMode,
} from '@/types/bn/uprating/upratingPolicyTypes';

export interface TieredBand {
  /** Inclusive lower bound in minor units. */
  readonly fromMinor: number;
  /** Exclusive upper bound in minor units (null = infinity). */
  readonly toMinor: number | null;
  /** Basis points applied within this band (nullable if fixed only). */
  readonly bpts?: number;
  /** Fixed uplift within this band (nullable if percentage only). */
  readonly fixedMinor?: number;
}

export interface UpratingPolicyInput {
  readonly type: BnUpratingPolicyType;
  /** For PERCENTAGE and PERCENTAGE_PLUS_FIXED — basis points. */
  readonly percentageBp?: number;
  /** For FIXED_AMOUNT and PERCENTAGE_PLUS_FIXED — minor units. */
  readonly fixedMinor?: number;
  /** For INDEX_FACTOR — factor in basis points (10_000 = 1.0000, 10_200 = 1.02). */
  readonly indexFactorBp?: number;
  /** For TIERED — bands (ordered non-overlapping). */
  readonly tiers?: readonly TieredBand[];
  /** For FORMULA_DRIVEN / MANUAL_IMPORT — precomputed new amount. */
  readonly precomputedNewMinor?: number;
  /** Optional floor on the increase amount (minor units, non-negative). */
  readonly minIncreaseMinor?: number;
  /** Optional ceiling on the increase amount (minor units, non-negative). */
  readonly maxIncreaseMinor?: number;
  /** Optional floor on the final new amount (minor units). */
  readonly floorNewMinor?: number;
  /** Optional ceiling on the final new amount (minor units). */
  readonly ceilingNewMinor?: number;
  readonly rounding?: BnUpratingRoundingMode;
}

export interface UpratingCalcResult {
  readonly currentMinor: number;
  readonly newMinor: number;
  readonly increaseMinor: number;
  readonly increaseBp: number;
  readonly rawNewBeforeClamp: number;
  readonly clampedByMinIncrease: boolean;
  readonly clampedByMaxIncrease: boolean;
  readonly clampedByFloor: boolean;
  readonly clampedByCeiling: boolean;
  readonly rounding: BnUpratingRoundingMode;
}

function roundMinor(v: number, mode: BnUpratingRoundingMode): number {
  switch (mode) {
    case 'NONE':
      return Math.trunc(v);
    case 'NEAREST_1':
      return Math.round(v);
    case 'NEAREST_10':
      return Math.round(v / 10) * 10;
    case 'NEAREST_100':
      return Math.round(v / 100) * 100;
    case 'DOWN':
      return Math.floor(v);
    case 'UP':
      return Math.ceil(v);
    case 'HALF_EVEN': {
      const floor = Math.floor(v);
      const diff = v - floor;
      if (diff < 0.5) return floor;
      if (diff > 0.5) return floor + 1;
      // exactly .5 → round to even
      return floor % 2 === 0 ? floor : floor + 1;
    }
  }
}

function applyPolicy(
  currentMinor: number,
  p: UpratingPolicyInput,
): number {
  switch (p.type) {
    case 'PERCENTAGE': {
      const bp = p.percentageBp ?? 0;
      return currentMinor + (currentMinor * bp) / 10_000;
    }
    case 'FIXED_AMOUNT': {
      return currentMinor + (p.fixedMinor ?? 0);
    }
    case 'PERCENTAGE_PLUS_FIXED': {
      const bp = p.percentageBp ?? 0;
      return currentMinor + (currentMinor * bp) / 10_000 + (p.fixedMinor ?? 0);
    }
    case 'INDEX_FACTOR': {
      const factor = (p.indexFactorBp ?? 10_000) / 10_000;
      return currentMinor * factor;
    }
    case 'TIERED': {
      if (!p.tiers || p.tiers.length === 0) return currentMinor;
      for (const band of p.tiers) {
        const inBand =
          currentMinor >= band.fromMinor &&
          (band.toMinor === null || currentMinor < band.toMinor);
        if (inBand) {
          return (
            currentMinor +
            (currentMinor * (band.bpts ?? 0)) / 10_000 +
            (band.fixedMinor ?? 0)
          );
        }
      }
      return currentMinor;
    }
    case 'FORMULA_DRIVEN':
    case 'MANUAL_IMPORT': {
      return p.precomputedNewMinor ?? currentMinor;
    }
  }
}

/**
 * Pure uprating calculator.
 *
 * @throws when `currentMinor` is negative — an award cannot have a
 * negative base amount.
 */
export function calculateUpratedAmount(
  currentMinor: number,
  policy: UpratingPolicyInput,
): UpratingCalcResult {
  if (!Number.isFinite(currentMinor) || currentMinor < 0) {
    throw new Error('currentMinor must be a non-negative finite integer');
  }
  const rounding: BnUpratingRoundingMode = policy.rounding ?? 'NEAREST_1';

  const rawNew = applyPolicy(currentMinor, policy);
  let clampedByMinIncrease = false;
  let clampedByMaxIncrease = false;
  let clampedByFloor = false;
  let clampedByCeiling = false;

  let increase = rawNew - currentMinor;
  if (
    policy.minIncreaseMinor !== undefined &&
    increase < policy.minIncreaseMinor
  ) {
    increase = policy.minIncreaseMinor;
    clampedByMinIncrease = true;
  }
  if (
    policy.maxIncreaseMinor !== undefined &&
    increase > policy.maxIncreaseMinor
  ) {
    increase = policy.maxIncreaseMinor;
    clampedByMaxIncrease = true;
  }

  let newBeforeRound = currentMinor + increase;
  if (
    policy.floorNewMinor !== undefined &&
    newBeforeRound < policy.floorNewMinor
  ) {
    newBeforeRound = policy.floorNewMinor;
    clampedByFloor = true;
  }
  if (
    policy.ceilingNewMinor !== undefined &&
    newBeforeRound > policy.ceilingNewMinor
  ) {
    newBeforeRound = policy.ceilingNewMinor;
    clampedByCeiling = true;
  }

  const newMinor = roundMinor(newBeforeRound, rounding);
  const finalIncrease = newMinor - currentMinor;
  const increaseBp =
    currentMinor === 0
      ? 0
      : Math.round((finalIncrease / currentMinor) * 10_000);

  return {
    currentMinor,
    newMinor,
    increaseMinor: finalIncrease,
    increaseBp,
    rawNewBeforeClamp: rawNew,
    clampedByMinIncrease,
    clampedByMaxIncrease,
    clampedByFloor,
    clampedByCeiling,
    rounding,
  };
}

/**
 * Arrears calculator: number of covered periods × (new − current), for a
 * simple flat arrears model. More sophisticated period-weighted arrears
 * are computed in Slice 3 by the payment-schedule engine.
 */
export function calculateFlatArrearsMinor(
  currentMinor: number,
  newMinor: number,
  periodsCovered: number,
): number {
  if (periodsCovered < 0) throw new Error('periodsCovered must be ≥ 0');
  const diff = newMinor - currentMinor;
  if (diff <= 0) return 0;
  return diff * Math.floor(periodsCovered);
}

/** Deterministic idempotency key for a run-item execution. */
export function upratingItemIdempotencyKey(input: {
  readonly runId: string;
  readonly awardId: string;
  readonly policyVersionId: string;
  readonly effectiveDate: string;
}): string {
  return [
    input.runId,
    input.awardId,
    input.policyVersionId,
    input.effectiveDate,
  ].join('::');
}
