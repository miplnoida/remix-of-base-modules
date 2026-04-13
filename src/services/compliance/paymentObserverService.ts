/**
 * Payment Observer Service — Passive Compliance Layer
 *
 * This service provides a READ-ONLY observation boundary between the
 * financial ledger (ce_employer_financial_ledger) and the Compliance module.
 *
 * DESIGN PRINCIPLES:
 * 1. PASSIVE OBSERVER — does NOT modify payment screens or ce_post_ledger_entry.
 * 2. PULL-BASED — Compliance asks "what's new?" rather than being pushed to.
 * 3. IDEMPOTENT — same entry can be fetched or marked multiple times safely.
 * 4. SOURCE OF TRUTH — the ledger is authoritative; this layer only tracks
 *    what Compliance has already acknowledged ("observed").
 *
 * The observation log (ce_payment_observation_log) is a lightweight marker
 * table — it does NOT duplicate ledger data. The view
 * ce_v_unobserved_payment_entries performs the LEFT JOIN exclusion to
 * surface only new entries.
 */

import { supabase } from '@/integrations/supabase/client';

// ── Types ──────────────────────────────────────────────────────

/** Shape of an unobserved payment entry returned by the RPC / view. */
export interface UnobservedPaymentEntry {
  ledger_entry_id: string;
  employer_id: string;
  employer_name: string | null;
  entry_type: string;        // PAYMENT_RECEIVED | ARRANGEMENT_CREDIT | REFUND
  fund_type: string;         // SS | PE | LEVY etc.
  period: string;            // YYYYMM
  credit_amount: number;
  ledger_idempotency_key: string;
  reference_type: string | null;
  reference_id: string | null;
  description: string;
  posted_by: string;
  posted_at: string;
}

/** Observation types — what happened when Compliance saw the entry. */
export type ObservationType = 'DETECTED' | 'ALLOCATED' | 'SKIPPED';

/** Result of marking an entry as observed. */
export interface ObservationResult {
  observation_id: string;
  was_duplicate: boolean;
}

// ── Fetch unobserved payments ──────────────────────────────────

/**
 * Fetch ledger payment entries that Compliance has not yet observed.
 * Calls the ce_fetch_unobserved_payments RPC (read-only, idempotent).
 *
 * @param employerId - Optional employer filter. Omit for all employers.
 * @param limit      - Max rows (default 200, capped server-side).
 */
export async function fetchUnobservedPayments(
  employerId?: string,
  limit: number = 200,
): Promise<UnobservedPaymentEntry[]> {
  const { data, error } = await supabase.rpc('ce_fetch_unobserved_payments', {
    p_employer_id: employerId ?? null,
    p_limit: limit,
  });

  if (error) throw error;
  return (data ?? []) as unknown as UnobservedPaymentEntry[];
}

// ── Mark a payment as observed ─────────────────────────────────

/**
 * Mark a single ledger entry as observed by Compliance.
 * Idempotent — safe to call multiple times for the same entry + type.
 *
 * @returns The observation log row ID and whether it was a duplicate call.
 */
export async function markPaymentObserved(
  ledgerEntryId: string,
  employerId: string,
  observationType: ObservationType = 'DETECTED',
  notes?: string,
  observedBy: string = 'SYSTEM',
): Promise<ObservationResult> {
  const { data, error } = await supabase.rpc('ce_mark_payment_observed', {
    p_ledger_entry_id: ledgerEntryId,
    p_employer_id: employerId,
    p_observation_type: observationType,
    p_notes: notes ?? null,
    p_observed_by: observedBy,
  });

  if (error) throw error;

  // The RPC returns the observation ID (existing or new).
  // We can't distinguish duplicate vs new from the UUID alone,
  // but the caller can safely treat it as idempotent either way.
  return {
    observation_id: data as string,
    was_duplicate: false, // conservative; true dedup is handled DB-side
  };
}

// ── Batch observe ──────────────────────────────────────────────

/**
 * Convenience: fetch all unobserved entries for an employer and mark
 * each as DETECTED. Returns the list so upstream code can decide
 * what to do next (allocate, skip, etc.).
 *
 * This is the primary entry point for a scheduled reconciliation job
 * or a manual "check for new payments" action.
 */
export async function detectNewPayments(
  employerId?: string,
  observedBy: string = 'SYSTEM',
): Promise<UnobservedPaymentEntry[]> {
  const entries = await fetchUnobservedPayments(employerId);

  // Mark each as DETECTED (idempotent, so partial failures are safe)
  for (const entry of entries) {
    await markPaymentObserved(
      entry.ledger_entry_id,
      entry.employer_id,
      'DETECTED',
      `Auto-detected by compliance observer`,
      observedBy,
    );
  }

  return entries;
}

// ── Observation log queries ────────────────────────────────────

/**
 * Fetch the observation log for a specific employer (audit/debug).
 */
export async function fetchObservationLog(
  employerId: string,
  limit: number = 50,
) {
  const { data, error } = await supabase
    .from('ce_payment_observation_log' as any)
    .select('*')
    .eq('employer_id', employerId)
    .order('observed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
