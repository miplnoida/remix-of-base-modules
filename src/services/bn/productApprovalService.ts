/**
 * Product Approval Service
 *
 * Drives the multi-level CONFIG_PUBLISH approval workflow for a
 * `bn_product_version` (which bundles the product's eligibility,
 * calculation and other rule changes).
 *
 * Levels are configurable per product via:
 *   bn_approval_policy WHERE policy_area = 'CONFIG_PUBLISH'
 *
 * Decisions are recorded in bn_version_approval (one row per level
 * decision: SUBMIT / REVIEW / APPROVE / REJECT / WITHDRAW / PUBLISH).
 *
 * Status transitions on bn_product_version.status:
 *   DRAFT → IN_REVIEW → APPROVED → ACTIVE
 *     (any stage) ─ REJECT ─→ DRAFT
 */
import { supabase } from '@/integrations/supabase/client';

export type ProductApprovalAction =
  | 'SUBMIT' | 'REVIEW' | 'APPROVE' | 'REJECT' | 'WITHDRAW' | 'PUBLISH';

export interface ApprovalLevelPolicy {
  id: string;
  level: number;
  stage_code: string | null;
  action_code: string;
  approval_role: string | null;
  approval_workbasket_id: string | null;
  requires_justification: boolean;
}

export interface ApprovalEvent {
  id: string;
  product_version_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  level: number | null;
  stage_code: string | null;
  approver_role: string | null;
  decision: string | null;
  reason_code: string | null;
  comments: string | null;
  performed_by: string | null;
  performed_at: string;
}

/** Ordered list of CONFIG_PUBLISH approval levels for a product version. */
export async function getApprovalChain(productVersionId: string): Promise<ApprovalLevelPolicy[]> {
  const { data, error } = await supabase
    .from('bn_approval_policy')
    .select('id, level, stage_code, action_code, approval_role, approval_workbasket_id, requires_justification')
    .eq('product_version_id', productVersionId)
    .eq('policy_area', 'CONFIG_PUBLISH')
    .eq('is_enabled', true)
    .order('level', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(r => ({
    id: r.id,
    level: r.level ?? 1,
    stage_code: r.stage_code,
    action_code: r.action_code,
    approval_role: r.approval_role,
    approval_workbasket_id: r.approval_workbasket_id,
    requires_justification: !!r.requires_justification,
  }));
}

/** Approval history for the version, ordered chronologically. */
export async function getApprovalHistory(productVersionId: string): Promise<ApprovalEvent[]> {
  const { data, error } = await supabase
    .from('bn_version_approval')
    .select('*')
    .eq('product_version_id', productVersionId)
    .order('performed_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ApprovalEvent[];
}

/**
 * Resolve the next pending level for a product version:
 *  - Highest level that has been APPROVED in history → next level above it.
 *  - If none approved yet → first level.
 *  - If all levels approved → null (ready to PUBLISH).
 */
export async function getNextPendingLevel(productVersionId: string): Promise<ApprovalLevelPolicy | null> {
  const [chain, history] = await Promise.all([
    getApprovalChain(productVersionId),
    getApprovalHistory(productVersionId),
  ]);
  if (chain.length === 0) return null;
  const approvedLevels = new Set(
    history.filter(h => h.decision === 'APPROVED' && h.level != null).map(h => h.level as number),
  );
  for (const level of chain) {
    if (!approvedLevels.has(level.level)) return level;
  }
  return null;
}

interface DecisionInput {
  productVersionId: string;
  action: ProductApprovalAction;
  level?: number;
  stageCode?: string | null;
  approverRole?: string | null;
  reasonCode?: string | null;
  comments?: string | null;
  performedBy: string; // user_code
  ruleDiffSnapshot?: unknown;
}

/** Persist a decision row + transition bn_product_version.status when warranted. */
export async function recordDecision(input: DecisionInput): Promise<void> {
  const { data: pv, error: pvErr } = await supabase
    .from('bn_product_version')
    .select('status')
    .eq('id', input.productVersionId)
    .maybeSingle();
  if (pvErr) throw pvErr;
  const fromStatus = pv?.status ?? null;

  let toStatus = fromStatus;
  let decision: string | null = null;
  switch (input.action) {
    case 'SUBMIT':
      toStatus = 'IN_REVIEW'; decision = 'SUBMITTED'; break;
    case 'REVIEW':
    case 'APPROVE':
      decision = 'APPROVED';
      break;
    case 'REJECT':
      toStatus = 'DRAFT'; decision = 'REJECTED'; break;
    case 'WITHDRAW':
      toStatus = 'DRAFT'; decision = 'WITHDRAWN'; break;
    case 'PUBLISH':
      toStatus = 'ACTIVE'; decision = 'PUBLISHED'; break;
  }

  // For APPROVE/REVIEW: if this was the last pending level, move to APPROVED
  if (decision === 'APPROVED' && input.level != null) {
    const next = await getNextPendingLevel(input.productVersionId);
    // The current decision is not yet persisted, so getNextPendingLevel still
    // returns the level we're approving now. Treat it as "no remaining" when
    // that level matches the input level AND there is no level above it.
    const chain = await getApprovalChain(input.productVersionId);
    const isLast = chain.every(l => l.level <= input.level!);
    if (isLast && next?.level === input.level) toStatus = 'APPROVED';
  }

  const { error: insertErr } = await supabase.from('bn_version_approval').insert({
    product_version_id: input.productVersionId,
    action: input.action,
    from_status: fromStatus,
    to_status: toStatus,
    level: input.level ?? null,
    stage_code: input.stageCode ?? null,
    approver_role: input.approverRole ?? null,
    decision,
    reason_code: input.reasonCode ?? null,
    comments: input.comments ?? null,
    performed_by: input.performedBy,
    rule_diff_snapshot: input.ruleDiffSnapshot ?? null,
  });
  if (insertErr) throw insertErr;

  if (toStatus && toStatus !== fromStatus) {
    const { error: updErr } = await supabase
      .from('bn_product_version')
      .update({ status: toStatus, modified_by: input.performedBy, modified_at: new Date().toISOString() })
      .eq('id', input.productVersionId);
    if (updErr) throw updErr;
  }
}

/** List versions awaiting a decision from the roles the current user holds. */
export async function listPendingForRoles(userRoles: string[]) {
  const { data: pvs, error } = await supabase
    .from('bn_product_version')
    .select(`
      id, version_number, status, effective_from, effective_to, description,
      bn_product:product_id ( benefit_code, benefit_name, category )
    `)
    .in('status', ['IN_REVIEW', 'APPROVED'])
    .order('modified_at', { ascending: false })
    .limit(500);
  if (error) throw error;

  const result: Array<{
    productVersion: any;
    nextLevel: ApprovalLevelPolicy | null;
    canAct: boolean;
  }> = [];
  for (const pv of pvs ?? []) {
    const next = await getNextPendingLevel(pv.id);
    const canAct = !!next?.approval_role && userRoles.includes(next.approval_role);
    result.push({ productVersion: pv, nextLevel: next, canAct });
  }
  return result;
}
