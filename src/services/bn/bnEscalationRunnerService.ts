/**
 * BN Escalation Runner
 *
 * Scans overdue work across the BN module and fires the correct
 * `bn_escalation_policy` for each item.
 *
 * Policy resolution priority (per task):
 *   1. Workflow step escalation_policy_id (from claim_queue_assignment.metadata
 *      or bn_workflow_template.steps_config step matching the claim's status)
 *   2. Workbasket default_escalation_policy_id (from bn_workbasket)
 *   3. Product version escalation_policy_id (bn_product_version)
 *   4. Country + product category default policy (legacy match)
 *   5. Global default policy (no product_category, no country_code)
 *
 * Scope of scan:
 *   - bn_external_task (employer/doctor/claimant external tasks)
 *   - bn_claim_queue_assignment (internal workflow tasks routed via workbasket)
 *   - bn_override_request (pending override review)
 *   - bn_override_request (pending override review)
 *
 * Side effects per fire:
 *   - inserts bn_escalation_event
 *   - optional reassign to escalation_target_basket_id
 *     (workbasket-level target wins over policy-level target)
 *   - bn_claim_event + audit trail
 *
 * Idempotent: skips items that already have an unresolved escalation event
 * for the same policy in the last 24h.
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
  bySource: Record<string, number>;
}

const norm = (s: any) => String(s || '').toUpperCase();

// ─── In-memory caches per run ───────────────────────────────────────
type Ctx = {
  policiesById: Map<string, any>;
  policiesByCode: Map<string, any>;
  policiesActive: any[];
  basketsById: Map<string, any>;
  claimsById: Map<string, any>;
  productsById: Map<string, any>;
  productVersionsById: Map<string, any>;
  workflowTemplatesById: Map<string, any>;
};

async function buildContext(claimIds: string[]): Promise<Ctx> {
  const [policiesRes, basketsRes, claimsRes] = await Promise.all([
    db.from('bn_escalation_policy').select('*').eq('is_active', true),
    db.from('bn_workbasket').select('*').eq('is_active', true),
    claimIds.length
      ? db.from('bn_claim').select('id, product_id, product_version_id, country_code, status, claim_number, ssn').in('id', claimIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const policies = (policiesRes.data ?? []) as any[];
  const baskets = (basketsRes.data ?? []) as any[];
  const claims = (claimsRes.data ?? []) as any[];

  const productIds = Array.from(new Set(claims.map((c) => c.product_id).filter(Boolean)));
  const versionIds = Array.from(new Set(claims.map((c) => c.product_version_id).filter(Boolean)));

  const [prodRes, verRes] = await Promise.all([
    productIds.length
      ? db.from('bn_product').select('id, category').in('id', productIds)
      : Promise.resolve({ data: [] as any[] }),
    versionIds.length
      ? db.from('bn_product_version').select('id, escalation_policy_id, workflow_template_id').in('id', versionIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const templateIds = Array.from(new Set(((verRes.data ?? []) as any[]).map((v) => v.workflow_template_id).filter(Boolean)));
  const tplRes = templateIds.length
    ? await db.from('bn_workflow_template').select('id, steps_config').in('id', templateIds)
    : { data: [] as any[] };

  return {
    policiesById: new Map(policies.map((p) => [p.id, p])),
    policiesByCode: new Map(policies.map((p) => [p.policy_code, p])),
    policiesActive: policies,
    basketsById: new Map(baskets.map((b) => [b.id, b])),
    claimsById: new Map(claims.map((c) => [c.id, c])),
    productsById: new Map(((prodRes.data ?? []) as any[]).map((p) => [p.id, p])),
    productVersionsById: new Map(((verRes.data ?? []) as any[]).map((v) => [v.id, v])),
    workflowTemplatesById: new Map(((tplRes.data ?? []) as any[]).map((t) => [t.id, t])),
  };
}

/**
 * Resolve escalation policy for a given task using priority order.
 */
