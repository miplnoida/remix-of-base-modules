import { supabase } from "@/integrations/supabase/client";
import { evaluateWaiverPolicy } from "./lgFeeWaiverPolicyService";
const sb = supabase as any;

export interface LgFeeWaiver {
  id: string;
  fee_charge_id: string;
  waiver_reason_code: string | null;
  requested_by: string | null;
  requested_at: string;
  waiver_amount: number | null;
  waiver_percent: number | null;
  approval_status: "DRAFT" | "SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "AUTO_APPROVED";
  approved_by: string | null;
  approved_at: string | null;
  comments: string | null;
  reversal_ledger_entry_id: string | null;
  policy_id: string | null;
  workbasket_code: string | null;
  approver_role_type: string | null;
  requires_finance_approval: boolean;
  justification: string | null;
  supporting_document_id: string | null;
}

export async function listWaivers(lgCaseId: string): Promise<LgFeeWaiver[]> {
  const { data: charges } = await sb.from("lg_fee_charge").select("id").eq("lg_case_id", lgCaseId);
  const ids = (charges ?? []).map((c: any) => c.id);
  if (!ids.length) return [];
  const { data, error } = await sb
    .from("lg_fee_waiver")
    .select("*")
    .in("fee_charge_id", ids)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function requestWaiver(opts: {
  fee_charge_id: string;
  reason: string;
  amount?: number | null;
  percent?: number | null;
  comments?: string;
  justification?: string;
  supporting_document_id?: string | null;
  userCode?: string | null;
}): Promise<string> {
  const { data: charge } = await sb
    .from("lg_fee_charge")
    .select("id, amount, lg_case_id, fee_rule_id, fee_head_code, posting_status, waived_amount, lg_fee_rule:fee_rule_id(allow_waiver)")
    .eq("id", opts.fee_charge_id)
    .single();

  const ruleAllows = charge?.lg_fee_rule?.allow_waiver ?? true;
  if (!ruleAllows) throw new Error("Waiver not allowed for this fee");

  const gross = Number(charge.amount || 0);
  const remaining = Math.max(0, gross - Number(charge.waived_amount || 0));
  const reqAmt = opts.amount != null ? Number(opts.amount) : Number(opts.percent || 0) / 100 * gross;
  if (reqAmt > remaining) throw new Error(`Waiver ${reqAmt.toFixed(2)} exceeds remaining ${remaining.toFixed(2)}`);
  if (opts.percent != null && Number(opts.percent) > 100) throw new Error("Waiver percent cannot exceed 100%");
  if (reqAmt <= 0) throw new Error("Waiver amount must be greater than 0");

  const reqPct = gross > 0 ? (reqAmt / gross) * 100 : 0;
  const alreadyPosted = charge.posting_status === "POSTED";

  const evalResult = await evaluateWaiverPolicy({
    feeChargeId: opts.fee_charge_id,
    requestedAmount: reqAmt,
    requestedPercent: reqPct,
    chargeAlreadyPosted: alreadyPosted,
  });

  const status: LgFeeWaiver["approval_status"] = evalResult.autoApprove ? "AUTO_APPROVED" : "SUBMITTED";

  const { data, error } = await sb
    .from("lg_fee_waiver")
    .insert({
      fee_charge_id: opts.fee_charge_id,
      lg_case_id: charge.lg_case_id,
      waiver_reason_code: opts.reason,
      requested_by: opts.userCode ?? null,
      waiver_amount: reqAmt,
      requested_waiver_amount: reqAmt,
      waiver_percent: reqPct,
      requested_waiver_percent: reqPct,
      comments: opts.comments ?? null,
      justification: opts.justification ?? null,
      supporting_document_id: opts.supporting_document_id ?? null,
      approval_status: status,
      policy_id: evalResult.policyId,
      workbasket_code: evalResult.workbasketCode,
      approver_role_type: evalResult.approverRoleType,
      requires_finance_approval: evalResult.requiresFinance,
    })
    .select("id")
    .single();
  if (error) throw error;

  await sb.from("lg_fee_charge").update({ waiver_status: "REQUESTED" }).eq("id", opts.fee_charge_id);
  await sb.from("lg_case_activity").insert({
    lg_case_id: charge.lg_case_id,
    activity_type: "FEE_WAIVER_REQUESTED",
    description: `Waiver ${reqAmt.toFixed(2)} requested on ${charge.fee_head_code} — ${evalResult.reason}`,
    performed_by: opts.userCode ?? null,
  });

  if (evalResult.autoApprove) {
    await approveWaiver(data.id, opts.userCode ?? null);
  }
  return data.id;
}

export async function approveWaiver(waiverId: string, userCode: string | null): Promise<void> {
  const { data: w, error } = await sb
    .from("lg_fee_waiver")
    .select("*, charge:fee_charge_id(*)")
    .eq("id", waiverId)
    .single();
  if (error) throw error;
  const charge = w.charge;
  const gross = Number(charge.amount || 0);
  const waivedAmount = w.waiver_amount != null
    ? Number(w.waiver_amount)
    : Number(w.waiver_percent || 0) * gross;
  const finalWaived = Math.min(gross, Math.max(0, waivedAmount));

  await sb
    .from("lg_fee_charge")
    .update({
      waived_amount: finalWaived,
      waiver_status: "APPROVED",
    })
    .eq("id", charge.id);

  let reversalId: string | null = null;
  if (charge.posting_status === "POSTED" && charge.ledger_entry_id) {
    const { data: orig } = await sb
      .from("ce_employer_financial_ledger")
      .select("employer_id, employer_name, period, fund_type")
      .eq("id", charge.ledger_entry_id)
      .single();
    const idem = `LG_FEE_WAIVER:${waiverId}`;
    const { data: existing } = await sb
      .from("ce_employer_financial_ledger")
      .select("id")
      .eq("idempotency_key", idem)
      .maybeSingle();
    if (existing) {
      reversalId = existing.id;
    } else {
      const { data: rev, error: rErr } = await sb
        .from("ce_employer_financial_ledger")
        .insert({
          employer_id: orig.employer_id,
          employer_name: orig.employer_name,
          entry_type: "WAIVER_APPLIED",
          fund_type: orig.fund_type,
          period: orig.period,
          debit_amount: 0,
          credit_amount: finalWaived,
          running_balance: 0,
          status: "POSTED",
          idempotency_key: idem,
          reference_type: "LG_FEE_WAIVER",
          reference_id: waiverId,
          reversal_of_id: charge.ledger_entry_id,
          description: `Waiver of legal fee ${charge.fee_head_code}`,
          posted_by: userCode ?? "SYSTEM",
          source_system: "LEGAL",
          source_pk: waiverId,
        })
        .select("id")
        .single();
      if (rErr) throw rErr;
      reversalId = rev.id;
    }
  }

  if (charge.employer_account_transaction_id) {
    const invoiceId = charge.employer_account_transaction_id;
    const { data: inv } = await sb
      .from("cn_invoices")
      .select("id, status, total_amount, paid_amount, outstanding_amount")
      .eq("id", invoiceId)
      .maybeSingle();
    if (inv && inv.status !== "C") {
      const paid = Number(inv.paid_amount || 0);
      const newTotal = Math.max(paid, Number(inv.total_amount || 0) - finalWaived);
      const newOutstanding = Math.max(0, newTotal - paid);
      const fullyWaived = newOutstanding === 0 && paid === 0;
      await sb
        .from("cn_invoices")
        .update(
          fullyWaived
            ? {
                status: "C",
                cancel_date: new Date().toISOString(),
                cancel_user: userCode ?? "SYSTEM",
                cancel_reason: `Legal fee waived (${charge.fee_head_code})`,
                outstanding_amount: 0,
              }
            : {
                total_amount: newTotal,
                total_amount_base: newTotal,
                outstanding_amount: newOutstanding,
                status: newOutstanding === 0 ? "P" : inv.status,
                internal_notes: `Waiver of ${finalWaived.toFixed(2)} applied — see waiver ${waiverId}`,
              },
        )
        .eq("id", invoiceId);
    }
  }

  await sb
    .from("lg_fee_waiver")
    .update({
      approval_status: w.approval_status === "AUTO_APPROVED" ? "AUTO_APPROVED" : "APPROVED",
      approved_by: userCode,
      approved_at: new Date().toISOString(),
      reversal_ledger_entry_id: reversalId,
    })
    .eq("id", waiverId);

  await sb.from("lg_case_activity").insert({
    lg_case_id: charge.lg_case_id,
    activity_type: "FEE_WAIVER_APPROVED",
    description: `Waiver ${finalWaived.toFixed(2)} approved on ${charge.fee_head_code}`,
    performed_by: userCode,
  });
}

export async function rejectWaiver(waiverId: string, userCode: string | null, reason?: string): Promise<void> {
  const { data: w } = await sb.from("lg_fee_waiver").select("*, charge:fee_charge_id(*)").eq("id", waiverId).single();
  await sb
    .from("lg_fee_waiver")
    .update({
      approval_status: "REJECTED",
      rejected_by: userCode,
      rejected_at: new Date().toISOString(),
      comments: reason ?? w.comments,
    })
    .eq("id", waiverId);
  await sb.from("lg_fee_charge").update({ waiver_status: "REJECTED" }).eq("id", w.fee_charge_id);
  await sb.from("lg_case_activity").insert({
    lg_case_id: w.charge.lg_case_id,
    activity_type: "FEE_WAIVER_REJECTED",
    description: `Waiver rejected on ${w.charge.fee_head_code}`,
    performed_by: userCode,
  });
}

export async function cancelWaiver(waiverId: string, userCode: string | null): Promise<void> {
  const { data: w } = await sb.from("lg_fee_waiver").select("lg_case_id, fee_charge_id").eq("id", waiverId).single();
  await sb.from("lg_fee_waiver").update({
    approval_status: "CANCELLED",
    cancelled_by: userCode,
    cancelled_at: new Date().toISOString(),
  }).eq("id", waiverId);
  await sb.from("lg_fee_charge").update({ waiver_status: "NONE" }).eq("id", w.fee_charge_id);
  await sb.from("lg_case_activity").insert({
    lg_case_id: w.lg_case_id,
    activity_type: "FEE_WAIVER_CANCELLED",
    description: `Waiver cancelled`,
    performed_by: userCode,
  });
}
