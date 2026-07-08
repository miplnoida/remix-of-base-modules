/**
 * Phase G — In-app notifications for officer-side events tied to
 * public employer submissions (received / accepted-and-linked).
 *
 * OM-9.7.7: migrated off direct `notification_templates` reads onto the
 * canonical `dispatchInAppNotification()` wrapper.
 */
import { supabase } from '@/integrations/supabase/client';
import { dispatchInAppNotification } from '@/lib/comm/notificationDispatchResolver';

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
    const recipients = await resolveOfficerRecipients(inspectionId);
    await dispatchInAppNotification({
      triggerEvent: event,
      moduleCode: 'COMPLIANCE_AUDIT',
      channel: 'IN_APP',
      recipientIds: recipients,
      variables: vars,
      entityId: entityId ?? inspectionId,
      entityType: 'audit_submission',
      notificationType: 'audit',
      module: 'compliance_audit',
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
