/**
 * Enterprise Communication Hub — lifecycle event log writer.
 *
 * Every stage transition inside `sendCommunication()` is persisted to
 * `communication_event_log`. The DB CHECK constrains `event_type` to a
 * small canonical set, so fine-grained façade stages (REQUEST_VALIDATED,
 * TEMPLATE_RESOLVED, BRANDING_RESOLVED, CONTENT_RENDERED, MESSAGE_CREATED,
 * MESSAGE_QUEUED, …) are recorded via `payload.stage` while `event_type`
 * stays within the accepted vocabulary ('created' / 'queued' / 'failed' /
 * 'cancelled' / …).
 */
import { supabase } from '@/integrations/supabase/client';
import type { CommHubLifecycleStage } from './types';

const db: any = supabase;

const STAGE_TO_EVENT_TYPE: Record<CommHubLifecycleStage, string> = {
  REQUEST_CREATED: 'created',
  REQUEST_VALIDATED: 'created',
  TEMPLATE_RESOLVED: 'created',
  BRANDING_RESOLVED: 'created',
  CONTENT_RENDERED: 'created',
  MESSAGE_CREATED: 'created',
  MESSAGE_QUEUED: 'queued',
};

export interface LogLifecycleInput {
  stage: CommHubLifecycleStage;
  requestId?: string | null;
  messageId?: string | null;
  actorUserId?: string | null;
  payload?: Record<string, unknown>;
}

export async function logLifecycle(input: LogLifecycleInput): Promise<void> {
  try {
    await db.from('communication_event_log').insert({
      request_id: input.requestId ?? null,
      message_id: input.messageId ?? null,
      event_type: STAGE_TO_EVENT_TYPE[input.stage],
      source: 'sendCommunication',
      actor_user_id: input.actorUserId ?? null,
      payload: { stage: input.stage, ...(input.payload ?? {}) },
    });
  } catch (err) {
    // Lifecycle logging must never break a send.
    // eslint-disable-next-line no-console
    console.warn('[commHub.logLifecycle] failed', input.stage, err);
  }
}

export const eventLogService = { logLifecycle };
