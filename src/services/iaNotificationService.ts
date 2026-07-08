/**
 * Internal Audit notification service.
 *
 * OM-9.7.7: migrated off direct `notification_templates` reads onto the
 * canonical `dispatchInAppNotification()` wrapper.
 */
import { dispatchInAppNotification } from '@/lib/comm/notificationDispatchResolver';

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
 * Look up the template through the canonical resolver and create in-app
 * notifications for each recipient. Writes to `system_notifications` and
 * logs to `system_business_events`.
 */
export async function sendIANotification({
  event,
  recipientIds = [],
  variables,
  entityId,
  entityType,
}: NotifyParams) {
  try {
    const result = await dispatchInAppNotification({
      triggerEvent: event,
      moduleCode: 'INTERNAL_AUDIT',
      channel: 'IN_APP',
      recipientIds,
      variables,
      entityId: entityId ?? null,
      entityType: entityType ?? 'audit_plan',
      notificationType: 'internal_audit',
      module: 'internal_audit',
    });
    if (result.source === 'NONE') {
      console.warn(`[IA Notify] No active template for event: ${event}`);
    }
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
