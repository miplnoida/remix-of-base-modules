/**
 * AW360-WAVE-1-C1 Stage D8 — Controlled volume ramps.
 *
 * Records each expansion stage with dual-owner approvals, evidence review,
 * and rollback triggers. Expansion is blocked when promotion gates fail.
 */
import type { AwardActionKey } from '../awardActionAvailability';

export type VolumeRampStage =
  | 'INTERNAL_TECH'
  | 'ONE_BUSINESS_USER'
  | 'NAMED_BUSINESS_COHORT'
  | 'FULL_PILOT_COHORT'
  | 'APPROVED_TENANT_ROLE'
  | 'FULL_APPROVED_TENANT';

export const VOLUME_RAMP_STAGE_ORDER: readonly VolumeRampStage[] = [
  'INTERNAL_TECH',
  'ONE_BUSINESS_USER',
  'NAMED_BUSINESS_COHORT',
  'FULL_PILOT_COHORT',
  'APPROVED_TENANT_ROLE',
  'FULL_APPROVED_TENANT',
];

export interface VolumeRampExpansion {
  readonly stage: VolumeRampStage;
  readonly actions: readonly AwardActionKey[];
  readonly priorLimit: number;
  readonly proposedLimit: number;
  readonly approvingBusinessOwner: string;
  readonly approvingTechnicalOwner: string;
  readonly evidenceReviewedAt: string;
  readonly incidentStateClear: boolean;
  readonly reconciliationStateClear: boolean;
  readonly rollbackTrigger: string;
  readonly effectiveAt: string;
}

export interface VolumeRampController {
  propose(exp: VolumeRampExpansion, gatesPassed: boolean): { readonly accepted: boolean; readonly reason?: string };
  history(): readonly VolumeRampExpansion[];
  currentLimitFor(stage: VolumeRampStage): number;
}

export function createVolumeRampController(): VolumeRampController {
  const rec: VolumeRampExpansion[] = [];
  const current = new Map<VolumeRampStage, number>();
  return {
    propose(exp, gatesPassed) {
      if (!gatesPassed) return { accepted: false, reason: 'PROMOTION_GATES_FAILED' };
      if (!exp.incidentStateClear) return { accepted: false, reason: 'INCIDENT_STATE_NOT_CLEAR' };
      if (!exp.reconciliationStateClear) return { accepted: false, reason: 'RECONCILIATION_NOT_CLEAR' };
      if (exp.approvingBusinessOwner === exp.approvingTechnicalOwner) {
        return { accepted: false, reason: 'DUAL_OWNER_REQUIRED' };
      }
      if (exp.proposedLimit <= exp.priorLimit) return { accepted: false, reason: 'NON_EXPANSION_PROPOSAL' };
      rec.push(exp);
      current.set(exp.stage, exp.proposedLimit);
      return { accepted: true };
    },
    history: () => rec.slice(),
    currentLimitFor: (s) => current.get(s) ?? 0,
  };
}
