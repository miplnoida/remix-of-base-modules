/**
 * AW360-WAVE-1-C1 Stage D9 — Runtime security review.
 *
 * Enumerates the security controls that must be reviewed against the
 * deployed implementation. Any unresolved CRITICAL or HIGH finding blocks
 * promotion.
 */
export type RuntimeSecurityControlId =
  | 'TRUSTED_ACTOR_DERIVATION'
  | 'TENANT_ISOLATION'
  | 'OBJECT_LEVEL_AUTHORIZATION'
  | 'PAYLOAD_VALIDATION'
  | 'REPLAY_RESISTANCE'
  | 'SERVICE_SIDE_DB_ACCESS'
  | 'SENSITIVE_DATA_LOGGING'
  | 'DIAGNOSTIC_ACCESS'
  | 'AUDIT_IMMUTABILITY'
  | 'COMPENSATION_PERMISSIONS'
  | 'ALERT_EXPOSURE'
  | 'RATE_LIMIT_BYPASS'
  | 'RUNBOOK_AUTHORIZATION';

export const RUNTIME_SECURITY_CONTROLS: readonly RuntimeSecurityControlId[] = [
  'TRUSTED_ACTOR_DERIVATION', 'TENANT_ISOLATION', 'OBJECT_LEVEL_AUTHORIZATION',
  'PAYLOAD_VALIDATION', 'REPLAY_RESISTANCE', 'SERVICE_SIDE_DB_ACCESS',
  'SENSITIVE_DATA_LOGGING', 'DIAGNOSTIC_ACCESS', 'AUDIT_IMMUTABILITY',
  'COMPENSATION_PERMISSIONS', 'ALERT_EXPOSURE', 'RATE_LIMIT_BYPASS', 'RUNBOOK_AUTHORIZATION',
];

export type RuntimeSecuritySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface RuntimeSecurityFinding {
  readonly control: RuntimeSecurityControlId;
  readonly severity: RuntimeSecuritySeverity;
  readonly detail: string;
  readonly resolved: boolean;
  readonly resolvedBy: string | null;
  readonly resolvedAt: string | null;
}

export interface RuntimeSecurityReviewInput {
  readonly reviewer: string;
  readonly reviewedAt: string;
  readonly findings: readonly RuntimeSecurityFinding[];
  readonly controlsReviewed: readonly RuntimeSecurityControlId[];
}

export interface RuntimeSecurityReport {
  readonly passed: boolean;
  readonly missingControls: readonly RuntimeSecurityControlId[];
  readonly unresolvedBlocking: readonly RuntimeSecurityFinding[];
}

export function evaluateRuntimeSecurityReview(input: RuntimeSecurityReviewInput): RuntimeSecurityReport {
  const reviewed = new Set(input.controlsReviewed);
  const missing = RUNTIME_SECURITY_CONTROLS.filter((c) => !reviewed.has(c));
  const blocking = input.findings.filter(
    (f) => !f.resolved && (f.severity === 'CRITICAL' || f.severity === 'HIGH'),
  );
  return {
    passed: missing.length === 0 && blocking.length === 0,
    missingControls: missing,
    unresolvedBlocking: blocking,
  };
}
