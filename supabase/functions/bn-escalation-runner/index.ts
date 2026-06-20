// BN Escalation Runner — scheduled / on-demand
// Scans overdue work across BN and fires bn_escalation_policy per item.
// Mirrors src/services/bn/bnEscalationRunnerService.ts (service-role).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const norm = (s: unknown) => String(s ?? "").toUpperCase();

type Ctx = {
  policiesById: Map<string, any>;
  policiesActive: any[];
  basketsById: Map<string, any>;
  claimsById: Map<string, any>;
  productsById: Map<string, any>;
  productVersionsById: Map<string, any>;
  workflowTemplatesById: Map<string, any>;
};

async function buildContext(db: any, claimIds: string[]): Promise<Ctx> {
  const [policiesRes, basketsRes, claimsRes] = await Promise.all([
    db.from("bn_escalation_policy").select("*").eq("is_active", true),
    db.from("bn_workbasket").select("*").eq("is_active", true),
    claimIds.length
      ? db.from("bn_claim").select("id, product_id, product_version_id, country_code, status, claim_number, ssn").in("id", claimIds)
      : Promise.resolve({ data: [] }),
  ]);
  const policies = policiesRes.data ?? [];
  const baskets = basketsRes.data ?? [];
  const claims = claimsRes.data ?? [];
  const productIds = [...new Set(claims.map((c: any) => c.product_id).filter(Boolean))];
  const versionIds = [...new Set(claims.map((c: any) => c.product_version_id).filter(Boolean))];
  const [prodRes, verRes] = await Promise.all([
    productIds.length ? db.from("bn_product").select("id, category").in("id", productIds) : Promise.resolve({ data: [] }),
    versionIds.length ? db.from("bn_product_version").select("id, escalation_policy_id, workflow_template_id").in("id", versionIds) : Promise.resolve({ data: [] }),
  ]);
  const tplIds = [...new Set((verRes.data ?? []).map((v: any) => v.workflow_template_id).filter(Boolean))];
  const tplRes = tplIds.length
    ? await db.from("bn_workflow_template").select("id, steps_config").in("id", tplIds)
    : { data: [] };
  return {
    policiesById: new Map(policies.map((p: any) => [p.id, p])),
    policiesActive: policies,
    basketsById: new Map(baskets.map((b: any) => [b.id, b])),
    claimsById: new Map(claims.map((c: any) => [c.id, c])),
    productsById: new Map((prodRes.data ?? []).map((p: any) => [p.id, p])),
    productVersionsById: new Map((verRes.data ?? []).map((v: any) => [v.id, v])),
    workflowTemplatesById: new Map((tplRes.data ?? []).map((t: any) => [t.id, t])),
  };
}

function resolvePolicy(ctx: Ctx, task: { claim_id: string; workbasket_id?: string | null; step_code?: string | null }): any | null {
  const claim = ctx.claimsById.get(task.claim_id);
  if (!claim) return null;
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
  if (task.workbasket_id) {
    const wb = ctx.basketsById.get(task.workbasket_id);
    const wbPid = wb?.default_escalation_policy_id;
    if (wbPid && ctx.policiesById.has(wbPid)) return ctx.policiesById.get(wbPid);
  }
  if (claim.product_version_id) {
    const v = ctx.productVersionsById.get(claim.product_version_id);
    if (v?.escalation_policy_id && ctx.policiesById.has(v.escalation_policy_id)) return ctx.policiesById.get(v.escalation_policy_id);
  }
  const prod = claim.product_id ? ctx.productsById.get(claim.product_id) : null;
  const cat = norm(prod?.category);
  const cc = norm(claim.country_code);
  return (
    ctx.policiesActive.find((p) => norm(p.product_category) === cat && norm(p.country_code) === cc) ||
    ctx.policiesActive.find((p) => norm(p.product_category) === cat && !p.country_code) ||
    ctx.policiesActive.find((p) => !p.product_category && norm(p.country_code) === cc) ||
    ctx.policiesActive.find((p) => !p.product_category && !p.country_code) ||
    null
  );
}

async function alreadyEscalated(db: any, claimId: string, policyId: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await db.from("bn_escalation_event").select("id")
    .eq("claim_id", claimId).eq("policy_id", policyId)
    .is("resolved_at", null).gte("escalated_at", since).limit(1);
  return !!(data && data.length);
}

