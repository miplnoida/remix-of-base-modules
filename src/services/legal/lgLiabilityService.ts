/**
 * EPIC-06A — Recoverable Liability service.
 * All Legal sub-modules (Recovery Workbench, Intake, Matter Workspace,
 * Court Operations, Orders, Arrangements, Settlements) roll up from here.
 *
 * No RLS — authorization enforced in the UI/hook layer via useLgAccess.
 * No mock data — every read hits Supabase.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  RecoverableLiability,
  CreateLiabilityInput,
  LiabilityPaymentAllocation,
  AllocationComponent,
  AllocationRule,
} from "@/types/legal/liability";

const sb = supabase as any;

/* -------------------------------------------------------------- reads */

export async function listLiabilitiesForCase(caseId: string): Promise<RecoverableLiability[]> {
  const { data, error } = await sb
    .from("lg_recoverable_liability")
    .select("*")
    .eq("lg_case_id", caseId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RecoverableLiability[];
}

export async function getLiability(id: string): Promise<RecoverableLiability | null> {
  const { data, error } = await sb
    .from("lg_recoverable_liability").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as RecoverableLiability | null;
}

export interface CaseLiabilityRollup {
  count: number;
  activeCount: number;
  totalAssessed: number;
  totalPaid: number;
  totalOutstanding: number;
  recoveryPct: number;
  byFund: Record<string, { assessed: number; paid: number; outstanding: number }>;
  nearingLimitation: RecoverableLiability[];
  highRisk: RecoverableLiability[];
}

export async function getCaseLiabilityRollup(caseId: string): Promise<CaseLiabilityRollup> {
  const rows = await listLiabilitiesForCase(caseId);
  const active = rows.filter((r) => r.status === "ACTIVE");
  const totalAssessed = active.reduce((s, r) => s + Number(r.total_assessed || 0), 0);
  const totalPaid = active.reduce((s, r) => s + Number(r.paid || 0), 0);
  const totalOutstanding = active.reduce((s, r) => s + Number(r.outstanding || 0), 0);
  const byFund: CaseLiabilityRollup["byFund"] = {};
  for (const r of active) {
    const k = r.fund_type ?? "UNSPECIFIED";
    if (!byFund[k]) byFund[k] = { assessed: 0, paid: 0, outstanding: 0 };
    byFund[k].assessed += Number(r.total_assessed || 0);
    byFund[k].paid += Number(r.paid || 0);
    byFund[k].outstanding += Number(r.outstanding || 0);
  }
  const now = Date.now();
  const nearingLimitation = active.filter((r) => {
    if (!r.limitation_date) return false;
    const days = (new Date(r.limitation_date).getTime() - now) / 86_400_000;
    return days >= 0 && days <= 90;
  });
  const highRisk = active.filter((r) => r.risk_level === "HIGH" || r.risk_level === "CRITICAL");
  return {
    count: rows.length,
    activeCount: active.length,
    totalAssessed,
    totalPaid,
    totalOutstanding,
    recoveryPct: totalAssessed > 0 ? (totalPaid / totalAssessed) * 100 : 0,
    byFund,
    nearingLimitation,
    highRisk,
  };
}

/* --------------------------------------------------------- mutations */

async function audit(
  liabilityId: string,
  caseId: string | null,
  action: string,
  oldValue: unknown,
  newValue: unknown,
  performedBy: string | null,
  remarks?: string,
) {
  await sb.from("lg_liability_audit").insert({
    liability_id: liabilityId,
    lg_case_id: caseId,
    action,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    performed_by: performedBy,
    remarks: remarks ?? null,
  });
}

export async function createLiability(
  input: CreateLiabilityInput,
  userCode: string | null,
): Promise<RecoverableLiability> {
  if ((input.principal ?? 0) < 0 || (input.interest ?? 0) < 0 || (input.penalty ?? 0) < 0) {
    throw new Error("Liability amounts cannot be negative");
  }
  const { data, error } = await sb
    .from("lg_recoverable_liability")
    .insert({ ...input, created_by: userCode, updated_by: userCode })
    .select("*")
    .single();
  if (error) throw error;
  await audit(data.id, data.lg_case_id, "CREATE", null, data, userCode);
  return data as RecoverableLiability;
}

export async function updateLiability(
  id: string,
  patch: Partial<CreateLiabilityInput> & { risk_level?: string; priority?: string; legal_status?: string; recovery_status?: string },
  userCode: string | null,
): Promise<RecoverableLiability> {
  const before = await getLiability(id);
  const { data, error } = await sb
    .from("lg_recoverable_liability")
    .update({ ...patch, updated_by: userCode })
    .eq("id", id).select("*").single();
  if (error) throw error;
  await audit(id, data.lg_case_id, "UPDATE", before, data, userCode);
  return data as RecoverableLiability;
}

export async function deleteLiability(id: string, userCode: string | null): Promise<void> {
  const before = await getLiability(id);
  const { error } = await sb.from("lg_recoverable_liability").delete().eq("id", id);
  if (error) throw error;
  if (before) await audit(id, before.lg_case_id, "DELETE", before, null, userCode);
}

/* ------------------------------------------------------- merge/split */

export async function mergeLiabilities(
  ids: string[],
  caseId: string,
  targetPatch: Partial<CreateLiabilityInput>,
  userCode: string | null,
): Promise<RecoverableLiability> {
  if (ids.length < 2) throw new Error("Select at least two liabilities to merge");
  const sources = await Promise.all(ids.map((i) => getLiability(i)));
  const valid = sources.filter((s): s is RecoverableLiability => !!s && s.lg_case_id === caseId);
  if (valid.length !== ids.length) throw new Error("Some liabilities not found or belong to another matter");

  const sum = (k: keyof RecoverableLiability) =>
    valid.reduce((s, r) => s + Number((r as any)[k] || 0), 0);

  const merged = await createLiability({
    lg_case_id: caseId,
    source_module: valid[0].source_module,
    liability_type: valid[0].liability_type,
    fund_type: valid[0].fund_type,
    principal: sum("principal"),
    interest: sum("interest"),
    penalty: sum("penalty"),
    court_cost: sum("court_cost"),
    legal_cost: sum("legal_cost"),
    other_cost: sum("other_cost"),
    contribution_period_from: valid.reduce<string | null>((min, r) =>
      r.contribution_period_from && (!min || r.contribution_period_from < min) ? r.contribution_period_from : min, null),
    contribution_period_to: valid.reduce<string | null>((max, r) =>
      r.contribution_period_to && (!max || r.contribution_period_to > max) ? r.contribution_period_to : max, null),
    employer_id: valid[0].employer_id,
    insured_person_id: valid[0].insured_person_id,
    remarks: `Merged from ${valid.length} liabilities`,
    ...targetPatch,
  }, userCode);

  for (const src of valid) {
    await sb.from("lg_recoverable_liability")
      .update({ status: "MERGED", merged_into_id: merged.id, updated_by: userCode })
      .eq("id", src.id);
    await audit(src.id, caseId, "MERGE", src, { merged_into_id: merged.id }, userCode);
  }
  return merged;
}

export async function splitLiability(
  sourceId: string,
  parts: Array<{ principal?: number; interest?: number; penalty?: number; court_cost?: number; legal_cost?: number; other_cost?: number; remarks?: string }>,
  userCode: string | null,
): Promise<RecoverableLiability[]> {
  const src = await getLiability(sourceId);
  if (!src) throw new Error("Liability not found");
  if (parts.length < 2) throw new Error("Provide at least two parts");
  const totalOfParts = parts.reduce(
    (s, p) => s + (p.principal ?? 0) + (p.interest ?? 0) + (p.penalty ?? 0)
      + (p.court_cost ?? 0) + (p.legal_cost ?? 0) + (p.other_cost ?? 0), 0);
  if (Math.abs(totalOfParts - Number(src.total_assessed)) > 0.01) {
    throw new Error(`Split parts total (${totalOfParts.toFixed(2)}) must equal source total (${Number(src.total_assessed).toFixed(2)})`);
  }
  const created: RecoverableLiability[] = [];
  for (const p of parts) {
    const c = await createLiability({
      lg_case_id: src.lg_case_id,
      source_module: src.source_module,
      liability_type: src.liability_type,
      fund_type: src.fund_type,
      statutory_basis: src.statutory_basis,
      contribution_period_from: src.contribution_period_from,
      contribution_period_to: src.contribution_period_to,
      employer_id: src.employer_id,
      insured_person_id: src.insured_person_id,
      principal: p.principal ?? 0,
      interest: p.interest ?? 0,
      penalty: p.penalty ?? 0,
      court_cost: p.court_cost ?? 0,
      legal_cost: p.legal_cost ?? 0,
      other_cost: p.other_cost ?? 0,
      remarks: p.remarks ?? `Split from ${src.id}`,
    }, userCode);
    await sb.from("lg_recoverable_liability").update({ split_from_id: src.id }).eq("id", c.id);
    created.push(c);
  }
  await sb.from("lg_recoverable_liability")
    .update({ status: "SPLIT", updated_by: userCode }).eq("id", src.id);
  await audit(src.id, src.lg_case_id, "SPLIT", src, { parts: created.map((c) => c.id) }, userCode);
  return created;
}

/* --------------------------------------------------- allocations */

export async function listAllocations(liabilityId: string): Promise<LiabilityPaymentAllocation[]> {
  const { data, error } = await sb
    .from("lg_payment_allocation")
    .select("*")
    .eq("liability_id", liabilityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LiabilityPaymentAllocation[];
}

export async function allocatePayment(
  liabilityId: string,
  input: {
    payment_id: string;
    payment_ref?: string | null;
    payment_date?: string | null;
    allocated_amount: number;
    component?: AllocationComponent | null;
    allocation_rule?: AllocationRule | null;
    remarks?: string | null;
  },
  userCode: string | null,
): Promise<LiabilityPaymentAllocation> {
  if (input.allocated_amount <= 0) throw new Error("Allocation amount must be positive");
  const liab = await getLiability(liabilityId);
  if (!liab) throw new Error("Liability not found");
  if (input.allocated_amount > Number(liab.outstanding) + 0.005) {
    throw new Error(`Allocation exceeds outstanding (${Number(liab.outstanding).toFixed(2)})`);
  }
  const { data, error } = await sb
    .from("lg_payment_allocation")
    .insert({ liability_id: liabilityId, ...input, created_by: userCode })
    .select("*").single();
  if (error) throw error;
  await audit(liabilityId, liab.lg_case_id, "ALLOCATE", null, data, userCode);
  return data as LiabilityPaymentAllocation;
}

export async function reverseAllocation(id: string, userCode: string | null): Promise<void> {
  const { data: existing } = await sb.from("lg_payment_allocation").select("*").eq("id", id).maybeSingle();
  const { error } = await sb.from("lg_payment_allocation").delete().eq("id", id);
  if (error) throw error;
  if (existing) await audit(existing.liability_id, null, "ALLOCATE_REVERSE", existing, null, userCode);
}

/* ------------------------------------------------------- linking */

export async function linkLiabilityToHearing(hearingId: string, liabilityId: string, userCode: string | null) {
  const { error } = await sb.from("lg_hearing_liability")
    .insert({ hearing_id: hearingId, liability_id: liabilityId, created_by: userCode });
  if (error && !String(error.message).includes("duplicate")) throw error;
}
export async function unlinkLiabilityFromHearing(hearingId: string, liabilityId: string) {
  await sb.from("lg_hearing_liability").delete()
    .eq("hearing_id", hearingId).eq("liability_id", liabilityId);
}
export async function listLiabilitiesForHearing(hearingId: string) {
  const { data, error } = await sb.from("lg_hearing_liability")
    .select("*, liability:lg_recoverable_liability(*)").eq("hearing_id", hearingId);
  if (error) throw error;
  return data ?? [];
}

export async function linkLiabilityToOrder(orderId: string, liabilityId: string, amountOrdered: number, userCode: string | null) {
  const { error } = await sb.from("lg_order_liability")
    .insert({ order_id: orderId, liability_id: liabilityId, amount_ordered: amountOrdered, created_by: userCode });
  if (error && !String(error.message).includes("duplicate")) throw error;
}
export async function linkLiabilityToArrangement(arrangementId: string, liabilityId: string, allocatedAmount: number, userCode: string | null) {
  const { error } = await sb.from("lg_arrangement_liability")
    .insert({ arrangement_id: arrangementId, liability_id: liabilityId, allocated_amount: allocatedAmount, created_by: userCode });
  if (error && !String(error.message).includes("duplicate")) throw error;
}
export async function linkLiabilityToSettlement(settlementId: string, liabilityId: string, settled: number, waived: number, userCode: string | null) {
  const { error } = await sb.from("lg_settlement_liability")
    .insert({ settlement_id: settlementId, liability_id: liabilityId, settled_amount: settled, waived_amount: waived, created_by: userCode });
  if (error && !String(error.message).includes("duplicate")) throw error;
}
export async function linkLiabilityToTask(taskId: string, liabilityId: string, userCode: string | null) {
  const { error } = await sb.from("lg_task_liability")
    .insert({ task_id: taskId, liability_id: liabilityId, created_by: userCode });
  if (error && !String(error.message).includes("duplicate")) throw error;
}
export async function linkLiabilityToDocument(documentId: string, liabilityId: string, docRole: string, userCode: string | null) {
  const { error } = await sb.from("lg_document_liability")
    .insert({ document_id: documentId, liability_id: liabilityId, doc_role: docRole, created_by: userCode });
  if (error && !String(error.message).includes("duplicate")) throw error;
}

/* -------------------------------------------------- notes & audit */

export async function listLiabilityNotes(liabilityId: string) {
  const { data, error } = await sb.from("lg_liability_note")
    .select("*").eq("liability_id", liabilityId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function addLiabilityNote(liabilityId: string, noteText: string, userCode: string | null) {
  const { data, error } = await sb.from("lg_liability_note")
    .insert({ liability_id: liabilityId, note_text: noteText, created_by: userCode })
    .select("*").single();
  if (error) throw error;
  return data;
}
export async function listLiabilityAudit(liabilityId: string) {
  const { data, error } = await sb.from("lg_liability_audit")
    .select("*").eq("liability_id", liabilityId).order("performed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/* --------------------------------------- migration helper (Part 22) */

/**
 * Convert an existing matter's case-level totals into a single MANUAL liability.
 * Only used when there is sufficient data — never fabricated.
 */
export async function createLiabilitiesFromExistingMatter(
  caseId: string,
  userCode: string | null,
): Promise<RecoverableLiability | null> {
  const existing = await listLiabilitiesForCase(caseId);
  if (existing.length > 0) return null;
  const { data: c } = await sb.from("lg_case")
    .select("id, primary_entity_type, primary_entity_ref, financial_amount_outstanding, financial_amount_principal, financial_amount_interest, financial_amount_penalty")
    .eq("id", caseId).maybeSingle();
  if (!c) return null;
  const principal = Number(c.financial_amount_principal ?? c.financial_amount_outstanding ?? 0);
  if (principal <= 0) return null;
  return createLiability({
    lg_case_id: caseId,
    source_module: "MANUAL",
    liability_type: "OTHER",
    principal,
    interest: Number(c.financial_amount_interest ?? 0),
    penalty: Number(c.financial_amount_penalty ?? 0),
    employer_id: c.primary_entity_type === "EMPLOYER" ? c.primary_entity_ref : null,
    insured_person_id: c.primary_entity_type === "IP" ? c.primary_entity_ref : null,
    remarks: "Auto-created from existing matter totals",
  }, userCode);
}
