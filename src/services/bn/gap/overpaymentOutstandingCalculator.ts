/**
 * BN Overpayments — Outstanding balance calculator.
 *
 * Slice 1 of the Overpayment Recovery epic.
 *
 * Pure function. Outstanding balance is DERIVED from approved financial
 * events; it is never manually typed. This is the single algorithm used by
 * the workspace summary, Award 360 alerts, reconciliation, and reporting.
 *
 *   outstanding = confirmed − waived − writtenOff − recovered + reversed
 *
 * Negative outstanding is clamped to 0 with a `hasOverAllocation` flag so
 * that reconciliation UI can surface the anomaly instead of silently
 * absorbing it.
 */

export type BnRecoveryTransactionKind =
  | 'RECEIPT'         // Payment from claimant / third party
  | 'DEDUCTION'       // Withheld from a future benefit payment
  | 'WAIVER'          // Approved waiver amount
  | 'WRITE_OFF'       // Approved write-off amount
  | 'REVERSAL'        // Reverses a previously recorded transaction
  | 'ADJUSTMENT';     // Manual correction (rare, admin only)

export interface BnRecoveryTransactionSlice {
  readonly kind: BnRecoveryTransactionKind;
  readonly amount: number;      // Positive absolute magnitude
  readonly approved: boolean;   // Unapproved rows never affect the balance
  readonly reversedByTxnId?: string | null;
  readonly txnId?: string;
}

export interface BnOverpaymentBalanceInput {
  readonly confirmedLiability: number;
  readonly transactions: readonly BnRecoveryTransactionSlice[];
}

export interface BnOverpaymentBalance {
  readonly confirmed: number;
  readonly waived: number;
  readonly writtenOff: number;
  readonly recovered: number;     // Receipts + deductions (approved, not reversed)
  readonly reversed: number;      // Sum of reversal magnitudes
  readonly outstanding: number;   // Clamped to ≥ 0
  readonly hasOverAllocation: boolean;
  readonly isFullyRecovered: boolean;
  readonly isFullyWaived: boolean;
  readonly isFullyWrittenOff: boolean;
}

/**
 * Compute the outstanding balance for an overpayment.
 *
 * Transactions with `approved === false` are ignored — pending approvals
 * must never move the balance until an authorised command approves them.
 * A transaction referenced by a REVERSAL row (`reversedByTxnId`) is
 * excluded from its category and the reversal contributes to `reversed`.
 */
export function computeOverpaymentBalance(
  input: BnOverpaymentBalanceInput,
): BnOverpaymentBalance {
  const reversedIds = new Set<string>();
  let reversed = 0;
  for (const t of input.transactions) {
    if (!t.approved) continue;
    if (t.kind === 'REVERSAL' && t.reversedByTxnId) {
      reversedIds.add(t.reversedByTxnId);
      reversed += Math.abs(t.amount);
    }
  }

  let waived = 0;
  let writtenOff = 0;
  let recovered = 0;

  for (const t of input.transactions) {
    if (!t.approved) continue;
    if (t.txnId && reversedIds.has(t.txnId)) continue;

    const amt = Math.abs(t.amount);
    switch (t.kind) {
      case 'WAIVER':      waived += amt; break;
      case 'WRITE_OFF':   writtenOff += amt; break;
      case 'RECEIPT':
      case 'DEDUCTION':   recovered += amt; break;
      case 'ADJUSTMENT':  recovered += amt; break;
      case 'REVERSAL':    /* handled above */ break;
    }
  }

  const raw = input.confirmedLiability - waived - writtenOff - recovered + reversed;
  const outstanding = Math.max(0, round2(raw));
  const hasOverAllocation = raw < -0.005;

  const confirmed = round2(input.confirmedLiability);
  return {
    confirmed,
    waived: round2(waived),
    writtenOff: round2(writtenOff),
    recovered: round2(recovered),
    reversed: round2(reversed),
    outstanding,
    hasOverAllocation,
    isFullyRecovered: outstanding === 0 && recovered > 0,
    isFullyWaived:    confirmed > 0 && round2(waived) >= confirmed,
    isFullyWrittenOff: confirmed > 0 && round2(writtenOff) >= confirmed,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
