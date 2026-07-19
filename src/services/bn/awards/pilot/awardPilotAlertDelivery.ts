/**
 * AW360-WAVE-1-C1 Stage D9 — Proven alert delivery + acknowledgement.
 *
 * A code-side alert object does NOT satisfy the alerting gate. This module
 * captures observed delivery, correlation ID, runbook reference, severity,
 * assigned owner, acknowledgement time, suspension decision, and closure
 * evidence for controlled alert instances.
 */
export type AlertInstanceKind =
  | 'AUDIT_PERSISTENCE_FAILURE'
  | 'EXECUTION_OUTSIDE_COHORT'
  | 'CROSS_TENANT_MISMATCH'
  | 'RECONCILIATION_DISCREPANCY'
  | 'UNEXPECTED_COMMAND_EXCEPTION';

export type AlertSeverity = 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AlertDeliveryEvidence {
  readonly kind: AlertInstanceKind;
  readonly correlationId: string;
  readonly runbookReference: string;    // e.g. RB-AW360-05
  readonly severity: AlertSeverity;
  readonly deliveredTo: readonly string[];   // named recipients
  readonly deliveredAt: string;
  readonly acknowledgedBy: string | null;
  readonly acknowledgedAt: string | null;
  readonly assignedOwner: string;
  readonly suspensionDecision: 'NONE' | 'COHORT_SUSPENDED' | 'PILOT_SUSPENDED' | 'KILL_SWITCH_ACTIVATED';
  readonly closureEvidence: string | null;
  readonly closedAt: string | null;
}

export interface AlertDeliveryReport {
  readonly evidence: readonly AlertDeliveryEvidence[];
  readonly allImmediateDelivered: boolean;
  readonly allImmediateAcknowledged: boolean;
  readonly missingClosure: readonly string[];   // correlation IDs
  readonly passed: boolean;
}

export const REQUIRED_ALERT_INSTANCES: readonly AlertInstanceKind[] = [
  'AUDIT_PERSISTENCE_FAILURE',
  'EXECUTION_OUTSIDE_COHORT',
  'CROSS_TENANT_MISMATCH',
  'RECONCILIATION_DISCREPANCY',
  'UNEXPECTED_COMMAND_EXCEPTION',
];

export function evaluateAlertDelivery(evidence: readonly AlertDeliveryEvidence[]): AlertDeliveryReport {
  const covered = new Set(evidence.map((e) => e.kind));
  const missingKind = REQUIRED_ALERT_INSTANCES.filter((k) => !covered.has(k));
  const immediates = evidence.filter((e) => e.severity === 'IMMEDIATE');
  const allImmediateDelivered = immediates.every((e) => e.deliveredTo.length > 0 && !!e.deliveredAt);
  const allImmediateAcknowledged = immediates.every((e) => !!e.acknowledgedBy && !!e.acknowledgedAt);
  const missingClosure = evidence.filter((e) => !e.closedAt && e.severity === 'IMMEDIATE').map((e) => e.correlationId);
  const runbookMissing = evidence.filter((e) => !/^RB-/i.test(e.runbookReference));
  const passed =
    missingKind.length === 0
    && allImmediateDelivered
    && allImmediateAcknowledged
    && missingClosure.length === 0
    && runbookMissing.length === 0;
  return { evidence, allImmediateDelivered, allImmediateAcknowledged, missingClosure, passed };
}
