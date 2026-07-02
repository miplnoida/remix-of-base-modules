/**
 * EPIC-06A.2 — Recoverable Liability Retrofit helpers.
 *
 * Bulk loaders and light aggregations used by the Recovery Workbench,
 * Matter Snapshot Rail, Hearing Pack, Intake Decision Support and the
 * junction UIs. Reads only — writes go through `lgLiabilityService`.
 *
 * No mock data. Missing tables silently return empty results so existing
 * matters without liabilities continue to render (fallback behaviour).
 */
import { supabase } from "@/integrations/supabase/client";
import type { RecoverableLiability } from "@/types/legal/liability";

const sb = supabase as any;

export interface LiabilityRollup {
  count: number;
  activeCount: number;
  totalAssessed: number;
  totalPaid: number;
  totalOutstanding: number;
  recoveryPct: number;
  fundTypes: string[];
  liabilityTypes: string[];
  recoveryStatuses: string[];
  nearestLimitationDate: string | null;
  hasNearingLimitation: boolean;   // ≤ 90 days
  writeOffCount: number;
  breachedCount: number;
}

export const EMPTY_ROLLUP: LiabilityRollup = {
  count: 0, activeCount: 0, totalAssessed: 0, totalPaid: 0, totalOutstanding: 0,
  recoveryPct: 0, fundTypes: [], liabilityTypes: [], recoveryStatuses: [],
  nearestLimitationDate: null, hasNearingLimitation: false,
  writeOffCount: 0, breachedCount: 0,
};

function toRollup(rows: RecoverableLiability[]): LiabilityRollup {
  if (rows.length === 0) return { ...EMPTY_ROLLUP };
  const active = rows.filter((r) => r.status === "ACTIVE");
  const totalAssessed = active.reduce((s, r) => s + Number(r.total_assessed || 0), 0);
  const totalPaid = active.reduce((s, r) => s + Number(r.paid || 0), 0);
  const totalOutstanding = active.reduce((s, r) => s + Number(r.outstanding || 0), 0);
  const now = Date.now();
  let nearest: string | null = null;
  for (const r of active) {
    if (r.limitation_date && (!nearest || r.limitation_date < nearest)) nearest = r.limitation_date;
  }
  const hasNearing = active.some((r) => {
    if (!r.limitation_date) return false;
    const d = (new Date(r.limitation_date).getTime() - now) / 86_400_000;
    return d >= 0 && d <= 90;
  });
  return {
    count: rows.length,
    activeCount: active.length,
    totalAssessed,
    totalPaid,
    totalOutstanding,
    recoveryPct: totalAssessed > 0 ? Math.min(100, (totalPaid / totalAssessed) * 100) : 0,
    fundTypes: Array.from(new Set(active.map((r) => r.fund_type ?? "").filter(Boolean))),
    liabilityTypes: Array.from(new Set(active.map((r) => r.liability_type).filter(Boolean))),
    recoveryStatuses: Array.from(new Set(active.map((r) => r.recovery_status).filter(Boolean))),
    nearestLimitationDate: nearest,
    hasNearingLimitation: hasNearing,
    writeOffCount: rows.filter((r) => r.status === "WRITTEN_OFF" || r.recovery_status === "WRITTEN_OFF").length,
    breachedCount: rows.filter((r) => r.recovery_status === "BREACHED").length,
  };
}

/**
 * Bulk-load liabilities for many cases in a single round-trip.
 * Returns a map keyed by lg_case_id → LiabilityRollup (never null).
 */
