/**
 * Field Execution Stage Resolver.
 *
 * Maps the runtime state of a visit (session timestamps, report status,
 * violations, missing-document/clarification flags, due-date status) to
 * one of the 10 canonical `FieldExecutionStage` values.
 *
 * The resolver is intentionally small and deterministic — it is the single
 * source of truth for "which stage am I on?" so both the suggestion UI
 * and the gate-advisory checks stay consistent.
 */
import type { FieldExecutionStage } from '@/types/fieldStageMapping';

export interface FieldStageContext {
  /** Visit session lifecycle. */
  sessionStarted: boolean;
  sessionClosed: boolean;

  /** Optional schedule signal — if the visit's scheduled date is within N days. */
  daysUntilScheduled?: number | null;

  /** Report state: 'DRAFT' | 'FINALIZED' | 'PUBLISHED' | … */
  reportStatus?: string | null;

  /** Findings / outcome signals. */
  hasViolations?: boolean;
  hasInterimFindings?: boolean;
  hasMissingDocuments?: boolean;
  hasOpenClarifications?: boolean;

  /** Outstanding items past their due date — drives reminder/escalation. */
  hasOverdueItems?: boolean;
  reminderCount?: number; // number of reminders already sent
}

/**
 * Resolve the *current* field stage. First-match wins; ordering reflects
 * operational priority (e.g. an open clarification while session is live
 * supersedes the generic "during audit" bucket).
 */
export function resolveFieldStage(ctx: FieldStageContext): FieldExecutionStage {
  const status = (ctx.reportStatus || '').toUpperCase();

  // Pre-visit: session not yet started.
  if (!ctx.sessionStarted) {
    if (typeof ctx.daysUntilScheduled === 'number' && ctx.daysUntilScheduled <= 3 && ctx.daysUntilScheduled >= 0) {
      return 'pre_visit_reminder';
    }
    return 'visit_created';
  }

  // During audit: session live, not yet closed.
  if (!ctx.sessionClosed) {
    if (ctx.hasMissingDocuments) return 'during_audit_missing_documents';
    if (ctx.hasOpenClarifications) return 'during_audit_clarification_required';
    if (ctx.hasInterimFindings) return 'during_audit_interim_findings';
    return 'during_audit_clarification_required'; // safe default within during-audit
  }

  // Session closed.
  if (status === 'PUBLISHED' || status === 'FINALIZED') {
    if (ctx.hasViolations) return 'enforcement_stage';
    if (ctx.hasOverdueItems) {
      return (ctx.reminderCount ?? 0) >= 2 ? 'escalation_stage' : 'reminder_stage';
    }
    return 'final_report_issuance';
  }

  // Closed but not yet finalized.
  return 'post_review_draft_findings';
}

/**
 * Adjacent stages to surface as "next likely" options alongside the
 * resolved stage. Always includes the resolved stage first.
 */
export function adjacentFieldStages(current: FieldExecutionStage): FieldExecutionStage[] {
  switch (current) {
    case 'visit_created':
      return ['visit_created', 'pre_visit_reminder'];
    case 'pre_visit_reminder':
      return ['pre_visit_reminder', 'during_audit_missing_documents'];
    case 'during_audit_missing_documents':
      return ['during_audit_missing_documents', 'during_audit_clarification_required'];
    case 'during_audit_clarification_required':
      return ['during_audit_clarification_required', 'during_audit_interim_findings'];
    case 'during_audit_interim_findings':
      return ['during_audit_interim_findings', 'post_review_draft_findings'];
    case 'post_review_draft_findings':
      return ['post_review_draft_findings', 'final_report_issuance'];
    case 'final_report_issuance':
      return ['final_report_issuance', 'enforcement_stage'];
    case 'enforcement_stage':
      return ['enforcement_stage', 'reminder_stage'];
    case 'reminder_stage':
      return ['reminder_stage', 'escalation_stage'];
    case 'escalation_stage':
      return ['escalation_stage', 'reminder_stage'];
  }
}
