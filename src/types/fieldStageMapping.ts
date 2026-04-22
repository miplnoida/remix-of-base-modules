/**
 * Field-Execution Stage Taxonomy.
 *
 * These are the 10 canonical stages of an audit visit's lifecycle that
 * the Field Execution module recognises. They are the *operational*
 * checkpoints (distinct from the 5 employer-audit `lifecycle_stage`
 * buckets used by templates themselves).
 *
 * The mapping table `ce_audit_field_stage_template_map` links each of
 * these stages to one or more existing `ce_audit_communication_templates`
 * rows. The taxonomy is enforced by a CHECK constraint on the table.
 */

export type FieldExecutionStage =
  | 'visit_created'
  | 'pre_visit_reminder'
  | 'during_audit_missing_documents'
  | 'during_audit_clarification_required'
  | 'during_audit_interim_findings'
  | 'post_review_draft_findings'
  | 'final_report_issuance'
  | 'enforcement_stage'
  | 'reminder_stage'
  | 'escalation_stage';

export const FIELD_STAGE_ORDER: FieldExecutionStage[] = [
  'visit_created',
  'pre_visit_reminder',
  'during_audit_missing_documents',
  'during_audit_clarification_required',
  'during_audit_interim_findings',
  'post_review_draft_findings',
  'final_report_issuance',
  'enforcement_stage',
  'reminder_stage',
  'escalation_stage',
];

export const FIELD_STAGE_LABELS: Record<FieldExecutionStage, string> = {
  visit_created: 'Visit Created / Scheduled',
  pre_visit_reminder: 'Pre-Visit Reminder',
  during_audit_missing_documents: 'During Audit — Missing Documents',
  during_audit_clarification_required: 'During Audit — Clarification Required',
  during_audit_interim_findings: 'During Audit — Interim Findings',
  post_review_draft_findings: 'Post-Review — Draft Findings / Report',
  final_report_issuance: 'Final Report Issuance',
  enforcement_stage: 'Enforcement Stage',
  reminder_stage: 'Reminder Stage',
  escalation_stage: 'Escalation Stage',
};

export const FIELD_STAGE_HINTS: Record<FieldExecutionStage, string> = {
  visit_created: 'Visit has been created or scheduled. Send the audit intimation and books-required notice.',
  pre_visit_reminder: 'A few days before the visit. Send a reminder so the employer is prepared.',
  during_audit_missing_documents: 'On-site, employer is missing required books or records. Request them in writing.',
  during_audit_clarification_required: 'On-site, additional clarification is needed on entries or wages.',
  during_audit_interim_findings: 'Mid-audit interim findings shared for transparency.',
  post_review_draft_findings: 'Session closed; draft findings/report ready for employer acknowledgment or dispute.',
  final_report_issuance: 'Final audit report is ready for issuance to the employer.',
  enforcement_stage: 'Violation notice and corrective-action requests after the final report.',
  reminder_stage: 'Recurring reminders for outstanding items, due dates, or unanswered communications.',
  escalation_stage: 'Formal escalation when reminders go unanswered or non-compliance persists.',
};

/**
 * Lifecycle stage that each field stage belongs to. Used as a *fallback*
 * source of templates when no explicit mapping row exists yet (zero-config
 * grace) and to group stages in the admin UI.
 */
export const FIELD_STAGE_TO_LIFECYCLE: Record<
  FieldExecutionStage,
  'pre_visit' | 'during_audit' | 'post_review' | 'final_enforcement' | 'reminders_escalation'
> = {
  visit_created: 'pre_visit',
  pre_visit_reminder: 'pre_visit',
  during_audit_missing_documents: 'during_audit',
  during_audit_clarification_required: 'during_audit',
  during_audit_interim_findings: 'during_audit',
  post_review_draft_findings: 'post_review',
  final_report_issuance: 'final_enforcement',
  enforcement_stage: 'final_enforcement',
  reminder_stage: 'reminders_escalation',
  escalation_stage: 'reminders_escalation',
};

export interface FieldStageTemplateMapping {
  id: string;
  field_stage: FieldExecutionStage;
  template_id: string;
  sort_order: number;
  is_default: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}
