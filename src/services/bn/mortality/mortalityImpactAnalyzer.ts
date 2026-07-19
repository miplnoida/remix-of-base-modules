/**
 * BN Mortality — Pure impact-analysis calculator (Slice 1).
 *
 * Given a verified date-of-death and a snapshot of the person's active
 * awards, scheduled payments, and issued payments, this pure function
 * computes the operational impact that must be reviewed BEFORE any
 * permanent change is executed against Awards, Payments, Survivor, Funeral,
 * or Legal modules.
 *
 * The analyser makes NO IO calls. Callers assemble the snapshot; the
 * command handlers in Slice 3 will consume its output within a transaction.
 *
 * All monetary values are integer minor units. The analyser never mutates
 * inputs.
 */

export interface AwardSnapshot {
  readonly awardId: string;
  readonly productCode: string;
  readonly status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED' | 'HELD';
  /** ISO date (yyyy-mm-dd) or null if open-ended. */
  readonly effectiveTo: string | null;
  /** Whether this product allows survivor continuation. */
  readonly survivorEligible: boolean;
  /** Whether this product is jointly payable (spouse). */
  readonly jointlyPayable: boolean;
}

export interface ScheduledPaymentSnapshot {
  readonly instructionId: string;
  readonly awardId: string;
  /** Period-start yyyy-mm-dd covered by the payment. */
  readonly periodStart: string;
  /** Period-end yyyy-mm-dd covered by the payment (inclusive). */
  readonly periodEnd: string;
  /** yyyy-mm-dd when the payment is scheduled to be released. */
  readonly scheduledOn: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly issued: boolean;
}

export interface MortalityImpactInput {
  readonly personRef: string;
  readonly dateOfDeath: string;                // yyyy-mm-dd (verified)
  readonly awards: readonly AwardSnapshot[];
  readonly payments: readonly ScheduledPaymentSnapshot[];
  readonly gracePeriodDays?: number;           // policy: final payable period
  readonly lowValueWriteOffMinor?: number;     // policy: below-threshold PAD write-off
  readonly hasExistingFuneralClaim?: boolean;
  readonly hasExistingSurvivorClaim?: boolean;
  readonly estateRecoveryThresholdMinor?: number;
}

export interface MortalityImpactResult {
  readonly personRef: string;
  readonly dateOfDeath: string;
  readonly activeAwardIds: readonly string[];
  readonly suspendedAwardIds: readonly string[];
  readonly awardsToHold: readonly string[];
  readonly awardsToTerminate: readonly string[];
  readonly scheduledUnpaidToStop: readonly string[];
  readonly issuedAfterDeath: readonly string[];
  readonly paymentsCoveringAfterDeath: readonly string[];
  readonly recoverableAmountMinor: number;
  readonly nonRecoverableAmountMinor: number;
  readonly openSurvivorOpportunity: boolean;
  readonly openFuneralOpportunity: boolean;
  readonly requiresEstateReferral: boolean;
  readonly duplicateFollowOnRisk: boolean;
}

const MS_PER_DAY = 86_400_000;

function toDate(iso: string): Date {
  // Force UTC midnight to avoid TZ drift in pure comparisons.
  return new Date(`${iso}T00:00:00Z`);
}

function addDaysIso(iso: string, days: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function analyseMortalityImpact(
  input: MortalityImpactInput,
): MortalityImpactResult {
  const dod = toDate(input.dateOfDeath);
  const grace = Math.max(0, input.gracePeriodDays ?? 0);
  const finalPayableUntil = addDaysIso(input.dateOfDeath, grace);
  const lowValueThresh = Math.max(0, input.lowValueWriteOffMinor ?? 0);
  const estateThresh = Math.max(0, input.estateRecoveryThresholdMinor ?? 0);

  const active = input.awards.filter((a) => a.status === 'ACTIVE');
  const suspended = input.awards.filter((a) => a.status === 'SUSPENDED');

  const awardsToHold = active.map((a) => a.awardId);
  // Jointly payable awards defer termination pending survivor continuation.
  const awardsToTerminate = active
    .filter((a) => !a.jointlyPayable)
    .map((a) => a.awardId);

  const scheduledUnpaidToStop: string[] = [];
  const issuedAfterDeath: string[] = [];
  const paymentsCoveringAfterDeath: string[] = [];
  let recoverableAmountMinor = 0;
  let nonRecoverableAmountMinor = 0;

  for (const p of input.payments) {
    const scheduled = toDate(p.scheduledOn);
    const periodEnd = toDate(p.periodEnd);
    const coversAfterDeath = periodEnd.getTime() > dod.getTime();
    const scheduledAfterFinalPayable =
      scheduled.getTime() > toDate(finalPayableUntil).getTime();

    if (!p.issued && scheduledAfterFinalPayable) {
      scheduledUnpaidToStop.push(p.instructionId);
      continue;
    }
    if (p.issued && scheduled.getTime() > dod.getTime()) {
      issuedAfterDeath.push(p.instructionId);
      if (p.amountMinor <= lowValueThresh) {
        nonRecoverableAmountMinor += p.amountMinor;
      } else {
        recoverableAmountMinor += p.amountMinor;
      }
    }
    if (coversAfterDeath) {
      paymentsCoveringAfterDeath.push(p.instructionId);
    }
  }

  const openSurvivorOpportunity =
    !input.hasExistingSurvivorClaim && active.some((a) => a.survivorEligible);
  const openFuneralOpportunity = !input.hasExistingFuneralClaim;
  const requiresEstateReferral =
    recoverableAmountMinor >= estateThresh && estateThresh > 0;

  return {
    personRef: input.personRef,
    dateOfDeath: input.dateOfDeath,
    activeAwardIds: active.map((a) => a.awardId),
    suspendedAwardIds: suspended.map((a) => a.awardId),
    awardsToHold,
    awardsToTerminate,
    scheduledUnpaidToStop,
    issuedAfterDeath,
    paymentsCoveringAfterDeath,
    recoverableAmountMinor,
    nonRecoverableAmountMinor,
    openSurvivorOpportunity,
    openFuneralOpportunity,
    requiresEstateReferral,
    duplicateFollowOnRisk:
      Boolean(input.hasExistingSurvivorClaim) ||
      Boolean(input.hasExistingFuneralClaim),
  };
}

/** Days between two ISO dates (used by policy calculators). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (toDate(toIso).getTime() - toDate(fromIso).getTime()) / MS_PER_DAY,
  );
}
