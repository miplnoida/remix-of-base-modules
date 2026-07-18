/**
 * AW360-WAVE-1-C1 Stage D6 — Pilot certification coverage matrix.
 *
 * Canonical enumeration of scenarios that each pilot action must be
 * certified against. The matrix is used by the coverage-matrix test to
 * prove every action × scenario cell has an executable assertion.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import { AWARD_PILOT_ACTIONS } from './awardPilotHandlers';

export type PilotCoverageScenario =
  | 'ALLOWED_EXECUTION'
  | 'REGISTRATION_DENIAL'
  | 'MODULE_DENIAL'
  | 'ROUTE_DENIAL'
  | 'FEATURE_FLAG_DENIAL'
  | 'PERMISSION_DENIAL'
  | 'BUSINESS_INELIGIBILITY_DENIAL'
  | 'MUTATION_DARK_LAUNCH_DENIAL'
  | 'UNAVAILABLE_COMMAND_DENIAL'
  | 'KILL_SWITCH_DENIAL'
  | 'COHORT_DENIAL'
  | 'INVALID_PAYLOAD'
  | 'STALE_VERSION'
  | 'DUPLICATE_REQUEST'
  | 'CONFLICTING_IDEMPOTENCY_KEY_REUSE'
  | 'TRANSACTION_FAILURE'
  | 'AUDIT_PERSISTENCE_FAILURE'
  | 'TELEMETRY_GENERATION'
  | 'TENANT_ISOLATION'
  | 'ROLLBACK_OR_COMPENSATION';

export const PILOT_COVERAGE_SCENARIOS: readonly PilotCoverageScenario[] = [
  'ALLOWED_EXECUTION',
  'REGISTRATION_DENIAL',
  'MODULE_DENIAL',
  'ROUTE_DENIAL',
  'FEATURE_FLAG_DENIAL',
  'PERMISSION_DENIAL',
  'BUSINESS_INELIGIBILITY_DENIAL',
  'MUTATION_DARK_LAUNCH_DENIAL',
  'UNAVAILABLE_COMMAND_DENIAL',
  'KILL_SWITCH_DENIAL',
  'COHORT_DENIAL',
  'INVALID_PAYLOAD',
  'STALE_VERSION',
  'DUPLICATE_REQUEST',
  'CONFLICTING_IDEMPOTENCY_KEY_REUSE',
  'TRANSACTION_FAILURE',
  'AUDIT_PERSISTENCE_FAILURE',
  'TELEMETRY_GENERATION',
  'TENANT_ISOLATION',
  'ROLLBACK_OR_COMPENSATION',
];

export type PilotCoverageMatrix = Readonly<
  Record<AwardActionKey, Readonly<Record<PilotCoverageScenario, boolean>>>
>;

/**
 * The scenarios that Stage D6 certifies for every pilot action. Cells
 * flip to true when an executable test asserts the behaviour. The
 * matrix is enforced by `pilotCoverageMatrix.test.ts` to reject drift.
 */
export function buildEmptyCoverageMatrix(): Record<
  AwardActionKey,
  Record<PilotCoverageScenario, boolean>
> {
  const m = {} as Record<AwardActionKey, Record<PilotCoverageScenario, boolean>>;
  for (const a of AWARD_PILOT_ACTIONS) {
    m[a] = {} as Record<PilotCoverageScenario, boolean>;
    for (const s of PILOT_COVERAGE_SCENARIOS) m[a][s] = false;
  }
  return m;
}

export interface CoverageMatrixSummary {
  actions: number;
  scenarios: number;
  covered: number;
  missing: readonly { action: AwardActionKey; scenario: PilotCoverageScenario }[];
  isComplete: boolean;
}

export function summariseCoverageMatrix(
  matrix: Record<AwardActionKey, Record<PilotCoverageScenario, boolean>>,
): CoverageMatrixSummary {
  const missing: { action: AwardActionKey; scenario: PilotCoverageScenario }[] = [];
  let covered = 0;
  for (const a of AWARD_PILOT_ACTIONS) {
    for (const s of PILOT_COVERAGE_SCENARIOS) {
      if (matrix[a][s]) covered++;
      else missing.push({ action: a, scenario: s });
    }
  }
  return {
    actions: AWARD_PILOT_ACTIONS.length,
    scenarios: PILOT_COVERAGE_SCENARIOS.length,
    covered,
    missing,
    isComplete: missing.length === 0,
  };
}
