/**
 * Breach Evaluation Service — Compliance Module
 *
 * Passive observer layer for arrangement breach/default detection.
 * Does NOT modify payment screens or posting flows.
 *
 * Invokes:
 *   - ce-breach-monitor edge function (daily/on-demand)
 *   - ce_recalculate_breach_state RPC (post-reconciliation cure)
 *
 * Reads from:
 *   - ce_payment_arrangements
 *   - ce_installments
 *   - ce_arrangement_breaches
 */

import { supabase } from '@/integrations/supabase/client';

// ── Types ───────────────────────────────────────────────────

export interface BreachEvaluationParams {
  asOfDate?: string;
  graceDays?: number;
  actor?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface BreachEvaluationResult {
  ok: boolean;
  run_id?: string;
  already_completed?: boolean;
  result?: {
    as_of_date: string;
    grace_days: number;
    arrangements_scanned: number;
    installments_flagged_overdue: number;
    breaches_created: number;
    arrangements_defaulted: number;
    dry_run?: boolean;
    active_arrangements?: number;
    potentially_overdue_installments?: number;
  };
  error?: string;
}

export interface BreachCureResult {
  arrangement_id: string;
  previous_missed: number;
  current_missed: number;
  was_breached: boolean;
  is_breached: boolean;
  unresolved_breaches: number;
}

export interface ArrangementBreachSummary {
  id: string;
  arrangement_id: string;
  breach_type: string;
  description: string;
  detected_at: string;
  detected_by: string;
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

// ── Run breach evaluation (edge function) ───────────────────

export async function runBreachEvaluation(
  params: BreachEvaluationParams = {},
): Promise<BreachEvaluationResult> {
  const { data, error } = await supabase.functions.invoke('ce-breach-monitor', {
    body: {
      as_of_date: params.asOfDate,
      grace_days: params.graceDays,
      checked_by: params.actor,
      dry_run: params.dryRun ?? false,
      force: params.force ?? false,
    },
  });

  if (error) throw error;
  return data as BreachEvaluationResult;
}

// ── Recalculate breach state after payment cure ─────────────

export async function recalculateBreachState(
  arrangementId: string,
  actor: string = 'SYSTEM',
): Promise<BreachCureResult> {
  const { data, error } = await supabase.rpc(
    'ce_recalculate_breach_state' as any,
    { p_arrangement_id: arrangementId, p_actor: actor },
  );

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return row as BreachCureResult;
}

// ── Fetch breach history for an arrangement ─────────────────

export async function fetchArrangementBreaches(
  arrangementId: string,
): Promise<ArrangementBreachSummary[]> {
  const { data, error } = await supabase
    .from('ce_arrangement_breaches')
    .select('*')
    .eq('arrangement_id', arrangementId)
    .order('detected_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as ArrangementBreachSummary[];
}

// ── Fetch breach indicators for summary display ─────────────

export interface ArrangementBreachIndicators {
  breachDetected: boolean;
  breachDate: string | null;
  breachReason: string | null;
  missedPayments: number;
  maxMissedBeforeBreach: number;
  status: string;
  unresolvedBreachCount: number;
}

export async function fetchBreachIndicators(
  arrangementId: string,
): Promise<ArrangementBreachIndicators> {
  const [arrResult, breachResult] = await Promise.all([
    supabase
      .from('ce_payment_arrangements')
      .select('breach_detected, breach_date, breach_reason, missed_payments, max_missed_before_breach, status')
      .eq('id', arrangementId)
      .single(),
    supabase
      .from('ce_arrangement_breaches')
      .select('id')
      .eq('arrangement_id', arrangementId)
      .is('resolution', null),
  ]);

  if (arrResult.error) throw arrResult.error;
  const arr = arrResult.data;

  return {
    breachDetected: arr.breach_detected ?? false,
    breachDate: arr.breach_date,
    breachReason: arr.breach_reason,
    missedPayments: arr.missed_payments ?? 0,
    maxMissedBeforeBreach: arr.max_missed_before_breach ?? 2,
    status: arr.status ?? 'DRAFT',
    unresolvedBreachCount: breachResult.data?.length ?? 0,
  };
}
