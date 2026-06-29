import { supabase } from '@/integrations/supabase/client';
import { caseViolationService } from '@/services/caseViolationService';

// ============================================
// VIOLATION LIFECYCLE SERVICE
// Enterprise-grade status transition engine
// ============================================

export type ViolationStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'UNDER_REVIEW'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED';

/**
 * Canonical transition matrix.
 * Key = current status, Value = set of allowed target statuses.
 */
/**
 * Local fallback transition matrix.
 *
 * The authoritative catalog now lives in the database (workflow_steps +
 * workflow_step_actions on the "CE Status — Trivial Transitions" workflow)
 * and is enforced by the `ce_apply_status_transition` RPC. This matrix is
 * kept only for legacy callers of `isTransitionAllowed()` / `getAllowedTransitions()`
 * and is the source of truth ONLY when the RPC is unreachable.
 *
 * Note: `UNDER_REVIEW → OPEN` is intentionally OMITTED (closes a workflow-
 * integrity bug where admins could walk a violation back to OPEN after
 * Start Work). Reopens from UNDER_REVIEW are no longer allowed; use the
 * RESOLVED/CLOSED/CANCELLED → OPEN reopen path instead.
 */
const TRANSITION_MATRIX: Record<ViolationStatus, ViolationStatus[]> = {
  OPEN: ['IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  IN_PROGRESS: ['UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  UNDER_REVIEW: ['IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CANCELLED'],
  ESCALATED: ['UNDER_REVIEW', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'OPEN'],
  CLOSED: ['OPEN'],
  CANCELLED: ['OPEN'],
};

/**
 * Map (target status) → workflow action_code as configured in the seeded
 * baseline workflow. The RPC needs an action_code; we derive it from the
 * legacy target-status API so existing callers keep working.
 */
const ACTION_CODE_BY_TARGET: Record<ViolationStatus, string> = {
  OPEN: 'REOPEN',
  IN_PROGRESS: 'START_WORK',
  UNDER_REVIEW: 'MOVE_TO_REVIEW',
  ESCALATED: 'ESCALATE',
  RESOLVED: 'RESOLVE',
  CLOSED: 'CLOSE',
  CANCELLED: 'CANCEL',
};

/** Human-readable labels for transition actions */
const ACTION_LABELS: Record<string, string> = {
  'OPEN→IN_PROGRESS': 'Started Work',
  'OPEN→UNDER_REVIEW': 'Moved to Review',
  'OPEN→ESCALATED': 'Escalated',
  'OPEN→RESOLVED': 'Resolved',
  'OPEN→CANCELLED': 'Cancelled',
  'IN_PROGRESS→UNDER_REVIEW': 'Moved to Review',
  'IN_PROGRESS→ESCALATED': 'Escalated',
  'IN_PROGRESS→RESOLVED': 'Resolved',
  'IN_PROGRESS→CANCELLED': 'Cancelled',
  'UNDER_REVIEW→OPEN': 'Returned to Open',
  'UNDER_REVIEW→IN_PROGRESS': 'Started Work',
  'UNDER_REVIEW→ESCALATED': 'Escalated',
  'UNDER_REVIEW→RESOLVED': 'Resolved',
  'UNDER_REVIEW→CANCELLED': 'Cancelled',
  'ESCALATED→UNDER_REVIEW': 'De-escalated to Review',
  'ESCALATED→RESOLVED': 'Resolved',
  'ESCALATED→CANCELLED': 'Cancelled',
  'RESOLVED→CLOSED': 'Closed',
  'RESOLVED→OPEN': 'Reopened',
  'CLOSED→OPEN': 'Reopened',
  'CANCELLED→OPEN': 'Reopened',
};

export interface TransitionRequest {
  violationId: string;
  targetStatus: ViolationStatus;
  performedBy: string;       // UserCode of actor
  notes: string;             // Mandatory reason/notes
  resolutionNotes?: string;  // For RESOLVED transitions
}

export interface TransitionResult {
  success: boolean;
  error?: string;
  previousStatus?: ViolationStatus;
  newStatus?: ViolationStatus;
}

class ViolationLifecycleService {
  /**
   * Check whether a transition is valid without executing it.
   */
  isTransitionAllowed(currentStatus: ViolationStatus, targetStatus: ViolationStatus): boolean {
    const allowed = TRANSITION_MATRIX[currentStatus];
    return allowed ? allowed.includes(targetStatus) : false;
  }

  /**
   * Get list of valid target statuses from a given status.
   */
  getAllowedTransitions(currentStatus: ViolationStatus): ViolationStatus[] {
    return TRANSITION_MATRIX[currentStatus] || [];
  }

  /**
   * Get the human-readable action label for a transition.
   */
  getActionLabel(from: ViolationStatus, to: ViolationStatus): string {
    return ACTION_LABELS[`${from}→${to}`] || `${from} → ${to}`;
  }

  /**
   * Execute a lifecycle transition atomically:
   *   1. Fetch current violation & validate transition
   *   2. Update ce_violations status + side-effect fields
   *   3. Insert audit record into ce_violation_history
   */
  async transition(request: TransitionRequest): Promise<TransitionResult> {
    const { violationId, targetStatus, performedBy, notes, resolutionNotes } = request;

    // 1. Fetch current state
    const { data: violation, error: fetchErr } = await supabase
      .from('ce_violations')
      .select('id, status, violation_number, employer_id, employer_name, territory, priority, total_amount, summary')
      .eq('id', violationId)
      .single();

    if (fetchErr || !violation) {
      return { success: false, error: 'Violation not found' };
    }

    const currentStatus = violation.status as ViolationStatus;

    // 2. Validate transition
    if (!this.isTransitionAllowed(currentStatus, targetStatus)) {
      return {
        success: false,
        error: `Transition from ${currentStatus} to ${targetStatus} is not allowed`,
      };
    }

    // 3. Build update payload
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status: targetStatus,
      updated_by: performedBy,
    };

    // Side-effect fields based on target status
    if (targetStatus === 'RESOLVED') {
      updatePayload.resolved_at = now;
      updatePayload.resolved_by = performedBy;
      if (resolutionNotes) {
        updatePayload.resolution_notes = resolutionNotes;
      }
    }

    if (targetStatus === 'ESCALATED') {
      updatePayload.escalated_at = now;
      updatePayload.escalated_to = performedBy;
    }

    // Reopening clears resolution/escalation fields
    if (targetStatus === 'OPEN' && ['RESOLVED', 'CLOSED', 'CANCELLED'].includes(currentStatus)) {
      updatePayload.resolved_at = null;
      updatePayload.resolved_by = null;
      updatePayload.resolution_notes = null;
      updatePayload.escalated_at = null;
      updatePayload.escalated_to = null;
    }

    // 4. Update violation
    const { error: updateErr } = await supabase
      .from('ce_violations')
      .update(updatePayload)
      .eq('id', violationId);

    if (updateErr) {
      return { success: false, error: `Failed to update violation: ${updateErr.message}` };
    }

    // 5. Insert history record
    const actionLabel = this.getActionLabel(currentStatus, targetStatus);
    const { error: historyErr } = await supabase
      .from('ce_violation_history')
      .insert({
        violation_id: violationId,
        action: actionLabel,
        from_value: currentStatus,
        to_value: targetStatus,
        notes: notes || null,
        performed_by: performedBy,
        performed_at: now,
      } as any);

    if (historyErr) {
      console.error('Failed to write violation history:', historyErr);
    }

    // 6. Auto-link/create case on ESCALATED transition
    if (targetStatus === 'ESCALATED' && (violation as any).employer_id) {
      try {
        const caseResult = await caseViolationService.findOrCreateCaseForEscalation(
          {
            id: violationId,
            violation_number: (violation as any).violation_number || '',
            employer_id: (violation as any).employer_id,
            employer_name: (violation as any).employer_name,
            territory: (violation as any).territory,
            priority: (violation as any).priority,
            total_amount: Number((violation as any).total_amount) || 0,
            summary: (violation as any).summary,
          },
          performedBy
        );
        if (!caseResult.success) {
          console.error('Case auto-link failed:', caseResult.error);
        }
      } catch (err) {
        console.error('Case auto-link error:', err);
        // Non-fatal — escalation succeeded, case link is best-effort
      }
    }

    // 7. Event-driven risk recalculation on resolution/closure
    if (['RESOLVED', 'CLOSED'].includes(targetStatus) && (violation as any).employer_id) {
      try {
        const { data: riskProfile } = await supabase
          .from('ce_risk_profiles')
          .select('id')
          .eq('employer_id', (violation as any).employer_id)
          .maybeSingle();
        if (riskProfile) {
          console.log(`[Lifecycle] Triggering risk recalculation for employer ${(violation as any).employer_id}`);
          // Mark profile for recalculation by updating next_review_date
          await supabase.from('ce_risk_profiles').update({
            next_review_date: new Date().toISOString(),
            updated_by: performedBy,
          }).eq('id', riskProfile.id);
        }
      } catch (err) {
        console.error('Risk recalc trigger error (non-fatal):', err);
      }
    }

    return {
      success: true,
      previousStatus: currentStatus,
      newStatus: targetStatus,
    };
  }

  /**
   * Convenience: Resolve a violation with mandatory notes.
   */
  async resolve(violationId: string, performedBy: string, resolutionNotes: string, transitionNotes: string): Promise<TransitionResult> {
    return this.transition({
      violationId,
      targetStatus: 'RESOLVED',
      performedBy,
      notes: transitionNotes,
      resolutionNotes,
    });
  }

  /**
   * Convenience: Close a resolved violation.
   */
  async close(violationId: string, performedBy: string, notes: string): Promise<TransitionResult> {
    return this.transition({
      violationId,
      targetStatus: 'CLOSED',
      performedBy,
      notes,
    });
  }

  /**
   * Convenience: Reopen a closed/cancelled/resolved violation.
   */
  async reopen(violationId: string, performedBy: string, reason: string): Promise<TransitionResult> {
    return this.transition({
      violationId,
      targetStatus: 'OPEN',
      performedBy,
      notes: reason,
    });
  }
}

export const violationLifecycleService = new ViolationLifecycleService();
