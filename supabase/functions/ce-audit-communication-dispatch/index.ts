// Compliance Audit Communication dispatcher (Phase 4 + 5 hardened).
// - Row-level locking via dispatch_locked_at (stale > 10 min auto-recovers)
// - Retry with exponential backoff (2^attempts * 5 min), max 5 attempts
// - Stop-condition checks before each occurrence
// - Recurrence chaining: materializes next child instance after successful send
// Invoked by pg_cron every 5 minutes OR manually with { communication_ids: [...] }.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 5;
const STALE_LOCK_MIN = 10;
const BATCH_SIZE = 50;

interface CommRow {
  id: string;
  template_id: string;
  inspection_id: string | null;
  employer_id: string;
  channel: 'email' | 'sms' | 'both';
  status: string;
  comm_type: string;
  subject_snapshot: string | null;
  email_body_snapshot: string | null;
  sms_body_snapshot: string | null;
  context_data_json: Record<string, unknown> | null;
  scheduled_at: string | null;
  occurrence_no: number;
  recurrence_enabled: boolean;
  recurrence_interval_days: number | null;
  recurrence_max_occurrences: number | null;
  recurrence_stop_conditions_json: any[];
  dispatch_attempts: number;
  dispatch_locked_at: string | null;
  parent_communication_id: string | null;
  materialized_by_policy_id: string | null;
}

async function logEvent(supabase: any, communicationId: string, eventType: string, payload: any = {}) {
  await supabase.from('ce_audit_communication_events').insert({
    communication_id: communicationId, event_type: eventType, payload,
  });
}

/** Returns true if any stop condition is satisfied (e.g., compliance achieved). */
async function shouldStopRecurrence(
  supabase: any, comm: CommRow,
): Promise<{ stop: boolean; reason?: string }> {
  const conds = comm.recurrence_stop_conditions_json || [];
  for (const c of conds) {
    const key = typeof c === 'string' ? c : c?.condition;
    if (!key) continue;
    if (key === 'response_received') {
      const { count } = await supabase
        .from('ce_audit_communication_events')
        .select('id', { count: 'exact', head: true })
        .eq('communication_id', comm.id)
        .in('event_type', ['response_received', 'acknowledged']);
      if ((count || 0) > 0) return { stop: true, reason: 'response_received' };
    }
    if (key === 'compliance_achieved' && comm.inspection_id) {
      const { data: insp } = await supabase
        .from('ce_audit_inspections')
        .select('status').eq('id', comm.inspection_id).maybeSingle();
      if (insp?.status && ['closed', 'compliant', 'completed'].includes(String(insp.status).toLowerCase())) {
        return { stop: true, reason: 'compliance_achieved' };
      }
    }
    if (key === 'case_closed' && comm.inspection_id) {
      const { data: insp } = await supabase
        .from('ce_audit_inspections')
        .select('status').eq('id', comm.inspection_id).maybeSingle();
      if (String(insp?.status).toLowerCase() === 'closed') return { stop: true, reason: 'case_closed' };
    }
  }
  return { stop: false };
}

