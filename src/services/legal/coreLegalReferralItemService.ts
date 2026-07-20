/**
 * Shared Legal Referral Items service.
 * ------------------------------------
 * Backs the new core_legal_referral_item table that lets Compliance / Benefits
 * forward only SELECTED debt lines / claim heads to Legal while keeping the
 * remainder under source-department control.
 *
 * NB: Per project memory the public schema is NO-RLS — role-based access only.
 *     Auth is enforced at app/edge layer.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type ReferralSourceModule = "COMPLIANCE" | "BENEFITS" | "FINANCE";
export type ReferralDebtorType = "EMPLOYER" | "INSURED_PERSON" | "BENEFICIARY" | "ESTATE" | "OTHER";
export type ReferralItemType =
  | "LIABILITY"
  | "CLAIM"
  | "OVERPAYMENT"
  | "APPEAL"
  | "FRAUD"
  | "FINANCE_DEBT"
  | "ESTATE_RECOVERY"
  | "PAYMENT_AFTER_DEATH";
export type ReferralItemStatus =
  | "PROPOSED"
  | "SELECTED"
  | "REFERRED"
  | "ACCEPTED"
  | "REJECTED"
  | "CLOSED"
  | "RETURNED";

export interface CoreLegalReferralItem {
  id: string;
  referral_id: string;
  source_module: ReferralSourceModule;
  source_record_type: string;
  source_record_id: string | null;
  source_reference_no: string | null;
  debtor_type: ReferralDebtorType;
  debtor_id: string | null;
  debtor_name: string | null;
  item_type: ReferralItemType;
  liability_head_code: string | null;
  fund_code: string | null;
  period_from: string | null;
  period_to: string | null;
  principal_amount: number;
  penalty_amount: number;
  interest_amount: number;
  cost_amount: number;
  total_amount: number;
  amount_referred: number;
  amount_retained_by_source: number;
  referral_reason_code: string | null;
  status: ReferralItemStatus;
  decision_reason: string | null;
  lg_case_action_id: string | null;
  source_payload: any;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface ReferralItemDraft {
  source_record_type: string;
  source_record_id?: string | null;
  source_reference_no?: string | null;
  debtor_type: ReferralDebtorType;
  debtor_id?: string | null;
  debtor_name?: string | null;
  item_type: ReferralItemType;
  liability_head_code?: string | null;
  fund_code?: string | null;
  period_from?: string | null;
  period_to?: string | null;
  principal_amount?: number;
  penalty_amount?: number;
  interest_amount?: number;
  cost_amount?: number;
  total_amount?: number;
  amount_referred?: number;
  amount_retained_by_source?: number;
  referral_reason_code?: string | null;
  source_payload?: any;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function listReferralItems(referralId: string): Promise<CoreLegalReferralItem[]> {
  const { data, error } = await sb
    .from("core_legal_referral_item")
    .select("*")
    .eq("referral_id", referralId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CoreLegalReferralItem[];
}

export async function insertReferralItems(
  referralId: string,
  sourceModule: ReferralSourceModule,
  items: ReferralItemDraft[],
  userCode?: string | null,
): Promise<CoreLegalReferralItem[]> {
  if (!items.length) return [];
  const rows = items.map((it) => ({
    referral_id: referralId,
    source_module: sourceModule,
    status: "REFERRED" as ReferralItemStatus,
    created_by: userCode ?? null,
    updated_by: userCode ?? null,
    principal_amount: 0,
    penalty_amount: 0,
    interest_amount: 0,
    cost_amount: 0,
    amount_retained_by_source: 0,
    source_payload: it.source_payload ?? {},
    ...it,
  }));
  const { data, error } = await sb
    .from("core_legal_referral_item")
    .insert(rows)
    .select("*");
  if (error) throw error;
  return (data ?? []) as CoreLegalReferralItem[];
}

export async function updateReferralItemStatus(
  itemId: string,
  status: ReferralItemStatus,
  opts?: { decision_reason?: string | null; lg_case_action_id?: string | null; userCode?: string | null },
): Promise<void> {
  const patch: any = { status, updated_by: opts?.userCode ?? null };
  if (opts?.decision_reason !== undefined) patch.decision_reason = opts.decision_reason;
  if (opts?.lg_case_action_id !== undefined) patch.lg_case_action_id = opts.lg_case_action_id;
  const { error } = await sb.from("core_legal_referral_item").update(patch).eq("id", itemId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Candidate-item discovery for COMPLIANCE wizard
// Returns ledger lines + defaulted installments in a single union so the
// user can pick across both sources.
// ---------------------------------------------------------------------------

export interface ComplianceCandidateItem {
  key: string;                       // stable react key
  source_record_type: "LEDGER_TXN" | "INSTALLMENT" | "VIOLATION";
  source_record_id: string;
  source_reference_no: string | null;
  debtor_type: "EMPLOYER";
  debtor_id: string;
  debtor_name: string | null;
  liability_head_code: string | null;
  fund_code: string | null;
  period_from: string | null;
  period_to: string | null;
  age_days: number | null;
  outstanding: number;
  principal: number;
  penalty: number;
  interest: number;
  raw: any;
}

export async function listComplianceCandidateItems(params: {
  employerId: string;
  ceCaseId?: string | null;  // when provided, always include violations linked to this case
  minAgeDays?: number;       // e.g. 150 for "older than 5 months"
  includeCurrent?: boolean;  // false = arrears only
}): Promise<ComplianceCandidateItem[]> {
  const today = Date.now();
  const ageCutoff = params.minAgeDays ?? 0;

  // 1) Ledger transactions (open debits)
  const { data: ledgerRows, error: lErr } = await sb
    .from("core_employer_ledger_transaction")
    .select(
      "id, transaction_no, transaction_date, posting_period, head_code, debit_amount, credit_amount, source_module, source_record_type, source_record_id, source_reference_no, payment_arrangement_id, posting_status",
    )
    .eq("employer_id", params.employerId)
    .neq("posting_status", "REVERSED")
    .order("transaction_date", { ascending: true })
    .limit(1000);
  if (lErr) throw lErr;

  // 2) Defaulted / overdue installments
  const { data: instRows, error: iErr } = await sb
    .from("ce_installments")
    .select(
      "id, arrangement_id, installment_number, due_date, amount, paid_amount, status, is_overdue, overdue_days",
    )
    .eq("is_overdue", true)
    .order("due_date", { ascending: true })
    .limit(1000);
  if (iErr) throw iErr;

  // Pull employer name (best-effort)
  let employerName: string | null = null;
  try {
    const { data: er } = await sb
      .from("er_master")
      .select("regno, name")
      .eq("regno", params.employerId)
      .maybeSingle();
    employerName = er?.name ?? null;
  } catch { /* ignore */ }

  const out: ComplianceCandidateItem[] = [];

  for (const r of ledgerRows ?? []) {
    const debit = Number(r.debit_amount ?? 0);
    const credit = Number(r.credit_amount ?? 0);
    const outstanding = Math.max(0, debit - credit);
    if (outstanding <= 0) continue;
    const ageDays = r.transaction_date
      ? Math.floor((today - new Date(r.transaction_date).getTime()) / 86400000)
      : null;
    if (!params.includeCurrent && ageDays != null && ageDays < ageCutoff) continue;

    const headCode = (r.head_code ?? "").toUpperCase();
    const isPenalty = headCode.includes("PENALTY") || headCode.includes("FINE");
    const isInterest = headCode.includes("INTEREST");
    out.push({
      key: `LEDGER:${r.id}`,
      source_record_type: "LEDGER_TXN",
      source_record_id: r.id,
      source_reference_no: r.transaction_no ?? r.source_reference_no ?? null,
      debtor_type: "EMPLOYER",
      debtor_id: params.employerId,
      debtor_name: employerName,
      liability_head_code: r.head_code ?? null,
      fund_code: deriveFundFromHead(r.head_code),
      period_from: r.posting_period ?? r.transaction_date ?? null,
      period_to: r.posting_period ?? r.transaction_date ?? null,
      age_days: ageDays,
      outstanding,
      principal: isPenalty || isInterest ? 0 : outstanding,
      penalty: isPenalty ? outstanding : 0,
      interest: isInterest ? outstanding : 0,
      raw: r,
    });
  }

  // Arrangements → employer mapping for installment rows
  const arrangementIds = Array.from(new Set((instRows ?? []).map((x: any) => x.arrangement_id))).filter(Boolean);
  let arrangementMap: Record<string, any> = {};
  if (arrangementIds.length) {
    const { data: arr } = await sb
      .from("ce_payment_arrangements")
      .select("id, employer_id, employer_name, arrangement_number")
      .in("id", arrangementIds);
    arrangementMap = Object.fromEntries((arr ?? []).map((a: any) => [a.id, a]));
  }

  for (const inst of instRows ?? []) {
    const arr = arrangementMap[inst.arrangement_id];
    if (!arr || arr.employer_id !== params.employerId) continue;
    const outstanding = Number(inst.amount ?? 0) - Number(inst.paid_amount ?? 0);
    if (outstanding <= 0) continue;
    const ageDays = inst.overdue_days ?? null;
    if (!params.includeCurrent && ageDays != null && ageDays < ageCutoff) continue;
    out.push({
      key: `INST:${inst.id}`,
      source_record_type: "INSTALLMENT",
      source_record_id: inst.id,
      source_reference_no: `${arr.arrangement_number}/#${inst.installment_number}`,
      debtor_type: "EMPLOYER",
      debtor_id: params.employerId,
      debtor_name: arr.employer_name ?? employerName,
      liability_head_code: "PAYMENT_PLAN_INSTALLMENT",
      fund_code: null,
      period_from: inst.due_date,
      period_to: inst.due_date,
      age_days: ageDays,
      outstanding,
      principal: outstanding,
      penalty: 0,
      interest: 0,
      raw: { ...inst, arrangement: arr },
    });
  }

  // 3) Open compliance violations. These represent unposted arrears that have
  //    not yet been written to the ledger (e.g. a freshly opened case whose
  //    liability sits on ce_violations only). Case-scoped violations are
  //    ALWAYS included; employer-wide violations still respect the age filter.
  const OPEN_VIOLATION_STATUSES = ["OPEN", "IN_PROGRESS", "UNDER_REVIEW", "ESCALATED"];
  let vioQuery = sb
    .from("ce_violations")
    .select(
      "id, violation_number, employer_id, employer_name, status, fund_type, period_from, period_to, discovered_date, principal_amount, penalty_amount, interest_amount, total_amount, case_id, is_deleted",
    )
    .in("status", OPEN_VIOLATION_STATUSES)
    .neq("is_deleted", true)
    .limit(1000);
  if (params.ceCaseId) {
    // Case-scoped referral: only violations linked to this case
    vioQuery = vioQuery.eq("case_id", params.ceCaseId);
  } else {
    vioQuery = vioQuery.eq("employer_id", params.employerId);
  }
  const { data: vioRows, error: vErr } = await vioQuery;
  if (vErr) throw vErr;

  const seenVioIds = new Set<string>();
  for (const v of vioRows ?? []) {
    if (!v?.id || seenVioIds.has(v.id)) continue;
    seenVioIds.add(v.id);
    const principal = Number(v.principal_amount ?? 0);
    const penalty = Number(v.penalty_amount ?? 0);
    const interest = Number(v.interest_amount ?? 0);
    const outstanding = Number(v.total_amount ?? 0) || (principal + penalty + interest);
    if (outstanding <= 0) continue;
    const anchorDate = v.discovered_date ?? v.period_from ?? null;
    const ageDays = anchorDate
      ? Math.floor((today - new Date(anchorDate).getTime()) / 86400000)
      : null;
    // When the referral is scoped to a specific case, ignore age/current filters.
    if (!params.ceCaseId && !params.includeCurrent && ageDays != null && ageDays < ageCutoff) continue;
    out.push({
      key: `VIOLATION:${v.id}`,
      source_record_type: "VIOLATION",
      source_record_id: v.id,
      source_reference_no: v.violation_number ?? null,
      debtor_type: "EMPLOYER",
      debtor_id: params.employerId,
      debtor_name: v.employer_name ?? employerName,
      liability_head_code: v.fund_type ? `${v.fund_type}_VIOLATION` : "VIOLATION",
      fund_code: v.fund_type ?? null,
      period_from: v.period_from ?? null,
      period_to: v.period_to ?? v.period_from ?? null,
      age_days: ageDays,
      outstanding,
      principal,
      penalty,
      interest,
      raw: v,
    });
  }

  return out;
}

