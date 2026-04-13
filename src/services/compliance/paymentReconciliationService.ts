/**
 * Payment Arrangement Reconciliation Service
 *
 * Extends the passive payment observer to allocate posted ledger
 * payments against ACTIVE payment arrangements and their installments.
 *
 * DESIGN:
 * - All allocation logic lives in the DB function
 *   ce_reconcile_ledger_payment_to_arrangement (server-side, atomic).
 * - This service is a thin typed wrapper — no business logic in the client.
 * - Idempotent: same ledger entry can be submitted multiple times safely.
 * - Does NOT modify payment screens or posting flows.
 */

import { supabase } from '@/integrations/supabase/client';
import type { UnobservedPaymentEntry } from './paymentObserverService';
import { fetchUnobservedPayments } from './paymentObserverService';

// ── Types ──────────────────────────────────────────────────────

/** Result shape from ce_reconcile_ledger_payment_to_arrangement RPC */
export interface ReconcileResult {
  observation_id: string | null;
  arrangement_id: string | null;
  allocated_amount: number;
  installments_touched: number;
  arrangement_completed: boolean;
  was_duplicate: boolean;
}

/** Summary of a batch reconciliation run */
export interface ReconciliationRunSummary {
  total_entries: number;
  allocated: number;
  skipped_no_arrangement: number;
  duplicates: number;
  errors: number;
  arrangements_completed: number;
  total_allocated_amount: number;
  results: ReconcileEntryResult[];
}

export interface ReconcileEntryResult {
  ledger_entry_id: string;
  employer_id: string;
  credit_amount: number;
  result: ReconcileResult | null;
  error: string | null;
}

// ── Single entry reconciliation ────────────────────────────────

/**
 * Reconcile a single posted ledger entry against payment arrangements.
 * Idempotent — returns was_duplicate: true if already processed.
 */
export async function reconcileLedgerPayment(
  ledgerEntryId: string,
  actor: string = 'SYSTEM',
): Promise<ReconcileResult> {
  const { data, error } = await supabase.rpc(
    'ce_reconcile_ledger_payment_to_arrangement' as any,
    {
      p_ledger_entry_id: ledgerEntryId,
      p_actor: actor,
    },
  );

  if (error) throw error;

  // RPC returns a single composite row
  const row = data as any;
  return {
    observation_id: row?.observation_id ?? null,
    arrangement_id: row?.arrangement_id ?? null,
    allocated_amount: Number(row?.allocated_amount ?? 0),
    installments_touched: Number(row?.installments_touched ?? 0),
    arrangement_completed: Boolean(row?.arrangement_completed),
    was_duplicate: Boolean(row?.was_duplicate),
  };
}

// ── Batch reconciliation ───────────────────────────────────────

/**
 * Fetch all unobserved payment entries and attempt to reconcile each
 * against payment arrangements. Returns a full summary.
 *
 * This is the primary entry point for:
 * - A scheduled automation job
 * - A manual "Reconcile Payments" admin action
 */
export async function reconcileUnobservedPayments(
  employerId?: string,
  actor: string = 'SYSTEM',
): Promise<ReconciliationRunSummary> {
  const entries = await fetchUnobservedPayments(employerId);

  const summary: ReconciliationRunSummary = {
    total_entries: entries.length,
    allocated: 0,
    skipped_no_arrangement: 0,
    duplicates: 0,
    errors: 0,
    arrangements_completed: 0,
    total_allocated_amount: 0,
    results: [],
  };

  for (const entry of entries) {
    const entryResult: ReconcileEntryResult = {
      ledger_entry_id: entry.ledger_entry_id,
      employer_id: entry.employer_id,
      credit_amount: entry.credit_amount,
      result: null,
      error: null,
    };

    try {
      const result = await reconcileLedgerPayment(entry.ledger_entry_id, actor);
      entryResult.result = result;

      if (result.was_duplicate) {
        summary.duplicates++;
      } else if (result.arrangement_id) {
        summary.allocated++;
        summary.total_allocated_amount += result.allocated_amount;
        if (result.arrangement_completed) {
          summary.arrangements_completed++;
        }
      } else {
        summary.skipped_no_arrangement++;
      }
    } catch (err: any) {
      entryResult.error = err?.message ?? String(err);
      summary.errors++;
    }

    summary.results.push(entryResult);
  }

  return summary;
}

// ── Arrangement summary recalculation ──────────────────────────

/**
 * Recalculate arrangement summary totals from installment data.
 * Useful for repair or audit — does not process new payments.
 */
export async function recalculateArrangementSummary(
  arrangementId: string,
  actor: string = 'SYSTEM',
): Promise<void> {
  const { error } = await supabase.rpc(
    'ce_recalculate_arrangement_summary' as any,
    {
      p_arrangement_id: arrangementId,
      p_actor: actor,
    },
  );

  if (error) throw error;
}

// ── Query helpers ──────────────────────────────────────────────

/**
 * Fetch arrangement with its installments for display/review.
 */
export async function fetchArrangementWithInstallments(arrangementId: string) {
  const [arrResult, instResult] = await Promise.all([
    supabase
      .from('ce_payment_arrangements')
      .select('*')
      .eq('id', arrangementId)
      .single(),
    supabase
      .from('ce_installments')
      .select('*')
      .eq('arrangement_id', arrangementId)
      .order('installment_number', { ascending: true }),
  ]);

  if (arrResult.error) throw arrResult.error;
  if (instResult.error) throw instResult.error;

  return {
    arrangement: arrResult.data,
    installments: instResult.data ?? [],
  };
}

/**
 * Fetch arrangements for a specific employer that are ACTIVE.
 */
export async function fetchActiveArrangementsForEmployer(employerId: string) {
  const { data, error } = await supabase
    .from('ce_payment_arrangements')
    .select('*')
    .eq('employer_id', employerId)
    .eq('status', 'ACTIVE')
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
