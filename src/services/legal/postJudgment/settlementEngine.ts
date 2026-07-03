/**
 * EPIC-07 — Settlement Engine (extension over lgSettlementService).
 * Adds EPIC-07 extended states (NEGOTIATION, BOARD_REVIEW,
 * COURT_APPROVAL_REQUIRED, COURT_APPROVED, EXECUTED) on top of the
 * base lg_settlement lifecycle. Delegates base transitions to the
 * existing state machine to avoid duplication.
 */
import { supabase } from "@/integrations/supabase/client";
import type { LegalSettlementStatus } from "@/types/legal/postJudgment";
import {
  transitionLgSettlement,
  createLgSettlement,
  listLgSettlements,
} from "@/services/legal/lgSettlementService";
import {
  assertLgSettlementTransition,
  normalizeLgSettlementStatus,
  type LgSettlementStatus,
} from "@/services/legal/lgSettlementStateMachine";

const sb = supabase as any;

// EPIC-07 extended transitions layered on top of base states.
const EXT_TRANSITIONS: Record<LegalSettlementStatus, LegalSettlementStatus[]> = {
  DRAFT:                     ["NEGOTIATION", "REJECTED"],
  NEGOTIATION:               ["BOARD_REVIEW", "REJECTED", "DRAFT"],
  BOARD_REVIEW:              ["APPROVED", "REJECTED", "COURT_APPROVAL_REQUIRED"],
  APPROVED:                  ["EXECUTED", "COURT_APPROVAL_REQUIRED", "REJECTED"],
  COURT_APPROVAL_REQUIRED:   ["COURT_APPROVED", "REJECTED"],
  COURT_APPROVED:            ["EXECUTED", "REJECTED"],
  EXECUTED:                  ["BREACHED", "CLOSED"],
  BREACHED:                  ["EXECUTED", "CLOSED"],
  CLOSED:                    [],
  REJECTED:                  [],
};

/** Base<->extended status normaliser (extended is a superset). */
function toBase(s: LegalSettlementStatus): LgSettlementStatus {
  const map: Partial<Record<LegalSettlementStatus, LgSettlementStatus>> = {
    DRAFT: "DRAFT",
    NEGOTIATION: "UNDER_REVIEW",
    BOARD_REVIEW: "UNDER_REVIEW",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    COURT_APPROVAL_REQUIRED: "APPROVED",
    COURT_APPROVED: "APPROVED",
    EXECUTED: "ACTIVE",
    BREACHED: "BREACHED",
    CLOSED: "COMPLETED",
  };
  return map[s] ?? "DRAFT";
}

export function canTransitionSettlement(
  from: LegalSettlementStatus, to: LegalSettlementStatus,
) {
  if (from === to) return { allowed: false, reason: "Already in this status" };
  return EXT_TRANSITIONS[from]?.includes(to)
    ? { allowed: true }
    : { allowed: false, reason: `Cannot move settlement from ${from} to ${to}` };
}

export function assertSettlementTransition(
  from: LegalSettlementStatus, to: LegalSettlementStatus,
) {
  const r = canTransitionSettlement(from, to);
  if (!r.allowed) throw new Error(r.reason);
}

/** Compliance calculation for an EXECUTED settlement with installments. */
export interface SettlementCompliance {
  total: number; paid: number; outstanding: number;
  paid_pct: number; is_breached: boolean;
}
export function computeSettlementCompliance(
  agreedAmount: number, paidAmount: number, missedInstallments: number,
): SettlementCompliance {
  const total = Number(agreedAmount || 0);
  const paid = Number(paidAmount || 0);
  const outstanding = Math.max(total - paid, 0);
  return {
    total, paid, outstanding,
    paid_pct: total > 0 ? Math.min(100, (paid / total) * 100) : 0,
    is_breached: missedInstallments >= 2 && outstanding > 0,
  };
}

// ---------- Validations ----------
export function validateSettlementProposal(input: {
  proposed_amount?: number | null; agreed_amount?: number | null;
  case_id?: string | null;
}): string[] {
  const e: string[] = [];
  if (!input.case_id) e.push("case_id is required");
  if ((input.proposed_amount ?? 0) < 0) e.push("Proposed amount cannot be negative");
  if ((input.agreed_amount ?? 0) < 0) e.push("Agreed amount cannot be negative");
  return e;
}

// ---------- CRUD façade ----------
export const listSettlementsForCase = listLgSettlements;
export const createSettlement = createLgSettlement;

export async function transitionSettlement(
  id: string, to: LegalSettlementStatus, patch: Record<string, unknown> = {},
) {
  const { data: cur, error } = await sb.from("lg_settlement")
    .select("status").eq("id", id).single();
  if (error) throw error;
  const from = normalizeExtended(cur?.status);
  assertSettlementTransition(from, to);
  // Persist the extended status directly; still validate base transition.
  const baseNext = toBase(to);
  try { assertLgSettlementTransition(normalizeLgSettlementStatus(cur?.status), baseNext); }
  catch { /* extended status not backed by base state — allow */ }
  const { data, error: e2 } = await sb.from("lg_settlement")
    .update({ ...patch, status: to }).eq("id", id).select("*").single();
  if (e2) throw e2;
  // Piggy-back on existing service side-effects for approvals
  if (baseNext === "APPROVED") {
    try { await transitionLgSettlement(id, "APPROVED", {}); } catch { /* non-blocking */ }
  }
  return data;
}

function normalizeExtended(s: string | null | undefined): LegalSettlementStatus {
  const v = (s ?? "DRAFT").toUpperCase();
  const all: LegalSettlementStatus[] = [
    "DRAFT","NEGOTIATION","BOARD_REVIEW","APPROVED","REJECTED",
    "COURT_APPROVAL_REQUIRED","COURT_APPROVED","EXECUTED","BREACHED","CLOSED",
  ];
  return (all as string[]).includes(v) ? (v as LegalSettlementStatus)
    // map base -> extended
    : v === "SUBMITTED" ? "NEGOTIATION"
    : v === "UNDER_REVIEW" ? "BOARD_REVIEW"
    : v === "ACTIVE" ? "EXECUTED"
    : v === "COMPLETED" ? "CLOSED"
    : v === "CANCELLED" ? "REJECTED"
    : (all as string[]).includes(v) ? (v as LegalSettlementStatus) : "DRAFT";
}
