/**
 * AW360-WAVE-1-C1 Stage D7 — Pilot scope freeze + configuration.
 *
 * Freezes the four approved pilot handlers and codifies the operational
 * ownership + rollout parameters that govern the limited production pilot.
 * Deployment/certification MUST fail if any non-pilot handler becomes
 * executable, or if the four approved handlers are not all registered.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import { AWARD_PILOT_ACTIONS, AWARD_COMMAND_REGISTRY } from './awardPilotHandlers';

export const APPROVED_PILOT_ACTIONS: readonly AwardActionKey[] = [
  'SEND_LIFE_CERTIFICATE_REMINDER',
  'SCHEDULE_MEDICAL_REVIEW',
  'PROPOSE_SUSPENSION',
  'PROPOSE_RESUMPTION',
] as const;

export interface PilotScopeFreeze {
  readonly approvedActions: readonly AwardActionKey[];
  readonly approvedTenants: readonly string[];
  readonly approvedUsers: readonly string[];
  readonly operationalOwner: string;
  readonly technicalOwner: string;
  readonly incidentOwner: string;
  readonly killSwitchOwner: string;
  readonly pilotStartDate: string;      // ISO
  readonly pilotReviewDate: string;     // ISO
  readonly maxPilotVolume: number;      // max commands accepted during pilot
  readonly expansionCriteria: readonly string[];
  readonly suspensionCriteria: readonly string[];
  readonly signOffVersion: string;      // pinned manifest version at freeze
}

export const AWARD_PILOT_SCOPE_FREEZE: PilotScopeFreeze = {
  approvedActions: APPROVED_PILOT_ACTIONS,
  approvedTenants: ['tenant_a'],
  approvedUsers: [
    'usr_internal_tech',           // Phase 1 canary
    'usr_benefits_officer_a',      // Phase 2 approved business user
    'usr_benefits_supervisor_a',   // Phase 3 named cohort
  ],
  operationalOwner: 'ops-benefits-lead@ssb.local',
  technicalOwner: 'award360-tech-lead@ssb.local',
  incidentOwner: 'incident-commander@ssb.local',
  killSwitchOwner: 'operational-owner@ssb.local',
  pilotStartDate: '2026-07-18T00:00:00.000Z',
  pilotReviewDate: '2026-08-01T00:00:00.000Z',
  maxPilotVolume: 500,
  expansionCriteria: [
    'zero unresolved reconciliation discrepancies',
    'zero cross-tenant executions',
    'zero unauthorised mutations',
    'zero unresolved critical or high incidents',
    'all four actions have business acceptance evidence',
    'production idempotency concurrent-safety certification passing',
  ],
  suspensionCriteria: [
    'cross-tenant execution detected',
    'unauthorised mutation detected',
    'audit persistence failure without recovery',
    'reconciliation discrepancy without explanation',
    'kill-switch drill failure',
    'operational alert unreached by named recipients',
  ],
  signOffVersion: 'AW360-WAVE-1-C1-D7',
};

/** Verifies executable handler set matches the frozen approved list. */
export function assertPilotScopeFrozen(): void {
  const registered = new Set<string>(AWARD_COMMAND_REGISTRY.keys());
  const approved = new Set<string>(APPROVED_PILOT_ACTIONS);
  const unapproved = [...registered].filter((a) => !approved.has(a));
  const missing = [...approved].filter((a) => !registered.has(a));
  if (unapproved.length > 0) {
    throw new Error(`Pilot scope violation — unapproved executable handler(s): ${unapproved.join(', ')}`);
  }
  if (missing.length > 0) {
    throw new Error(`Pilot scope violation — approved handler(s) missing: ${missing.join(', ')}`);
  }
  if (AWARD_PILOT_ACTIONS.length !== APPROVED_PILOT_ACTIONS.length) {
    throw new Error(
      `Pilot scope violation — action-count drift: registered=${AWARD_PILOT_ACTIONS.length} approved=${APPROVED_PILOT_ACTIONS.length}`,
    );
  }
}
