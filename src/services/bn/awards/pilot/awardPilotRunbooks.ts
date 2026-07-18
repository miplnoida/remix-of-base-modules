/**
 * AW360-WAVE-1-C1 Stage D6 — Operational runbooks.
 *
 * Structured runbooks driving both the diagnostics panel display and
 * the runbook-completeness certification test.
 */

export interface PilotRunbook {
  readonly id: string;
  readonly title: string;
  readonly requiredRole: string;
  readonly steps: readonly string[];
  readonly expectedAuditEvidence: string;
  readonly escalationPath: string;
}

export const PILOT_RUNBOOKS: readonly PilotRunbook[] = [
  {
    id: 'RB-01',
    title: 'Activate the pilot',
    requiredRole: 'platform_operator',
    steps: [
      'Confirm manifest status is PILOT_OPERATIONALLY_VALIDATED',
      'Set kill-switch flag ON for chosen action in chosen cohort',
      'Verify positive smoke test via observability dashboard',
    ],
    expectedAuditEvidence: 'Kill-switch state change telemetry event',
    escalationPath: 'Head of Platform Operations',
  },
  {
    id: 'RB-02',
    title: 'Disable the pilot (kill switch)',
    requiredRole: 'platform_operator',
    steps: [
      'Flip kill-switch OFF for target action',
      'Confirm subsequent commands return KILL_SWITCH_OFF',
      'Notify business owners with correlation ID',
    ],
    expectedAuditEvidence: 'KILL_SWITCH_OFF telemetry events',
    escalationPath: 'Incident commander',
  },
  {
    id: 'RB-03',
    title: 'Investigate a correlation ID',
    requiredRole: 'sre',
    steps: [
      'Look up correlation ID in telemetry sink',
      'Match COMMAND_ATTEMPT, GUARD_DECISION, and completion event',
      'Retrieve audit record and reconciliation status',
    ],
    expectedAuditEvidence: 'Correlated telemetry and audit trail',
    escalationPath: 'Award 360 tech lead',
  },
  {
    id: 'RB-04',
    title: 'Handle a version conflict',
    requiredRole: 'benefits_officer',
    steps: [
      'Reload Award 360 shell to refresh expected version',
      'Re-submit command with new expectedVersion',
      'Verify audit shows single execution',
    ],
    expectedAuditEvidence: 'One AwardAuditEvidence row with newVersion = priorVersion + 1',
    escalationPath: 'Supervisor',
  },
  {
    id: 'RB-05',
    title: 'Handle duplicate submissions',
    requiredRole: 'benefits_officer',
    steps: [
      'Confirm DUPLICATE_COMMAND outcome returned',
      'Verify only one audit row exists for the idempotency key',
    ],
    expectedAuditEvidence: 'Single audit record for the shared idempotency key',
    escalationPath: 'Supervisor',
  },
  {
    id: 'RB-06',
    title: 'Reconcile a missing audit event',
    requiredRole: 'sre',
    steps: [
      'Query reconciliation service for MUTATION_WITHOUT_AUDIT',
      'Open incident; do NOT retro-write audit rows',
      'Coordinate compensating action if business state mutated',
    ],
    expectedAuditEvidence: 'Incident record + compensation audit row',
    escalationPath: 'Compliance officer',
  },
  {
    id: 'RB-07',
    title: 'Handle communication provider failure',
    requiredRole: 'comm_hub_ops',
    steps: [
      'Confirm provider outage from Comm Hub dashboard',
      'Do NOT retry via direct provider access',
      'Queue drains automatically once provider is healthy',
    ],
    expectedAuditEvidence: 'Provider ack telemetry with resumed status',
    escalationPath: 'Comm Hub duty officer',
  },
  {
    id: 'RB-08',
    title: 'Withdraw a proposal (suspension or resumption)',
    requiredRole: 'benefits_supervisor',
    steps: [
      'Open proposal in Award 360',
      'Invoke Withdraw compensating action (audit-preserving)',
      'Verify proposal marked WITHDRAWN, original audit preserved',
    ],
    expectedAuditEvidence: 'Original proposal audit + compensation audit',
    escalationPath: 'Head of Benefits',
  },
  {
    id: 'RB-09',
    title: 'Cancel or reschedule a medical review',
    requiredRole: 'medical_officer',
    steps: [
      'Open the schedule record',
      'Invoke Cancel or Reschedule compensating action',
      'Confirm business state and audit updated',
    ],
    expectedAuditEvidence: 'Schedule + compensation audit rows',
    escalationPath: 'Medical panel chair',
  },
  {
    id: 'RB-10',
    title: 'Escalate security or tenant-isolation concern',
    requiredRole: 'security_officer',
    steps: [
      'Disable pilot kill-switch for affected action',
      'Capture correlation IDs and reconciliation report',
      'Escalate to security incident channel',
    ],
    expectedAuditEvidence: 'Security incident ticket + reconciliation snapshot',
    escalationPath: 'CISO on-call',
  },
  {
    id: 'RB-11',
    title: 'Roll back a deployment',
    requiredRole: 'release_manager',
    steps: [
      'Confirm which manifest version is deployed',
      'Roll back to previous manifest version',
      'Verify in-flight commands drained or replayed via idempotency store',
    ],
    expectedAuditEvidence: 'Deployment log + telemetry showing manifestVersion change',
    escalationPath: 'Release commander',
  },
];
