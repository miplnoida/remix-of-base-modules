/**
 * AW360-WAVE-1-C1 Stage D9 — Independent per-action attestation decisions.
 *
 * Each of the four approved actions receives its own decision. Aggregate
 * totals cannot approve any single action; every attestation must include
 * the required sign-offs, rationale, and rollback condition.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import { APPROVED_PILOT_ACTIONS } from './awardPilotScopeFreeze';

export type ActionAttestationDecision =
  | 'APPROVED_FOR_TENANT'
  | 'EXPAND_COHORT'
  | 'REMAIN_PILOT'
  | 'REQUIRES_REMEDIATION'
  | 'SUSPENDED';

export interface ActionAttestationSignOff {
  readonly business: { readonly signedBy: string; readonly at: string } | null;
  readonly technical: { readonly signedBy: string; readonly at: string } | null;
  readonly operational: { readonly signedBy: string; readonly at: string } | null;
  readonly security: { readonly signedBy: string; readonly at: string } | null;
}

export interface ActionAttestation {
  readonly action: AwardActionKey;
  readonly decision: ActionAttestationDecision;
  readonly evidencePeriod: { readonly from: string; readonly to: string };
  readonly productionVolume: number;
  readonly businessOutcomes: string;
  readonly sloPassed: boolean;
  readonly reconciliationClean: boolean;
  readonly incidentsClean: boolean;
  readonly securityClean: boolean;
  readonly compensationClean: boolean;
  readonly signOff: ActionAttestationSignOff;
  readonly rationale: string;
  readonly rollbackCondition: string;
  readonly attestedAt: string;
}

export interface ActionAttestationValidation {
  readonly action: AwardActionKey;
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateActionAttestation(a: ActionAttestation): ActionAttestationValidation {
  const errors: string[] = [];
  if (!APPROVED_PILOT_ACTIONS.includes(a.action)) errors.push('action not in approved pilot list');
  if (!a.rationale || a.rationale.trim().length < 12) errors.push('rationale required');
  if (!a.rollbackCondition || a.rollbackCondition.trim().length < 6) errors.push('rollback condition required');
  if (!a.signOff.business || !a.signOff.technical || !a.signOff.operational || !a.signOff.security) {
    errors.push('all four sign-offs required');
  }
  if (a.decision === 'APPROVED_FOR_TENANT') {
    if (!a.sloPassed) errors.push('APPROVED_FOR_TENANT requires SLO pass');
    if (!a.reconciliationClean) errors.push('APPROVED_FOR_TENANT requires clean reconciliation');
    if (!a.incidentsClean) errors.push('APPROVED_FOR_TENANT requires clean incidents');
    if (!a.securityClean) errors.push('APPROVED_FOR_TENANT requires clean security');
    if (a.productionVolume <= 0) errors.push('APPROVED_FOR_TENANT requires evidenced production volume');
  }
  return { action: a.action, valid: errors.length === 0, errors };
}

export interface AllActionAttestationReport {
  readonly perAction: Readonly<Record<AwardActionKey, ActionAttestationValidation>>;
  readonly allApproved: boolean;
  readonly anyBlocking: boolean;
}

export function reconcileAllActionAttestations(
  attestations: readonly ActionAttestation[],
): AllActionAttestationReport {
  const perAction: Record<string, ActionAttestationValidation> = {};
  for (const action of APPROVED_PILOT_ACTIONS) {
    const found = attestations.find((a) => a.action === action);
    if (!found) {
      perAction[action] = { action, valid: false, errors: ['attestation missing'] };
    } else {
      perAction[action] = validateActionAttestation(found);
    }
  }
  const allApproved = attestations.length === APPROVED_PILOT_ACTIONS.length
    && attestations.every((a) => a.decision === 'APPROVED_FOR_TENANT'
      && validateActionAttestation(a).valid);
  const anyBlocking = attestations.some((a) => a.decision === 'REQUIRES_REMEDIATION' || a.decision === 'SUSPENDED');
  return {
    perAction: perAction as Record<AwardActionKey, ActionAttestationValidation>,
    allApproved,
    anyBlocking,
  };
}
