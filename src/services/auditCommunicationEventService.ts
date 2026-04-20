/**
 * Phase 6 — Client-side helper to fire business events that materialize
 * AUTO_EVENT_DRIVEN audit communications.
 *
 * Usage from anywhere in the app (e.g., after publishing an audit):
 *   await fireAuditCommunicationEvent({
 *     event_type: 'audit_completed',
 *     employer_id,
 *     inspection_id,
 *     context_data: { employer: { name }, inspection: { ref, completed_on } },
 *   });
 */
import { supabase } from '@/integrations/supabase/client';

export type AuditCommunicationEventType =
  | 'inspection_scheduled'
  | 'inspection_published'
  | 'inspection_started'
  | 'audit_completed'
  | 'audit_finalized'
  | 'violation_logged'
  | 'dispute_received'
  | 'response_received'
  | 'visit_24h_warning'
  | 'final_report_published'
  | string; // allow custom

export interface FireEventInput {
  event_type: AuditCommunicationEventType;
  employer_id: string;
  inspection_id?: string | null;
  context_data?: Record<string, unknown>;
  triggered_by?: string;
}

export interface FireEventResult {
  ok: boolean;
  created?: Array<{ communication_id: string; template_id: string }>;
  skipped?: Array<{ template_id: string; reason: string }>;
  error?: string;
}

export async function fireAuditCommunicationEvent(
  input: FireEventInput,
): Promise<FireEventResult> {
  const { data, error } = await supabase.functions.invoke(
    'ce-audit-communication-event-hook',
    { body: input },
  );
  if (error) {
    console.error('[fireAuditCommunicationEvent]', error);
    return { ok: false, error: error.message };
  }
  return data as FireEventResult;
}

export const auditCommunicationEventService = {
  fire: fireAuditCommunicationEvent,
};
