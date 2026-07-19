/**
 * AW360-WAVE-1-C1 Stage D9 — Runtime attestation record.
 *
 * The CODE manifest (award360LoaderManifest.ts) stays at
 * WAVE_1_PRODUCTION_READY / AW360-WAVE-1-C1-D8. Runtime attestation is a
 * SEPARATE lifecycle that reflects live operational state observed against
 * the deployed system. Runtime status MUST NOT be flipped merely because
 * automated tests pass — it advances only when real operational evidence
 * is captured and reviewed.
 */

export type Award360RuntimeAttestationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUSPENDED'
  | 'FAILED'
  | 'PASSED';

export interface Award360RuntimeAttestationRecord {
  readonly status: Award360RuntimeAttestationStatus;
  readonly version: string;                 // D9 tag
  readonly codeManifestStatus: string;      // must equal AWARD360_MANIFEST_STATUS
  readonly codeManifestVersion: string;     // must equal AWARD360_MANIFEST_VERSION
  readonly openedAt: string | null;
  readonly closedAt: string | null;
  readonly reason: string | null;
  readonly lastUpdatedAt: string;
}

export const AWARD360_RUNTIME_ATTESTATION_VERSION = 'AW360-WAVE-1-C1-D9';

/**
 * Default runtime record at code-ship time. NOT_STARTED remains the correct
 * value until an approved evidence window opens against a deployed
 * environment with verified migrations and cohorts.
 */
export const AWARD360_RUNTIME_ATTESTATION: Award360RuntimeAttestationRecord = {
  status: 'NOT_STARTED',
  version: AWARD360_RUNTIME_ATTESTATION_VERSION,
  codeManifestStatus: 'WAVE_1_PRODUCTION_READY',
  codeManifestVersion: 'AW360-WAVE-1-C1-D8',
  openedAt: null,
  closedAt: null,
  reason: 'Runtime evidence window has not yet been opened.',
  lastUpdatedAt: '2026-07-19T00:00:00.000Z',
};

export interface RuntimeAttestationTransitionInput {
  readonly current: Award360RuntimeAttestationRecord;
  readonly to: Award360RuntimeAttestationStatus;
  readonly at: string;
  readonly reason: string;
}

const ALLOWED: Record<Award360RuntimeAttestationStatus, readonly Award360RuntimeAttestationStatus[]> = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['SUSPENDED', 'FAILED', 'PASSED'],
  SUSPENDED:   ['IN_PROGRESS', 'FAILED'],
  FAILED:      ['IN_PROGRESS'],
  PASSED:      [],
};

/** Transitions the record. Throws on illegal transitions or missing reason. */
export function transitionRuntimeAttestation(
  input: RuntimeAttestationTransitionInput,
): Award360RuntimeAttestationRecord {
  const { current, to, at, reason } = input;
  if (!ALLOWED[current.status].includes(to)) {
    throw new Error(`Illegal runtime-attestation transition ${current.status} → ${to}`);
  }
  if (!reason || reason.trim().length < 6) {
    throw new Error('Runtime-attestation transition requires a non-trivial reason.');
  }
  return {
    ...current,
    status: to,
    openedAt: current.openedAt ?? (to === 'IN_PROGRESS' ? at : null),
    closedAt: to === 'PASSED' || to === 'FAILED' ? at : current.closedAt,
    reason,
    lastUpdatedAt: at,
  };
}
