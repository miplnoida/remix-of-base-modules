/**
 * AW360-WAVE-1-C1 Stage D6 — Business UAT catalog.
 *
 * Formal UAT scenarios for every approved pilot action. Each entry is
 * structured so it can drive both the executable UAT certification test
 * and printed sign-off documentation.
 */
import type { AwardActionKey } from '../awardActionAvailability';

export interface PilotUATScenario {
  readonly id: string;
  readonly action: AwardActionKey;
  readonly title: string;
  readonly preconditions: readonly string[];
  readonly actingRole: string;
  readonly tenant: string;
  readonly awardState: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'PENDING';
  readonly canonicalAction: AwardActionKey;
  readonly expectedUiPresentation: string;
  readonly expectedResolverResult: 'ALLOWED' | 'DENIED';
  readonly expectedGuardResult: 'ALLOWED' | 'DENIED';
  readonly expectedMutation: string;
  readonly expectedAuditEvent: string;
  readonly expectedTelemetry: readonly string[];
  readonly expectedUserVisibleResult: string;
  readonly expectedCompensationRoute: string;
  readonly remainsProposalOnly: boolean;
}

export const PILOT_UAT_CATALOG: readonly PilotUATScenario[] = [
  {
    id: 'UAT-SLCR-001',
    action: 'SEND_LIFE_CERTIFICATE_REMINDER',
    title: 'Officer sends life-cert reminder to an eligible pensioner',
    preconditions: [
      'Life-cert due within threshold',
      'Beneficiary alive',
      'Comm-hub configured with LC_REMINDER_V1 template',
    ],
    actingRole: 'benefits_officer',
    tenant: 'tenant_a',
    awardState: 'ACTIVE',
    canonicalAction: 'SEND_LIFE_CERTIFICATE_REMINDER',
    expectedUiPresentation: 'Reminder button enabled with confirmation dialog',
    expectedResolverResult: 'ALLOWED',
    expectedGuardResult: 'ALLOWED',
    expectedMutation: 'Reminder queued via Comm Hub façade; no direct provider write',
    expectedAuditEvent: 'AWARD_LIFE_CERT_REMINDER_SENT',
    expectedTelemetry: ['COMMAND_ATTEMPT', 'GUARD_DECISION', 'COMMAND_EXECUTED'],
    expectedUserVisibleResult: 'Toast: reminder queued; correlation ID surfaced for support',
    expectedCompensationRoute: 'Record retract-reminder note (delivery cannot be un-sent)',
    remainsProposalOnly: false,
  },
  {
    id: 'UAT-SLCR-002',
    action: 'SEND_LIFE_CERTIFICATE_REMINDER',
    title: 'Deceased beneficiary — reminder must be blocked',
    preconditions: ['Beneficiary flagged deceased'],
    actingRole: 'benefits_officer',
    tenant: 'tenant_a',
    awardState: 'ACTIVE',
    canonicalAction: 'SEND_LIFE_CERTIFICATE_REMINDER',
    expectedUiPresentation: 'Reminder button disabled with reason tooltip',
    expectedResolverResult: 'DENIED',
    expectedGuardResult: 'DENIED',
    expectedMutation: 'None',
    expectedAuditEvent: 'None (denial recorded in telemetry only)',
    expectedTelemetry: ['COMMAND_ATTEMPT', 'GUARD_DECISION', 'COMMAND_DENIED'],
    expectedUserVisibleResult: 'Denial reason surfaced without mutation attempt',
    expectedCompensationRoute: 'N/A',
    remainsProposalOnly: false,
  },
  {
    id: 'UAT-SMR-001',
    action: 'SCHEDULE_MEDICAL_REVIEW',
    title: 'Medical officer schedules a review for an active award',
    preconditions: ['Award active', 'Panel available for tenant'],
    actingRole: 'medical_officer',
    tenant: 'tenant_a',
    awardState: 'ACTIVE',
    canonicalAction: 'SCHEDULE_MEDICAL_REVIEW',
    expectedUiPresentation: 'Schedule form with panel + date picker',
    expectedResolverResult: 'ALLOWED',
    expectedGuardResult: 'ALLOWED',
    expectedMutation: 'Row inserted in medical-review schedule via injected executor',
    expectedAuditEvent: 'AWARD_MEDICAL_REVIEW_SCHEDULED',
    expectedTelemetry: ['COMMAND_ATTEMPT', 'GUARD_DECISION', 'COMMAND_EXECUTED'],
    expectedUserVisibleResult: 'Schedule confirmed; version bumped',
    expectedCompensationRoute: 'Cancel or reschedule via compensating action',
    remainsProposalOnly: false,
  },
  {
    id: 'UAT-SMR-002',
    action: 'SCHEDULE_MEDICAL_REVIEW',
    title: 'Cancelled award — cannot schedule',
    preconditions: ['Award cancelled'],
    actingRole: 'medical_officer',
    tenant: 'tenant_a',
    awardState: 'CANCELLED',
    canonicalAction: 'SCHEDULE_MEDICAL_REVIEW',
    expectedUiPresentation: 'Schedule button disabled',
    expectedResolverResult: 'DENIED',
    expectedGuardResult: 'DENIED',
    expectedMutation: 'None',
    expectedAuditEvent: 'None',
    expectedTelemetry: ['COMMAND_ATTEMPT', 'GUARD_DECISION', 'COMMAND_DENIED'],
    expectedUserVisibleResult: 'Denial reason surfaced',
    expectedCompensationRoute: 'N/A',
    remainsProposalOnly: false,
  },
  {
    id: 'UAT-PS-001',
    action: 'PROPOSE_SUSPENSION',
    title: 'Supervisor proposes suspension for non-compliance',
    preconditions: ['Award active', 'Evidence attached'],
    actingRole: 'benefits_supervisor',
    tenant: 'tenant_a',
    awardState: 'ACTIVE',
    canonicalAction: 'PROPOSE_SUSPENSION',
    expectedUiPresentation: 'Propose form with reason and effective date',
    expectedResolverResult: 'ALLOWED',
    expectedGuardResult: 'ALLOWED',
    expectedMutation: 'Suspension proposal row created; award status UNCHANGED',
    expectedAuditEvent: 'AWARD_SUSPENSION_PROPOSED',
    expectedTelemetry: ['COMMAND_ATTEMPT', 'GUARD_DECISION', 'COMMAND_EXECUTED'],
    expectedUserVisibleResult: 'Proposal recorded — awaiting approval',
    expectedCompensationRoute: 'Withdraw proposal (audit-preserving)',
    remainsProposalOnly: true,
  },
  {
    id: 'UAT-PS-002',
    action: 'PROPOSE_SUSPENSION',
    title: 'Auditor cannot propose suspension',
    preconditions: ['Role: read-only auditor'],
    actingRole: 'read_only_auditor',
    tenant: 'tenant_a',
    awardState: 'ACTIVE',
    canonicalAction: 'PROPOSE_SUSPENSION',
    expectedUiPresentation: 'Propose button not visible',
    expectedResolverResult: 'DENIED',
    expectedGuardResult: 'DENIED',
    expectedMutation: 'None',
    expectedAuditEvent: 'None',
    expectedTelemetry: ['COMMAND_ATTEMPT', 'GUARD_DECISION', 'COMMAND_DENIED'],
    expectedUserVisibleResult: 'No mutation possible',
    expectedCompensationRoute: 'N/A',
    remainsProposalOnly: true,
  },
  {
    id: 'UAT-PR-001',
    action: 'PROPOSE_RESUMPTION',
    title: 'Supervisor proposes resumption of a suspended award',
    preconditions: ['Award suspended', 'Evidence of compliance attached'],
    actingRole: 'benefits_supervisor',
    tenant: 'tenant_a',
    awardState: 'SUSPENDED',
    canonicalAction: 'PROPOSE_RESUMPTION',
    expectedUiPresentation: 'Propose resumption form',
    expectedResolverResult: 'ALLOWED',
    expectedGuardResult: 'ALLOWED',
    expectedMutation: 'Resumption proposal row created; award status UNCHANGED',
    expectedAuditEvent: 'AWARD_RESUMPTION_PROPOSED',
    expectedTelemetry: ['COMMAND_ATTEMPT', 'GUARD_DECISION', 'COMMAND_EXECUTED'],
    expectedUserVisibleResult: 'Proposal recorded — awaiting approval',
    expectedCompensationRoute: 'Withdraw proposal (audit-preserving)',
    remainsProposalOnly: true,
  },
  {
    id: 'UAT-PR-002',
    action: 'PROPOSE_RESUMPTION',
    title: 'Active award — resumption proposal denied',
    preconditions: ['Award already active'],
    actingRole: 'benefits_supervisor',
    tenant: 'tenant_a',
    awardState: 'ACTIVE',
    canonicalAction: 'PROPOSE_RESUMPTION',
    expectedUiPresentation: 'Resumption button hidden',
    expectedResolverResult: 'DENIED',
    expectedGuardResult: 'DENIED',
    expectedMutation: 'None',
    expectedAuditEvent: 'None',
    expectedTelemetry: ['COMMAND_ATTEMPT', 'GUARD_DECISION', 'COMMAND_DENIED'],
    expectedUserVisibleResult: 'Denial reason surfaced',
    expectedCompensationRoute: 'N/A',
    remainsProposalOnly: true,
  },
];

export interface UATCoverageSummary {
  readonly totalScenarios: number;
  readonly actionsCovered: readonly AwardActionKey[];
  readonly proposalsRemainProposals: boolean;
}

export function summariseUATCoverage(): UATCoverageSummary {
  const set = new Set<AwardActionKey>();
  for (const s of PILOT_UAT_CATALOG) set.add(s.action);
  const proposalScenarios = PILOT_UAT_CATALOG.filter(
    (s) => s.action === 'PROPOSE_SUSPENSION' || s.action === 'PROPOSE_RESUMPTION',
  );
  return {
    totalScenarios: PILOT_UAT_CATALOG.length,
    actionsCovered: [...set],
    proposalsRemainProposals: proposalScenarios.every((s) => s.remainsProposalOnly),
  };
}
