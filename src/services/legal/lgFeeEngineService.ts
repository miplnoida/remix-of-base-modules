import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

/**
 * Legal Fee Engine
 * ----------------
 * Pure calculation + auto-apply + posting to the central employer financial ledger.
 * No fee master is duplicated here — fee heads live on `tb_income_codes`,
 * rules on `lg_fee_rule`, bundles on `lg_fee_bundle(_item)`, and every posted
 * fee writes a row to `ce_employer_financial_ledger`.
 */

export type CalcType = "FIXED" | "PERCENTAGE" | "FORMULA" | "TIER" | "MANUAL";

export interface LgFeeRule {
  id: string;
  fee_rule_code: string;
  fee_rule_name: string;
  country_code: string | null;
  case_type_code: string | null;
  stage_code: string | null;
  event_code: string | null;
  fee_head_id: string | null;
  fee_head_code: string | null;
  calculation_type: CalcType;
  base_variable: string | null;
  fixed_amount: number | null;
  percentage_rate: number | null;
  min_amount: number | null;
  max_amount: number | null;
  formula_code: string | null;
  tier_config_json: any;
  effective_from: string;
  effective_to: string | null;
  auto_apply: boolean;
  allow_waiver: boolean;
  waiver_requires_approval: boolean;
  status: string;
}

export interface FeeContext {
  claim_amount?: number;
  outstanding_amount?: number;
  arrears_amount?: number;
  number_of_hearings?: number;
  stage?: string;
  case_type?: string;
  employer_size?: number;
  risk_score?: number;
  days_overdue?: number;
  court_type?: string;
  service_method?: string;
  enforcement_type?: string;
}

export interface FeeCalc {
  amount: number;
  base_used: number | null;
  breakdown: string;
}

function clamp(amt: number, min: number | null, max: number | null): number {
  let v = amt;
  if (min != null && v < Number(min)) v = Number(min);
  if (max != null && v > Number(max)) v = Number(max);
  return Math.round(v * 100) / 100;
}

export function calculateFee(rule: LgFeeRule, ctx: FeeContext): FeeCalc {
  switch (rule.calculation_type) {
    case "FIXED": {
      const v = clamp(Number(rule.fixed_amount ?? 0), rule.min_amount, rule.max_amount);
      return { amount: v, base_used: null, breakdown: `FIXED ${v.toFixed(2)}` };
    }
    case "PERCENTAGE": {
      const base = Number((ctx as any)?.[rule.base_variable || "outstanding_amount"] ?? 0);
      const pct = Number(rule.percentage_rate ?? 0);
      const v = clamp(base * pct, rule.min_amount, rule.max_amount);
      return {
        amount: v,
        base_used: base,
        breakdown: `${(pct * 100).toFixed(2)}% × ${base.toFixed(2)} = ${v.toFixed(2)} (clamped ${rule.min_amount ?? "—"}…${rule.max_amount ?? "—"})`,
      };
    }
    case "TIER": {
      const tiers: Array<{ upTo: number | null; amount: number }> = Array.isArray(rule.tier_config_json) ? rule.tier_config_json : [];
      const base = Number((ctx as any)?.[rule.base_variable || "outstanding_amount"] ?? 0);
      const tier = tiers.find((t) => t.upTo == null || base <= Number(t.upTo));
      const v = clamp(Number(tier?.amount ?? 0), rule.min_amount, rule.max_amount);
      return { amount: v, base_used: base, breakdown: `TIER base=${base.toFixed(2)} → ${v.toFixed(2)}` };
    }
    case "FORMULA": {
      // Whitelisted simple arithmetic on a single base variable; safe fallback to fixed_amount.
      const base = Number((ctx as any)?.[rule.base_variable || "outstanding_amount"] ?? 0);
      const v = clamp(Number(rule.fixed_amount ?? 0) + base * Number(rule.percentage_rate ?? 0), rule.min_amount, rule.max_amount);
      return { amount: v, base_used: base, breakdown: `FORMULA(${rule.formula_code ?? "default"}) → ${v.toFixed(2)}` };
    }
    case "MANUAL":
    default:
      return { amount: 0, base_used: null, breakdown: "MANUAL — operator enters amount" };
  }
}

