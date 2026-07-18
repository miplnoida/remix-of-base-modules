/**
 * AW360-WAVE-1-C1 Stage D7 — Named-user canary rollout controller.
 *
 * Progresses the pilot cohort through four controlled phases:
 *   PHASE_1_INTERNAL_TECH   — a single internal technical user
 *   PHASE_2_ONE_BUSINESS    — one approved business user
 *   PHASE_3_NAMED_COHORT    — small named cohort of business users
 *   PHASE_4_FULL_PILOT      — complete approved pilot cohort
 *
 * Every expansion is recorded with approver, timestamps, previous cohort,
 * new cohort, evidence reviewed, unresolved incidents, and the rollback
 * condition that would trigger a reversal.
 */
import { AWARD_PILOT_SCOPE_FREEZE } from './awardPilotScopeFreeze';

export type PilotCanaryPhase =
  | 'PHASE_1_INTERNAL_TECH'
  | 'PHASE_2_ONE_BUSINESS'
  | 'PHASE_3_NAMED_COHORT'
  | 'PHASE_4_FULL_PILOT';

export const PILOT_CANARY_PHASE_ORDER: readonly PilotCanaryPhase[] = [
  'PHASE_1_INTERNAL_TECH',
  'PHASE_2_ONE_BUSINESS',
  'PHASE_3_NAMED_COHORT',
  'PHASE_4_FULL_PILOT',
] as const;

export const PILOT_CANARY_COHORTS: Record<PilotCanaryPhase, readonly string[]> = {
  PHASE_1_INTERNAL_TECH: ['usr_internal_tech'],
  PHASE_2_ONE_BUSINESS: ['usr_internal_tech', 'usr_benefits_officer_a'],
  PHASE_3_NAMED_COHORT: ['usr_internal_tech', 'usr_benefits_officer_a', 'usr_benefits_supervisor_a'],
  PHASE_4_FULL_PILOT: AWARD_PILOT_SCOPE_FREEZE.approvedUsers,
};

export interface PilotCohortExpansionRecord {
  readonly at: string;
  readonly approver: string;
  readonly previousPhase: PilotCanaryPhase | null;
  readonly newPhase: PilotCanaryPhase;
  readonly previousCohort: readonly string[];
  readonly newCohort: readonly string[];
  readonly evidenceReviewed: readonly string[];
  readonly unresolvedIncidents: readonly string[];
  readonly rollbackCondition: string;
}

export interface PilotCanaryRolloutController {
  currentPhase(): PilotCanaryPhase;
  currentCohort(): readonly string[];
  allows(userId: string): boolean;
  expandTo(next: PilotCanaryPhase, rec: Omit<PilotCohortExpansionRecord,
    'previousPhase' | 'previousCohort' | 'newPhase' | 'newCohort'>): PilotCohortExpansionRecord;
  history(): readonly PilotCohortExpansionRecord[];
}

export function createPilotCanaryController(opts: {
  readonly initialPhase?: PilotCanaryPhase;
  readonly now?: () => Date;
} = {}): PilotCanaryRolloutController {
  const now = opts.now ?? (() => new Date());
  let phase: PilotCanaryPhase = opts.initialPhase ?? 'PHASE_1_INTERNAL_TECH';
  const history: PilotCohortExpansionRecord[] = [];
  return {
    currentPhase: () => phase,
    currentCohort: () => PILOT_CANARY_COHORTS[phase],
    allows: (userId) => PILOT_CANARY_COHORTS[phase].includes(userId),
    expandTo: (next, rec) => {
      const prev = phase;
      const idxPrev = PILOT_CANARY_PHASE_ORDER.indexOf(prev);
      const idxNext = PILOT_CANARY_PHASE_ORDER.indexOf(next);
      if (idxNext <= idxPrev) {
        throw new Error(`Cohort expansion must move forward: ${prev} → ${next}`);
      }
      if (rec.unresolvedIncidents.length > 0) {
        throw new Error(
          `Cannot expand cohort with unresolved incidents: ${rec.unresolvedIncidents.join(', ')}`,
        );
      }
      const expansion: PilotCohortExpansionRecord = {
        ...rec,
        at: rec.at ?? now().toISOString(),
        previousPhase: prev,
        newPhase: next,
        previousCohort: PILOT_CANARY_COHORTS[prev],
        newCohort: PILOT_CANARY_COHORTS[next],
      };
      history.push(expansion);
      phase = next;
      return expansion;
    },
    history: () => history.slice(),
  };
}
