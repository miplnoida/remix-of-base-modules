/**
 * Phase 3 — Instance workflow extensions for AuditCommunicationService.
 *
 * Adds:
 *   - updateDraft (edit subject/body/channel/recipients prior to submission)
 *   - schedule / reschedule / cancelScheduled
 *   - configureRecurrence (per-instance overrides of template policy)
 *   - listDeliveries (for delivery history view)
 *   - listEvents (for audit timeline)
 *
 * Kept in a separate file so the original send/approve flow in
 * auditCommunicationService.ts stays untouched (backward-compat).
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  AuditCommunication,
  AuditCommunicationDelivery,
  AuditCommunicationEvent,
  AuditCommunicationRecipient,
  CeCommChannel,
  CeCommStopCondition,
} from '@/types/auditCommunication';

const COMM = 'ce_audit_communications' as any;
const REC = 'ce_audit_communication_recipients' as any;
const DEL = 'ce_audit_communication_deliveries' as any;
const EVT = 'ce_audit_communication_events' as any;

async function logEvent(
  communicationId: string,
  eventType: string,
  actor?: string,
  payload: Record<string, unknown> = {},
) {
  await (supabase.from(EVT) as any).insert({
    communication_id: communicationId,
    event_type: eventType,
    actor_user_id: actor,
    payload,
  });
}

export interface DraftEditPatch {
  subject_snapshot?: string | null;
  email_body_snapshot?: string | null;
  sms_body_snapshot?: string | null;
  channel?: CeCommChannel;
  scheduled_at?: string | null;
}

export interface RecurrenceConfig {
  enabled: boolean;
  interval_days?: number | null;
  max_occurrences?: number | null;
  stop_conditions?: CeCommStopCondition[];
}

export interface ManualRecipientInput {
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
  role?: string | null;
  is_primary?: boolean;
}

export const auditCommunicationInstanceService = {
  /** Edit a draft (only allowed while status is `draft` or `rejected`). */
  async updateDraft(id: string, patch: DraftEditPatch, userCode?: string): Promise<AuditCommunication> {
    const { data: cur, error: gErr } = await (supabase.from(COMM) as any)
      .select('status').eq('id', id).maybeSingle();
    if (gErr) throw gErr;
    if (!cur) throw new Error('Communication not found');
    if (!['draft', 'rejected'].includes(cur.status)) {
      throw new Error(`Cannot edit a ${cur.status} communication`);
    }
    const { data, error } = await (supabase.from(COMM) as any)
      .update({ ...patch, updated_by: userCode })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    await logEvent(id, 'draft_edited', userCode, { fields: Object.keys(patch) });
    return data as AuditCommunication;
  },

  /** Replace the recipient set of a draft. */
  async replaceRecipients(id: string, recipients: ManualRecipientInput[], userCode?: string) {
    const { data: cur, error: gErr } = await (supabase.from(COMM) as any)
      .select('status').eq('id', id).maybeSingle();
    if (gErr) throw gErr;
    if (!cur) throw new Error('Communication not found');
    if (!['draft', 'rejected'].includes(cur.status)) {
      throw new Error(`Cannot edit recipients on a ${cur.status} communication`);
    }
    const { error: dErr } = await (supabase.from(REC) as any).delete().eq('communication_id', id);
    if (dErr) throw dErr;
    if (recipients.length) {
      const { error } = await (supabase.from(REC) as any).insert(
        recipients.map((r, idx) => ({
          communication_id: id,
          recipient_name: r.name ?? null,
          recipient_email: r.email ?? null,
          recipient_mobile: r.mobile ?? null,
          recipient_role: r.role ?? null,
          source: 'manual' as const,
          is_primary: r.is_primary ?? idx === 0,
        })),
      );
      if (error) throw error;
    }
    await logEvent(id, 'recipients_replaced', userCode, { count: recipients.length });
  },

  async listRecipients(id: string): Promise<AuditCommunicationRecipient[]> {
    const { data, error } = await (supabase.from(REC) as any)
      .select('*')
      .eq('communication_id', id)
      .order('created_at');
    if (error) throw error;
    return (data || []) as AuditCommunicationRecipient[];
  },

  /** Schedule (or reschedule) a draft/approved communication. */
  async schedule(id: string, scheduledAt: string, userCode?: string) {
    const { data: cur, error: gErr } = await (supabase.from(COMM) as any)
      .select('status, template_id').eq('id', id).maybeSingle();
    if (gErr) throw gErr;
    if (!cur) throw new Error('Communication not found');
    if (!['draft', 'approved', 'pending_approval'].includes(cur.status)) {
      throw new Error(`Cannot schedule a ${cur.status} communication`);
    }
    const { error } = await (supabase.from(COMM) as any)
      .update({ scheduled_at: scheduledAt, updated_by: userCode })
      .eq('id', id);
    if (error) throw error;
    await logEvent(id, 'scheduled', userCode, { scheduled_at: scheduledAt });
  },

  async cancelScheduled(id: string, reason: string, userCode?: string) {
    const { error } = await (supabase.from(COMM) as any)
      .update({
        status: 'cancelled',
        scheduled_at: null,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_by: userCode,
      })
      .eq('id', id);
    if (error) throw error;
    await logEvent(id, 'scheduled_cancelled', userCode, { reason });
  },

  /** Configure per-instance recurrence (overrides template policy for this instance only). */
  async configureRecurrence(id: string, cfg: RecurrenceConfig, userCode?: string) {
    const { error } = await (supabase.from(COMM) as any)
      .update({
        recurrence_enabled: cfg.enabled,
        recurrence_interval_days: cfg.enabled ? cfg.interval_days ?? null : null,
        recurrence_max_occurrences: cfg.enabled ? cfg.max_occurrences ?? null : null,
        recurrence_stop_conditions_json: cfg.enabled ? cfg.stop_conditions ?? [] : [],
        updated_by: userCode,
      })
      .eq('id', id);
    if (error) throw error;
    await logEvent(id, 'recurrence_configured', userCode, cfg as any);
  },

  async listDeliveries(id: string): Promise<AuditCommunicationDelivery[]> {
    const { data, error } = await (supabase.from(DEL) as any)
      .select('*')
      .eq('communication_id', id)
      .order('attempted_at', { ascending: false });
    if (error) throw error;
    return (data || []) as AuditCommunicationDelivery[];
  },

  async listEvents(id: string): Promise<AuditCommunicationEvent[]> {
    const { data, error } = await (supabase.from(EVT) as any)
      .select('*')
      .eq('communication_id', id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as AuditCommunicationEvent[];
  },
};
