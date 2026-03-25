/**
 * Internal Audit notification service.
 * Inserts into notification_templates-based in-app notifications.
 */
import { supabase } from '@/integrations/supabase/client';

type IANotificationEvent =
  | 'ia_plan_submitted'
  | 'ia_plan_approved'
  | 'ia_plan_rejected'
  | 'ia_plan_revision_required'
  | 'ia_team_conflict'
  | 'ia_engagement_started'
  | 'ia_report_issued'
  | 'ia_action_overdue'
  | 'ia_closure_pending';

interface NotifyParams {
  event: IANotificationEvent;
  recipientIds?: string[];
  variables: Record<string, string>;
  entityId?: string;
  entityType?: string;
}

/**
 * Look up the template by trigger_event and create in-app notifications
 * for each recipient. Falls back to system_notifications table.
 */
export async function sendIANotification({ event, recipientIds = [], variables, entityId, entityType }: NotifyParams) {
  try {
    // Fetch template
    const { data: templates } = await supabase
      .from('notification_templates')
      .select('id, name, subject, body, placeholders')
      .eq('trigger_event', event)
      .eq('is_enabled', true)
      .limit(1);

    const template = templates?.[0];
    if (!template) {
      console.warn(`[IA Notify] No active template for event: ${event}`);
      return;
    }

    // Interpolate variables into body
    let body = template.body || '';
    let subject = template.subject || '';
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      body = body.replaceAll(placeholder, value);
      subject = subject.replaceAll(placeholder, value);
    });

    // Insert into system_notifications for each recipient
    if (recipientIds.length > 0) {
      const notifications = recipientIds.map(userId => ({
        user_id: userId,
        title: subject,
        message: body,
        type: 'internal_audit',
        category: event,
        entity_id: entityId || null,
        entity_type: entityType || null,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      await supabase.from('system_notifications' as any).insert(notifications);
    }

    // Also log to system_business_events for audit trail
    await supabase.from('system_business_events').insert({
      action: event,
      module: 'internal_audit',
      entity_type: entityType || 'audit_plan',
      entity_id: entityId,
      description: subject,
      payload_json: variables,
    });
  } catch (error) {
    console.error('[IA Notify] Failed:', error);
  }
}

/** Convenience helpers */
export const notifyPlanSubmitted = (planId: string, vars: Record<string, string>) =>
  sendIANotification({ event: 'ia_plan_submitted', variables: vars, entityId: planId, entityType: 'audit_plan' });

export const notifyPlanApproved = (planId: string, vars: Record<string, string>) =>
  sendIANotification({ event: 'ia_plan_approved', variables: vars, entityId: planId, entityType: 'audit_plan' });

export const notifyPlanRejected = (planId: string, vars: Record<string, string>) =>
  sendIANotification({ event: 'ia_plan_rejected', variables: vars, entityId: planId, entityType: 'audit_plan' });

export const notifyTeamConflict = (planId: string, vars: Record<string, string>) =>
  sendIANotification({ event: 'ia_team_conflict', variables: vars, entityId: planId, entityType: 'audit_plan' });

export const notifyEngagementStarted = (engId: string, vars: Record<string, string>) =>
  sendIANotification({ event: 'ia_engagement_started', variables: vars, entityId: engId, entityType: 'audit_engagement' });

export const notifyReportIssued = (reportId: string, vars: Record<string, string>) =>
  sendIANotification({ event: 'ia_report_issued', variables: vars, entityId: reportId, entityType: 'audit_report' });

export const notifyActionOverdue = (actionId: string, vars: Record<string, string>) =>
  sendIANotification({ event: 'ia_action_overdue', variables: vars, entityId: actionId, entityType: 'audit_action' });

export const notifyClosurePending = (engId: string, vars: Record<string, string>) =>
  sendIANotification({ event: 'ia_closure_pending', variables: vars, entityId: engId, entityType: 'audit_engagement' });
