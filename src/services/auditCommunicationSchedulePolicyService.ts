/**
 * Audit Communication Schedule Policy Service —
 * CRUD over ce_audit_communication_schedule_policies (1:1 with template).
 *
 * Defines automation behavior per template: trigger mode (none / event /
 * time-relative / exact datetime), recurrence (interval days, max occurrences,
 * stop conditions). Used by the materializer (cron + hooks) and editor.
 */
import { supabase } from '@/integrations/supabase/client';
import type {
  AuditCommunicationSchedulePolicy,
  CeCommScheduleTriggerMode,
} from '@/types/auditCommunication';

const TBL = 'ce_audit_communication_schedule_policies' as any;

export const auditCommunicationSchedulePolicyService = {
  async getForTemplate(templateId: string): Promise<AuditCommunicationSchedulePolicy | null> {
    const { data, error } = await (supabase.from(TBL) as any)
      .select('*')
      .eq('template_id', templateId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as AuditCommunicationSchedulePolicy | null;
  },

  /** Upsert the policy for a template (creates if missing). */
  async upsert(
    templateId: string,
    patch: Partial<Omit<AuditCommunicationSchedulePolicy, 'id' | 'template_id' | 'created_at' | 'updated_at'>>,
  ): Promise<AuditCommunicationSchedulePolicy> {
    const payload = {
      template_id: templateId,
      trigger_mode: patch.trigger_mode ?? ('NONE' as CeCommScheduleTriggerMode),
      trigger_event: patch.trigger_event ?? null,
      relative_to_field: patch.relative_to_field ?? null,
      offset_days: patch.offset_days ?? null,
      offset_hours: patch.offset_hours ?? null,
      exact_datetime: patch.exact_datetime ?? null,
      recurrence_enabled: patch.recurrence_enabled ?? false,
      recurrence_interval_days: patch.recurrence_interval_days ?? null,
      recurrence_max_occurrences: patch.recurrence_max_occurrences ?? null,
      recurrence_stop_conditions_json: patch.recurrence_stop_conditions_json ?? [],
    };
    const { data, error } = await (supabase.from(TBL) as any)
      .upsert(payload, { onConflict: 'template_id' })
      .select()
      .single();
    if (error) throw error;
    return data as AuditCommunicationSchedulePolicy;
  },

  /** Convenience: list policies whose trigger_mode is one of the given modes. */
  async listByTriggerModes(modes: CeCommScheduleTriggerMode[]) {
    if (!modes.length) return [];
    const { data, error } = await (supabase.from(TBL) as any)
      .select('*, template:ce_audit_communication_templates(id, template_code, template_name, comm_type, channel, is_active, send_mode)')
      .in('trigger_mode', modes);
    if (error) throw error;
    return (data || []) as Array<AuditCommunicationSchedulePolicy & { template?: any }>;
  },

  async remove(templateId: string) {
    const { error } = await (supabase.from(TBL) as any)
      .delete()
      .eq('template_id', templateId);
    if (error) throw error;
  },
};

export const SEND_MODE_LABELS: Record<string, string> = {
  MANUAL_ONLY: 'Manual only',
  MANUAL_OR_SCHEDULED: 'Manual or scheduled',
  AUTO_EVENT_DRIVEN: 'Automatic — event driven',
  AUTO_TIME_DRIVEN: 'Automatic — time driven',
};

export const TRIGGER_MODE_LABELS: Record<CeCommScheduleTriggerMode, string> = {
  NONE: 'None',
  EVENT: 'Event-triggered',
  TIME_RELATIVE: 'Relative to a date',
  EXACT_DATETIME: 'Exact date/time',
};

export const STOP_CONDITION_LABELS: Record<string, string> = {
  acknowledged: 'Recipient acknowledged',
  employer_responded: 'Employer responded',
  case_closed: 'Case closed',
  report_finalized: 'Report finalized',
};

/** Catalog of supported anchor fields for TIME_RELATIVE policies. */
export const RELATIVE_ANCHOR_FIELDS = [
  { value: 'inspection.visit_date', label: 'Inspection visit date' },
  { value: 'inspection.scheduled_at', label: 'Inspection scheduled date' },
  { value: 'case.due_date', label: 'Case due date' },
  { value: 'case.created_at', label: 'Case created date' },
  { value: 'report.finalized_at', label: 'Report finalized date' },
] as const;

/** Catalog of supported events for EVENT policies. */
export const TRIGGER_EVENTS = [
  { value: 'inspection.scheduled', label: 'Inspection scheduled' },
  { value: 'inspection.rescheduled', label: 'Inspection rescheduled' },
  { value: 'inspection.cancelled', label: 'Inspection cancelled' },
  { value: 'report.finalized', label: 'Report finalized' },
  { value: 'case.opened', label: 'Case opened' },
  { value: 'case.closed', label: 'Case closed' },
  { value: 'communication.no_response', label: 'No response received' },
  { value: 'communication.acknowledged', label: 'Communication acknowledged' },
] as const;
