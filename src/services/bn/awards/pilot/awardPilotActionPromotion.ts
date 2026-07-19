/**
 * AW360-WAVE-1-C1 Stage D8 — Action-level promotion decisions.
 *
 * Each of the four approved pilot actions is evaluated independently.
 * Aggregate totals do not authorise promotion of any single action.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import { APPROVED_PILOT_ACTIONS } from './awardPilotScopeFreeze';
import type { PerActionEvidence } from './awardPilotPerActionEvidence';
import type { SloEvaluation } from './awardPilotSlo';
import type { SecurityCertificationResult } from './awardPilotSecurityCertification';
import type { AwardPilotEvidenceWindow } from './awardPilotEvidenceWindow';

export type ActionPromotionDecision =
  | 'REMAIN_PILOT'
  | 'EXPAND_COHORT'
  | 'APPROVED_FOR_TENANT'
  | 'SUSPENDED'
  | 'REQUIRES_REMEDIATION';

export interface ActionPromotionSignOff {
  readonly by: string;
  readonly at: string;
}

export interface ActionPromotionRecord {
  readonly action: AwardActionKey;
  readonly decision: ActionPromotionDecision;
  readonly evidencePeriodHours: number;
  readonly volume: number;
  readonly reconciliationClean: boolean;
  readonly incidentsClear: boolean;
  readonly sloEvaluation: SloEvaluation;
  readonly securityResult: SecurityCertificationResult;
  readonly businessSignOff: ActionPromotionSignOff | null;
  readonly technicalSignOff: ActionPromotionSignOff | null;
  readonly operationalSignOff: ActionPromotionSignOff | null;
  readonly rationale: string;
  readonly rollbackConditions: readonly string[];
}

export interface ActionPromotionInputs {
  readonly action: AwardActionKey;
  readonly evidence: PerActionEvidence;
  readonly window: AwardPilotEvidenceWindow;
  readonly evidencePeriodHours: number;
  readonly reconciliationClean: boolean;
  readonly incidentsClear: boolean;
  readonly sloEvaluation: SloEvaluation;
  readonly securityResult: SecurityCertificationResult;
  readonly businessSignOff: ActionPromotionSignOff | null;
  readonly technicalSignOff: ActionPromotionSignOff | null;
  readonly operationalSignOff: ActionPromotionSignOff | null;
}

export function decideActionPromotion(inp: ActionPromotionInputs): ActionPromotionRecord {
  const rationaleParts: string[] = [];
  const rollback: string[] = ['reconciliation discrepancy', 'incident severity ≥ HIGH', 'SLO breach ≥ 2 consecutive intervals'];

  const belowVolume = inp.evidence.successful < inp.window.minSuccessfulCommandsPerAction;
  const shortWindow = inp.evidencePeriodHours < inp.window.minCalendarHours;
  const anyBlocking = !inp.securityResult.passed || !inp.sloEvaluation.passed || !inp.reconciliationClean || !inp.incidentsClear;
  const signedOff = Boolean(inp.businessSignOff && inp.technicalSignOff && inp.operationalSignOff);

  let decision: ActionPromotionDecision;
  if (anyBlocking) { decision = 'REQUIRES_REMEDIATION'; rationaleParts.push('blocking gate failure'); }
  else if (belowVolume || shortWindow) { decision = 'REMAIN_PILOT'; rationaleParts.push('evidence not sufficient'); }
  else if (!signedOff) { decision = 'EXPAND_COHORT'; rationaleParts.push('ready to expand cohort pending final sign-off'); }
  else if (!inp.evidence.businessAccepted) { decision = 'EXPAND_COHORT'; rationaleParts.push('business acceptance still forming'); }
  else { decision = 'APPROVED_FOR_TENANT'; rationaleParts.push('all evidence, SLO, security, and sign-off gates met'); }

  return {
    action: inp.action,
    decision,
    evidencePeriodHours: inp.evidencePeriodHours,
    volume: inp.evidence.successful,
    reconciliationClean: inp.reconciliationClean,
    incidentsClear: inp.incidentsClear,
    sloEvaluation: inp.sloEvaluation,
    securityResult: inp.securityResult,
    businessSignOff: inp.businessSignOff,
    technicalSignOff: inp.technicalSignOff,
    operationalSignOff: inp.operationalSignOff,
    rationale: rationaleParts.join('; '),
    rollbackConditions: rollback,
  };
}

export function isFullyPromoted(rec: ActionPromotionRecord): boolean {
  return rec.decision === 'APPROVED_FOR_TENANT';
}

export const AWARD_PILOT_ACTION_PROMOTION_ORDER: readonly AwardActionKey[] = APPROVED_PILOT_ACTIONS;
