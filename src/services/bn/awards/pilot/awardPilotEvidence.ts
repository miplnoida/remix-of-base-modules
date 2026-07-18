/**
 * AW360-WAVE-1-C1 Stage D7 — Live pilot evidence records.
 *
 * Structured evidence captured for every pilot command that reaches the
 * pipeline. Non-payload — no PII, no secrets, no full request bodies. The
 * record captures decisions and identifiers so a correlation ID can drive
 * a complete forensic reconstruction.
 */
import type { AwardActionKey } from '../awardActionAvailability';
import type {
  AwardCommandOutcomeCode,
  AwardCommandRequest,
  AwardCommandResult,
} from './awardCommandContracts';

export type PilotReconciliationStatus = 'PENDING' | 'CLEAN' | 'DISCREPANCY';

export interface PilotEvidenceRecord {
  readonly action: AwardActionKey;
  readonly commandId: string;
  readonly correlationId: string;
  readonly tenantId: string;
  readonly awardId: string;
  readonly actorUserId: string;
  readonly effectiveRole: string;
  readonly resolverDecision: 'ALLOWED' | 'DENIED' | 'HIDDEN';
  readonly guardDecision: 'ALLOWED' | 'DENIED';
  readonly guardReasonCode: string;
  readonly killSwitchState: 'ON' | 'OFF';
  readonly cohortDecision: 'INCLUDED' | 'EXCLUDED';
  readonly payloadValid: boolean;
  readonly expectedVersion: number;
  readonly resultingVersion: number | null;
  readonly idempotencyResult: 'CLAIMED' | 'REPLAYED' | 'CONFLICT' | 'NOT_ATTEMPTED';
  readonly commandOutcome: AwardCommandOutcomeCode;
  readonly auditReference: string | null;
  readonly telemetryCompleted: boolean;
  readonly externalAckReceived: boolean | null; // null = N/A for this action
  readonly reconciliationStatus: PilotReconciliationStatus;
  readonly userVisibleResult: string;
  readonly compensationStatus: 'NONE' | 'PROPOSED' | 'APPLIED';
  readonly appVersion: string;
  readonly manifestVersion: string;
  readonly capturedAt: string;
}

export interface PilotEvidenceStore {
  record(evidence: PilotEvidenceRecord): void;
  list(filter?: Partial<Pick<PilotEvidenceRecord, 'action' | 'tenantId' | 'commandOutcome'>>): readonly PilotEvidenceRecord[];
  byCorrelationId(correlationId: string): readonly PilotEvidenceRecord[];
}

export function createInMemoryPilotEvidenceStore(): PilotEvidenceStore {
  const rows: PilotEvidenceRecord[] = [];
  return {
    record: (e) => {
      rows.push(e);
    },
    list: (filter) => {
      if (!filter) return rows.slice();
      return rows.filter((r) =>
        (filter.action === undefined || r.action === filter.action) &&
        (filter.tenantId === undefined || r.tenantId === filter.tenantId) &&
        (filter.commandOutcome === undefined || r.commandOutcome === filter.commandOutcome),
      );
    },
    byCorrelationId: (id) => rows.filter((r) => r.correlationId === id),
  };
}

export interface BuildEvidenceInput {
  readonly request: AwardCommandRequest;
  readonly result: AwardCommandResult;
  readonly appVersion: string;
  readonly manifestVersion: string;
  readonly killSwitchOn: boolean;
  readonly cohortIncluded: boolean;
  readonly idempotencyResult: PilotEvidenceRecord['idempotencyResult'];
  readonly auditReference: string | null;
  readonly telemetryCompleted: boolean;
  readonly externalAckReceived: boolean | null;
  readonly reconciliationStatus?: PilotReconciliationStatus;
  readonly userVisibleResult: string;
  readonly compensationStatus?: PilotEvidenceRecord['compensationStatus'];
  readonly capturedAt?: string;
}

export function buildPilotEvidence(input: BuildEvidenceInput): PilotEvidenceRecord {
  const { request, result } = input;
  const resolverDecision: PilotEvidenceRecord['resolverDecision'] =
    result.guard?.allowed ? 'ALLOWED' : result.guard?.reasonCode === 'HIDDEN_BY_RESOLVER' ? 'HIDDEN' : 'DENIED';
  return {
    action: request.action,
    commandId: request.commandId,
    correlationId: request.correlationId,
    tenantId: request.tenantId,
    awardId: request.awardId,
    actorUserId: request.actor.userId,
    effectiveRole: request.actor.effectiveRole,
    resolverDecision,
    guardDecision: result.guard?.allowed ? 'ALLOWED' : 'DENIED',
    guardReasonCode: result.guard?.reasonCode ?? 'N/A',
    killSwitchState: input.killSwitchOn ? 'ON' : 'OFF',
    cohortDecision: input.cohortIncluded ? 'INCLUDED' : 'EXCLUDED',
    payloadValid: result.outcome !== 'INVALID_PAYLOAD',
    expectedVersion: request.expectedVersion,
    resultingVersion: result.newVersion ?? null,
    idempotencyResult: input.idempotencyResult,
    commandOutcome: result.outcome,
    auditReference: input.auditReference,
    telemetryCompleted: input.telemetryCompleted,
    externalAckReceived: input.externalAckReceived,
    reconciliationStatus: input.reconciliationStatus ?? 'PENDING',
    userVisibleResult: input.userVisibleResult,
    compensationStatus: input.compensationStatus ?? 'NONE',
    appVersion: input.appVersion,
    manifestVersion: input.manifestVersion,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
  };
}

/** Evidence record required fields for governance completeness. */
export const REQUIRED_PILOT_EVIDENCE_FIELDS = [
  'action', 'commandId', 'correlationId', 'tenantId', 'awardId', 'actorUserId',
  'effectiveRole', 'resolverDecision', 'guardDecision', 'guardReasonCode',
  'killSwitchState', 'cohortDecision', 'payloadValid', 'expectedVersion',
  'resultingVersion', 'idempotencyResult', 'commandOutcome', 'auditReference',
  'telemetryCompleted', 'externalAckReceived', 'reconciliationStatus',
  'userVisibleResult', 'compensationStatus', 'appVersion', 'manifestVersion',
  'capturedAt',
] as const;
