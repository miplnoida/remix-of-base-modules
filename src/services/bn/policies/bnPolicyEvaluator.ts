/**
 * Central policy evaluator. Pure read/decision layer — no DB writes.
 *
 * Every Benefits override/approval decision must run through `evaluatePolicy`.
 * No component or service may make its own role/status check. If a check is
 * missing, add it to `bn_approval_policy` via Product Catalog → Approval /
 * Override Policies and the evaluator will pick it up.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  ApprovalPolicy,
  PolicyArea,
  PolicyContext,
  PolicyDecision,
} from './types';

const db = supabase as any;

function normaliseRoles(roles: string[] | undefined): string[] {
  return (roles ?? []).map((r) => String(r || '').toUpperCase()).filter(Boolean);
}

function hasRole(userRoles: string[], required: string | null | undefined): boolean {
  if (!required) return true;
  const need = String(required).toUpperCase();
  return normaliseRoles(userRoles).includes(need);
}

/** Fetch every policy row for a product version. */
export async function getProductPolicies(productVersionId: string): Promise<ApprovalPolicy[]> {
  if (!productVersionId) return [];
  const { data, error } = await db
    .from('bn_approval_policy')
    .select('*')
    .eq('product_version_id', productVersionId);
  if (error) throw new Error(`getProductPolicies failed: ${error.message}`);
  return (data ?? []) as ApprovalPolicy[];
}

/** Fetch a single policy by area + action (DEFAULT if no override). */
export async function getPolicy(
  productVersionId: string,
  area: PolicyArea,
  actionCode = 'DEFAULT',
): Promise<ApprovalPolicy | null> {
  if (!productVersionId) return null;
  // Try the specific action; fall back to DEFAULT.
  const { data, error } = await db
    .from('bn_approval_policy')
    .select('*')
    .eq('product_version_id', productVersionId)
    .eq('policy_area', area)
    .in('action_code', [actionCode, 'DEFAULT'])
    .order('action_code', { ascending: actionCode === 'DEFAULT' });
  if (error) throw new Error(`getPolicy failed: ${error.message}`);
  const rows = (data ?? []) as ApprovalPolicy[];
  return rows.find((r) => r.action_code === actionCode) ?? rows[0] ?? null;
}

function emptyDecision(reason: string): PolicyDecision {
  return {
    allowed: false,
    policy: null,
    reasons: [reason],
    requires: { reasonCode: false, justification: false, document: false, supervisorApproval: false },
  };
}

/** Core evaluator. Returns whether the actor may perform the requested action. */
export async function evaluatePolicy(ctx: PolicyContext): Promise<PolicyDecision> {
  const policy = await getPolicy(ctx.productVersionId, ctx.area, ctx.actionCode);
  if (!policy) return emptyDecision(`No ${ctx.area} policy configured for this product version.`);
  if (!policy.is_enabled) return { ...emptyDecision(`${ctx.area} overrides are disabled for this product.`), policy };

  const reasons: string[] = [];
  const requires = {
    reasonCode: !!policy.requires_reason_code,
    justification: !!policy.requires_justification,
    document: !!policy.requires_document,
    supervisorApproval: !!policy.requires_supervisor_approval,
  };

  // Status gate
  if (ctx.claimStatus) {
    if (policy.allowed_statuses?.length && !policy.allowed_statuses.includes(ctx.claimStatus)) {
      reasons.push(`Claim status "${ctx.claimStatus}" is not in the allowed statuses for this policy.`);
    }
    if (policy.blocked_statuses?.includes(ctx.claimStatus)) {
      reasons.push(`Claim status "${ctx.claimStatus}" is blocked from ${ctx.area} overrides.`);
    }
  }

  // Rule gate
  if (ctx.ruleCode) {
    if (policy.allowed_rule_codes?.length && !policy.allowed_rule_codes.includes(ctx.ruleCode)) {
      reasons.push(`Rule "${ctx.ruleCode}" is not allowed by this policy.`);
    }
    if (policy.blocked_rule_codes?.includes(ctx.ruleCode)) {
      reasons.push(`Rule "${ctx.ruleCode}" is blocked from override.`);
    }
  }

  // Non-waivable guard (documents)
  if (policy.non_waivable && ctx.actionKind === 'REQUEST') {
    reasons.push('This item is marked non-waivable and cannot be overridden.');
  }

  // Amount thresholds
  if (typeof ctx.amount === 'number') {
    if (policy.max_override_amount !== null && ctx.amount > Number(policy.max_override_amount)) {
      reasons.push(`Amount exceeds maximum override of ${policy.max_override_amount}.`);
    }
  }

  // Action-kind specific role checks
  if (ctx.actionKind === 'APPROVE') {
    if (!hasRole(ctx.userRoles, policy.approval_role)) {
      reasons.push(`Approval requires role "${policy.approval_role}".`);
    }
    // Maker-checker
    if (
      ctx.requesterUserId &&
      ctx.requesterUserId === ctx.userId &&
      !policy.self_approval_allowed
    ) {
      reasons.push('Maker-checker: a different reviewer must approve this request.');
    }
  }

  return {
    allowed: reasons.length === 0,
    policy,
    reasons,
    requires,
    approverRole: policy.approval_role,
    workbasketId: policy.approval_workbasket_id,
  };
}

// ─── Convenience helpers (typed entry points) ──────────────────────────

export const canRequestOverride = (ctx: Omit<PolicyContext, 'actionKind'>) =>
  evaluatePolicy({ ...ctx, actionKind: 'REQUEST' });

export const canApproveOverride = (ctx: Omit<PolicyContext, 'actionKind'>) =>
  evaluatePolicy({ ...ctx, actionKind: 'APPROVE' });

export const canWaiveDocument = (ctx: Omit<PolicyContext, 'actionKind' | 'area'>) =>
  evaluatePolicy({ ...ctx, area: 'DOCUMENTS', actionKind: 'REQUEST' });

export const canOverrideCalculation = (ctx: Omit<PolicyContext, 'actionKind' | 'area'>) =>
  evaluatePolicy({ ...ctx, area: 'CALCULATION', actionKind: 'REQUEST' });

export const canAmendClaim = (ctx: Omit<PolicyContext, 'actionKind' | 'area'>) =>
  evaluatePolicy({ ...ctx, area: 'AMENDMENTS', actionKind: 'REQUEST' });

export const canOverrideWorkflow = (ctx: Omit<PolicyContext, 'actionKind' | 'area'>) =>
  evaluatePolicy({ ...ctx, area: 'WORKFLOW', actionKind: 'REQUEST' });

export const canApproveAward = (ctx: Omit<PolicyContext, 'actionKind' | 'area'>) =>
  evaluatePolicy({ ...ctx, area: 'AWARD', actionKind: 'APPROVE' });

export const canApprovePayment = (ctx: Omit<PolicyContext, 'actionKind' | 'area'>) =>
  evaluatePolicy({ ...ctx, area: 'PAYMENT', actionKind: 'APPROVE' });
