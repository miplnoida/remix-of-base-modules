import { getOutstandingByHead } from "./ledgerBalanceService";
import { listLedgerHeads } from "./ledgerHeadService";

/**
 * Validation helpers (Phase 5).
 * Block / warn rules used by Legal, Compliance, Payments and Posting.
 */

export class LedgerValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

/**
 * A legal liability action must be backed by ledger source unless explicitly
 * marked manual/legacy. This is enforced at create time.
 */
export function assertLegalActionHasLedgerSource(args: {
  ledger_transaction_ids?: string[] | null;
  ledger_balance_snapshot?: unknown | null;
  is_manual_legacy?: boolean;
}): void {
  if (args.is_manual_legacy) return;
  const hasTxns = Array.isArray(args.ledger_transaction_ids) && args.ledger_transaction_ids.length > 0;
  const hasSnapshot = !!args.ledger_balance_snapshot;
  if (!hasTxns && !hasSnapshot) {
    throw new LedgerValidationError(
      "Legal liability action requires a ledger source (transaction ids or balance snapshot). Mark as manual/legacy if intentional.",
      "LEGAL_NO_LEDGER_SOURCE",
    );
  }
}

/**
 * Waivers may only be applied against waivable heads (penalty/fine/interest).
 * Principal heads are non-waivable.
 */
export async function assertWaiverAllowed(headCode: string): Promise<void> {
  const heads = await listLedgerHeads();
  const head = heads.find((h) => h.head_code === headCode);
  if (!head) throw new LedgerValidationError(`Unknown ledger head ${headCode}`, "UNKNOWN_HEAD");
  if (!head.is_waivable) {
    throw new LedgerValidationError(
      `Waivers are not allowed against principal head ${headCode}.`,
      "WAIVER_NOT_ALLOWED",
    );
  }
}

/**
 * Block allocation above the outstanding balance for a (head, period).
 */
export async function assertAllocationWithinOutstanding(args: {
  employer_id: string;
  head_code: string;
  allocated_amount: number;
}): Promise<void> {
  const outByHead = await getOutstandingByHead(args.employer_id);
  const outstanding = Number(outByHead[args.head_code] ?? 0);
  if (args.allocated_amount > outstanding + 0.005) {
    throw new LedgerValidationError(
      `Allocation ${args.allocated_amount.toFixed(2)} exceeds outstanding ${outstanding.toFixed(2)} for ${args.head_code}.`,
      "ALLOCATION_OVER_OUTSTANDING",
    );
  }
}
