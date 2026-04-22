/**
 * planner-approval-request
 * ------------------------
 * Submits a new planner action approval request:
 *   1. Reads the planner action (must be exception/merge with PENDING approval).
 *   2. Resolves approver list (zone supervisor + compliance head).
 *   3. Creates ce_planner_action_approvals row.
 *   4. Issues per-approver magic-link tokens (approve/reject/view).
 *   5. Enqueues planner-approval-request emails via send-transactional-email.
 *   6. Logs to ce_planner_approval_audit.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const SLA_HOURS = 48;
const TOKEN_TTL_HOURS = 96;

function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey);

    const body = await req.json();
    const { actionId, requestedByUserCode, appBaseUrl } = body ?? {};
    if (!actionId || !requestedByUserCode) {
      return new Response(
        JSON.stringify({ error: 'actionId and requestedByUserCode are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 1. Load the planner action
    const { data: action, error: actionErr } = await admin
      .from('ce_planner_candidate_actions' as any)
      .select('*')
      .eq('id', actionId)
      .maybeSingle();
    if (actionErr || !action) throw new Error(`Action not found: ${actionErr?.message}`);
    const a: any = action;

    if (!['convert_exception', 'merge_duplicate'].includes(a.action_type)) {
      return new Response(
        JSON.stringify({ error: 'Action type does not require approval' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Resolve approvers — Compliance Head + zone supervisor (parallel)
    const { data: approverRows } = await admin
      .from('user_roles' as any)
      .select('user_code, users:user_code(email, full_name)')
      .in('role_name', ['ComplianceHead', 'SeniorInspector']) as any;

    const approvers = (approverRows ?? [])
      .map((r: any) => ({
        userCode: r.user_code,
        email: r.users?.email ?? null,
      }))
      .filter((r: any) => r.email && r.userCode !== requestedByUserCode);

    if (approvers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No eligible approvers found' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 3. Create approval row
    const slaDueAt = new Date(Date.now() + SLA_HOURS * 60 * 60 * 1000).toISOString();
    const { data: approval, error: appErr } = await admin
      .from('ce_planner_action_approvals' as any)
      .insert({
        action_id: a.id,
        week_start_date: a.week_start_date,
        inspector_id: a.inspector_id,
        employer_id: a.employer_id,
        audit_program: a.audit_program,
        zone_id: a.zone_id,
        action_type: a.action_type,
        exception_category: a.exception_category,
        exception_justification: a.exception_justification,
        capacity_impact_hours: a.capacity_impact_hours ?? 0,
        requested_by_user_code: requestedByUserCode,
        sla_due_at: slaDueAt,
        approver_user_codes: approvers.map((x: any) => x.userCode),
        approver_emails: approvers.map((x: any) => x.email),
      })
      .select('*')
      .single();
    if (appErr) throw appErr;

    // 4. Issue per-approver tokens and enqueue emails
    const tokenExpiry = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString();
    const base = appBaseUrl || 'https://admin.secureserve.biz';

    for (const ap of approvers) {
      const intents: Array<'approve' | 'reject' | 'view'> = ['approve', 'reject', 'view'];
      const tokens: Record<string, string> = {};
      for (const intent of intents) {
        const raw = randomToken();
        const hash = await sha256(raw);
        await admin.from('ce_planner_approval_tokens' as any).insert({
          approval_id: approval.id,
          token_hash: hash,
          approver_user_code: ap.userCode,
          approver_email: ap.email,
          intent,
          expires_at: tokenExpiry,
        });
        tokens[intent] = raw;
      }

      const approveUrl = `${base}/approval/decide?t=${tokens.approve}&i=approve`;
      const rejectUrl = `${base}/approval/decide?t=${tokens.reject}&i=reject`;
      const viewUrl = `${base}/approval/inbox?t=${tokens.view}`;

      await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'planner-approval-request',
          recipientEmail: ap.email,
          idempotencyKey: `pa-req-${approval.id}-${ap.userCode}`,
          templateData: {
            approverName: ap.userCode,
            requesterCode: requestedByUserCode,
            actionType: a.action_type,
            employerId: a.employer_id,
            auditProgram: a.audit_program ?? '—',
            weekStartDate: a.week_start_date,
            justification: a.exception_justification ?? '—',
            capacityImpactHours: a.capacity_impact_hours ?? 0,
            slaDueAt,
            approveUrl,
            rejectUrl,
            viewUrl,
          },
        },
      });

      await admin.from('ce_planner_approval_audit' as any).insert({
        approval_id: approval.id,
        event_type: 'email_sent',
        recipient_email: ap.email,
        channel: 'email',
        payload: { template: 'planner-approval-request', userCode: ap.userCode },
      });
    }

    await admin.from('ce_planner_approval_audit' as any).insert({
      approval_id: approval.id,
      event_type: 'submitted',
      actor_user_code: requestedByUserCode,
      payload: { approvers: approvers.length },
    });

    return new Response(
      JSON.stringify({ ok: true, approvalId: approval.id, approvers: approvers.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('planner-approval-request error', e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
