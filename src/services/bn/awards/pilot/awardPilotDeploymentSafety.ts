/**
 * AW360-WAVE-1-C1 Stage D6 — Deployment / migration safety contract.
 *
 * Static invariants describing what must hold across deployments so
 * that:
 *   - old + new app versions can co-exist safely;
 *   - configuration defaults remain fail-closed;
 *   - non-pilot handlers cannot become executable via config drift.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import { AWARD_PILOT_ACTIONS } from './awardPilotHandlers';

export interface DeploymentSafetyContract {
  readonly killSwitchDefault: 'OFF';
  readonly cohortDefault: 'CLOSED';
  readonly pilotActions: readonly AwardActionKey[];
  readonly darkLaunchNonPilots: true;
  readonly manifestBackCompatibleWith: readonly string[];
  readonly inFlightRequestPolicy: 'COMPLETE_OR_IDEMPOTENT_REPLAY';
  readonly migrationRollbackPlan: readonly string[];
}

export const AWARD_PILOT_DEPLOYMENT_SAFETY: DeploymentSafetyContract = {
  killSwitchDefault: 'OFF',
  cohortDefault: 'CLOSED',
  pilotActions: AWARD_PILOT_ACTIONS,
  darkLaunchNonPilots: true,
  manifestBackCompatibleWith: ['AW360-WAVE-1-C1-D5'],
  inFlightRequestPolicy: 'COMPLETE_OR_IDEMPOTENT_REPLAY',
  migrationRollbackPlan: [
    'Freeze new command intake via kill-switch OFF',
    'Drain executor queue',
    'Roll application container back to previous manifest version',
    'Verify idempotency store rejects replays with different payloads',
    'Re-enable kill-switch per approved cohort',
  ],
};
