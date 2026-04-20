// Phase 6 — Event-driven materializer for AUTO_EVENT_DRIVEN templates.
// Receives a business event and creates pre-approved communication drafts
// for every active template whose schedule policy matches.
//
// POST body:
// {
//   event_type: 'inspection_scheduled' | 'inspection_published' | 'audit_completed' | 'violation_logged' | ...,
//   employer_id: string,
//   inspection_id?: string | null,
//   context_data?: Record<string, unknown>,
//   triggered_by?: string
// }
//
// Returns: { ok, created: [{communication_id, template_id}], skipped: [{template_id, reason}] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function render(tpl: string | null, ctx: Record<string, unknown>): string {
  if (!tpl) return '';
  return tpl.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const parts = String(key).split('.');
    let v: any = ctx;
    for (const p of parts) v = v?.[p];
    return v == null ? '' : String(v);
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const body = await req.json();
    const eventType: string = body?.event_type;
    const employerId: string = body?.employer_id;
    const inspectionId: string | null = body?.inspection_id ?? null;
    const contextData: Record<string, unknown> = body?.context_data ?? {};
    const triggeredBy: string | undefined = body?.triggered_by;

    if (!eventType || !employerId) {
      return new Response(JSON.stringify({ ok: false, error: 'event_type and employer_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Find matching policies
    const { data: policies, error: pErr } = await supabase
      .from('ce_audit_communication_schedule_policies')
      .select(`id, template_id, trigger_mode, trigger_event, relative_to_field, offset_days,
               recurrence_enabled, recurrence_interval_days, recurrence_max_occurrences,
               recurrence_stop_conditions_json,
               template:ce_audit_communication_templates!inner (
                 id, template_code, template_name, comm_type, channel, send_mode,
                 email_subject, email_body, sms_body, is_active
               )`)
      .eq('trigger_mode', 'EVENT')
      .eq('trigger_event', eventType);
    if (pErr) throw pErr;

    const created: any[] = [];
    const skipped: any[] = [];

    for (const policy of policies || []) {
      const tpl: any = (policy as any).template;
      if (!tpl?.is_active) { skipped.push({ template_id: tpl?.id, reason: 'template_inactive' }); continue; }
      if (tpl.send_mode !== 'AUTO_EVENT_DRIVEN' && tpl.send_mode !== 'MANUAL_OR_SCHEDULED') {
        skipped.push({ template_id: tpl.id, reason: `send_mode_${tpl.send_mode}` }); continue; }

      // Idempotency: skip if a communication already exists for this template + inspection + event in last 24h
      if (inspectionId) {
        const since = new Date(Date.now() - 86400000).toISOString();
        const { count } = await supabase
          .from('ce_audit_communications')
          .select('id', { count: 'exact', head: true })
          .eq('template_id', tpl.id)
          .eq('inspection_id', inspectionId)
          .gte('created_at', since);
        if ((count || 0) > 0) { skipped.push({ template_id: tpl.id, reason: 'duplicate_in_24h' }); continue; }
      }

      // Compute scheduled_at (immediate by default for events)
      const scheduledAt = new Date().toISOString();

      const subject = render(tpl.email_subject, contextData);
      const emailBody = render(tpl.email_body, contextData);
      const smsBody = render(tpl.sms_body, contextData);

      const { data: comm, error: cErr } = await supabase
        .from('ce_audit_communications')
        .insert({
          inspection_id: inspectionId,
          employer_id: employerId,
          template_id: tpl.id,
          comm_type: tpl.comm_type,
          channel: tpl.channel,
          status: 'approved', // event-driven = pre-approved
          subject_snapshot: subject,
          email_body_snapshot: emailBody,
          sms_body_snapshot: smsBody,
          context_data_json: contextData,
          scheduled_at: scheduledAt,
          recurrence_enabled: !!policy.recurrence_enabled,
          recurrence_interval_days: policy.recurrence_interval_days,
          recurrence_max_occurrences: policy.recurrence_max_occurrences,
          recurrence_stop_conditions_json: policy.recurrence_stop_conditions_json || [],
          materialized_by_policy_id: policy.id,
          occurrence_no: 1,
          dispatch_attempts: 0,
          created_by: triggeredBy ?? null,
          approved_at: scheduledAt,
        })
        .select('id').single();
      if (cErr) { skipped.push({ template_id: tpl.id, reason: cErr.message }); continue; }

      // Resolve recipients via existing recipient pipeline (inline minimal version)
      // We mark this for the dispatcher via an event; recipient resolution is handled by the
      // existing service when called from UI; for event-driven we copy from inspection contacts.
      if (inspectionId) {
        const { data: contacts } = await supabase
          .from('ce_audit_inspection_contacts' as any)
          .select('contact_name, contact_email, contact_mobile, role')
          .eq('inspection_id', inspectionId);
        if (contacts?.length) {
          await supabase.from('ce_audit_communication_recipients').insert(
            contacts.map((c: any, i: number) => ({
              communication_id: comm.id,
              recipient_name: c.contact_name,
              recipient_email: c.contact_email,
              recipient_mobile: c.contact_mobile,
              recipient_role: c.role,
              source: 'inspection_contact',
              is_primary: i === 0,
            })),
          );
        }
      }

      await supabase.from('ce_audit_communication_events').insert({
        communication_id: comm.id,
        event_type: 'materialized_from_event',
        actor_user_id: triggeredBy,
        payload: { event_type: eventType, policy_id: policy.id },
      });
      created.push({ communication_id: comm.id, template_id: tpl.id });
    }

    return new Response(JSON.stringify({ ok: true, event_type: eventType, created, skipped }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[ce-audit-communication-event-hook] error', e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