async function fireEscalation(db: any, opts: { claimId: string; policy: any; reason: string; task: { id: string; type: string; workbasket_id?: string | null }; performedBy: string; ctx: Ctx }) {
  const { claimId, policy, reason, task, performedBy, ctx } = opts;
  const claim = ctx.claimsById.get(claimId);

  await db.from("bn_escalation_event").insert({
    claim_id: claimId, policy_id: policy.id, trigger_reason: reason,
    escalated_from_user: performedBy, escalated_to_role: policy.escalation_target_role,
  });

  if (policy.auto_reassign) {
    const sourceBasket = task.workbasket_id ? ctx.basketsById.get(task.workbasket_id) : null;
    const targetBasketId = sourceBasket?.escalation_target_basket_id || policy.escalation_target_basket_id || null;
    if (targetBasketId && sourceBasket?.allow_auto_reassign !== false) {
      try {
        await db.from("bn_claim_queue_assignment")
          .update({ is_active: false, completed_at: new Date().toISOString() })
          .eq("claim_id", claimId).eq("is_active", true);
        await db.from("bn_claim_queue_assignment").insert({
          claim_id: claimId, workbasket_id: targetBasketId, is_active: true,
          assigned_at: new Date().toISOString(),
          metadata: { reason: `Auto-escalated by ${policy.policy_code}`, by: performedBy },
        });
      } catch (_) { /* non-fatal */ }
    }
  }

  await db.from("bn_claim_event").insert({
    claim_id: claimId, event_type: "ESCALATED",
    from_status: claim?.status, to_status: claim?.status, performed_by: performedBy,
    metadata: { policy_code: policy.policy_code, source: task.type, source_id: task.id, target_role: policy.escalation_target_role },
  });

  await db.from("system_audit_trail").insert({
    entity_type: "bn_claim", entity_id: claimId, action: "ESCALATED",
    after_value: { policy_code: policy.policy_code, source: task.type, target_role: policy.escalation_target_role },
    performed_by: performedBy, severity: "warn",
  }).then(() => {}, () => {});
}

async function runEscalation(db: any, performedBy: string) {
  const result = { scanned: 0, escalated: 0, skipped: 0, errors: [] as string[], bySource: {} as Record<string, number> };
  const nowIso = new Date().toISOString();

  const [extRes, qaRes, ovrRes] = await Promise.all([
    db.from("bn_external_task").select("id, claim_id, participant_kind, task_type, due_at, status")
      .eq("status", "PENDING").not("due_at", "is", null).lt("due_at", nowIso),
    db.from("bn_claim_queue_assignment").select("id, claim_id, workbasket_id, due_at, is_active, completed_at")
      .eq("is_active", true).is("completed_at", null).not("due_at", "is", null).lt("due_at", nowIso),
    db.from("bn_override_request").select("id, claim_id, status, expires_at")
      .in("status", ["PENDING", "IN_REVIEW"]).not("expires_at", "is", null).lt("expires_at", nowIso),
  ]);

  type Item = { source: string; id: string; claim_id: string; workbasket_id?: string | null; step_code?: string | null; reason: string };
  const items: Item[] = [];
  for (const t of (extRes.data ?? [])) items.push({ source: "external_task", id: t.id, claim_id: t.claim_id, reason: `External task "${t.task_type}" (${t.participant_kind}) overdue since ${t.due_at}` });
  for (const a of (qaRes.data ?? [])) items.push({ source: "queue_assignment", id: a.id, claim_id: a.claim_id, workbasket_id: a.workbasket_id, reason: `Workbasket task overdue since ${a.due_at}` });
  for (const o of (ovrRes.data ?? [])) items.push({ source: "override_request", id: o.id, claim_id: o.claim_id, reason: `Override review overdue since ${o.expires_at}` });

  result.scanned = items.length;
  if (!items.length) return result;

  const claimIds = [...new Set(items.map((i) => i.claim_id).filter(Boolean))];
  const ctx = await buildContext(db, claimIds);

  for (const it of items) {
    try {
      const claim = ctx.claimsById.get(it.claim_id);
      if (!claim) { result.skipped++; continue; }
      const policy = resolvePolicy(ctx, it);
      if (!policy) { result.skipped++; continue; }
      if (await alreadyEscalated(db, it.claim_id, policy.id)) { result.skipped++; continue; }
      await fireEscalation(db, { claimId: it.claim_id, policy, reason: it.reason, task: { id: it.id, type: it.source, workbasket_id: it.workbasket_id }, performedBy, ctx });
      result.escalated++;
      result.bySource[it.source] = (result.bySource[it.source] ?? 0) + 1;
    } catch (e: any) {
      result.errors.push(`${it.source}:${it.id}: ${e?.message || e}`);
    }
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    let performedBy = "SYSTEM";
    try {
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      if (body?.performedBy) performedBy = String(body.performedBy);
    } catch (_) { /* ignore */ }

    const started = Date.now();
    const result = await runEscalation(db, performedBy);
    console.log(`[bn-escalation-runner] ${JSON.stringify(result)} in ${Date.now() - started}ms`);

    return new Response(JSON.stringify({ ok: true, ...result, duration_ms: Date.now() - started }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[bn-escalation-runner] failed", e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
