/**
 * BN ↔ Legacy Calculation Comparison Service
 *
 * Parallel-run validation only. Captures the legacy BEMA calculation alongside
 * the new BN calculation for the same claim/benefit so reviewers can confirm
 * the new engine produces the expected amounts before cutover.
 *
 * Hard rules:
 *  - Read-only against legacy data. We never write back to cl_head / cl_detail_*.
 *  - Every write is stamped with the authenticated user_code (no SYSTEM fallback).
 *  - Diff visibility in Claim 360 is gated by the caller's permission check.
 */

import { supabase } from "@/integrations/supabase/client";
import { requireUserCode } from "@/lib/bn/requireUserCode";

export type ComparisonStatus =
  | "MATCH"
  | "WITHIN_TOLERANCE"
  | "MISMATCH"
  | "LEGACY_MISSING"
  | "BN_MISSING";

export interface ComparisonSnapshotInput {
  bnClaimId: string;
  legacyClaimNumber?: string | null;
  legacyClaimSeq?: number | null;
  benefitCode?: string | null;
  legacyAmount: number | null;
  bnAmount: number | null;
  rawLegacyJson?: unknown;
  rawBnJson?: unknown;
  notes?: string | null;
  /** Absolute tolerance for "within tolerance" classification. Default 0.01. */
  toleranceAmount?: number;
  /** Percent tolerance (e.g. 0.5 = 0.5%). Default 0.5. */
  tolerancePercent?: number;
}

export interface ComparisonSnapshot {
  id: string;
  bnClaimId: string;
  legacyClaimNumber: string | null;
  legacyClaimSeq: number | null;
  benefitCode: string | null;
  legacyAmount: number | null;
  bnAmount: number | null;
  differenceAmount: number | null;
  differencePercent: number | null;
  comparisonStatus: ComparisonStatus;
  comparisonNotes: string | null;
  capturedBy: string | null;
  capturedAt: string;
  rawLegacyJson: unknown;
  rawBnJson: unknown;
}

function classify(
  legacy: number | null,
  bn: number | null,
  diff: number | null,
  pct: number | null,
  tolAmt: number,
  tolPct: number,
): ComparisonStatus {
  if (legacy === null && bn === null) return "MISMATCH";
  if (legacy === null) return "LEGACY_MISSING";
  if (bn === null) return "BN_MISSING";
  if (diff === null) return "MISMATCH";
  if (Math.abs(diff) < 0.005) return "MATCH";
  if (Math.abs(diff) <= tolAmt || (pct !== null && Math.abs(pct) <= tolPct)) {
    return "WITHIN_TOLERANCE";
  }
  return "MISMATCH";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function rowToSnapshot(row: any): ComparisonSnapshot {
  return {
    id: row.id,
    bnClaimId: row.bn_claim_id ?? row.claim_id,
    legacyClaimNumber: row.legacy_claim_number ?? null,
    legacyClaimSeq: row.legacy_claim_seq ?? null,
    benefitCode: row.benefit_code ?? null,
    legacyAmount: row.legacy_amount === null || row.legacy_amount === undefined ? null : Number(row.legacy_amount),
    bnAmount: row.bn_amount === null || row.bn_amount === undefined ? null : Number(row.bn_amount),
    differenceAmount:
      row.difference_amount === null || row.difference_amount === undefined ? null : Number(row.difference_amount),
    differencePercent:
      row.difference_percent === null || row.difference_percent === undefined ? null : Number(row.difference_percent),
    comparisonStatus: (row.comparison_status as ComparisonStatus) ?? "MISMATCH",
    comparisonNotes: row.comparison_notes ?? row.notes ?? null,
    capturedBy: row.captured_by ?? null,
    capturedAt: row.captured_at,
    rawLegacyJson: row.raw_legacy_json ?? row.legacy_raw_output ?? null,
    rawBnJson: row.raw_bn_json ?? null,
  };
}

/**
 * Persist a parallel-run snapshot. Computes diff/percent and classification
 * server-side-of-the-client (deterministic math, not user-provided).
 */
export async function captureComparisonSnapshot(
  input: ComparisonSnapshotInput,
  userCode: string | null | undefined,
): Promise<ComparisonSnapshot> {
  const actor = requireUserCode(userCode, "capture BN/legacy calculation comparison");

  const tolAmt = input.toleranceAmount ?? 0.01;
  const tolPct = input.tolerancePercent ?? 0.5;

  const legacy = input.legacyAmount;
  const bn = input.bnAmount;
  const diff = legacy !== null && bn !== null ? round2(bn - legacy) : null;
  const pct =
    legacy !== null && bn !== null && legacy !== 0
      ? round4(((bn - legacy) / Math.abs(legacy)) * 100)
      : legacy === 0 && bn !== null && bn !== 0
        ? null
        : legacy === 0 && bn === 0
          ? 0
          : null;
  const status = classify(legacy, bn, diff, pct, tolAmt, tolPct);

  const payload: Record<string, any> = {
    bn_claim_id: input.bnClaimId,
    claim_id: input.bnClaimId, // keep legacy column populated for back-compat readers
    legacy_claim_number: input.legacyClaimNumber ?? null,
    legacy_claim_seq: input.legacyClaimSeq ?? null,
    benefit_code: input.benefitCode ?? null,
    legacy_amount: legacy,
    bn_amount: bn,
    difference_amount: diff,
    difference_percent: pct,
    comparison_status: status,
    comparison_notes: input.notes ?? null,
    raw_legacy_json: input.rawLegacyJson ?? null,
    raw_bn_json: input.rawBnJson ?? null,
    captured_by: actor,
    captured_at: new Date().toISOString(),
    entered_by: actor,
    modified_by: actor,
  };

  const { data, error } = await supabase
    .from("bn_calc_legacy_snapshot")
    .insert(payload as any)
    .select("*")
    .single();

  if (error) throw error;
  return rowToSnapshot(data);
}

/** List snapshots for a BN claim (most recent first). */
export async function listSnapshotsForClaim(bnClaimId: string): Promise<ComparisonSnapshot[]> {
  const { data, error } = await supabase
    .from("bn_calc_legacy_snapshot")
    .select("*")
    .or(`bn_claim_id.eq.${bnClaimId},claim_id.eq.${bnClaimId}`)
    .order("captured_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToSnapshot);
}

/** Summary helper for Claim 360 badge. */
export function summarizeSnapshots(snapshots: ComparisonSnapshot[]): {
  total: number;
  matches: number;
  withinTolerance: number;
  mismatches: number;
  worstAbsDiff: number;
  latest: ComparisonSnapshot | null;
} {
  let matches = 0;
  let withinTolerance = 0;
  let mismatches = 0;
  let worstAbsDiff = 0;
  for (const s of snapshots) {
    if (s.comparisonStatus === "MATCH") matches++;
    else if (s.comparisonStatus === "WITHIN_TOLERANCE") withinTolerance++;
    else mismatches++;
    if (s.differenceAmount !== null) {
      worstAbsDiff = Math.max(worstAbsDiff, Math.abs(s.differenceAmount));
    }
  }
  return {
    total: snapshots.length,
    matches,
    withinTolerance,
    mismatches,
    worstAbsDiff,
    latest: snapshots[0] ?? null,
  };
}
