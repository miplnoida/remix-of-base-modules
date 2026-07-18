/**
 * AW360-WAVE-1-C1 Stage D7 — Promotion gate evaluation.
 *
 * Aggregates the evidence needed to decide whether the pilot may be
 * promoted from PILOT_OPERATIONALLY_VALIDATED to
 * LIMITED_PRODUCTION_PILOT_VALIDATED. Every gate is a hard requirement;
 * automated tests alone are NOT sufficient.
 */
import type { PilotEvidenceRecord } from './awardPilotEvidence';
import type { PilotReconciliationRunRecord } from './awardPilotReconciliationSchedule';
import type { PilotIncidentRegister } from './awardPilotIncidents';

export type PromotionGateId =
  | 'ZERO_CROSS_TENANT_EXECUTIONS'
  | 'ZERO_UNAUTHORISED_EXECUTIONS'
  | 'ZERO_MUTATION_WITHOUT_AUDIT'
  | 'ZERO_UNEXPLAINED_RECONCILIATION_DISCREPANCIES'
  | 'ZERO_DUPLICATE_BUSINESS_EFFECTS'
  | 'ZERO_LOST_UPDATES'
  | 'FULL_CORRELATION_TRACEABILITY'
  | 'ALL_IMMEDIATE_ALERTS_REVIEWED'
  | 'NO_UNRESOLVED_CRITICAL_OR_HIGH_INCIDENT'
  | 'BUSINESS_ACCEPTANCE_ALL_FOUR_ACTIONS'
  | 'PRODUCTION_IDEMPOTENCY_CERTIFICATION'
  | 'PILOT_EVIDENCE_WINDOW_COMPLETE'
  | 'TECHNICAL_AND_BUSINESS_SIGN_OFF';

export interface PromotionGateStatus {
  readonly id: PromotionGateId;
  readonly passed: boolean;
  readonly detail: string;
}

export interface PromotionGateInputs {
  readonly evidence: readonly PilotEvidenceRecord[];
  readonly reconciliations: readonly PilotReconciliationRunRecord[];
  readonly incidentRegister: PilotIncidentRegister;
  readonly immediateAlertsReviewed: boolean;
  readonly businessAcceptance: {
    readonly SEND_LIFE_CERTIFICATE_REMINDER: boolean;
    readonly SCHEDULE_MEDICAL_REVIEW: boolean;
    readonly PROPOSE_SUSPENSION: boolean;
    readonly PROPOSE_RESUMPTION: boolean;
  };
  readonly productionIdempotencyCertified: boolean;
  readonly evidenceWindowCompleteHours: number;
  readonly requiredEvidenceWindowHours: number;
  readonly technicalSignOff: { readonly signedBy: string; readonly at: string } | null;
  readonly businessSignOff: { readonly signedBy: string; readonly at: string } | null;
}

export interface PromotionGateReport {
  readonly gates: readonly PromotionGateStatus[];
  readonly allPassed: boolean;
  readonly failed: readonly PromotionGateId[];
}

export function evaluatePromotionGates(input: PromotionGateInputs): PromotionGateReport {
  const evidence = input.evidence;
  const crossTenant = evidence.filter((e) => e.correlationNotes?.includes('CROSS_TENANT')).length;
  const unauthorised = evidence.filter(
    (e) => e.guardDecision !== 'ALLOWED' && e.commandOutcome === 'EXECUTED',
  ).length;
  const mutationsWithoutAudit = evidence.filter(
    (e) => e.commandOutcome === 'EXECUTED' && !e.auditReference,
  ).length;
  const missingCorrelation = evidence.filter((e) => !e.correlationId).length;
  const unresolvedRecons = input.reconciliations.filter((r) => r.finalStatus === 'UNRESOLVED').length;
  const duplicateEffects = evidence.filter(
    (e) => e.idempotencyResult === 'CONFLICT' && e.commandOutcome === 'EXECUTED',
  ).length;
  const staleVersionExecutions = evidence.filter(
    (e) => e.commandOutcome === 'VERSION_CONFLICT' && e.userVisibleResult === 'APPLIED',
  ).length;
  const openHighOrCritical = input.incidentRegister.hasOpenAtSeverityOrAbove('HIGH');
  const businessAccepted =
    input.businessAcceptance.SEND_LIFE_CERTIFICATE_REMINDER &&
    input.businessAcceptance.SCHEDULE_MEDICAL_REVIEW &&
    input.businessAcceptance.PROPOSE_SUSPENSION &&
    input.businessAcceptance.PROPOSE_RESUMPTION;
  const windowComplete = input.evidenceWindowCompleteHours >= input.requiredEvidenceWindowHours;
  const signOff = Boolean(input.technicalSignOff && input.businessSignOff);

  const gates: PromotionGateStatus[] = [
    { id: 'ZERO_CROSS_TENANT_EXECUTIONS', passed: crossTenant === 0,
      detail: `${crossTenant} cross-tenant executions detected` },
    { id: 'ZERO_UNAUTHORISED_EXECUTIONS', passed: unauthorised === 0,
      detail: `${unauthorised} unauthorised executions detected` },
    { id: 'ZERO_MUTATION_WITHOUT_AUDIT', passed: mutationsWithoutAudit === 0,
      detail: `${mutationsWithoutAudit} mutations lacked audit references` },
    { id: 'ZERO_UNEXPLAINED_RECONCILIATION_DISCREPANCIES', passed: unresolvedRecons === 0,
      detail: `${unresolvedRecons} reconciliation runs UNRESOLVED` },
    { id: 'ZERO_DUPLICATE_BUSINESS_EFFECTS', passed: duplicateEffects === 0,
      detail: `${duplicateEffects} duplicate business effects observed` },
    { id: 'ZERO_LOST_UPDATES', passed: staleVersionExecutions === 0,
      detail: `${staleVersionExecutions} stale-version writes applied` },
    { id: 'FULL_CORRELATION_TRACEABILITY', passed: missingCorrelation === 0,
      detail: `${missingCorrelation} evidence records missing correlation ID` },
    { id: 'ALL_IMMEDIATE_ALERTS_REVIEWED', passed: input.immediateAlertsReviewed,
      detail: input.immediateAlertsReviewed ? 'all reviewed' : 'immediate alerts not all reviewed' },
    { id: 'NO_UNRESOLVED_CRITICAL_OR_HIGH_INCIDENT', passed: !openHighOrCritical,
      detail: openHighOrCritical ? 'HIGH/CRITICAL incident still open' : 'clear' },
    { id: 'BUSINESS_ACCEPTANCE_ALL_FOUR_ACTIONS', passed: businessAccepted,
      detail: businessAccepted ? 'all four accepted' : 'missing business acceptance' },
    { id: 'PRODUCTION_IDEMPOTENCY_CERTIFICATION', passed: input.productionIdempotencyCertified,
      detail: input.productionIdempotencyCertified ? 'certified' : 'not certified' },
    { id: 'PILOT_EVIDENCE_WINDOW_COMPLETE', passed: windowComplete,
      detail: `${input.evidenceWindowCompleteHours}h/${input.requiredEvidenceWindowHours}h` },
    { id: 'TECHNICAL_AND_BUSINESS_SIGN_OFF', passed: signOff,
      detail: signOff ? 'both signed off' : 'sign-off missing' },
  ];

  const failed = gates.filter((g) => !g.passed).map((g) => g.id);
  return { gates, allPassed: failed.length === 0, failed };
}
