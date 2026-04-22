/**
 * Visit Stage → Communication Lifecycle Stage mapping.
 *
 * Maps the operational state of an audit visit (derived from `inspection`
 * timestamps + report state + gate state) to one of the
 * `CeCommLifecycleStage` buckets so the visit workspace can surface the
 * right communication templates at the right moment.
 *
 * Reuses the existing `lifecycle_stage` taxonomy on
 * `ce_audit_communication_templates` — no new categories invented here.
 */
import type { CeCommLifecycleStage } from '@/types/auditCommunication';

export type VisitStage =
  | 'pre_visit'
  | 'during_audit'
  | 'post_review'
  | 'final_enforcement'
  | 'reminders_escalation';

export interface VisitStageContext {
  sessionStarted: boolean;
  sessionClosed: boolean;
  reportStatus?: string | null;     // 'DRAFT' | 'FINALIZED' | 'PUBLISHED' | …
  hasViolations?: boolean;
  /** True if the gate has at least one unmet REQUIRED check. */
  gateBlocked?: boolean;
}

/**
 * Resolve the *current* stage of a visit. Single-stage answer used to set
 * the default suggestion bucket; the suggestions UI also shows adjacent
 * stages in collapsed form.
 */
export function resolveVisitStage(ctx: VisitStageContext): VisitStage {
  const { sessionStarted, sessionClosed, reportStatus, hasViolations } = ctx;
  if (!sessionStarted) return 'pre_visit';
  if (!sessionClosed) return 'during_audit';
  // Session closed:
  const status = (reportStatus || '').toUpperCase();
  if (status === 'PUBLISHED' || status === 'FINALIZED') {
    return hasViolations ? 'final_enforcement' : 'reminders_escalation';
  }
  return 'post_review';
}

/**
 * Stages to surface in the suggestions panel, ordered by how immediately
 * relevant they are to the resolved stage. Always includes the resolved
 * stage first plus the next logical stage so inspectors can pre-stage
 * follow-ups.
 */
export function suggestedStages(current: VisitStage): CeCommLifecycleStage[] {
  switch (current) {
    case 'pre_visit':
      return ['pre_visit', 'during_audit'];
    case 'during_audit':
      return ['during_audit', 'post_review'];
    case 'post_review':
      return ['post_review', 'final_enforcement'];
    case 'final_enforcement':
      return ['final_enforcement', 'reminders_escalation'];
    case 'reminders_escalation':
      return ['reminders_escalation', 'final_enforcement'];
  }
}

export const VISIT_STAGE_LABELS: Record<VisitStage, string> = {
  pre_visit: 'Pre-Visit',
  during_audit: 'During Audit',
  post_review: 'Post-Review',
  final_enforcement: 'Final / Enforcement',
  reminders_escalation: 'Reminders & Escalation',
};

export const VISIT_STAGE_HINTS: Record<VisitStage, string> = {
  pre_visit: 'Send intimation and books-required notices before arriving on site.',
  during_audit: 'Use clarification, additional info, and interim findings while the audit is in progress.',
  post_review: 'Share draft findings and request acknowledgment after the session is closed.',
  final_enforcement: 'Issue final report, violation notice and corrective-action requests.',
  reminders_escalation: 'Send due-date reminders and escalation notices for outstanding items.',
};