function resolvePolicy(
  ctx: Ctx,
  task: { claim_id: string; workbasket_id?: string | null; step_code?: string | null },
): any | null {
  const claim = ctx.claimsById.get(task.claim_id);
  if (!claim) return null;

  // 1. Workflow step level — match by step_code or current claim status
  if (claim.product_version_id) {
    const version = ctx.productVersionsById.get(claim.product_version_id);
    const tpl = version?.workflow_template_id ? ctx.workflowTemplatesById.get(version.workflow_template_id) : null;
    const steps: any[] = Array.isArray(tpl?.steps_config) ? tpl!.steps_config : [];
    const matchStep =
      steps.find((s) => task.step_code && (s.step_code === task.step_code || s.code === task.step_code)) ||
      steps.find((s) => s.maps_to_status === claim.status || s.status === claim.status);
    const stepPolicyId = matchStep?.escalation_policy_id;
    if (stepPolicyId && ctx.policiesById.has(stepPolicyId)) return ctx.policiesById.get(stepPolicyId);
  }

  // 2. Workbasket default
  if (task.workbasket_id) {
    const wb = ctx.basketsById.get(task.workbasket_id);
    const wbPolicyId = wb?.default_escalation_policy_id;
    if (wbPolicyId && ctx.policiesById.has(wbPolicyId)) return ctx.policiesById.get(wbPolicyId);
  }

  // 3. Product version
  if (claim.product_version_id) {
    const v = ctx.productVersionsById.get(claim.product_version_id);
    const verPolicyId = v?.escalation_policy_id;
    if (verPolicyId && ctx.policiesById.has(verPolicyId)) return ctx.policiesById.get(verPolicyId);
  }

  // 4. Country + product category
  const prod = claim.product_id ? ctx.productsById.get(claim.product_id) : null;
  const cat = norm(prod?.category);
  const cc = norm(claim.country_code);
  const matched =
    ctx.policiesActive.find((p) => norm(p.product_category) === cat && norm(p.country_code) === cc) ||
    ctx.policiesActive.find((p) => norm(p.product_category) === cat && !p.country_code) ||
    ctx.policiesActive.find((p) => !p.product_category && norm(p.country_code) === cc) ||
    // 5. Global default
    ctx.policiesActive.find((p) => !p.product_category && !p.country_code) ||
    null;

  return matched;
}

async function alreadyEscalated(claimId: string, policyId: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await db
    .from('bn_escalation_event')
    .select('id')
    .eq('claim_id', claimId)
    .eq('policy_id', policyId)
    .is('resolved_at', null)
    .gte('escalated_at', since)
    .limit(1);
  return !!(data && data.length);
}

async function fireEscalation(opts: {
  claimId: string;
  policy: any;
  reason: string;
  task: { id: string; type: string; workbasket_id?: string | null };
  performedBy: string;
  ctx: Ctx;
}) {
  const { claimId, policy, reason, task, performedBy, ctx } = opts;
  const claim = ctx.claimsById.get(claimId);

  await db.from('bn_escalation_event').insert({
    claim_id: claimId,
    policy_id: policy.id,
    trigger_reason: reason,
    escalated_from_user: performedBy,
    escalated_to_role: policy.escalation_target_role,
  });

  // Auto-reassign: workbasket-level target takes priority, then policy-level
  if (policy.auto_reassign) {
    const sourceBasket = task.workbasket_id ? ctx.basketsById.get(task.workbasket_id) : null;
    const targetBasketId =
      sourceBasket?.escalation_target_basket_id ||
      policy.escalation_target_basket_id ||
      null;
    if (targetBasketId && sourceBasket?.allow_auto_reassign !== false) {
      try {
        await assignClaimToWorkbasket(
          claimId, targetBasketId, performedBy,
          `Auto-escalated by ${policy.policy_code}`,
        );
      } catch (_) { /* non-fatal */ }
    }
  }

  await db.from('bn_claim_event').insert({
    claim_id: claimId,
    event_type: 'ESCALATED',
    from_status: claim?.status,
    to_status: claim?.status,
    performed_by: performedBy,
    metadata: {
      policy_code: policy.policy_code,
      source: task.type,
      source_id: task.id,
      target_role: policy.escalation_target_role,
    },
  });

  await auditClaimAction({
    entityType: 'bn_claim',
    entityId: claimId,
    action: 'ESCALATED',
    afterValue: {
      policy_code: policy.policy_code,
      source: task.type,
      target_role: policy.escalation_target_role,
    },
    performedBy,
    critical: true,
  });
}

