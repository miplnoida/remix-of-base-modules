/**
 * useVisitCommunicationOrchestrator
 *
 * Single façade hook that composes the existing communication layers
 * into one stage-aware orchestration object for an audit visit.
 *
 * Layers it stitches together (each remains independently usable):
 *
 *   1. Templates           — auditCommunicationTemplateService
 *                            (reused as-is from Settings)
 *   2. Stage mapping       — fieldStageTemplateMapService
 *                            (admin-managed binding of templates → 10
 *                            field-execution stages)
 *   3. Visit instances     — auditCommunicationService
 *                            (rows in ce_audit_communications keyed by
 *                            inspection_id)
 *   4. Trigger engine      — useVisitTriggerEvaluation
 *                            (rule-driven SUGGEST / AUTO_CREATE_DRAFT /
 *                            AUTO_SEND decisions, dedup-aware)
 *   5. Approval workflow   — auditCommunicationApprovalService
 *                            (draft → submitted → approved/rejected → sent)
 *   6. Status / intel      — useVisitCommunicationStatus
 *                            (counts, overdue acks/responses, escalation,
 *                             last-sent, completion-gate signal)
 *
 * Anything else (composer dialog, history dialog, intelligence card,
 * gate checks) consumes these primitives directly. This hook is the
 * recommended single import for new visit-workspace surfaces and for
 * future audit types (e.g. desk audit, follow-up visit) that need the
 * same orchestration without re-wiring 4–5 hooks.
 */
import { useMemo } from 'react';
import { useVisitTriggerEvaluation } from '@/hooks/useVisitTriggerEvaluation';
import { useVisitCommunicationStatus } from '@/hooks/useVisitCommunicationStatus';
import type { TriggerContext } from '@/types/commTriggerRule';

interface Options {
  inspectionId: string | null | undefined;
  employerId: string | null | undefined;
  employerName?: string;
  /** Lifecycle + findings context fed into the trigger engine. */
  triggerContext: Omit<TriggerContext, 'existingByType'>;
  userCode?: string;
  enabled?: boolean;
}

export function useVisitCommunicationOrchestrator({
  inspectionId,
  employerId,
  employerName,
  triggerContext,
  userCode,
  enabled = true,
}: Options) {
  const status = useVisitCommunicationStatus(inspectionId ?? null);
  const triggers = useVisitTriggerEvaluation({
    inspectionId,
    employerId,
    employerName,
    visitContext: triggerContext,
    userCode,
    enabled,
  });

  /**
   * Single completion-gate signal — true if the visit is safe to close
   * from a communications perspective. Combines:
   *   - no open drafts / pending approvals / overdue items
   *   - at least one final-stage communication issued
   */
  const completionGate = useMemo(() => {
    const blockers: string[] = [];
    if (status.drafts > 0) blockers.push(`${status.drafts} draft(s) not submitted`);
    if (status.pendingApproval > 0) blockers.push(`${status.pendingApproval} awaiting approval`);
    if (status.overdueResponses.length > 0) {
      blockers.push(`${status.overdueResponses.length} overdue response(s)`);
    }
    if (status.maxEscalationLevel >= 2) {
      blockers.push(`escalation level ${status.maxEscalationLevel} active`);
    }
    if (!status.finalStageIssued) {
      blockers.push('no final-stage communication issued');
    }
    return {
      ready: blockers.length === 0,
      blockers,
    };
  }, [
    status.drafts,
    status.pendingApproval,
    status.overdueResponses.length,
    status.maxEscalationLevel,
    status.finalStageIssued,
  ]);

  /** Next recommended action surfaced to the auditor (highest priority SUGGEST). */
  const nextRecommended = triggers.suggestions[0] ?? null;

  return {
    status,
    triggers,
    completionGate,
    nextRecommended,
    loading: status.loading || triggers.loading,
  };
}
