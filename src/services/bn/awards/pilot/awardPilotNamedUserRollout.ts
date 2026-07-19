/**
 * AW360-WAVE-1-C1 Stage D9 — Named-user rollout controller.
 *
 * Enforces the approved expansion sequence for the pilot cohort, with
 * hard blocks when any reconciliation discrepancy or unresolved HIGH/
 * CRITICAL incident is present.
 */
import type { AwardActionKey } from '../awardActionAvailability';

export type RolloutPhaseId =
  | 'INTERNAL_TECHNICAL_USER'
  | 'ONE_AUTHORISED_BUSINESS_USER'
  | 'NAMED_BUSINESS_COHORT'
  | 'FULL_APPROVED_PILOT_COHORT'
  | 'APPROVED_TENANT_ROLE';

export const ROLLOUT_PHASE_ORDER: readonly RolloutPhaseId[] = [
  'INTERNAL_TECHNICAL_USER',
  'ONE_AUTHORISED_BUSINESS_USER',
  'NAMED_BUSINESS_COHORT',
  'FULL_APPROVED_PILOT_COHORT',
  'APPROVED_TENANT_ROLE',
];

export interface RolloutExpansionRecord {
  readonly fromPhase: RolloutPhaseId | null;
  readonly toPhase: RolloutPhaseId;
  readonly actions: readonly AwardActionKey[];
  readonly previousCohort: readonly string[];
  readonly newCohort: readonly string[];
  readonly evidenceReviewed: readonly string[];       // reconciliation run IDs, incident IDs, etc.
  readonly reconciliationClean: boolean;
  readonly openHighOrCriticalIncidents: number;
  readonly businessApprover: string;
  readonly technicalApprover: string;
  readonly rollbackTrigger: string;
  readonly effectiveAt: string;
}

export interface RolloutExpansionDecision {
  readonly permitted: boolean;
  readonly blocked: readonly string[];
}

export function evaluateExpansion(rec: RolloutExpansionRecord): RolloutExpansionDecision {
  const blocked: string[] = [];
  const fromIdx = rec.fromPhase ? ROLLOUT_PHASE_ORDER.indexOf(rec.fromPhase) : -1;
  const toIdx = ROLLOUT_PHASE_ORDER.indexOf(rec.toPhase);
  if (toIdx === -1) blocked.push('unknown toPhase');
  if (toIdx !== fromIdx + 1) blocked.push(`expansion must be sequential: ${rec.fromPhase} → ${rec.toPhase}`);
  if (!rec.reconciliationClean) blocked.push('reconciliation not clean');
  if (rec.openHighOrCriticalIncidents > 0) blocked.push('open HIGH/CRITICAL incidents');
  if (!rec.businessApprover) blocked.push('business approver missing');
  if (!rec.technicalApprover) blocked.push('technical approver missing');
  if (!rec.rollbackTrigger) blocked.push('rollback trigger missing');
  if (rec.actions.length === 0) blocked.push('actions must be non-empty');
  return { permitted: blocked.length === 0, blocked };
}

export interface RolloutRegister {
  add(rec: RolloutExpansionRecord): RolloutExpansionDecision;
  history(): readonly RolloutExpansionRecord[];
  currentPhase(): RolloutPhaseId | null;
}

export function createRolloutRegister(): RolloutRegister {
  const history: RolloutExpansionRecord[] = [];
  let current: RolloutPhaseId | null = null;
  return {
    add(rec) {
      const decision = evaluateExpansion({ ...rec, fromPhase: rec.fromPhase ?? current });
      if (decision.permitted) {
        history.push(rec);
        current = rec.toPhase;
      }
      return decision;
    },
    history: () => history.slice(),
    currentPhase: () => current,
  };
}
