/**
 * Phase G — In-app notifications for officer-side events tied to
 * public employer submissions (received / accepted-and-linked).
 */
import { supabase } from '@/integrations/supabase/client';

type Vars = Record<string, string>;

async function resolveOfficerRecipients(inspectionId: string): Promise<string[]> {
  const { data } = await (supabase as any)
    .from('ce_inspections')
    .select('created_by')
    .eq('id', inspectionId)
    .maybeSingle();
  const ids: string[] = [];
  if (data?.created_by) ids.push(data.created_by);
  return ids;
}

async function dispatch(event: string, inspectionId: string, vars: Vars, entityId?: string) {
  try {
    const { data: templates } = await (supabase as any)
      .from('notification_templates')
      .select('subject, body')
      .eq('trigger_event', event)
      .eq('is_enabled', true)
      .limit(1);
    const tpl = templates?.[0];
    if (!tpl) return;

    let subject = tpl.subject ?? '';
    let body = tpl.body ?? '';
    Object.entries(vars).forEach(([k, v]) => {
      const ph = `{{${k}}}`;
      subject = subject.split(ph).join(v);
      body = body.split(ph).join(v);
    });

    const recipients = await resolveOfficerRecipients(inspectionId);
    if (recipients.length > 0) {
      const rows = recipients.map((user_id) => ({
        user_id,
        title: subject,
        message: body,
        type: 'audit',
        category: event,
        entity_id: entityId ?? inspectionId,
        entity_type: 'audit_submission',
        is_read: false,
        created_at: new Date().toISOString(),
      }));
      await (supabase as any).from('system_notifications').insert(rows);
    }

    await (supabase as any).from('system_business_events').insert({
      action: event,
      module: 'compliance_audit',
      entity_type: 'audit_submission',
      entity_id: entityId ?? inspectionId,
      description: subject,
      payload_json: vars,
    });
  } catch (e) {
    console.warn('[AuditSubmission notify] failed:', e);
  }
}

export const notifySubmissionReceived = (
  inspectionId: string,
  vars: Vars,
  entityId?: string
) => dispatch('audit_public_submission_received', inspectionId, vars, entityId);

export const notifySubmissionLinked = (
  inspectionId: string,
  vars: Vars,
  entityId?: string
) => dispatch('audit_public_submission_linked', inspectionId, vars, entityId);