export async function loadLiabilityRollupsForCases(
  caseIds: string[],
): Promise<{
  rollupByCase: Map<string, LiabilityRollup>;
  rowsByCase: Map<string, RecoverableLiability[]>;
}> {
  const rollupByCase = new Map<string, LiabilityRollup>();
  const rowsByCase = new Map<string, RecoverableLiability[]>();
  if (caseIds.length === 0) return { rollupByCase, rowsByCase };

  const { data, error } = await sb
    .from("lg_recoverable_liability")
    .select("*")
    .in("lg_case_id", caseIds);
  if (error) return { rollupByCase, rowsByCase };

  const rows = (data ?? []) as RecoverableLiability[];
  for (const r of rows) {
    const list = rowsByCase.get(r.lg_case_id) ?? [];
    list.push(r);
    rowsByCase.set(r.lg_case_id, list);
  }
  for (const [caseId, list] of rowsByCase.entries()) {
    rollupByCase.set(caseId, toRollup(list));
  }
  return { rollupByCase, rowsByCase };
}

export async function loadLiabilityRollupForCase(caseId: string): Promise<{
  rollup: LiabilityRollup; rows: RecoverableLiability[];
}> {
  const { data } = await sb.from("lg_recoverable_liability").select("*").eq("lg_case_id", caseId);
  const rows = (data ?? []) as RecoverableLiability[];
  return { rollup: toRollup(rows), rows };
}

/** True if any liability exists for the given case. */
export async function hasLiabilities(caseId: string): Promise<boolean> {
  const { count } = await sb.from("lg_recoverable_liability")
    .select("id", { count: "exact", head: true }).eq("lg_case_id", caseId);
  return (count ?? 0) > 0;
}

/**
 * Return liability IDs already linked to a target entity (hearing/order/…).
 * Used by LiabilityLinkDialog to compute link/unlink state.
 */
export async function listLinkedLiabilityIds(
  target: "hearing" | "order" | "arrangement" | "settlement" | "task" | "document",
  targetId: string,
): Promise<Set<string>> {
  const table = `lg_${target}_liability`;
  const fk = `${target}_id`;
  const { data } = await sb.from(table).select(`liability_id, ${fk}`).eq(fk, targetId);
  return new Set(((data ?? []) as any[]).map((r) => r.liability_id));
}

/** Chronological liability events for the unified matter timeline. */
export async function listLiabilityTimelineEvents(caseId: string): Promise<
  Array<{ id: string; ts: string; title: string; detail: string | null; actor: string | null }>
> {
  const { data: liab } = await sb
    .from("lg_recoverable_liability")
    .select("id, liability_type, principal, total_assessed, outstanding, created_at, created_by")
    .eq("lg_case_id", caseId);
  const rows = (liab ?? []) as any[];
  const ids = rows.map((r) => r.id);
  const [auditRes, allocRes] = await Promise.all([
    ids.length
      ? sb.from("lg_liability_audit").select("id, liability_id, action, performed_by, performed_at").in("liability_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? sb.from("lg_payment_allocation").select("id, liability_id, allocated_amount, component, payment_ref, payment_date, created_by, created_at").in("liability_id", ids)
      : Promise.resolve({ data: [] }),
  ]);

  const evts: Array<{ id: string; ts: string; title: string; detail: string | null; actor: string | null }> = [];
  for (const r of rows) {
    evts.push({
      id: `liab-create-${r.id}`,
      ts: r.created_at,
      title: `Liability created · ${r.liability_type}`,
      detail: `Assessed ${Number(r.total_assessed ?? 0).toFixed(2)} · Outstanding ${Number(r.outstanding ?? 0).toFixed(2)}`,
      actor: r.created_by ?? null,
    });
  }
  for (const a of (auditRes.data ?? []) as any[]) {
    if (a.action === "CREATE") continue; // already captured
    evts.push({
      id: `liab-audit-${a.id}`,
      ts: a.performed_at,
      title: `Liability · ${a.action}`,
      detail: null,
      actor: a.performed_by ?? null,
    });
  }
  for (const p of (allocRes.data ?? []) as any[]) {
    evts.push({
      id: `liab-alloc-${p.id}`,
      ts: p.payment_date ?? p.created_at,
      title: `Payment allocated`,
      detail: `${Number(p.allocated_amount ?? 0).toFixed(2)}${p.component ? ` · ${p.component}` : ""}${p.payment_ref ? ` · ${p.payment_ref}` : ""}`,
      actor: p.created_by ?? null,
    });
  }
  return evts;
}