export async function escalateOverdueExternalTasks(
  performedBy = 'SYSTEM',
): Promise<EscalationResult> {
  const result: EscalationResult = { scanned: 0, escalated: 0, skipped: 0, errors: [], bySource: {} };
  const nowIso = new Date().toISOString();

  // ─── Gather overdue tasks from all relevant sources ─────────────
  const [extRes, qaRes, ovrRes] = await Promise.all([
    db.from('bn_external_task')
      .select('id, claim_id, participant_kind, task_type, due_at, status')
      .eq('status', 'PENDING').not('due_at', 'is', null).lt('due_at', nowIso),
    db.from('bn_claim_queue_assignment')
      .select('id, claim_id, workbasket_id, due_at, is_active, picked_at, completed_at')
      .eq('is_active', true).is('completed_at', null)
      .not('due_at', 'is', null).lt('due_at', nowIso),
    db.from('bn_override_request')
      .select('id, claim_id, status, expires_at, created_at')
      .in('status', ['PENDING', 'IN_REVIEW']).not('expires_at', 'is', null).lt('expires_at', nowIso),
  ]);

  type Item = { source: string; id: string; claim_id: string; workbasket_id?: string | null; step_code?: string | null; reason: string };
  const items: Item[] = [];

  for (const t of (extRes.data ?? []) as any[]) {
    items.push({
      source: 'external_task',
      id: t.id, claim_id: t.claim_id,
      reason: `External task "${t.task_type}" (${t.participant_kind}) overdue since ${t.due_at}`,
    });
  }
  for (const a of (qaRes.data ?? []) as any[]) {
    items.push({
      source: 'queue_assignment',
      id: a.id, claim_id: a.claim_id, workbasket_id: a.workbasket_id,
      reason: `Workbasket task overdue since ${a.due_at}`,
    });
  }
  for (const o of (ovrRes.data ?? []) as any[]) {
    items.push({
      source: 'override_request',
      id: o.id, claim_id: o.claim_id,
      reason: `Override review overdue since ${o.expires_at}`,
    });
  }

  result.scanned = items.length;
  if (result.scanned === 0) return result;

  const claimIds = Array.from(new Set(items.map((i) => i.claim_id).filter(Boolean)));
  const ctx = await buildContext(claimIds);

  for (const it of items) {
    try {
      const claim = ctx.claimsById.get(it.claim_id);
      if (!claim) { result.skipped++; continue; }

      const policy = resolvePolicy(ctx, { claim_id: it.claim_id, workbasket_id: it.workbasket_id, step_code: it.step_code });
      if (!policy) { result.skipped++; continue; }

      if (await alreadyEscalated(it.claim_id, policy.id)) { result.skipped++; continue; }

      await fireEscalation({
        claimId: it.claim_id,
        policy,
        reason: it.reason,
        task: { id: it.id, type: it.source, workbasket_id: it.workbasket_id },
        performedBy,
        ctx,
      });

      result.escalated++;
      result.bySource[it.source] = (result.bySource[it.source] ?? 0) + 1;
    } catch (e: any) {
      result.errors.push(`${it.source}:${it.id}: ${e?.message || e}`);
    }
  }

  return result;
}
