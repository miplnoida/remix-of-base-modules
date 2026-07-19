/**
 * AW360-WAVE-1-C1 Stage D9 — Runtime evidence contract.
 *
 * Defines the exact non-sensitive fields captured for every live pilot
 * command. Payload bodies, PII, and secrets are NOT recorded; only
 * identifiers and decision outcomes needed for forensic reconstruction.
 * Extends the D7 evidence model with deployment identity for D9.
 */
import type { PilotEvidenceRecord } from './awardPilotEvidence';

export type LiveEvidenceCompleteness = 'COMPLETE' | 'INCOMPLETE';

export interface LiveEvidenceRecord extends PilotEvidenceRecord {
  readonly deploymentId: string;
  readonly commitSha: string;
  readonly runtimeManifestVersion: string;
}

export const LIVE_EVIDENCE_REQUIRED_FIELDS = [
  'action', 'commandId', 'correlationId', 'tenantId', 'awardId', 'actorUserId',
  'effectiveRole', 'resolverDecision', 'guardDecision', 'killSwitchState',
  'cohortDecision', 'payloadValid', 'expectedVersion', 'resultingVersion',
  'idempotencyResult', 'commandOutcome', 'auditReference', 'telemetryCompleted',
  'externalAckReceived', 'reconciliationStatus', 'userVisibleResult',
  'compensationStatus', 'appVersion', 'manifestVersion', 'capturedAt',
  'deploymentId', 'commitSha', 'runtimeManifestVersion',
] as const;

const FORBIDDEN_KEY_PATTERNS = [/password/i, /secret/i, /ssn/i, /dob/i, /token/i, /pin\b/i, /cvv/i, /^payload$/i, /^body$/i];

export function assertNoSensitiveFields(rec: Record<string, unknown>): void {
  for (const key of Object.keys(rec)) {
    for (const p of FORBIDDEN_KEY_PATTERNS) {
      if (p.test(key)) throw new Error(`Live evidence must not contain sensitive field: ${key}`);
    }
  }
}

export function evaluateLiveEvidenceCompleteness(rec: LiveEvidenceRecord): LiveEvidenceCompleteness {
  for (const f of LIVE_EVIDENCE_REQUIRED_FIELDS) {
    if ((rec as unknown as Record<string, unknown>)[f] === undefined) return 'INCOMPLETE';
  }
  if (!rec.correlationId || !rec.commandId || !rec.deploymentId || !rec.commitSha) return 'INCOMPLETE';
  return 'COMPLETE';
}
