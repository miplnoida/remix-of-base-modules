/**
 * AW360-WAVE-1-C1 Stage D6 — Production-like pilot fixtures.
 *
 * Realistic, multi-tenant fixtures for exercising the pilot pipeline
 * under conditions that approximate production. Uses only the four
 * approved pilot actions. No globally privileged actors are used as
 * the only positive-path fixtures.
 */
import type { AwardActionInput, AwardActionKey } from '../awardActionAvailability';
import type { AwardCommandRequest } from './awardCommandContracts';
import { AWARD_PILOT_ACTIONS } from './awardPilotHandlers';

export type PilotTenantId = 'tenant_a' | 'tenant_b' | 'tenant_c_disabled';

export interface PilotTenantFixture {
  readonly tenantId: PilotTenantId;
  readonly cohortEnabled: boolean;
  readonly killSwitchEnabled: Record<AwardActionKey, boolean>;
  readonly displayName: string;
}

export interface PilotActorFixture {
  readonly userId: string;
  readonly effectiveRole: 'benefits_officer' | 'benefits_supervisor' | 'medical_officer' | 'read_only_auditor' | 'external';
  readonly cohortTags: readonly string[];
  readonly canProposeSuspension: boolean;
  readonly canServiceMedical: boolean;
  readonly canServiceLifeCert: boolean;
  readonly canServiceCommunications: boolean;
  readonly tenantId: PilotTenantId;
}

export interface PilotAwardFixture {
  readonly awardId: string;
  readonly tenantId: PilotTenantId;
  readonly awardStatus: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'PENDING';
  readonly version: number;
  readonly deceased: boolean;
  readonly eligibleFor: readonly AwardActionKey[];
  readonly rationale: string;
}

const allowAll = (): Record<AwardActionKey, boolean> =>
  AWARD_PILOT_ACTIONS.reduce((acc, a) => ({ ...acc, [a]: true }), {} as Record<AwardActionKey, boolean>);

const denyAll = (): Record<AwardActionKey, boolean> =>
  AWARD_PILOT_ACTIONS.reduce((acc, a) => ({ ...acc, [a]: false }), {} as Record<AwardActionKey, boolean>);

export const PILOT_TENANTS: readonly PilotTenantFixture[] = [
  { tenantId: 'tenant_a', cohortEnabled: true, killSwitchEnabled: allowAll(), displayName: 'Pilot A' },
  { tenantId: 'tenant_b', cohortEnabled: true, killSwitchEnabled: allowAll(), displayName: 'Pilot B' },
  { tenantId: 'tenant_c_disabled', cohortEnabled: false, killSwitchEnabled: denyAll(), displayName: 'Excluded' },
];

export const PILOT_ACTORS: readonly PilotActorFixture[] = [
  {
    userId: 'usr_benefits_officer_a',
    effectiveRole: 'benefits_officer',
    cohortTags: ['pilot_cohort_a'],
    canProposeSuspension: true,
    canServiceMedical: true,
    canServiceLifeCert: true,
    canServiceCommunications: true,
    tenantId: 'tenant_a',
  },
  {
    userId: 'usr_medical_officer_a',
    effectiveRole: 'medical_officer',
    cohortTags: ['pilot_cohort_a'],
    canProposeSuspension: false,
    canServiceMedical: true,
    canServiceLifeCert: false,
    canServiceCommunications: false,
    tenantId: 'tenant_a',
  },
  {
    userId: 'usr_supervisor_b',
    effectiveRole: 'benefits_supervisor',
    cohortTags: ['pilot_cohort_b'],
    canProposeSuspension: true,
    canServiceMedical: true,
    canServiceLifeCert: true,
    canServiceCommunications: true,
    tenantId: 'tenant_b',
  },
  {
    userId: 'usr_auditor_a',
    effectiveRole: 'read_only_auditor',
    cohortTags: [],
    canProposeSuspension: false,
    canServiceMedical: false,
    canServiceLifeCert: false,
    canServiceCommunications: false,
    tenantId: 'tenant_a',
  },
  {
    userId: 'usr_external',
    effectiveRole: 'external',
    cohortTags: [],
    canProposeSuspension: false,
    canServiceMedical: false,
    canServiceLifeCert: false,
    canServiceCommunications: false,
    tenantId: 'tenant_c_disabled',
  },
];

