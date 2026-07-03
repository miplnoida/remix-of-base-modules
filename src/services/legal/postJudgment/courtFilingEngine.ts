/**
 * EPIC-07 — Court Filing Engine
 * Deterministic filing lifecycle, deadline evaluation, and CRUD.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  CourtFiling, CourtFilingStatus, CourtFilingType,
} from "@/types/legal/postJudgment";

const sb = supabase as any;

const TRANSITIONS: Record<CourtFilingStatus, CourtFilingStatus[]> = {
  DRAFT:     ["FILED", "WITHDRAWN"],
  FILED:     ["SERVED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
  SERVED:    ["ACCEPTED", "REJECTED", "WITHDRAWN"],
  ACCEPTED:  ["WITHDRAWN"],
  REJECTED:  ["DRAFT"],
  WITHDRAWN: [],
};

export function canTransitionFiling(from: string, to: CourtFilingStatus) {
  const cur = (from ?? "DRAFT") as CourtFilingStatus;
  if (cur === to) return { allowed: false, reason: "Already in this status" };
  return TRANSITIONS[cur]?.includes(to)
    ? { allowed: true }
    : { allowed: false, reason: `Cannot move filing from ${cur} to ${to}` };
}
export function assertFilingTransition(from: string, to: CourtFilingStatus) {
  const r = canTransitionFiling(from, to);
  if (!r.allowed) throw new Error(r.reason);
}

// Standard filing deadlines by type (business days from case event).
export const FILING_DEADLINE_RULES: Record<CourtFilingType, { defaultDays: number }> = {
  APPLICATION:       { defaultDays: 14 },
  AFFIDAVIT:         { defaultDays: 7  },
  REPLY:             { defaultDays: 7  },
  WITNESS_STATEMENT: { defaultDays: 14 },
  EVIDENCE_BUNDLE:   { defaultDays: 21 },
  MOTION:            { defaultDays: 14 },
  APPEAL:            { defaultDays: 28 },
  VARIATION:         { defaultDays: 14 },
  EXECUTION:         { defaultDays: 7  },
};

export interface FilingDeadlineStatus {
  days_to_deadline: number | null;
  is_overdue: boolean;
  is_at_risk: boolean;   // within 3 days
}

export function evaluateFilingDeadline(f: Pick<CourtFiling, "deadline" | "status">): FilingDeadlineStatus {
  if (!f.deadline || ["ACCEPTED", "WITHDRAWN"].includes(f.status)) {
    return { days_to_deadline: null, is_overdue: false, is_at_risk: false };
  }
  const days = Math.floor(
    (new Date(f.deadline).getTime() - Date.now()) / 86_400_000,
  );
  return {
    days_to_deadline: days,
    is_overdue: days < 0 && f.status !== "FILED" && f.status !== "SERVED",
    is_at_risk: days >= 0 && days <= 3,
  };
}

export function validateFiling(input: Partial<CourtFiling>): string[] {
  const e: string[] = [];
  if (!input.case_id) e.push("case_id is required");
  if (!input.filing_type) e.push("Filing type is required");
  if (!input.title) e.push("Title is required");
  return e;
}

// ---------- CRUD ----------
export async function listFilings(caseId: string): Promise<CourtFiling[]> {
  const { data, error } = await sb.from("lg_court_filing")
    .select("*").eq("case_id", caseId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createFiling(input: Partial<CourtFiling>) {
  const errs = validateFiling(input);
  if (errs.length) throw new Error(errs.join("; "));
  const { data, error } = await sb.from("lg_court_filing")
    .insert({ status: "DRAFT", ...input }).select("*").single();
  if (error) throw error;
  return data;
}

export async function transitionFiling(
  id: string, to: CourtFilingStatus, patch: Partial<CourtFiling> = {},
) {
  const { data: cur, error } = await sb.from("lg_court_filing")
    .select("status").eq("id", id).single();
  if (error) throw error;
  assertFilingTransition(cur.status, to);
  const stamp: Record<string, unknown> = {};
  if (to === "FILED") stamp.filed_at = new Date().toISOString();
  if (to === "SERVED") stamp.served_at = new Date().toISOString();
  const { data, error: e2 } = await sb.from("lg_court_filing")
    .update({ ...patch, ...stamp, status: to }).eq("id", id).select("*").single();
  if (e2) throw e2;
  return data;
}
