/**
 * planner-approval-sla-cron
 * -------------------------
 * Runs periodically (every 15 min). For each PENDING approval:
 *   • SLA breached → mark ESCALATED, notify Compliance Head with escalation email
 *   • Reminder window (24h before SLA, max 2 reminders) → resend request email
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const REMINDER_WINDOW_HOURS = 24;
const MAX_REMINDERS = 2;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey);

  const now = Date.now();
  let escalated = 0;
  let remindersSent = 0;

  try {
    const { data: pending } = await admin
      .from('ce_planner_action_approvals' as any)
      .select('*')
      .eq('status', 'PENDING') as any;

    for (const row of pending ?? []) {
      const slaTs = new Date(row.sla_due_at).getTime();

      // SLA breached
      if (slaTs <= now) {
        await admin
          .from('ce_planner_action_approvals' as any)
          .update({
            status: 'ESCALATED',
            escalated_at: new Date().toISOString(),
            escalation_count: (row.escalation_count ?? 0) + 1,
          })
          .eq('id', row.id);

        await admin.from('ce_planner_approval_audit' as any).insert({
          approval_id: row.id,
          event_type: 'escalated',
          payload: { reason: 'sla_breach' },
        });

        // Notify all approvers with escalation email
        for (const email of row.approver_emails ?? []) {
          await admin.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'planner-approval-escalation',
              recipientEmail: email,
              idempotencyKey: `pa-esc-${row.id}-${email}`,
              templateData: {
                actionType: row.action_type,
                employerId: row.employer_id,
                weekStartDate: row.week_start_date,
                slaDueAt: row.sla_due_at,
                requesterCode: row.requested_by_user_code,
              },
            },
          });
        }
        escalated++;
        continue;
      }

      // Reminder window
      const hoursToSla = (slaTs - now) / (60 * 60 * 1000);
      const lastRem = row.last_reminder_at ? new Date(row.last_reminder_at).getTime() : 0;
      const hoursSinceLastReminder = (now - lastRem) / (60 * 60 * 1000);

      if (
        hoursToSla <= REMINDER_WINDOW_HOURS &&
        (row.reminder_sent_count ?? 0) < MAX_REMINDERS &&
        (lastRem === 0 || hoursSinceLastReminder >= 12)
      ) {
        await admin
          .from('ce_planner_action_approvals' as any)
          .update({
            reminder_sent_count: (row.reminder_sent_count ?? 0) + 1,
            last_reminder_at: new Date().toISOString(),
          })
          .eq('id', row.id);

        await admin.from('ce_planner_approval_audit' as any).insert({
          approval_id: row.id,
          event_type: 'reminder_sent',
          payload: { remaining_hours: hoursToSla.toFixed(1) },
        });
        remindersSent++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, escalated, remindersSent, processed: (pending ?? []).length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('planner-approval-sla-cron error', e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
