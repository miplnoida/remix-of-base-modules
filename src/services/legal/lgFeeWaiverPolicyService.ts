import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface LgFeeWaiverPolicy {
  id: string;
  policy_code: string;
  policy_name: string;
  country_code: string | null;
  fee_head_id: string | null;
  case_type_code: string | null;
  max_waiver_amount_without_approval: number;
  max_waiver_percent_without_approval: number;
  approval_required: boolean;
  approval_route_code: string | null;
  min_approvers: number;
  allow_self_approval: boolean;
  requires_reason: boolean;
  requires_document: boolean;
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
}

export interface LgFeeWaiverPolicyTier {
  id: string;
  policy_id: string;
  tier_order: number;
  min_amount: number | null;
  max_amount: number | null;
  min_percent: number | null;
  max_percent: number | null;
  approver_role_type: string | null;
  workbasket_code: string | null;
  requires_finance: boolean;
}

export interface WaiverEvaluation {
  policyId: string | null;
  policyCode: string | null;
  autoApprove: boolean;
  approvalRequired: boolean;
  approverRoleType: string | null;
  workbasketCode: string | null;
  requiresFinance: boolean;
  matchedTierOrder: number | null;
  reason: string;
}

export async function listPolicies(): Promise<LgFeeWaiverPolicy[]> {
  const { data, error } = await sb
    .from("lg_fee_waiver_policy")
    .select("*")
    .order("policy_code", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listTiers(policyId: string): Promise<LgFeeWaiverPolicyTier[]> {
  const { data, error } = await sb
    .from("lg_fee_waiver_policy_tier")
    .select("*")
    .eq("policy_id", policyId)
    .order("tier_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function upsertPolicy(p: Partial<LgFeeWaiverPolicy> & { policy_code?: string }): Promise<string> {
  if (p.id) {
    const { error } = await sb.from("lg_fee_waiver_policy").update(p).eq("id", p.id);
    if (error) throw error;
    return p.id;
  }
  // Central numbering: FWP-{SEQ}. Force auto-generate on create — allowOverride=false.
  const { generateAutoCode } = await import("@/hooks/useAutoCode");
  const payload: any = { ...p, policy_code: await generateAutoCode({ entityKey: "FEE_WAIVER_POLICY" }) };
  const { data, error } = await sb.from("lg_fee_waiver_policy").insert(payload).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deletePolicy(id: string): Promise<void> {
  const { error } = await sb.from("lg_fee_waiver_policy").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertTier(t: Partial<LgFeeWaiverPolicyTier> & { policy_id: string; tier_order: number }): Promise<string> {
  if (t.id) {
    const { error } = await sb.from("lg_fee_waiver_policy_tier").update(t).eq("id", t.id);
    if (error) throw error;
    return t.id;
  }
  const { data, error } = await sb.from("lg_fee_waiver_policy_tier").insert(t).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deleteTier(id: string): Promise<void> {
  const { error } = await sb.from("lg_fee_waiver_policy_tier").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Evaluate which approval is required for a waiver request.
 * Resolution order:
 *  1. Explicit policy on the fee rule (lg_fee_rule.waiver_policy_id)
 *  2. Active policy matching fee_head_id
 *  3. Active policy matching case_type_code
 *  4. Country default (SMALL_DEPT_DEFAULT)
 */
export async function evaluateWaiverPolicy(opts: {
  feeChargeId: string;
  requestedAmount: number;
  requestedPercent: number;
  chargeAlreadyPosted: boolean;
}): Promise<WaiverEvaluation> {
  // 1. Load charge → rule → policy
  const { data: charge } = await sb
    .from("lg_fee_charge")
    .select("id, amount, fee_head_ref_id, lg_case_id, posting_status, fee_rule_id, lg_fee_rule:fee_rule_id(waiver_policy_id, allow_waiver)")
    .eq("id", opts.feeChargeId)
    .maybeSingle();

  let policyId: string | null = charge?.lg_fee_rule?.waiver_policy_id ?? null;

  if (!policyId && charge?.fee_head_ref_id) {
    const { data } = await sb
      .from("lg_fee_waiver_policy")
      .select("id")
      .eq("status", "ACTIVE")
      .eq("fee_head_id", charge.fee_head_ref_id)
      .limit(1)
      .maybeSingle();
    if (data) policyId = data.id;
  }

  if (!policyId) {
    const { data } = await sb
      .from("lg_fee_waiver_policy")
      .select("id")
      .eq("status", "ACTIVE")
      .eq("policy_code", "SMALL_DEPT_DEFAULT")
      .maybeSingle();
    if (data) policyId = data.id;
  }

  if (!policyId) {
    return {
      policyId: null, policyCode: null, autoApprove: false, approvalRequired: true,
      approverRoleType: "LG_APPROVER", workbasketCode: "LG_FEE_WAIVER_REVIEW",
      requiresFinance: opts.chargeAlreadyPosted, matchedTierOrder: null,
      reason: "No policy configured — defaulting to LG approver review",
    };
  }

  const { data: policy } = await sb
    .from("lg_fee_waiver_policy")
    .select("*")
    .eq("id", policyId)
    .single();

  // Auto-approve check
  const withinAmt = opts.requestedAmount <= Number(policy.max_waiver_amount_without_approval || 0);
  const withinPct = opts.requestedPercent <= Number(policy.max_waiver_percent_without_approval || 0);
  if (!opts.chargeAlreadyPosted && policy.approval_required && withinAmt && withinPct) {
    return {
      policyId, policyCode: policy.policy_code,
      autoApprove: true, approvalRequired: false,
      approverRoleType: "AUTO", workbasketCode: "LG_FEE_WAIVER_APPROVED_FOR_POSTING",
      requiresFinance: false, matchedTierOrder: 0,
      reason: `Within auto-approve thresholds (≤ ${policy.max_waiver_amount_without_approval} XCD / ≤ ${policy.max_waiver_percent_without_approval}%)`,
    };
  }

  // Tier match
  const tiers = await listTiers(policyId);
  const matched = tiers.find(t => {
    const amtOk = (t.min_amount == null || opts.requestedAmount >= Number(t.min_amount))
               && (t.max_amount == null || opts.requestedAmount <= Number(t.max_amount));
    const pctOk = (t.min_percent == null || opts.requestedPercent >= Number(t.min_percent))
               && (t.max_percent == null || opts.requestedPercent <= Number(t.max_percent));
    return amtOk || pctOk;
  });

  const requiresFinance = opts.chargeAlreadyPosted || (matched?.requires_finance ?? false);

  return {
    policyId, policyCode: policy.policy_code,
    autoApprove: false,
    approvalRequired: true,
    approverRoleType: matched?.approver_role_type ?? "LG_APPROVER",
    workbasketCode: requiresFinance
      ? "LG_FEE_WAIVER_FINANCE_REVIEW"
      : (matched?.workbasket_code ?? policy.approval_route_code ?? "LG_FEE_WAIVER_REVIEW"),
    requiresFinance,
    matchedTierOrder: matched?.tier_order ?? null,
    reason: matched
      ? `Tier ${matched.tier_order}: routes to ${matched.approver_role_type ?? "approver"}${requiresFinance ? " + finance" : ""}`
      : "No matching tier — default approver review",
  };
}
