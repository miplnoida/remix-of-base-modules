/**
 * AW360-WAVE-1-C1 Stage D8 — Formal security certification.
 *
 * Enumerates security controls that MUST be reviewed and tested before
 * production expansion. Unresolved CRITICAL or HIGH findings block
 * promotion.
 */

export type SecurityControlId =
  | 'SERVER_DERIVED_ACTOR_AUTHORITY'
  | 'TENANT_ISOLATION'
  | 'OBJECT_LEVEL_AUTHORIZATION'
  | 'PAYLOAD_VALIDATION'
  | 'REPLAY_RESISTANCE'
  | 'IDEMPOTENCY_KEY_HANDLING'
  | 'DIAGNOSTIC_AUTHORIZATION'
  | 'SENSITIVE_DATA_LOGGING'
  | 'AUDIT_IMMUTABILITY'
  | 'COMPENSATION_PERMISSIONS'
  | 'ALERT_EXPOSURE'
  | 'RUNBOOK_PERMISSIONS'
  | 'RATE_LIMIT_BYPASS';

export type SecurityFindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';

export interface SecurityFinding {
  readonly id: string;
  readonly control: SecurityControlId;
  readonly severity: SecurityFindingSeverity;
  readonly resolved: boolean;
  readonly summary: string;
}

export interface SecurityCertificationInput {
  readonly reviewedAt: string;
  readonly reviewer: string;
  readonly findings: readonly SecurityFinding[];
  readonly controlsExercised: readonly SecurityControlId[];
}

export const SECURITY_REQUIRED_CONTROLS: readonly SecurityControlId[] = [
  'SERVER_DERIVED_ACTOR_AUTHORITY',
  'TENANT_ISOLATION',
  'OBJECT_LEVEL_AUTHORIZATION',
  'PAYLOAD_VALIDATION',
  'REPLAY_RESISTANCE',
  'IDEMPOTENCY_KEY_HANDLING',
  'DIAGNOSTIC_AUTHORIZATION',
  'SENSITIVE_DATA_LOGGING',
  'AUDIT_IMMUTABILITY',
  'COMPENSATION_PERMISSIONS',
  'ALERT_EXPOSURE',
  'RUNBOOK_PERMISSIONS',
  'RATE_LIMIT_BYPASS',
];

export interface SecurityCertificationResult {
  readonly passed: boolean;
  readonly missingControls: readonly SecurityControlId[];
  readonly openBlockingFindings: readonly string[];
}

export function certifySecurity(input: SecurityCertificationInput): SecurityCertificationResult {
  const missing = SECURITY_REQUIRED_CONTROLS.filter((c) => !input.controlsExercised.includes(c));
  const blocking = input.findings
    .filter((f) => !f.resolved && (f.severity === 'CRITICAL' || f.severity === 'HIGH'))
    .map((f) => f.id);
  return {
    passed: missing.length === 0 && blocking.length === 0,
    missingControls: missing,
    openBlockingFindings: blocking,
  };
}
