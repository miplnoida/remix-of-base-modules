/**
 * OM-9.7.7 — Runtime Communication Resolver Cutover.
 *
 * Approved canonical wrapper for runtime notification dispatch callers
 * (Internal Audit, Compliance planning, Audit public submission, …).
 *
 * Runtime services MUST call `resolveNotificationForTriggerEvent()` here
 * instead of reading `notification_templates` directly. This wrapper
 * delegates to `resolveNotificationTemplateForBusinessEvent` (governed
 * business-event route) and only falls back to a legacy direct read of
 * `notification_templates` when the seeded catalogue has no entry — this
 * legacy branch is confined to `src/lib/comm/*` (the allow-listed
 * canonical layer) so runtime business modules stay clean of direct
 * reads.
 *
 * Every dispatch call is offered as `dispatchInAppNotification()` which
 * renders `{{token}}` placeholders via the resolved subject/body,
 * inserts into `system_notifications`, and records a
 * `system_business_events` audit row.
 */
import { supabase } from '@/integrations/supabase/client';
import { resolveNotificationTemplateForBusinessEvent } from '@/lib/comm/businessCommunicationResolver';

export type NotificationChannel = 'EMAIL' | 'SMS' | 'IN_APP' | 'PORTAL';

export interface ResolvedNotificationTemplate {
  /** Explicit source trace so callers can log which layer answered. */
  source:
    | 'CANONICAL_RESOLVER'
    | 'CANONICAL_RESOLVER_SEED'
    | 'LEGACY_NOTIFICATION_TEMPLATE'
    | 'NONE';
  subject: string;
  body: string;
  warnings: string[];
}

export interface ResolveNotificationInput {
  /** Legacy `trigger_event` string (also the businessEventCode). */
  triggerEvent: string;
  moduleCode?: string;
  channel?: NotificationChannel;
  languageCode?: string | null;
  departmentCode?: string | null;
}

/**
 * Resolve a notification template (subject + body) for a runtime
 * dispatch. Prefer the governed business-event route; fall back to a
 * confined direct read of `notification_templates` when the catalogue
 * has no entry yet. Returns `source = 'NONE'` when no template exists
 * anywhere — callers should skip dispatch in that case (matches the
 * pre-migration behaviour).
 */
export async function resolveNotificationForTriggerEvent(
  input: ResolveNotificationInput,
): Promise<ResolvedNotificationTemplate> {
  const warnings: string[] = [];

  // 1. Canonical resolver first.
  try {
    const ctx = await resolveNotificationTemplateForBusinessEvent({
      moduleCode: input.moduleCode ?? 'PLATFORM',
      businessEventCode: input.triggerEvent,
      channel: input.channel ?? 'IN_APP',
      languageCode: input.languageCode ?? null,
      departmentCode: input.departmentCode ?? null,
    });
    warnings.push(...ctx.warnings);
    const subject = (ctx.render as any)?.subject ?? '';
    const body = (ctx.render as any)?.body ?? (ctx.render as any)?.html ?? '';
    if (ctx.render && (subject || body)) {
      return {
        source:
          ctx.templateSource === 'EFFECTIVE_DEFAULT'
            ? 'CANONICAL_RESOLVER_SEED'
            : 'CANONICAL_RESOLVER',
        subject,
        body,
        warnings,
      };
    }
  } catch (e) {
    warnings.push(`Canonical resolver threw for ${input.triggerEvent}: ${(e as Error).message}`);
  }

  // 2. Legacy fallback confined to this canonical wrapper. Business
  //    modules never see this branch — they only see the resolver
  //    facade. Remove when every trigger_event has a seeded catalogue
  //    entry (tracked in comm-direct-read-waiver-burndown.md).
  try {
    const { data } = await (supabase as any)
      .from('notification_templates')
      .select('subject, body')
      .eq('trigger_event', input.triggerEvent)
      .eq('is_enabled', true)
      .limit(1);
    const row = data?.[0];
    if (row && (row.subject || row.body)) {
      warnings.push(
        `Legacy notification_templates fallback used for trigger_event=${input.triggerEvent}. ` +
          'Add this event to the seed catalogue to remove the fallback.',
      );
      return {
        source: 'LEGACY_NOTIFICATION_TEMPLATE',
        subject: row.subject ?? '',
        body: row.body ?? '',
        warnings,
      };
    }
  } catch (e) {
    warnings.push(`Legacy notification_templates lookup failed: ${(e as Error).message}`);
  }

  warnings.push(`No template resolved for trigger_event=${input.triggerEvent}.`);
  return { source: 'NONE', subject: '', body: '', warnings };
}

/** Simple `{{key}}` interpolation shared by all dispatchers. */
export function renderNotificationText(
  text: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  let out = text ?? '';
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v == null ? '' : String(v));
  }
  return out;
}

export interface DispatchInAppInput extends ResolveNotificationInput {
  recipientIds: string[];
  variables: Record<string, string | number | null | undefined>;
  entityId?: string | null;
  entityType?: string | null;
  notificationType: string; // e.g. 'internal_audit', 'compliance', 'audit'
  module: string; // system_business_events.module
}

export interface DispatchResult {
  dispatched: number;
  source: ResolvedNotificationTemplate['source'];
  warnings: string[];
}

/**
 * Governed in-app dispatch: resolves template through the canonical
 * route, renders variables, writes `system_notifications`, and logs a
 * `system_business_events` audit row.
 */
export async function dispatchInAppNotification(
  input: DispatchInAppInput,
): Promise<DispatchResult> {
  const tpl = await resolveNotificationForTriggerEvent(input);
  if (tpl.source === 'NONE') {
    return { dispatched: 0, source: 'NONE', warnings: tpl.warnings };
  }

  const subject = renderNotificationText(tpl.subject, input.variables);
  const body = renderNotificationText(tpl.body, input.variables);

  try {
    if (input.recipientIds.length > 0) {
      const rows = input.recipientIds.map((user_id) => ({
        user_id,
        title: subject,
        message: body,
        type: input.notificationType,
        category: input.triggerEvent,
        entity_id: input.entityId ?? null,
        entity_type: input.entityType ?? null,
        is_read: false,
        created_at: new Date().toISOString(),
      }));
      await (supabase as any).from('system_notifications').insert(rows);
    }

    await (supabase as any).from('system_business_events').insert({
      action: input.triggerEvent,
      module: input.module,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      description: subject,
      payload_json: input.variables as any,
    });
  } catch (e) {
    tpl.warnings.push(`dispatch write failed: ${(e as Error).message}`);
  }

  return {
    dispatched: input.recipientIds.length,
    source: tpl.source,
    warnings: tpl.warnings,
  };
}
