/**
 * AW360-WAVE-1-C1 Stage D9 — Operational drills.
 *
 * Controlled exercises that must be executed and evidenced during the
 * runtime evidence window.
 */
export type OperationalDrillId =
  | 'KILL_SWITCH_ACTIVATION'
  | 'COHORT_REMOVAL_AFTER_UI_LOAD'
  | 'SIMULTANEOUS_DUPLICATE_SUBMISSION'
  | 'STALE_VERSION_CONFLICT'
  | 'PROVIDER_TIMEOUT'
  | 'PROCESS_TERMINATION'
  | 'RESPONSE_LOSS_AFTER_COMMIT'
  | 'DEPLOYMENT_ROLLBACK'
  | 'RECONCILIATION_DISCREPANCY'
  | 'CORRELATION_ID_INVESTIGATION'
  | 'PROPOSAL_WITHDRAWAL'
  | 'MEDICAL_REVIEW_CANCELLATION_OR_RESCHEDULE';

export interface OperationalDrillRecord {
  readonly id: OperationalDrillId;
  readonly date: string;
  readonly owner: string;
  readonly runbookReference: string;
  readonly outcome: 'PASS' | 'PARTIAL' | 'FAIL';
  readonly evidence: readonly string[];
  readonly followUp: string | null;
}

export const REQUIRED_OPERATIONAL_DRILLS: readonly OperationalDrillId[] = [
  'KILL_SWITCH_ACTIVATION',
  'COHORT_REMOVAL_AFTER_UI_LOAD',
  'SIMULTANEOUS_DUPLICATE_SUBMISSION',
  'STALE_VERSION_CONFLICT',
  'PROVIDER_TIMEOUT',
  'PROCESS_TERMINATION',
  'RESPONSE_LOSS_AFTER_COMMIT',
  'DEPLOYMENT_ROLLBACK',
  'RECONCILIATION_DISCREPANCY',
  'CORRELATION_ID_INVESTIGATION',
  'PROPOSAL_WITHDRAWAL',
  'MEDICAL_REVIEW_CANCELLATION_OR_RESCHEDULE',
];

export interface OperationalDrillReport {
  readonly passed: boolean;
  readonly missing: readonly OperationalDrillId[];
  readonly failed: readonly OperationalDrillId[];
  readonly partial: readonly OperationalDrillId[];
}

export function evaluateOperationalDrills(records: readonly OperationalDrillRecord[]): OperationalDrillReport {
  const byId = new Map(records.map((r) => [r.id, r] as const));
  const missing = REQUIRED_OPERATIONAL_DRILLS.filter((id) => !byId.has(id));
  const failed = REQUIRED_OPERATIONAL_DRILLS.filter((id) => byId.get(id)?.outcome === 'FAIL');
  const partial = REQUIRED_OPERATIONAL_DRILLS.filter((id) => byId.get(id)?.outcome === 'PARTIAL');
  return {
    passed: missing.length === 0 && failed.length === 0 && partial.length === 0,
    missing, failed, partial,
  };
}
