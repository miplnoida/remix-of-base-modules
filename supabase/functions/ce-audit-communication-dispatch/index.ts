// Compliance Audit Communication dispatcher.
// Picks up approved + (scheduled or due) communications and triggers send via existing send-notification.
// Intended to be invoked by pg_cron every 5 minutes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommRow {
  id: string;
  channel: 'email' | 'sms' | 'both';
  status: string;
  subject_snapshot: string | null;
  email_body_snapshot: string | null;
  sms_body_snapshot: string | null;
  comm_type: string;
  scheduled_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Optional explicit list of comm IDs in body (manual trigger). Otherwise scan due ones.
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body OK for cron */ }
    const explicitIds: string[] | undefined = body?.communication_ids;

    let q = supabase
      .from('ce_audit_communications')
      .select('id, channel, status, subject_snapshot, email_body_snapshot, sms_body_snapshot, comm_type, scheduled_at')
      .eq('status', 'approved');
    if (explicitIds?.length) q = q.in('id', explicitIds);
    const { data: comms, error } = await q.limit(50);
    if (error) throw error;

    const now = Date.now();
    const due = (comms || []).filter((c: any) =>
      !c.scheduled_at || new Date(c.scheduled_at).getTime() <= now
    ) as CommRow[];

    let totalSent = 0, totalFailed = 0;
    const perCommResults: any[] = [];

    for (const comm of due) {
      const { data: recips } = await supabase
        .from('ce_audit_communication_recipients')
        .select('id, recipient_email, recipient_mobile')
        .eq('communication_id', comm.id);

      await supabase.from('ce_audit_communications').update({ status: 'sending' }).eq('id', comm.id);
      await supabase.from('ce_audit_communication_events').insert({
        communication_id: comm.id, event_type: 'dispatch_started', payload: { source: 'cron' },
      });

      let sent = 0, failed = 0;
      const wantEmail = comm.channel === 'email' || comm.channel === 'both';
      const wantSms = comm.channel === 'sms' || comm.channel === 'both';

      for (const r of recips || []) {
        if (wantEmail && r.recipient_email) {
          const { data: del } = await supabase.from('ce_audit_communication_deliveries').insert({
            communication_id: comm.id, recipient_id: r.id, channel: 'email',
            recipient_address: r.recipient_email, status: 'queued',
          }).select().single();
          try {
            const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
              body: JSON.stringify({
                recipient_email: r.recipient_email,
                subject: comm.subject_snapshot || '(no subject)',
                body: comm.email_body_snapshot || '',
                trigger_source: 'ce_audit_communication',
                metadata: { communication_id: comm.id, comm_type: comm.comm_type },
              }),
            });
            if (resp.ok) {
              await supabase.from('ce_audit_communication_deliveries')
                .update({ status: 'sent', delivered_at: new Date().toISOString() }).eq('id', del!.id);
              sent++;
            } else {
              const t = await resp.text();
              await supabase.from('ce_audit_communication_deliveries')
                .update({ status: 'failed', failure_reason: t.slice(0, 500) }).eq('id', del!.id);
              failed++;
            }
          } catch (e: any) {
            await supabase.from('ce_audit_communication_deliveries')
              .update({ status: 'failed', failure_reason: String(e?.message).slice(0, 500) }).eq('id', del!.id);
            failed++;
          }
        }
        if (wantSms && r.recipient_mobile) {
          const { data: del } = await supabase.from('ce_audit_communication_deliveries').insert({
            communication_id: comm.id, recipient_id: r.id, channel: 'sms',
            recipient_address: r.recipient_mobile, status: 'queued',
          }).select().single();
          try {
            const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
              body: JSON.stringify({
                channel: 'sms',
                to: r.recipient_mobile,
                recipient_email: r.recipient_email || `${r.recipient_mobile}@sms.local`,
                subject: comm.subject_snapshot || '',
                body: comm.sms_body_snapshot || comm.subject_snapshot || '',
                trigger_source: 'ce_audit_communication',
                metadata: { communication_id: comm.id, comm_type: comm.comm_type, sms: true },
              }),
            });
            if (resp.ok) {
              await supabase.from('ce_audit_communication_deliveries')
                .update({ status: 'sent', delivered_at: new Date().toISOString() }).eq('id', del!.id);
              sent++;
            } else {
              const t = await resp.text();
              await supabase.from('ce_audit_communication_deliveries')
                .update({ status: 'failed', failure_reason: t.slice(0, 500) }).eq('id', del!.id);
              failed++;
            }
          } catch (e: any) {
            await supabase.from('ce_audit_communication_deliveries')
              .update({ status: 'failed', failure_reason: String(e?.message).slice(0, 500) }).eq('id', del!.id);
            failed++;
          }
        }
      }

      const finalStatus = failed === 0 && sent > 0 ? 'sent' : sent === 0 ? 'failed' : 'partial';
      await supabase.from('ce_audit_communications').update({
        status: finalStatus, sent_at: new Date().toISOString(),
      }).eq('id', comm.id);
      await supabase.from('ce_audit_communication_events').insert({
        communication_id: comm.id, event_type: 'dispatch_completed', payload: { sent, failed },
      });

      totalSent += sent; totalFailed += failed;
      perCommResults.push({ id: comm.id, sent, failed, status: finalStatus });
    }

    return new Response(JSON.stringify({
      ok: true, processed: due.length, total_sent: totalSent, total_failed: totalFailed, results: perCommResults,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[ce-audit-communication-dispatch] error', e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