function deriveFundFromHead(head: string | null | undefined): string | null {
  if (!head) return null;
  const h = head.toUpperCase();
  if (h.startsWith("SS") || h.includes("SOC_SEC") || h.includes("SOCIAL")) return "SS";
  if (h.startsWith("LV") || h.includes("LEVY")) return "LV";
  if (h.startsWith("PE") || h.includes("PENSION") || h.includes("EMPLOY")) return "PE";
  return null;
}

// ---------------------------------------------------------------------------
// Candidate-item discovery for BENEFITS wizard
// ---------------------------------------------------------------------------

export interface BenefitsCandidateItem {
  key: string;
  source_record_type: "CLAIM" | "OVERPAYMENT" | "AWARD" | "APPEAL" | "FRAUD";
  source_record_id: string;
  source_reference_no: string | null;
  debtor_type: "INSURED_PERSON" | "BENEFICIARY" | "ESTATE";
  debtor_id: string | null;
  debtor_name: string | null;
  item_type: ReferralItemType;
  outstanding: number;
  period_from: string | null;
  period_to: string | null;
  raw: any;
}

export async function listBenefitsCandidatesByClaim(claimId: string): Promise<BenefitsCandidateItem[]> {
  const out: BenefitsCandidateItem[] = [];
  const { data: claim } = await sb.from("bn_claim").select("*").eq("id", claimId).maybeSingle();
  if (!claim) return out;

  // Claim itself
  out.push({
    key: `CLAIM:${claim.id}`,
    source_record_type: "CLAIM",
    source_record_id: claim.id,
    source_reference_no: claim.claim_number ?? null,
    debtor_type: "INSURED_PERSON",
    debtor_id: claim.ssn ?? null,
    debtor_name: claim.ssn ?? null,
    item_type: "CLAIM",
    outstanding: 0,
    period_from: claim.claim_date ?? null,
    period_to: null,
    raw: claim,
  });

  // Overpayments linked via award
  if (claim.ssn) {
    const { data: awards } = await sb
      .from("bn_award")
      .select("id, ssn")
      .eq("ssn", claim.ssn);
    const awardIds = (awards ?? []).map((a: any) => a.id);
    if (awardIds.length) {
      const { data: ops } = await sb
        .from("bn_overpayment")
        .select("*")
        .in("bn_award_id", awardIds);
      for (const op of ops ?? []) {
        out.push({
          key: `OP:${op.id}`,
          source_record_type: "OVERPAYMENT",
          source_record_id: op.id,
          source_reference_no: null,
          debtor_type: "INSURED_PERSON",
          debtor_id: claim.ssn,
          debtor_name: claim.ssn,
          item_type: "OVERPAYMENT",
          outstanding: Number(op.outstanding_amount ?? 0),
          period_from: op.period_from ?? null,
          period_to: op.period_to ?? null,
          raw: op,
        });
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Acceptance: create Legal Case Actions from accepted items
// Called from lgIntakeService.acceptAndCreateCase
// ---------------------------------------------------------------------------

const ACTION_KIND_MAP: Record<string, { action_kind: string; category: string }> = {
  LIABILITY: { action_kind: "CONTRIBUTION_RECOVERY", category: "DEBT_RECOVERY" },
  CLAIM: { action_kind: "BENEFIT_DISPUTE", category: "BENEFITS" },
  OVERPAYMENT: { action_kind: "OVERPAYMENT_RECOVERY", category: "BENEFITS" },
  APPEAL: { action_kind: "APPEAL", category: "BENEFITS" },
  FRAUD: { action_kind: "FRAUD_REVIEW", category: "INVESTIGATION" },
  ESTATE_RECOVERY: { action_kind: "ESTATE_RECOVERY", category: "BENEFITS" },
  PAYMENT_AFTER_DEATH: { action_kind: "PAYMENT_AFTER_DEATH", category: "BENEFITS" },
  FINANCE_DEBT: { action_kind: "FINANCE_RECOVERY", category: "DEBT_RECOVERY" },
};

export async function generateLegalActionsFromItems(params: {
  lgCaseId: string;
  referralId: string;
  userCode?: string | null;
}): Promise<{ created: number }> {
  const items = await listReferralItems(params.referralId);
  // Only ACCEPTED or REFERRED-without-rejection should produce actions
  const eligible = items.filter((i) => i.status === "REFERRED" || i.status === "ACCEPTED");
  if (!eligible.length) return { created: 0 };

  let created = 0;
  for (const it of eligible) {
    const map = ACTION_KIND_MAP[it.item_type] ?? { action_kind: "GENERIC", category: "OTHER" };
    const fundLabel = it.fund_code ? `${it.fund_code} ` : "";
    const isPenalty =
      it.penalty_amount > 0 && it.principal_amount === 0 && it.interest_amount === 0;
    const action_kind = isPenalty && it.item_type === "LIABILITY"
      ? `${it.fund_code ?? "GEN"}_PENALTY`
      : it.item_type === "LIABILITY"
        ? `${it.fund_code ?? "GEN"}_CONTRIBUTION`
        : map.action_kind;
    const { data: act, error } = await sb
      .from("lg_case_action")
      .insert({
        case_id: params.lgCaseId,
        action_kind,
        category: map.category,
        referral_item_id: it.id,
        source_module: it.source_module,
        liability_head_code: it.liability_head_code,
        fund_code: it.fund_code,
        period_from: it.period_from,
        period_to: it.period_to,
        principal_amount: it.principal_amount,
        penalty_amount: it.penalty_amount,
        interest_amount: it.interest_amount,
        cost_amount: it.cost_amount,
        total_amount: it.amount_referred,
        outstanding_amount: it.amount_referred,
        amount_paid: 0,
        insured_person_id: it.debtor_type === "INSURED_PERSON" ? it.debtor_id : null,
        notes: `${fundLabel}${map.action_kind} from referral item ${it.id}`,
        status: "OPEN",
        stage: "INITIATED",
        created_by: params.userCode ?? "SYSTEM",
        updated_by: params.userCode ?? null,
      })
      .select("id")
      .single();
    if (error) {
      // Don't poison the entire acceptance — log & continue.
      // eslint-disable-next-line no-console
      console.warn("[referralItem→action] insert failed", error, it.id);
      continue;
    }
    await updateReferralItemStatus(it.id, "ACCEPTED", {
      lg_case_action_id: act.id,
      userCode: params.userCode ?? null,
    });
    created++;
  }
  return { created };
}

// ---------------------------------------------------------------------------
// Item-level reject (Legal returns one item to source)
// ---------------------------------------------------------------------------

export async function rejectReferralItem(
  itemId: string,
  reason: string,
  userCode?: string | null,
): Promise<void> {
  await updateReferralItemStatus(itemId, "REJECTED", {
    decision_reason: reason,
    userCode: userCode ?? null,
  });
}

export async function returnReferralItem(
  itemId: string,
  reason: string,
  userCode?: string | null,
): Promise<void> {
  await updateReferralItemStatus(itemId, "RETURNED", {
    decision_reason: reason,
    userCode: userCode ?? null,
  });
}
