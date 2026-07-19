/**
 * AW360-WAVE-1-C1 Stage D9 — Real multi-instance idempotency certification.
 *
 * Certifies observed behaviour when two or more independent application
 * processes (or workers), each with their own database connection, race on
 * the same idempotency contract. Process-local locks are NOT the correctness
 * boundary — the database's UNIQUE (tenant_id, idempotency_key) constraint is.
 */
import type { AwardActionKey } from '../awardActionAvailability';

export type RuntimeMIScenarioId =
  | 'SIMULTANEOUS_IDENTICAL_DIFFERENT_INSTANCES'
  | 'ONE_ATOMIC_CLAIM_ONE_MUTATION_ONE_AUDIT'
  | 'STABLE_IN_FLIGHT_HANDLING'
  | 'STABLE_COMPLETED_REPLAY'
  | 'CONFLICTING_FINGERPRINT_REJECTED'
  | 'SAME_KEY_DIFFERENT_TENANTS_ACCEPTED'
  | 'ABANDONED_CLAIM_HANDLED'
  | 'RETRY_AFTER_CLIENT_RESPONSE_LOSS'
  | 'PROCESS_TERMINATION_AFTER_CLAIM'
  | 'PROCESS_TERMINATION_AFTER_COMMIT';

export interface RuntimeMIObservation {
  readonly scenario: RuntimeMIScenarioId;
  readonly action: AwardActionKey;
  readonly instances: number;                 // must be ≥ 2 for correctness proofs
  readonly separateDbConnections: boolean;
  readonly atomicClaimsGranted: number;       // must be exactly 1 for identical races
  readonly businessMutationsApplied: number;  // must be exactly 1 for identical races
  readonly auditEventsWritten: number;        // must be exactly 1 for identical races
  readonly duplicateBusinessEffects: number;  // must be 0
  readonly notes: string;
}

export interface RuntimeMIExpectation {
  readonly scenario: RuntimeMIScenarioId;
  readonly minInstances: number;
  readonly requireSeparateConnections: boolean;
  readonly atomicClaimsGranted?: number;
  readonly businessMutationsApplied?: number;
  readonly auditEventsWritten?: number;
  readonly duplicateBusinessEffectsMax: 0;
}

export const RUNTIME_MI_EXPECTATIONS: readonly RuntimeMIExpectation[] = [
  { scenario: 'SIMULTANEOUS_IDENTICAL_DIFFERENT_INSTANCES', minInstances: 2, requireSeparateConnections: true,
    atomicClaimsGranted: 1, businessMutationsApplied: 1, auditEventsWritten: 1, duplicateBusinessEffectsMax: 0 },
  { scenario: 'ONE_ATOMIC_CLAIM_ONE_MUTATION_ONE_AUDIT', minInstances: 2, requireSeparateConnections: true,
    atomicClaimsGranted: 1, businessMutationsApplied: 1, auditEventsWritten: 1, duplicateBusinessEffectsMax: 0 },
  { scenario: 'STABLE_IN_FLIGHT_HANDLING', minInstances: 2, requireSeparateConnections: true, duplicateBusinessEffectsMax: 0 },
  { scenario: 'STABLE_COMPLETED_REPLAY', minInstances: 2, requireSeparateConnections: true, duplicateBusinessEffectsMax: 0 },
  { scenario: 'CONFLICTING_FINGERPRINT_REJECTED', minInstances: 2, requireSeparateConnections: true, duplicateBusinessEffectsMax: 0 },
  { scenario: 'SAME_KEY_DIFFERENT_TENANTS_ACCEPTED', minInstances: 2, requireSeparateConnections: true, duplicateBusinessEffectsMax: 0 },
  { scenario: 'ABANDONED_CLAIM_HANDLED', minInstances: 2, requireSeparateConnections: true, duplicateBusinessEffectsMax: 0 },
  { scenario: 'RETRY_AFTER_CLIENT_RESPONSE_LOSS', minInstances: 2, requireSeparateConnections: true, duplicateBusinessEffectsMax: 0 },
  { scenario: 'PROCESS_TERMINATION_AFTER_CLAIM', minInstances: 2, requireSeparateConnections: true, duplicateBusinessEffectsMax: 0 },
  { scenario: 'PROCESS_TERMINATION_AFTER_COMMIT', minInstances: 2, requireSeparateConnections: true, duplicateBusinessEffectsMax: 0 },
];

export interface RuntimeMICertificationReport {
  readonly passed: boolean;
  readonly failures: readonly { scenario: RuntimeMIScenarioId; reason: string }[];
}

export function certifyRuntimeMultiInstance(
  observations: readonly RuntimeMIObservation[],
): RuntimeMICertificationReport {
  const failures: { scenario: RuntimeMIScenarioId; reason: string }[] = [];
  const byId = new Map(observations.map((o) => [o.scenario, o] as const));
  for (const exp of RUNTIME_MI_EXPECTATIONS) {
    const obs = byId.get(exp.scenario);
    if (!obs) { failures.push({ scenario: exp.scenario, reason: 'no runtime observation' }); continue; }
    if (obs.instances < exp.minInstances) failures.push({ scenario: exp.scenario, reason: `instances=${obs.instances} < ${exp.minInstances}` });
    if (exp.requireSeparateConnections && !obs.separateDbConnections) failures.push({ scenario: exp.scenario, reason: 'shared DB connection' });
    if (exp.atomicClaimsGranted !== undefined && obs.atomicClaimsGranted !== exp.atomicClaimsGranted)
      failures.push({ scenario: exp.scenario, reason: `atomicClaims=${obs.atomicClaimsGranted} expected ${exp.atomicClaimsGranted}` });
    if (exp.businessMutationsApplied !== undefined && obs.businessMutationsApplied !== exp.businessMutationsApplied)
      failures.push({ scenario: exp.scenario, reason: `mutations=${obs.businessMutationsApplied} expected ${exp.businessMutationsApplied}` });
    if (exp.auditEventsWritten !== undefined && obs.auditEventsWritten !== exp.auditEventsWritten)
      failures.push({ scenario: exp.scenario, reason: `audits=${obs.auditEventsWritten} expected ${exp.auditEventsWritten}` });
    if (obs.duplicateBusinessEffects > 0)
      failures.push({ scenario: exp.scenario, reason: `duplicate business effects=${obs.duplicateBusinessEffects}` });
  }
  return { passed: failures.length === 0, failures };
}
