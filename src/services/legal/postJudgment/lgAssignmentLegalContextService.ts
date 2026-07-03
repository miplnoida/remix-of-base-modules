/**
 * EPIC-07 Phase 5 — Legal Recovery Context for Recovery Assignments
 * Resolves the "primary" legal case for a recovery assignment (via linked
 * liabilities) and returns the post-judgment snapshot for that case.
 *
 * Deterministic priority: case with the greatest count of linked liabilities;
 * ties broken by highest outstanding, then earliest case id.
 */
import { supabase } from "@/integrations/supabase/client";
import { loadPostJudgmentSnapshot, type PostJudgmentSnapshot } from "./postJudgmentSnapshotService";

const sb = supabase as any;

export interface AssignmentLegalContext {
  case_id: string | null;
  case_no: string | null;
  linked_case_count: number;
  snapshot: PostJudgmentSnapshot | null;
}

export async function resolveAssignmentLegalContext(assignmentId: string): Promise<AssignmentLegalContext> {
  const { data: links, error } = await sb
    .from("lg_recovery_assignment_liability")
    .select("liability_id, lg_recoverable_liability!inner(lg_case_id, outstanding_amount)")
    .eq("assignment_id", assignmentId);
  if (error) throw error;

  const rows = (links ?? []) as Array<{
    lg_recoverable_liability: { lg_case_id: string | null; outstanding_amount: number | null };
  }>;

  // Aggregate by case
  const byCase = new Map<string, { count: number; outstanding: number }>();
  for (const r of rows) {
    const cid = r.lg_recoverable_liability?.lg_case_id;
    if (!cid) continue;
    const cur = byCase.get(cid) ?? { count: 0, outstanding: 0 };
    cur.count += 1;
    cur.outstanding += Number(r.lg_recoverable_liability?.outstanding_amount ?? 0);
    byCase.set(cid, cur);
  }
  if (byCase.size === 0) {
    return { case_id: null, case_no: null, linked_case_count: 0, snapshot: null };
  }

  const primary = [...byCase.entries()].sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    if (b[1].outstanding !== a[1].outstanding) return b[1].outstanding - a[1].outstanding;
    return a[0].localeCompare(b[0]);
  })[0];
  const primaryCaseId = primary[0];

  const { data: caseRow } = await sb
    .from("lg_case")
    .select("case_no")
    .eq("id", primaryCaseId)
    .maybeSingle();

  const snapshot = await loadPostJudgmentSnapshot(primaryCaseId);

  return {
    case_id: primaryCaseId,
    case_no: caseRow?.case_no ?? null,
    linked_case_count: byCase.size,
    snapshot,
  };
}
