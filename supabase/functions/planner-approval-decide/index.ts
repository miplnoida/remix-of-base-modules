/**
 * planner-approval-decide
 * -----------------------
 * Public endpoint called from the email magic link OR the in-app inbox.
 *   GET  ?t=<token>&i=<intent>      → resolves token, returns approval context
 *   POST { token, intent, notes }   → records the decision
 *
 * Maker-checker is enforced at the DB trigger level; we surface the error
 * cleanly here. Full audit trail is appended on every event.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey);

  try {
    let token = '';
    let intent = '';
    let notes = '';
    if (req.method === 'GET') {
      const u = new URL(req.url);
      token = u.searchParams.get('t') ?? '';
      intent = u.searchParams.get('i') ?? 'view';
    } else {
      const body = await req.json();
      token = body.token ?? '';
      intent = body.intent ?? '';
      notes = body.notes ?? '';
    }

    if (!token || !intent) {
      return new Response(JSON.stringify({ error: 'Missing token or intent' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const hash = await sha256(token);
    const { data: tok } = await admin
      .from('ce_planner_approval_tokens' as any)
      .select('*')
      .eq('token_hash', hash)
      .maybeSingle();

    if (!tok) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const t: any = tok;
    if (new Date(t.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'Token expired' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load approval
    const { data: approval } = await admin
      .from('ce_planner_action_approvals' as any)
      .select('*')
      .eq('id', t.approval_id)
      .maybeSingle();
    if (!approval) {
      return new Response(JSON.stringify({ error: 'Approval not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const ap: any = approval;

    // GET = preview only
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({
          ok: true,
          approval: ap,
          tokenIntent: t.intent,
          alreadyDecided: ap.status !== 'PENDING',
          alreadyUsed: !!t.used_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // POST = decision
    if (ap.status !== 'PENDING') {
      return new Response(
        JSON.stringify({ error: `Already ${ap.status.toLowerCase()}` }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (t.used_at) {
      return new Response(JSON.stringify({ error: 'Token already used' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['approve', 'reject'].includes(intent)) {
      return new Response(JSON.stringify({ error: 'Invalid intent' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Maker-checker — surface a friendly message before hitting DB trigger
    if (t.approver_user_code === ap.requested_by_user_code) {
      await admin.from('ce_planner_approval_audit' as any).insert({
        approval_id: ap.id,
        event_type: 'maker_checker_blocked',
        actor_user_code: t.approver_user_code,
        payload: { intent },
      });
      return new Response(
        JSON.stringify({ error: 'Maker-checker: requester cannot approve own action' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const newStatus = intent === 'approve' ? 'APPROVED' : 'REJECTED';
    const ip = req.headers.get('x-forwarded-for') ?? null;
    const ua = req.headers.get('user-agent') ?? null;

    // Mark token used
    await admin
      .from('ce_planner_approval_tokens' as any)
      .update({ used_at: new Date().toISOString(), used_ip: ip, used_user_agent: ua })
      .eq('id', t.id);

    // Update approval (DB trigger blocks self-approval as belt-and-braces)
    const { error: updErr } = await admin
      .from('ce_planner_action_approvals' as any)
      .update({
        status: newStatus,
        decision_notes: notes || null,
        decided_by_user_code: t.approver_user_code,
        decided_at: new Date().toISOString(),
        decided_via: req.headers.get('x-source') === 'inbox' ? 'inbox_ui' : 'email_link',
        updated_by: t.approver_user_code,
      })
      .eq('id', ap.id);
    if (updErr) throw updErr;

    // Mirror decision back onto the underlying planner action
    await admin
      .from('ce_planner_candidate_actions' as any)
      .update({
        approval_status: newStatus,
        approved_by_user_code: t.approver_user_code,
        approved_at: new Date().toISOString(),
        notes: notes || null,
        updated_by: t.approver_user_code,
      })
      .eq('id', ap.action_id);

    // Audit + notify requester
    await admin.from('ce_planner_approval_audit' as any).insert({
      approval_id: ap.id,
      event_type: intent === 'approve' ? 'approved' : 'rejected',
      actor_user_code: t.approver_user_code,
      payload: { via: req.headers.get('x-source') ?? 'email_link', notes },
    });

    // Lookup requester email
    const { data: reqUser } = await admin
      .from('users' as any)
      .select('email, full_name')
      .eq('user_code', ap.requested_by_user_code)
      .maybeSingle();

    if (reqUser && (reqUser as any).email) {
      const tmpl =
        intent === 'approve' ? 'planner-approval-granted' : 'planner-approval-rejected';
      await admin.functions.invoke('send-transactional-email', {
        body: {
          templateName: tmpl,
          recipientEmail: (reqUser as any).email,
          idempotencyKey: `pa-decision-${ap.id}`,
          templateData: {
            requesterName: (reqUser as any).full_name ?? ap.requested_by_user_code,
            approverCode: t.approver_user_code,
            actionType: ap.action_type,
            employerId: ap.employer_id,
            weekStartDate: ap.week_start_date,
            decisionNotes: notes || '',
          },
        },
      });
    }

    return new Response(JSON.stringify({ ok: true, status: newStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('planner-approval-decide error', e);
    const msg = e?.message ?? String(e);
    const isMakerChecker = msg.includes('maker_checker_violation');
    return new Response(
      JSON.stringify({
        error: isMakerChecker
          ? 'Maker-checker: requester cannot approve own action'
          : msg,
      }),
      {
        status: isMakerChecker ? 403 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
