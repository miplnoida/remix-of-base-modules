/**
 * BN Overpayments — Explicit Benefits ↔ Finance integration contract.
 *
 * Slice 1 of the Overpayment Recovery epic.
 *
 * Benefits owns: cause, affected periods, liability decision, recovery
 * recommendation, effect on future benefit.
 * Finance owns:  accounts receivable, receipt processing, accounting
 * entries, allocation, financial reconciliation, external collection.
 *
 * Benefits code MUST NOT write directly to any finance-ledger table. All
 * cross-boundary interactions go through this contract. In runtime the
 * contract is fulfilled by an edge function that calls Finance RPCs; in
 * tests it is fulfilled by an in-memory adapter.
 *
 * The types here are the source of truth for both sides.
 */

// ── Outbound (Benefits → Finance) ────────────────────────────────────────

export interface FinancePublishLiabilityConfirmed {
  readonly kind: 'LIABILITY_CONFIRMED';
  readonly overpaymentId: string;
  readonly amount: number;
  readonly currency: string;
  readonly confirmedAt: string;      // ISO
  readonly confirmedBy: string;      // staff id
  readonly causeCode: string;
  readonly benefitProductVersionId?: string | null;
  readonly claimId?: string | null;
  readonly personId?: string | null;
}

export interface FinancePublishReceiptRecorded {
  readonly kind: 'RECEIPT_RECORDED';
  readonly overpaymentId: string;
  readonly receiptRef: string;
  readonly amount: number;
  readonly currency: string;
  readonly receivedAt: string;
  readonly channel: 'CASH' | 'CHEQUE' | 'EFT' | 'CARD' | 'DEDUCTION' | 'OTHER';
  readonly externalReference?: string | null;
}

export interface FinancePublishWaiverApproved {
  readonly kind: 'WAIVER_APPROVED';
  readonly overpaymentId: string;
  readonly waiverRequestId: string;
  readonly amount: number;
  readonly currency: string;
  readonly reasonCode: string;
  readonly approvedAt: string;
  readonly approvedBy: string;
}

export interface FinancePublishWriteOffApproved {
  readonly kind: 'WRITEOFF_APPROVED';
  readonly overpaymentId: string;
  readonly writeoffRequestId: string;
  readonly amount: number;
  readonly currency: string;
  readonly reasonCode: string;
  readonly approvedAt: string;
  readonly approvedBy: string;
}

export interface FinancePublishReversal {
  readonly kind: 'TRANSACTION_REVERSED';
  readonly overpaymentId: string;
  readonly reversedTxnId: string;
  readonly amount: number;
  readonly currency: string;
  readonly reasonCode: string;
  readonly reversedAt: string;
  readonly reversedBy: string;
}

export type FinanceOutboundEvent =
  | FinancePublishLiabilityConfirmed
  | FinancePublishReceiptRecorded
  | FinancePublishWaiverApproved
  | FinancePublishWriteOffApproved
  | FinancePublishReversal;

// ── Inbound (Finance → Benefits) ─────────────────────────────────────────

export interface FinanceReceiptAck {
  readonly financeReceiptId: string;
  readonly journalEntryId: string;
  readonly acceptedAt: string;
}

export interface FinanceAllocationAck {
  readonly financeAllocationId: string;
  readonly allocatedAt: string;
  readonly remainingReceiptBalance: number;
}

export interface FinanceArBalance {
  readonly overpaymentId: string;
  readonly arBalance: number;
  readonly currency: string;
  readonly asOf: string;
}

// ── Port (adapter interface) ─────────────────────────────────────────────

export interface OverpaymentFinancePort {
  publish(event: FinanceOutboundEvent): Promise<{ readonly acknowledgedAt: string; readonly correlationId: string }>;
  ackReceipt(overpaymentId: string, receiptRef: string): Promise<FinanceReceiptAck>;
  ackAllocation(overpaymentId: string, allocationId: string): Promise<FinanceAllocationAck>;
  getArBalance(overpaymentId: string): Promise<FinanceArBalance>;
}

/**
 * Guard used by the command pipeline in tests and diagnostics — proves the
 * outbound payload has the mandatory Finance boundary fields. Never trust
 * a partially populated event; Finance reconciliation depends on all
 * fields being present.
 */
export function assertFinanceOutboundPayload(evt: FinanceOutboundEvent): void {
  if (!evt.overpaymentId) throw new Error('FINANCE_CONTRACT: overpaymentId required');
  if (!('amount' in evt) || typeof evt.amount !== 'number' || Number.isNaN(evt.amount)) {
    throw new Error(`FINANCE_CONTRACT: numeric amount required on ${evt.kind}`);
  }
  if (!('currency' in evt) || !evt.currency) {
    throw new Error(`FINANCE_CONTRACT: currency required on ${evt.kind}`);
  }
  if (evt.amount < 0) {
    throw new Error(`FINANCE_CONTRACT: amount must be non-negative on ${evt.kind}`);
  }
}

/**
 * Whitelist of Finance-owned tables that Benefits code must NOT write to.
 * The gap-modules architecture guard enforces this against the codebase.
 */
export const FINANCE_OWNED_TABLES: readonly string[] = [
  'cn_payments_journal',
  'cn_adjustments_journal',
  'cn_refund_journal',
  'cn_return_journal',
  'cn_fines_journal',
  'core_ledger_head',
  'core_ledger_payment_allocation',
  'core_employer_ledger_transaction',
  'core_employer_ledger_balance',
];