/** Phase 5: materialize the next recurrence child if applicable. */
async function maybeChainNext(supabase: any, comm: CommRow) {
  if (!comm.recurrence_enabled) return;
  const next = comm.occurrence_no + 1;
  if (comm.recurrence_max_occurrences && next > comm.recurrence_max_occurrences) {
    await logEvent(supabase, comm.id, 'recurrence_max_reached', { occurrence_no: comm.occurrence_no });
    return;
  }
  const stop = await shouldStopRecurrence(supabase, comm);
  if (stop.stop) {
    await logEvent(supabase, comm.id, 'recurrence_stopped', stop);
    return;
  }
  const intervalDays = comm.recurrence_interval_days || 7;
  const nextAt = new Date(Date.now() + intervalDays * 86400000).toISOString();

  // Copy base fields; pre-approved (recurrence inherits approval)
  const { data: child, error } = await supabase
    .from('ce_audit_communications')
    .insert({
      template_id: comm.template_id,
      inspection_id: comm.inspection_id,
      employer_id: comm.employer_id,
      comm_type: comm.comm_type,
      channel: comm.channel,
      status: 'approved',
      subject_snapshot: comm.subject_snapshot,
      email_body_snapshot: comm.email_body_snapshot,
      sms_body_snapshot: comm.sms_body_snapshot,
      context_data_json: comm.context_data_json || {},
      scheduled_at: nextAt,
      parent_communication_id: comm.parent_communication_id || comm.id,
      occurrence_no: next,
      recurrence_enabled: true,
      recurrence_interval_days: comm.recurrence_interval_days,
      recurrence_max_occurrences: comm.recurrence_max_occurrences,
      recurrence_stop_conditions_json: comm.recurrence_stop_conditions_json,
      materialized_by_policy_id: comm.materialized_by_policy_id,
    })
    .select('id').single();
  if (error) {
    await logEvent(supabase, comm.id, 'recurrence_chain_failed', { error: error.message });
    return;
  }

  // Copy recipients
  const { data: recips } = await supabase
    .from('ce_audit_communication_recipients').select('*').eq('communication_id', comm.id);
  if (recips?.length) {
    await supabase.from('ce_audit_communication_recipients').insert(
      recips.map((r: any) => ({
        communication_id: child.id,
        recipient_name: r.recipient_name, recipient_email: r.recipient_email,
        recipient_mobile: r.recipient_mobile, recipient_role: r.recipient_role,
        source: r.source, is_primary: r.is_primary,
      })),
    );
  }
  await logEvent(supabase, comm.id, 'recurrence_child_created', { child_id: child.id, scheduled_at: nextAt });
  await logEvent(supabase, child.id, 'recurrence_child_of', { parent_id: comm.id, occurrence_no: next });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* cron */ }
    const explicitIds: string[] | undefined = body?.communication_ids;

    const nowIso = new Date().toISOString();
    const staleCutoff = new Date(Date.now() - STALE_LOCK_MIN * 60_000).toISOString();

    // Pick approved + due + (unlocked OR stale lock) + under max attempts
    let q = supabase
      .from('ce_audit_communications')
      .select('id, template_id, inspection_id, employer_id, channel, status, comm_type, subject_snapshot, email_body_snapshot, sms_body_snapshot, context_data_json, scheduled_at, occurrence_no, recurrence_enabled, recurrence_interval_days, recurrence_max_occurrences, recurrence_stop_conditions_json, dispatch_attempts, dispatch_locked_at, parent_communication_id, materialized_by_policy_id')
      .eq('status', 'approved')
      .lt('dispatch_attempts', MAX_ATTEMPTS);
    if (explicitIds?.length) q = q.in('id', explicitIds);
    const { data: candidates, error } = await q.limit(BATCH_SIZE * 2);
    if (error) throw error;

    const due = (candidates || []).filter((c: any) => {
      const dueTime = !c.scheduled_at || new Date(c.scheduled_at).getTime() <= Date.now();
      const unlocked = !c.dispatch_locked_at || c.dispatch_locked_at < staleCutoff;
      return dueTime && unlocked;
    }).slice(0, BATCH_SIZE) as CommRow[];

    let totalSent = 0, totalFailed = 0, totalSkipped = 0;
    const perCommResults: any[] = [];

    for (const comm of due) {
      // Acquire lock (CAS-style: only if still unlocked or stale)
      const { data: locked, error: lockErr } = await supabase
        .from('ce_audit_communications')
        .update({ dispatch_locked_at: nowIso, status: 'sending' })
        .eq('id', comm.id)
        .eq('status', 'approved')
        .or(`dispatch_locked_at.is.null,dispatch_locked_at.lt.${staleCutoff}`)
        .select('id').maybeSingle();
      if (lockErr || !locked) {
        totalSkipped++;
        perCommResults.push({ id: comm.id, skipped: true, reason: 'lock_contention' });
        continue;
      }

      // Pre-flight: stop conditions for recurrence
      if (comm.recurrence_enabled) {
        const stop = await shouldStopRecurrence(supabase, comm);
        if (stop.stop) {
          await supabase.from('ce_audit_communications').update({
            status: 'cancelled', cancelled_at: nowIso,
            cancellation_reason: `Stop condition: ${stop.reason}`,
            dispatch_locked_at: null,
          }).eq('id', comm.id);
          await logEvent(supabase, comm.id, 'dispatch_cancelled_by_stop', stop);
          totalSkipped++;
          perCommResults.push({ id: comm.id, skipped: true, reason: stop.reason });
          continue;
        }
      }

      const { data: recips } = await supabase
        .from('ce_audit_communication_recipients')
        .select('id, recipient_email, recipient_mobile')
        .eq('communication_id', comm.id);

      await logEvent(supabase, comm.id, 'dispatch_started', {
        source: explicitIds ? 'manual' : 'cron', attempt: comm.dispatch_attempts + 1,
      });

      let sent = 0, failed = 0;
      const wantEmail = comm.channel === 'email' || comm.channel === 'both';
      const wantSms = comm.channel === 'sms' || comm.channel === 'both';

      const sendOne = async (channel: 'email' | 'sms', address: string, recipId: string) => {
        const { data: del } = await supabase.from('ce_audit_communication_deliveries').insert({
          communication_id: comm.id, recipient_id: recipId, channel,
          recipient_address: address, status: 'queued',
        }).select().single();
        try {
          const payload = channel === 'email'
            ? {
                recipient_email: address,
                subject: comm.subject_snapshot || '(no subject)',
                body: comm.email_body_snapshot || '',
                trigger_source: 'ce_audit_communication',
                metadata: { communication_id: comm.id, comm_type: comm.comm_type },
              }
            : {
                channel: 'sms', to: address,
                recipient_email: `${address}@sms.local`,
                subject: comm.subject_snapshot || '',
                body: comm.sms_body_snapshot || comm.subject_snapshot || '',
                trigger_source: 'ce_audit_communication',
                metadata: { communication_id: comm.id, comm_type: comm.comm_type, sms: true },
              };
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
            body: JSON.stringify(payload),
          });
          if (resp.ok) {
            await supabase.from('ce_audit_communication_deliveries')
              .update({ status: 'sent', delivered_at: nowIso }).eq('id', del!.id);
            return true;
          }
          const t = await resp.text();
          await supabase.from('ce_audit_communication_deliveries')
            .update({ status: 'failed', failure_reason: t.slice(0, 500) }).eq('id', del!.id);
          return false;
        } catch (e: any) {
          await supabase.from('ce_audit_communication_deliveries')
            .update({ status: 'failed', failure_reason: String(e?.message).slice(0, 500) }).eq('id', del!.id);
          return false;
        }
      };

      for (const r of recips || []) {
        if (wantEmail && r.recipient_email) (await sendOne('email', r.recipient_email, r.id)) ? sent++ : failed++;
        if (wantSms && r.recipient_mobile) (await sendOne('sms', r.recipient_mobile, r.id)) ? sent++ : failed++;
      }

      const newAttempts = comm.dispatch_attempts + 1;
      const allFailed = sent === 0 && failed > 0;
      const partial = sent > 0 && failed > 0;
      const fullSuccess = sent > 0 && failed === 0;

      let updates: any = { dispatch_attempts: newAttempts, dispatch_locked_at: null };

      if (fullSuccess) {
        updates.status = 'sent';
        updates.sent_at = nowIso;
        updates.last_dispatch_error = null;
      } else if (partial) {
        updates.status = 'partial';
        updates.sent_at = nowIso;
      } else if (allFailed) {
        if (newAttempts >= MAX_ATTEMPTS) {
          updates.status = 'failed';
          updates.last_dispatch_error = `Max attempts (${MAX_ATTEMPTS}) reached`;
        } else {
          // Exponential backoff: 2^attempts * 5 min
          const backoffMs = Math.pow(2, newAttempts) * 5 * 60_000;
          updates.status = 'approved'; // retry
          updates.scheduled_at = new Date(Date.now() + backoffMs).toISOString();
          updates.last_dispatch_error = `Attempt ${newAttempts} failed; retrying in ${backoffMs / 60000}m`;
        }
      } else {
        // No recipients matched channel
        updates.status = 'failed';
        updates.last_dispatch_error = 'No deliverable recipients';
      }

      await supabase.from('ce_audit_communications').update(updates).eq('id', comm.id);
      await logEvent(supabase, comm.id, 'dispatch_completed', {
        sent, failed, attempt: newAttempts, status: updates.status,
      });

      // Phase 5: chain next recurrence on success/partial only
      if ((fullSuccess || partial)) {
        await maybeChainNext(supabase, { ...comm, dispatch_attempts: newAttempts });
      }

      totalSent += sent; totalFailed += failed;
      perCommResults.push({ id: comm.id, sent, failed, status: updates.status, attempt: newAttempts });
    }

    return new Response(JSON.stringify({
      ok: true, processed: due.length, skipped: totalSkipped,
      total_sent: totalSent, total_failed: totalFailed, results: perCommResults,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[ce-audit-communication-dispatch] error', e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
