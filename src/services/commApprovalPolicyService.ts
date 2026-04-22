/**
 * Communication Approval Policy resolver.
 * ----------------------------------------------------------------------------
 * Decides — for a given draft context — whether a communication can be sent
 * directly OR which approver chain must sign off, based on configurable
 * policies stored in `ce_audit_comm_approval_policies`.
 *
 * Matching rules (any NULL field on the policy = wildcard):
 *   • match_comm_type           must equal context.commType
 *   • match_lifecycle_stage     must equal context.lifecycleStage
 *   • match_case_type           must equal context.caseType
 *   • match_enforcement_stage   must equal context.enforcementStage
 *   • min_severity              context.severity rank must be ≥ this
 *
 * Resolution: pick the active policy with the lowest `priority` value among
 * the matchers (lower = stronger). If no policy matches, fall back to the
 * template's static `approval_rule_json` (legacy behavior).
 */
import { supabase } from '@/integrations/supabase/client';
import type { CeCommApprovalRole, CeCommType, CeCommLifecycleStage } from '@/types/auditCommunication';

const POL = 'ce_audit_comm_approval_policies' as any;

export type Severity = 'none' | 'low' | 'medium' | 'high' | 'critical';

const SEV_RANK: Record<Severity, number> = {
  none: 0, low: 1, medium: 2, high: 3, critical: 4,
};

export interface ApprovalPolicyRow {
  id: string;
  policy_code: string;
  policy_name: string;
  description: string | null;
  match_comm_type: CeCommType | null;
  match_lifecycle_stage: CeCommLifecycleStage | null;
  match_case_type: string | null;
  match_enforcement_stage: string | null;
  min_severity: Severity;
  direct_send_allowed: boolean;
  required_roles: CeCommApprovalRole[];
  priority: number;
  is_active: boolean;
}

export interface PolicyContext {
  commType: CeCommType;
  lifecycleStage?: CeCommLifecycleStage | null;
  caseType?: string | null;
  enforcementStage?: string | null;
  severity?: Severity;
}

export interface ResolvedApprovalPlan {
  /** True if the draft can bypass approval entirely. */
  directSendAllowed: boolean;
  /** Ordered approver roles (empty = no approval rows needed). */
  requiredRoles: CeCommApprovalRole[];
  /** Which policy decided this plan, if any. */
  policyId: string | null;
  policyCode: string | null;
  /** Human-readable explanation for the UI. */
  reason: string;
}

function matches(pol: ApprovalPolicyRow, ctx: PolicyContext): boolean {
  if (pol.match_comm_type && pol.match_comm_type !== ctx.commType) return false;
  if (pol.match_lifecycle_stage && pol.match_lifecycle_stage !== ctx.lifecycleStage) return false;
  if (pol.match_case_type && pol.match_case_type !== ctx.caseType) return false;
  if (pol.match_enforcement_stage && pol.match_enforcement_stage !== ctx.enforcementStage) return false;
  const sev = ctx.severity ?? 'none';
  if (SEV_RANK[sev] < SEV_RANK[pol.min_severity]) return false;
  return true;
}

export const commApprovalPolicyService = {
  async list(): Promise<ApprovalPolicyRow[]> {
    const { data, error } = await (supabase.from(POL) as any)
      .select('*')
      .order('priority');
    if (error) throw error;
    return (data || []) as ApprovalPolicyRow[];
  },

  async resolve(ctx: PolicyContext, fallbackRoles: CeCommApprovalRole[] = []): Promise<ResolvedApprovalPlan> {
    const { data, error } = await (supabase.from(POL) as any)
      .select('*')
      .eq('is_active', true)
      .order('priority');
    if (error) throw error;
    const all = (data || []) as ApprovalPolicyRow[];
    const winner = all.find((p) => matches(p, ctx));

    if (winner) {
      return {
        directSendAllowed: winner.direct_send_allowed,
        requiredRoles: winner.required_roles || [],
        policyId: winner.id,
        policyCode: winner.policy_code,
        reason: `Matched policy "${winner.policy_name}"`,
      };
    }
    // Legacy fallback — use the template's static approval_rule_json
    return {
      directSendAllowed: fallbackRoles.length === 0,
      requiredRoles: fallbackRoles,
      policyId: null,
      policyCode: null,
      reason: fallbackRoles.length
        ? 'Using template-defined approval roles (no policy matched).'
        : 'No policy matched — direct send permitted.',
    };
  },

  async upsert(row: Partial<ApprovalPolicyRow> & { policy_code: string }, userCode?: string) {
    const { error } = await (supabase.from(POL) as any).upsert(
      { ...row, updated_by: userCode, created_by: row.id ? undefined : userCode },
      { onConflict: 'policy_code' },
    );
    if (error) throw error;
  },

  async setActive(id: string, isActive: boolean, userCode?: string) {
    const { error } = await (supabase.from(POL) as any)
      .update({ is_active: isActive, updated_by: userCode })
      .eq('id', id);
    if (error) throw error;
  },
};
