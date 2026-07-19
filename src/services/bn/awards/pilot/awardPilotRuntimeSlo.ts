/**
 * AW360-WAVE-1-C1 Stage D9 — Runtime SLO measurements.
 *
 * Evaluates SLO thresholds against real runtime measurements captured
 * during the evidence window. Hard invariants (zero cross-tenant, zero
 * unauthorised, zero duplicate business effects, full traceability) must
 * hold in addition to the numeric thresholds.
 */
export interface RuntimeSloMeasurements {
  readonly availabilityPct: number;
  readonly p50LatencyMs: number;
  readonly p95LatencyMs: number;
  readonly p99LatencyMs: number;
  readonly commandFailureRatePct: number;
  readonly auditPersistencePct: number;
  readonly reconciliationCompletionMinutes: number;
  readonly alertDeliverySeconds: number;
  readonly providerAckSeconds: number;
  readonly incidentAckMinutes: number;
  readonly recoveryTimeMinutes: number;
  readonly duplicateBusinessEffects: number;
  readonly crossTenantExecutions: number;
  readonly unauthorisedExecutions: number;
  readonly missingCorrelationIds: number;
  readonly missingAuditRefs: number;
}

export interface RuntimeSloThresholds {
  readonly minAvailabilityPct: number;
  readonly maxP50LatencyMs: number;
  readonly maxP95LatencyMs: number;
  readonly maxP99LatencyMs: number;
  readonly maxFailureRatePct: number;
  readonly minAuditPersistencePct: number;
  readonly maxReconciliationCompletionMinutes: number;
  readonly maxAlertDeliverySeconds: number;
  readonly maxProviderAckSeconds: number;
  readonly maxIncidentAckMinutes: number;
  readonly maxRecoveryTimeMinutes: number;
}

export const RUNTIME_SLO_DEFAULTS: RuntimeSloThresholds = {
  minAvailabilityPct: 99.5,
  maxP50LatencyMs: 250,
  maxP95LatencyMs: 800,
  maxP99LatencyMs: 1500,
  maxFailureRatePct: 1,
  minAuditPersistencePct: 100,
  maxReconciliationCompletionMinutes: 30,
  maxAlertDeliverySeconds: 60,
  maxProviderAckSeconds: 120,
  maxIncidentAckMinutes: 15,
  maxRecoveryTimeMinutes: 60,
};

export interface RuntimeSloReport {
  readonly passed: boolean;
  readonly numericFailures: readonly string[];
  readonly invariantFailures: readonly string[];
}

export function evaluateRuntimeSlo(
  m: RuntimeSloMeasurements,
  t: RuntimeSloThresholds = RUNTIME_SLO_DEFAULTS,
): RuntimeSloReport {
  const numeric: string[] = [];
  if (m.availabilityPct < t.minAvailabilityPct) numeric.push(`availability ${m.availabilityPct}% < ${t.minAvailabilityPct}%`);
  if (m.p50LatencyMs > t.maxP50LatencyMs) numeric.push(`p50 ${m.p50LatencyMs}ms > ${t.maxP50LatencyMs}ms`);
  if (m.p95LatencyMs > t.maxP95LatencyMs) numeric.push(`p95 ${m.p95LatencyMs}ms > ${t.maxP95LatencyMs}ms`);
  if (m.p99LatencyMs > t.maxP99LatencyMs) numeric.push(`p99 ${m.p99LatencyMs}ms > ${t.maxP99LatencyMs}ms`);
  if (m.commandFailureRatePct > t.maxFailureRatePct) numeric.push(`failure ${m.commandFailureRatePct}% > ${t.maxFailureRatePct}%`);
  if (m.auditPersistencePct < t.minAuditPersistencePct) numeric.push(`audit persistence ${m.auditPersistencePct}% < ${t.minAuditPersistencePct}%`);
  if (m.reconciliationCompletionMinutes > t.maxReconciliationCompletionMinutes) numeric.push(`reconciliation ${m.reconciliationCompletionMinutes}m > ${t.maxReconciliationCompletionMinutes}m`);
  if (m.alertDeliverySeconds > t.maxAlertDeliverySeconds) numeric.push(`alert delivery ${m.alertDeliverySeconds}s > ${t.maxAlertDeliverySeconds}s`);
  if (m.providerAckSeconds > t.maxProviderAckSeconds) numeric.push(`provider ack ${m.providerAckSeconds}s > ${t.maxProviderAckSeconds}s`);
  if (m.incidentAckMinutes > t.maxIncidentAckMinutes) numeric.push(`incident ack ${m.incidentAckMinutes}m > ${t.maxIncidentAckMinutes}m`);
  if (m.recoveryTimeMinutes > t.maxRecoveryTimeMinutes) numeric.push(`recovery ${m.recoveryTimeMinutes}m > ${t.maxRecoveryTimeMinutes}m`);

  const invariants: string[] = [];
  if (m.duplicateBusinessEffects !== 0) invariants.push(`duplicate business effects=${m.duplicateBusinessEffects}`);
  if (m.crossTenantExecutions !== 0) invariants.push(`cross-tenant executions=${m.crossTenantExecutions}`);
  if (m.unauthorisedExecutions !== 0) invariants.push(`unauthorised executions=${m.unauthorisedExecutions}`);
  if (m.missingCorrelationIds !== 0) invariants.push(`missing correlation IDs=${m.missingCorrelationIds}`);
  if (m.missingAuditRefs !== 0) invariants.push(`missing audit refs=${m.missingAuditRefs}`);

  return {
    passed: numeric.length === 0 && invariants.length === 0,
    numericFailures: numeric,
    invariantFailures: invariants,
  };
}
