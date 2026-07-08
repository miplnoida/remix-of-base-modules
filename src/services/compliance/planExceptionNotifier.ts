/**
 * Plan-Exception Approval Notifier
 *
 * Fire-and-forget notifications for the controlled exception flow on the
 * Weekly Audit Plan:
 *   - On exception SUBMIT (PENDING_APPROVAL)
 *       → notify the plan reviewer / approver / inspector's supervisor
 *   - On exception APPROVED / REJECTED
 *       → notify the original creator
 *
 * Mirrors the in-app notification pattern used by `auditPublicSubmissionNotifyService`
 * (writes to `system_notifications` and logs a `system_business_events` row).
 *
 * All side-effects are wrapped in try/catch so a notification failure NEVER
 * blocks the underlying plan-item write.
 */
import { supabase } from '@/integrations/supabase/client';
import {
  resolveNotificationForTriggerEvent,
  renderNotificationText,
} from '@/lib/comm/notificationDispatchResolver';

type Vars = Record<string, string | number | null | undefined>;

interface PlanContext {
  planId: string | null | undefined;
  itemId?: string | null;
  employerName?: string | null;
  employerId?: string | null;
  exceptionCategory?: string | null;
  reasonNote?: string | null;
  performedBy: string;
}

/** Resolve the human(s) who should review an exception for a given plan. */
async function resolveSupervisorRecipients(planId: string): Promise<string[]> {
  try {
    const { data: plan } = await (supabase as any)
      .from('ce_weekly_plans')
      .select('approved_by, reviewer_id, inspector_id, created_by')
      .eq('id', planId)
      .maybeSingle();
    if (!plan) return [];
    const ids = new Set<string>();
    // Prefer a real reviewer/approver if present; fall back to whatever
    // identifies the plan owner so the message lands somewhere visible.
    if (plan.approved_by) ids.add(String(plan.approved_by));
    if (plan.reviewer_id) ids.add(String(plan.reviewer_id));
    if (ids.size === 0 && plan.inspector_id) ids.add(String(plan.inspector_id));
    if (ids.size === 0 && plan.created_by) ids.add(String(plan.created_by));
    return Array.from(ids);
  } catch (e) {
    console.warn('[plan-exception-notify] resolveSupervisor failed', e);
    return [];
  }
}

async function resolveCreator(itemId: string | null | undefined, fallbackPlanId?: string | null): Promise<string[]> {
  try {
    if (itemId) {
      const { data } = await (supabase as any)
        .from('ce_weekly_plan_items')
        .select('created_by')
        .eq('id', itemId)
        .maybeSingle();
      if (data?.created_by) return [String(data.created_by)];
    }
    if (fallbackPlanId) {
      const { data } = await (supabase as any)
        .from('ce_weekly_plans')
        .select('created_by, inspector_id')
        .eq('id', fallbackPlanId)
        .maybeSingle();
      if (data?.created_by) return [String(data.created_by)];
      if (data?.inspector_id) return [String(data.inspector_id)];
    }
    return [];
  } catch (e) {
    console.warn('[plan-exception-notify] resolveCreator failed', e);
    return [];
  }
}

async function lookupTemplate(event: string): Promise<{ subject: string; body: string } | null> {
  try {
    const { data } = await (supabase as any)
      .from('notification_templates')
      .select('subject, body')
      .eq('trigger_event', event)
      .eq('is_enabled', true)
      .limit(1);
    if (data?.[0]) return { subject: data[0].subject ?? '', body: data[0].body ?? '' };
  } catch (e) {
    console.warn('[plan-exception-notify] template lookup failed', e);
  }
  return null;
}

function render(text: string, vars: Vars): string {
  let out = text;
  Object.entries(vars).forEach(([k, v]) => {
    const ph = `{{${k}}}`;
    out = out.split(ph).join(v == null ? '' : String(v));
  });
  return out;
}

async function dispatch(opts: {
  event: string;
  recipients: string[];
  defaultSubject: string;
  defaultBody: string;
  vars: Vars;
  planId: string;
  entityId?: string | null;
}) {
  if (opts.recipients.length === 0) return;
  try {
    const tpl = await lookupTemplate(opts.event);
    const subject = render(tpl?.subject || opts.defaultSubject, opts.vars);
    const body = render(tpl?.body || opts.defaultBody, opts.vars);

    const rows = opts.recipients.map((user_id) => ({
      user_id,
      title: subject,
      message: body,
      type: 'compliance',
      category: opts.event,
      entity_id: opts.entityId ?? opts.planId,
      entity_type: 'weekly_plan_exception',
      is_read: false,
      created_at: new Date().toISOString(),
    }));
    await (supabase as any).from('system_notifications').insert(rows);

    await (supabase as any).from('system_business_events').insert({
      action: opts.event,
      module: 'compliance_planning',
      entity_type: 'weekly_plan_exception',
      entity_id: opts.entityId ?? opts.planId,
      description: subject,
      payload_json: opts.vars as any,
    });
  } catch (e) {
    console.warn('[plan-exception-notify] dispatch failed', e);
  }
}

export const planExceptionNotifier = {
  async submitted(ctx: PlanContext) {
    if (!ctx.planId) return;
    const recipients = await resolveSupervisorRecipients(ctx.planId);
    await dispatch({
      event: 'plan_exception_submitted',
      recipients,
      defaultSubject: `Plan exception awaiting approval — ${ctx.employerName ?? 'employer'}`,
      defaultBody:
        `An exception was added to the weekly plan and requires your approval.\n` +
        `Employer: {{employerName}} ({{employerId}})\n` +
        `Category: {{category}}\n` +
        `Reason: {{reason}}\n` +
        `Submitted by: {{performedBy}}`,
      vars: {
        employerName: ctx.employerName ?? '',
        employerId: ctx.employerId ?? '',
        category: ctx.exceptionCategory ?? '',
        reason: ctx.reasonNote ?? '',
        performedBy: ctx.performedBy,
      },
      planId: ctx.planId,
      entityId: ctx.itemId,
    });
  },

  async decision(ctx: PlanContext & { outcome: 'APPROVED' | 'REJECTED'; note?: string | null }) {
    if (!ctx.planId) return;
    const recipients = await resolveCreator(ctx.itemId, ctx.planId);
    const event = ctx.outcome === 'APPROVED' ? 'plan_exception_approved' : 'plan_exception_rejected';
    await dispatch({
      event,
      recipients,
      defaultSubject:
        ctx.outcome === 'APPROVED'
          ? `Plan exception approved — ${ctx.employerName ?? 'employer'}`
          : `Plan exception rejected — ${ctx.employerName ?? 'employer'}`,
      defaultBody:
        ctx.outcome === 'APPROVED'
          ? `Your exception for {{employerName}} ({{employerId}}) has been approved by {{performedBy}}.`
          : `Your exception for {{employerName}} ({{employerId}}) has been rejected by {{performedBy}}.\nNote: {{note}}`,
      vars: {
        employerName: ctx.employerName ?? '',
        employerId: ctx.employerId ?? '',
        performedBy: ctx.performedBy,
        note: ctx.note ?? '',
      },
      planId: ctx.planId,
      entityId: ctx.itemId,
    });
  },
};
