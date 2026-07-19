/**
 * AW360-WAVE-1-C1 Stage D8 — Production evidence window contract.
 *
 * Explicit requirements gate promotion; promotion is blocked until the
 * window is complete for a given action.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import { APPROVED_PILOT_ACTIONS } from './awardPilotScopeFreeze';

export interface AwardPilotEvidenceWindow {
  readonly startDate: string;                 // ISO
  readonly endDate: string;                   // ISO
  readonly minCalendarHours: number;
  readonly minSuccessfulCommandsPerAction: number;
  readonly minAuthorisedBusinessUsers: number;
  readonly minProductionDeploymentCycles: number;
  readonly requiredReconciliationCadenceHours: number;
  readonly requiresKillSwitchDrill: boolean;
  readonly requiresProviderDegradationDrill: boolean;
  readonly maxUnresolvedIncidents: number;
  readonly businessReviewCadenceDays: number;
}

export const AWARD_PILOT_EVIDENCE_WINDOW: AwardPilotEvidenceWindow = {
  startDate: '2026-07-19T00:00:00.000Z',
  endDate: '2026-08-02T00:00:00.000Z',
  minCalendarHours: 14 * 24,
  minSuccessfulCommandsPerAction: 25,
  minAuthorisedBusinessUsers: 3,
  minProductionDeploymentCycles: 2,
  requiredReconciliationCadenceHours: 24,
  requiresKillSwitchDrill: true,
  requiresProviderDegradationDrill: true,
  maxUnresolvedIncidents: 0,
  businessReviewCadenceDays: 7,
};

export interface EvidenceWindowStatus {
  readonly complete: boolean;
  readonly elapsedHours: number;
  readonly requiredHours: number;
  readonly killSwitchDrillDone: boolean;
  readonly providerDegradationDrillDone: boolean;
  readonly deploymentCycles: number;
  readonly authorisedBusinessUsers: number;
  readonly missing: readonly string[];
}

export interface EvidenceWindowInputs {
  readonly now: Date;
  readonly killSwitchDrillDone: boolean;
  readonly providerDegradationDrillDone: boolean;
  readonly deploymentCycles: number;
  readonly authorisedBusinessUsers: number;
  readonly window?: AwardPilotEvidenceWindow;
}

export function evaluateEvidenceWindow(input: EvidenceWindowInputs): EvidenceWindowStatus {
  const w = input.window ?? AWARD_PILOT_EVIDENCE_WINDOW;
  const start = new Date(w.startDate).getTime();
  const elapsedHours = Math.max(0, (input.now.getTime() - start) / (1000 * 60 * 60));
  const missing: string[] = [];
  if (elapsedHours < w.minCalendarHours) missing.push('MIN_CALENDAR_HOURS');
  if (!input.killSwitchDrillDone && w.requiresKillSwitchDrill) missing.push('KILL_SWITCH_DRILL');
  if (!input.providerDegradationDrillDone && w.requiresProviderDegradationDrill) missing.push('PROVIDER_DEGRADATION_DRILL');
  if (input.deploymentCycles < w.minProductionDeploymentCycles) missing.push('MIN_DEPLOYMENT_CYCLES');
  if (input.authorisedBusinessUsers < w.minAuthorisedBusinessUsers) missing.push('MIN_AUTHORISED_BUSINESS_USERS');
  return {
    complete: missing.length === 0,
    elapsedHours,
    requiredHours: w.minCalendarHours,
    killSwitchDrillDone: input.killSwitchDrillDone,
    providerDegradationDrillDone: input.providerDegradationDrillDone,
    deploymentCycles: input.deploymentCycles,
    authorisedBusinessUsers: input.authorisedBusinessUsers,
    missing,
  };
}

export const AWARD_PILOT_EVIDENCE_WINDOW_ACTIONS: readonly AwardActionKey[] = APPROVED_PILOT_ACTIONS;