export async function listFeeRulesForEvent(eventCode: string): Promise<LgFeeRule[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("lg_fee_rule")
    .select("*")
    .eq("auto_apply", true)
    .eq("status", "ACTIVE")
    .eq("event_code", eventCode)
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`);
  if (error) throw error;
  return data ?? [];
}

export async function listBundlesForEvent(eventCode: string): Promise<any[]> {
  const { data, error } = await sb
    .from("lg_fee_bundle")
    .select("*, lg_fee_bundle_item(*, lg_fee_rule(*))")
    .eq("status", "ACTIVE")
    .eq("trigger_event", eventCode);
  if (error) throw error;
  return data ?? [];
}

async function loadCaseContext(lgCaseId: string): Promise<{ ctx: FeeContext; caseRow: any }> {
  const { data: c } = await sb
    .from("lg_case")
    .select("id, case_type_code, current_stage_code, claim_amount, outstanding_amount_snapshot, employer_id, opened_date")
    .eq("id", lgCaseId)
    .maybeSingle();
  const { count: hearings } = await sb.from("lg_hearing").select("id", { count: "exact", head: true }).eq("lg_case_id", lgCaseId);
  const opened = c?.opened_date ? new Date(c.opened_date) : new Date();
  const days = Math.max(0, Math.floor((Date.now() - opened.getTime()) / 86_400_000));
  const ctx: FeeContext = {
    claim_amount: Number(c?.claim_amount ?? 0),
    outstanding_amount: Number(c?.outstanding_amount_snapshot ?? c?.claim_amount ?? 0),
    arrears_amount: Number(c?.outstanding_amount_snapshot ?? 0),
    number_of_hearings: hearings ?? 0,
    stage: c?.current_stage_code,
    case_type: c?.case_type_code,
    days_overdue: days,
  };
  return { ctx, caseRow: c };
}

async function createChargeFromRule(opts: {
  lgCaseId: string;
  rule: LgFeeRule;
  ctx: FeeContext;
  sourceEvent: string;
  bundleId?: string | null;
  userCode?: string | null;
  autoApplied: boolean;
}): Promise<{ id: string; idempotency_key: string; amount: number } | null> {
  const calc = calculateFee(opts.rule, opts.ctx);
  const idem = `LG_FEE:${opts.lgCaseId}:${opts.rule.id}:${opts.sourceEvent}`;
  // Idempotent insert
  const { data: existing } = await sb
    .from("lg_fee_charge")
    .select("id, amount")
    .eq("idempotency_key", idem)
    .maybeSingle();
  if (existing) return { id: existing.id, idempotency_key: idem, amount: Number(existing.amount) };

  const { data, error } = await sb
    .from("lg_fee_charge")
    .insert({
      lg_case_id: opts.lgCaseId,
      fee_rule_id: opts.rule.id,
      fee_bundle_id: opts.bundleId ?? null,
      fee_head_ref_id: opts.rule.fee_head_id,
      fee_head_code: opts.rule.fee_head_code,
      description: opts.rule.fee_rule_name,
      amount: calc.amount,
      calculated_amount: calc.amount,
      currency_code: "XCD",
      charge_date: new Date().toISOString().slice(0, 10),
      status: "PENDING",
      posting_status: "PENDING",
      source_event: opts.sourceEvent,
      auto_applied: opts.autoApplied,
      idempotency_key: idem,
      charge_reason: calc.breakdown,
      created_by: opts.userCode ?? null,
    })
    .select("id, amount")
    .single();
  if (error) throw error;
  return { id: data.id, idempotency_key: idem, amount: Number(data.amount) };
}

export async function autoApplyForEvent(lgCaseId: string, eventCode: string, userCode?: string | null): Promise<string[]> {
  const { ctx } = await loadCaseContext(lgCaseId);
  const rules = await listFeeRulesForEvent(eventCode);
  const created: string[] = [];
  for (const r of rules) {
    const out = await createChargeFromRule({ lgCaseId, rule: r, ctx, sourceEvent: eventCode, userCode, autoApplied: true });
    if (out) created.push(out.id);
  }
  if (created.length) {
    await sb.from("lg_case_activity").insert({
      lg_case_id: lgCaseId,
      activity_type: "FEE_AUTO_APPLIED",
      description: `Auto-applied ${created.length} fee(s) for ${eventCode}`,
      performed_by: userCode ?? null,
    });
  }
  return created;
}

export async function applyBundle(lgCaseId: string, bundleId: string, userCode?: string | null): Promise<string[]> {
  const { ctx } = await loadCaseContext(lgCaseId);
  const { data: bundle, error } = await sb
    .from("lg_fee_bundle")
    .select("*, lg_fee_bundle_item(*, lg_fee_rule(*))")
    .eq("id", bundleId)
    .single();
  if (error) throw error;
  const items = (bundle.lg_fee_bundle_item || []).sort((a: any, b: any) => a.sequence_no - b.sequence_no);
  const created: string[] = [];
  for (const item of items) {
    if (!item.lg_fee_rule) continue;
    const out = await createChargeFromRule({
      lgCaseId,
      rule: item.lg_fee_rule,
      ctx,
      sourceEvent: bundle.trigger_event || "BUNDLE",
      bundleId,
      userCode,
      autoApplied: false,
    });
    if (out) created.push(out.id);
  }
  await sb.from("lg_case_activity").insert({
    lg_case_id: lgCaseId,
    activity_type: "FEE_BUNDLE_APPLIED",
    description: `Applied bundle ${bundle.bundle_code} (${created.length} fees)`,
    performed_by: userCode ?? null,
  });
  return created;
}

export async function addManualFee(opts: {
  lgCaseId: string;
  feeHeadId: string;
  feeHeadCode: string;
  amount: number;
  reason: string;
  userCode?: string | null;
}): Promise<string> {
  const { data, error } = await sb
    .from("lg_fee_charge")
    .insert({
      lg_case_id: opts.lgCaseId,
      fee_head_ref_id: opts.feeHeadId,
      fee_head_code: opts.feeHeadCode,
      description: opts.feeHeadCode,
      amount: opts.amount,
      calculated_amount: opts.amount,
      currency_code: "XCD",
      charge_date: new Date().toISOString().slice(0, 10),
      status: "PENDING",
      posting_status: "PENDING",
      source_event: "MANUAL",
      auto_applied: false,
      charge_reason: opts.reason,
      created_by: opts.userCode ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  await sb.from("lg_case_activity").insert({
    lg_case_id: opts.lgCaseId,
    activity_type: "FEE_ADDED_MANUAL",
    description: `Manual fee ${opts.feeHeadCode} ${opts.amount.toFixed(2)}`,
    performed_by: opts.userCode ?? null,
  });
  return data.id;
}

async function nextLegalInvoiceNumber(): Promise<string> {
  const yr = new Date().getFullYear();
  const { data } = await sb
    .from("cn_invoices")
    .select("invoice_number")
    .like("invoice_number", `LGL-${yr}-%`)
    .order("invoice_number", { ascending: false })
    .limit(1);
  const last = data?.[0]?.invoice_number;
  const next = last ? parseInt(String(last).split("-").pop() || "0", 10) + 1 : 1;
  return `LGL-${yr}-${String(next).padStart(6, "0")}`;
}

/**
 * Post a confirmed fee charge.
 * Dual posting:
 *   1. `ce_employer_financial_ledger` — compliance/arrears DEBIT entry.
 *   2. `cn_invoices` + `cn_invoice_lines` — collectible invoice the cashier
 *      can search, accept payment for, and reconcile.
 * Both writes are idempotent.
 */
export async function postFeeCharge(chargeId: string, userCode: string | null): Promise<void> {
  const { data: charge, error: cErr } = await sb
    .from("lg_fee_charge")
    .select("*, lg_case:lg_case_id(employer_id)")
    .eq("id", chargeId)
    .single();
  if (cErr) throw cErr;
  if (charge.posting_status === "POSTED" && charge.ledger_entry_id && charge.employer_account_transaction_id) {
    return;
  }

  const employerUuid = charge.lg_case?.employer_id;
  let erNo: string | null = null;
  let erName: string | null = null;
  if (employerUuid) {
    const { data: er } = await sb
      .from("au_er_master")
      .select("er_no, er_name")
      .eq("id", employerUuid)
      .maybeSingle();
    erNo = er?.er_no ?? null;
    erName = er?.er_name ?? null;
  }
  if (!erNo) throw new Error("Cannot post fee: employer er_no missing on case");

  const currency = charge.currency_code || "XCD";
  const netAmount = Number(charge.net_amount ?? (charge.amount - (charge.waived_amount || 0)));
  const period = new Date().toISOString().slice(0, 7);

  // ---- 1. Compliance ledger (idempotent) ----
  const ledgerIdem = `LG_FEE_POST:${chargeId}`;
  let ledgerId: string | null = charge.ledger_entry_id ?? null;
  if (!ledgerId) {
    const { data: existing } = await sb
      .from("ce_employer_financial_ledger")
      .select("id")
      .eq("idempotency_key", ledgerIdem)
      .maybeSingle();
    if (existing) {
      ledgerId = existing.id;
    } else {
      const { data: ledger, error: lErr } = await sb
        .from("ce_employer_financial_ledger")
        .insert({
          employer_id: erNo,
          employer_name: erName,
          entry_type: "ADJUSTMENT",
          fund_type: "SS",
          period,
          debit_amount: netAmount,
          credit_amount: 0,
          running_balance: 0,
          status: "POSTED",
          idempotency_key: ledgerIdem,
          reference_type: "LG_FEE_CHARGE",
          reference_id: chargeId,
          description: `Legal fee ${charge.fee_head_code}${charge.charge_reason ? " — " + charge.charge_reason : ""}`,
          posted_by: userCode ?? "SYSTEM",
          source_system: "LEGAL",
          source_pk: chargeId,
        })
        .select("id")
        .single();
      if (lErr) throw lErr;
      ledgerId = ledger.id;
    }
  }

  // ---- 2. Cashier invoice (idempotent on lg_fee_charge.employer_account_transaction_id) ----
  let invoiceId: number | null = charge.employer_account_transaction_id ?? null;
  if (!invoiceId) {
    const due = new Date(); due.setDate(due.getDate() + 14);
    const invoiceNumber = await nextLegalInvoiceNumber();
    const { data: invoice, error: iErr } = await sb
      .from("cn_invoices")
      .insert({
        invoice_number: invoiceNumber,
        invoice_type: "LEGAL",
        payment_source: "LEGAL",
        payer_type: "ER",
        payer_id: erNo,
        payer_name: erName,
        currency_code: currency,
        base_currency: currency,
        exchange_rate: 1,
        total_amount: netAmount,
        total_amount_base: netAmount,
        outstanding_amount: netAmount,
        paid_amount: 0,
        due_date: due.toISOString().slice(0, 10),
        status: "O",
        is_recurring: false,
        internal_notes: `Legal fee ${charge.fee_head_code} for case ${charge.lg_case_id} (charge ${chargeId})`,
        public_notes: charge.charge_reason ?? charge.description ?? null,
        created_by: userCode ?? null,
      })
      .select("id")
      .single();
    if (iErr) throw iErr;
    invoiceId = invoice.id;

    const { error: lnErr } = await sb
      .from("cn_invoice_lines")
      .insert({
        invoice_id: invoiceId,
        payment_code: charge.fee_head_code,
        currency_code: currency,
        amount: netAmount,
        exchange_rate: 1,
        amount_base: netAmount,
        base_currency: currency,
        sort_order: 1,
      });
    if (lnErr) throw lnErr;
  }

  await sb
    .from("lg_fee_charge")
    .update({
      ledger_entry_id: ledgerId,
      employer_account_transaction_id: invoiceId,
      posted_invoice_ref_id: invoiceId ? String(invoiceId) : null,
      posting_status: "POSTED",
      status: "POSTED",
      posted_by: userCode,
      posted_at: new Date().toISOString(),
    })
    .eq("id", chargeId);

  await sb.from("lg_case_activity").insert({
    lg_case_id: charge.lg_case_id,
    activity_type: "FEE_POSTED",
    description: `${charge.fee_head_code} ${netAmount.toFixed(2)} posted → ledger + invoice #${invoiceId} (employer ${erNo})`,
    performed_by: userCode,
  });
}
