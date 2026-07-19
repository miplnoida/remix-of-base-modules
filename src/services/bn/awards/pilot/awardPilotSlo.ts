/**
 * AW360-WAVE-1-C1 Stage D8 — Production SLO definitions & evaluation.
 *
 * Thresholds are the promotion contract. Promotion evaluates ACTUAL
 * measurements against these; tests alone are NOT sufficient.
 */

export interface AwardPilotSloThresholds {
  readonly serviceAvailabilityPct: number;         // ≥
  readonly p50LatencyMs: number;                   // ≤
  readonly p95LatencyMs: number;                   // ≤
  readonly p99LatencyMs: number;                   // ≤
  readonly commandFailureRatePct: number;          // ≤
  readonly auditPersistenceSuccessPct: number;     // ≥
  readonly reconciliationCompletionMinutes: number; // ≤
  readonly alertDeliverySeconds: number;           // ≤
  readonly providerAckSeconds: number;             // ≤
  readonly incidentAckMinutes: number;             // ≤
  readonly incidentRecoveryHours: number;          // ≤
}

export const AWARD_PILOT_SLO_THRESHOLDS: AwardPilotSloThresholds = {
  serviceAvailabilityPct: 99.5,
  p50LatencyMs: 250,
  p95LatencyMs: 800,
  p99LatencyMs: 1_500,
  commandFailureRatePct: 1.0,
  auditPersistenceSuccessPct: 100,
  reconciliationCompletionMinutes: 15,
  alertDeliverySeconds: 60,
  providerAckSeconds: 10,
  incidentAckMinutes: 15,
  incidentRecoveryHours: 4,
};

export interface AwardPilotSloMeasurements {
  readonly serviceAvailabilityPct: number;
  readonly p50LatencyMs: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly commandFailureRatePct: number;
  readonly auditPersistenceSuccessPct: number;
  readonly reconciliationCompletionMinutes: number;
  readonly alertDeliverySeconds: number;
  readonly providerAckSeconds: number;
  readonly incidentAckMinutes: number;
  readonly incidentRecoveryHours: number;
  /** Universal invariants (hard true/false). */
  readonly everySuccessHasAudit: boolean;
  readonly everyCompletedCommandHasCorrelation: boolean;
  readonly acceptedDuplicateBusinessEffects: number;
  readonly crossTenantExecutions: number;
  readonly unauthorisedExecutions: number;
}

export type SloBreachCode =
  | 'AVAILABILITY_BELOW_TARGET'
  | 'P50_LATENCY_EXCEEDED'
  | 'P95_LATENCY_EXCEEDED'
  | 'P99_LATENCY_EXCEEDED'
  | 'COMMAND_FAILURE_RATE_EXCEEDED'
  | 'AUDIT_PERSISTENCE_BELOW_TARGET'
  | 'RECONCILIATION_TOO_SLOW'
  | 'ALERT_DELIVERY_TOO_SLOW'
  | 'PROVIDER_ACK_TOO_SLOW'
  | 'INCIDENT_ACK_TOO_SLOW'
  | 'INCIDENT_RECOVERY_TOO_SLOW'
  | 'MISSING_AUDIT_FOR_SUCCESS'
  | 'MISSING_CORRELATION_FOR_COMPLETION'
  | 'DUPLICATE_BUSINESS_EFFECT'
  | 'CROSS_TENANT_EXECUTION'
  | 'UNAUTHORISED_EXECUTION';

export interface SloEvaluation {
  readonly passed: boolean;
  readonly breaches: readonly SloBreachCode[];
}

export function evaluateSlo(
  m: AwardPilotSloMeasurements,
  t: AwardPilotSloThresholds = AWARD_PILOT_SLO_THRESHOLDS,
): SloEvaluation {
  const breaches: SloBreachCode[] = [];
  if (m.serviceAvailabilityPct < t.serviceAvailabilityPct) breaches.push('AVAILABILITY_BELOW_TARGET');
  if (m.p50LatencyMs > t.p50LatencyMs) breaches.push('P50_LATENCY_EXCEEDED');
  if (m.p95LatencyMs > t.p95LatencyMs) breaches.push('P95_LATENCY_EXCEEDED');
  if (m.p99LatencyMs > t.p99LatencyMs) breaches.push('P99_LATENCY_EXCEEDED');
  if (m.commandFailureRatePct > t.commandFailureRatePct) breaches.push('COMMAND_FAILURE_RATE_EXCEEDED');
  if (m.auditPersistenceSuccessPct < t.auditPersistenceSuccessPct) breaches.push('AUDIT_PERSISTENCE_BELOW_TARGET');
  if (m.reconciliationCompletionMinutes > t.reconciliationCompletionMinutes) breaches.push('RECONCILIATION_TOO_SLOW');
  if (m.alertDeliverySeconds > t.alertDeliverySeconds) breaches.push('ALERT_DELIVERY_TOO_SLOW');
  if (m.providerAckSeconds > t.providerAckSeconds) breaches.push('PROVIDER_ACK_TOO_SLOW');
  if (m.incidentAckMinutes > t.incidentAckMinutes) breaches.push('INCIDENT_ACK_TOO_SLOW');
  if (m.incidentRecoveryHours > t.incidentRecoveryHours) breaches.push('INCIDENT_RECOVERY_TOO_SLOW');
  if (!m.everySuccessHasAudit) breaches.push('MISSING_AUDIT_FOR_SUCCESS');
  if (!m.everyCompletedCommandHasCorrelation) breaches.push('MISSING_CORRELATION_FOR_COMPLETION');
  if (m.acceptedDuplicateBusinessEffects > 0) breaches.push('DUPLICATE_BUSINESS_EFFECT');
  if (m.crossTenantExecutions > 0) breaches.push('CROSS_TENANT_EXECUTION');
  if (m.unauthorisedExecutions > 0) breaches.push('UNAUTHORISED_EXECUTION');
  return { passed: breaches.length === 0, breaches };
}

export function percentiles(sortedLatenciesMs: readonly number[]): { p50: number; p95: number; p99: number } {
  if (sortedLatenciesMs.length === 0) return { p50: 0, p95: 0, p99: 0 };
  const at = (p: number) => {
    const idx = Math.min(sortedLatenciesMs.length - 1, Math.floor((p / 100) * sortedLatenciesMs.length));
    return sortedLatenciesMs[idx];
  };
  return { p50: at(50), p95: at(95), p99: at(99) };
}