export const PILOT_AWARDS: readonly PilotAwardFixture[] = [
  {
    awardId: 'aw_active_a_1',
    tenantId: 'tenant_a',
    awardStatus: 'ACTIVE',
    version: 3,
    deceased: false,
    eligibleFor: ['SEND_LIFE_CERTIFICATE_REMINDER', 'SCHEDULE_MEDICAL_REVIEW', 'PROPOSE_SUSPENSION'],
    rationale: 'Active award, eligible for all reminders and proposals.',
  },
  {
    awardId: 'aw_suspended_a_1',
    tenantId: 'tenant_a',
    awardStatus: 'SUSPENDED',
    version: 7,
    deceased: false,
    eligibleFor: ['PROPOSE_RESUMPTION'],
    rationale: 'Suspended award, only eligible for resumption proposal.',
  },
  {
    awardId: 'aw_deceased_b_1',
    tenantId: 'tenant_b',
    awardStatus: 'ACTIVE',
    version: 12,
    deceased: true,
    eligibleFor: [],
    rationale: 'Deceased beneficiary — business-ineligible for pilot mutations.',
  },
  {
    awardId: 'aw_cancelled_a_1',
    tenantId: 'tenant_a',
    awardStatus: 'CANCELLED',
    version: 20,
    deceased: false,
    eligibleFor: [],
    rationale: 'Cancelled award — all mutations ineligible.',
  },
  {
    awardId: 'aw_pilot_b_1',
    tenantId: 'tenant_b',
    awardStatus: 'ACTIVE',
    version: 2,
    deceased: false,
    eligibleFor: ['SEND_LIFE_CERTIFICATE_REMINDER', 'SCHEDULE_MEDICAL_REVIEW'],
    rationale: 'Active tenant_b award.',
  },
  {
    awardId: 'aw_stale_a_1',
    tenantId: 'tenant_a',
    awardStatus: 'ACTIVE',
    version: 99,
    deceased: false,
    eligibleFor: ['SEND_LIFE_CERTIFICATE_REMINDER'],
    rationale: 'Award used for stale-version certification.',
  },
];

export const PILOT_DUPLICATE_IDEMPOTENCY_KEY = 'idem_pilot_replay';

export const validPayloadFor: Record<AwardActionKey, unknown> = {
  SEND_LIFE_CERTIFICATE_REMINDER: {
    lifeCertificateId: 'lc_fixture_1',
    channel: 'EMAIL' as const,
    reminderTemplateCode: 'LC_REMINDER_V1',
  },
  SCHEDULE_MEDICAL_REVIEW: {
    medicalReviewScheduleId: 'mrs_fixture_1',
    scheduledFor: '2026-09-15',
    panelCode: 'PANEL_A',
  },
  PROPOSE_SUSPENSION: {
    reasonCode: 'NON_COMPLIANCE',
    effectiveDate: '2026-10-01',
    evidenceRef: 'ev_1',
  },
  PROPOSE_RESUMPTION: {
    reasonCode: 'COMPLIANT_AGAIN',
    effectiveDate: '2026-10-15',
    evidenceRef: 'ev_2',
  },
} as any;

/**
 * Build a resolver input for the fixture triple. This mirrors what the
 * canonical resolver would produce for the actor / award combination.
 * We derive it here for fixture executability — the pipeline still
 * re-evaluates the guard against this input.
 */
export function fixtureResolverInput(
  action: AwardActionKey,
  actor: PilotActorFixture,
  award: PilotAwardFixture,
): AwardActionInput {
  const businessEligible = award.eligibleFor.includes(action);
  return {
    action,
    awardId: award.awardId,
    awardStatus: award.awardStatus,
    permissions: {
      canServiceLifeCert: actor.canServiceLifeCert,
      canServiceMedical: actor.canServiceMedical,
      canServiceCommunications: actor.canServiceCommunications,
      canServiceSuspension: actor.canProposeSuspension,
      canProposeSuspension: actor.canProposeSuspension,
      canApproveSuspension: false,
      isDeceased: award.deceased,
      businessEligible,
    } as any,
    featureEnabled: {
      lifeCert: true,
      medicalReview: true,
      awardSuspension: true,
    } as any,
    rolloutStates: {} as any,
    capabilities: {},
    rollout: {},
  };
}

export function fixtureCommandRequest(
  action: AwardActionKey,
  actor: PilotActorFixture,
  award: PilotAwardFixture,
  overrides: Partial<AwardCommandRequest> = {},
): AwardCommandRequest {
  return {
    commandId: overrides.commandId ?? `cmd_${action}_${award.awardId}_${Math.random().toString(36).slice(2, 8)}`,
    correlationId: overrides.correlationId ?? `corr_${award.awardId}`,
    idempotencyKey: overrides.idempotencyKey ?? `idem_${action}_${award.awardId}_${Math.random().toString(36).slice(2, 8)}`,
    tenantId: actor.tenantId,
    action,
    awardId: award.awardId,
    expectedVersion: overrides.expectedVersion ?? award.version,
    payload: overrides.payload ?? validPayloadFor[action],
    actor: overrides.actor ?? {
      userId: actor.userId,
      effectiveRole: actor.effectiveRole,
      cohortTags: actor.cohortTags,
    },
    resolverInput: overrides.resolverInput ?? fixtureResolverInput(action, actor, award),
  };
}

export function positivePathTriple(action: AwardActionKey): {
  actor: PilotActorFixture;
  award: PilotAwardFixture;
} {
  const award = PILOT_AWARDS.find(
    (a) => a.eligibleFor.includes(action) && a.tenantId !== 'tenant_c_disabled',
  );
  if (!award) throw new Error(`no positive-path award for ${action}`);
  const actor = PILOT_ACTORS.find((a) => {
    if (a.tenantId !== award.tenantId) return false;
    if (a.effectiveRole === 'read_only_auditor' || a.effectiveRole === 'external') return false;
    if (action === 'SEND_LIFE_CERTIFICATE_REMINDER') return a.canServiceLifeCert;
    if (action === 'SCHEDULE_MEDICAL_REVIEW') return a.canServiceMedical;
    if (action === 'PROPOSE_SUSPENSION' || action === 'PROPOSE_RESUMPTION') return a.canProposeSuspension;
    return false;
  });
  if (!actor) throw new Error(`no positive-path actor for ${action}`);
  return { actor, award };
}
