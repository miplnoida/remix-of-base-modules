/**
 * BN Escalation Runner (Phase 5)
 *
 * Scans `bn_external_task` for PENDING items past their `due_at` and
 * fires the matching `bn_escalation_policy`:
 *   - inserts a `bn_escalation_event`
 *   - optionally reassigns the claim to `escalation_target_basket_id`
 *   - writes a BN claim event + audit trail
 *
 * Idempotent: skips tasks that already have an unresolved escalation event
 * for the same policy.
 */
import { supabase } from '@/integrations/supabase/client';
import { auditClaimAction } from '@/services/bn/audit/bnAuditService';
import { assignClaimToWorkbasket } from '@/services/bn/approvalLevelService';

const db = supabase as any;

export interface EscalationResult {
  scanned: number;
  escalated: number;
  skipped: number;
  errors: string[];
}

const norm = (s: any) => String(s || '').toUpperCase();

async function findPolicyFor(params: {
  productCategory?: string | null;
  countryCode?: string | null;
}): Promise<any | null> {
  const { data } = await db
    .from('bn_escalation_policy')
    .select('*')
    .eq('is_active', true)
    .eq('trigger_type', 'TASK_OVERDUE');
  const rows = (data ?? []) as any[];
  if (rows.length === 0) return null;
  const cat = norm(params.productCategory);
  const cc = norm(params.countryCode);
  return (
    rows.find((p) => norm(p.product_category) === cat && norm(p.country_code) === cc) ??
    rows.find((p) => norm(p.product_category) === cat && !p.country_code) ??
    rows.find((p) => !p.product_category && norm(p.country_code) === cc) ??
    rows.find((p) => !p.product_category && !p.country_code) ??
    null
  );
}

export async function escalateOverdueExternalTasks(
  performedBy = 'SYSTEM',
): Promise<EscalationResult> {
  const result: EscalationResult = { scanned: 0, escalated: 0, skipped: 0, errors: [] };

  const nowIso = new Date().toISOString();
  const { data: tasks, error } = await db
    .from('bn_external_task')
    .select('id, claim_id, participant_kind, task_type, due_at, status, blocks_workflow')
    .eq('status', 'PENDING')
    .not('due_at', 'is', null)
    .lt('due_at', nowIso);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  result.scanned = (tasks ?? []).length;
  if (result.scanned === 0) return result;

  // Bulk load product/country for involved claims.
  const claimIds = Array.from(new Set((tasks as any[]).map((t) => t.claim_id)));
  const { data: claims } = await db
    .from('bn_claim')
    .select('id, product_id, country_code, status, claim_number, ssn')
    .in('id', claimIds);
  const { data: products } = await db
    .from('bn_product')
    .select('id, category')
    .in('id', Array.from(new Set((claims ?? []).map((c: any) => c.product_id).filter(Boolean))));

  const claimById = new Map<string, any>((claims ?? []).map((c: any) => [c.id, c]));
  const prodById = new Map<string, any>((products ?? []).map((p: any) => [p.id, p]));

  for (const t of tasks as any[]) {
    try {
      const claim = claimById.get(t.claim_id);
      if (!claim) { result.skipped++; continue; }
      const prod = claim.product_id ? prodById.get(claim.product_id) : null;

      const policy = await findPolicyFor({
        productCategory: prod?.category,
        countryCode: claim.country_code,
      });
      if (!policy) { result.skipped++; continue; }

      // Idempotency: skip if an unresolved escalation already exists for
      // this claim + policy in the last 24h.
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data: existing } = await db
        .from('bn_escalation_event')
        .select('id')
        .eq('claim_id', t.claim_id)
        .eq('policy_id', policy.id)
        .is('resolved_at', null)
        .gte('escalated_at', since)
        .limit(1);
      if (existing && existing.length > 0) { result.skipped++; continue; }

      await db.from('bn_escalation_event').insert({
        claim_id: t.claim_id,
        policy_id: policy.id,
        trigger_reason: `External task "${t.task_type}" (${t.participant_kind}) overdue since ${t.due_at}`,
        escalated_from_user: performedBy,
        escalated_to_role: policy.escalation_target_role,
      });

      if (policy.auto_reassign && policy.escalation_target_basket_id) {
        await assignClaimToWorkbasket(
          t.claim_id, policy.escalation_target_basket_id, performedBy,
          `Auto-escalated by ${policy.policy_code}`,
        );
      }

      await db.from('bn_claim_event').insert({
        claim_id: t.claim_id,
        event_type: 'ESCALATED',
        from_status: claim.status,
        to_status: claim.status,
        performed_by: performedBy,
        metadata: {
          policy_code: policy.policy_code,
          external_task_id: t.id,
          target_role: policy.escalation_target_role,
        },
      });

      await auditClaimAction({
        entityType: 'bn_claim',
        entityId: t.claim_id,
        action: 'ESCALATED',
        afterValue: {
          policy_code: policy.policy_code,
          task_type: t.task_type,
          target_role: policy.escalation_target_role,
        },
        performedBy,
        critical: true,
      });

      result.escalated++;
    } catch (e: any) {
      result.errors.push(`${t.id}: ${e?.message || e}`);
    }
  }

  return result;
}
