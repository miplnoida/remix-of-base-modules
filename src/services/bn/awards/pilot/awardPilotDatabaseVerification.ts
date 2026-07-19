/**
 * AW360-WAVE-1-C1 Stage D9 — Live database + tenant-policy verification.
 *
 * Verifies the deployed migration is present with the expected constraints,
 * indexes, RLS, policies, and grants; and that live policy behaviour is
 * correct across tenant contexts. Server/database-derived tenant authority
 * is mandatory.
 */
import { PILOT_IDEMPOTENCY_MIGRATION, PILOT_IDEMPOTENCY_TABLE } from './awardPilotSupabaseIdempotency';

export interface DatabaseObjectVerification {
  readonly tableExists: boolean;
  readonly compositePrimaryKey: boolean;
  readonly requiredIndexesPresent: readonly string[];
  readonly requiredIndexesMissing: readonly string[];
  readonly rlsEnabled: boolean;
  readonly policiesPresent: readonly string[];
  readonly policiesMissing: readonly string[];
  readonly grantsPresent: readonly string[];
  readonly grantsMissing: readonly string[];
  readonly retentionMetadataAvailable: boolean;
  readonly atomicClaimSupported: boolean;
}

export type LiveTenantPolicyScenario =
  | 'AUTHENTICATED_TENANT_A_OWN_ROW'
  | 'AUTHENTICATED_TENANT_B_OWN_ROW'
  | 'UNAUTHENTICATED_ACCESS'
  | 'CROSS_TENANT_SELECT'
  | 'CROSS_TENANT_UPDATE'
  | 'SAME_KEY_DIFFERENT_TENANTS'
  | 'MANIPULATED_TENANT_CONTEXT'
  | 'SERVER_SIDE_EXECUTION';

export interface LiveTenantPolicyOutcome {
  readonly scenario: LiveTenantPolicyScenario;
  readonly expected: 'ALLOWED' | 'DENIED' | 'ISOLATED_ROWS';
  readonly observed: 'ALLOWED' | 'DENIED' | 'ISOLATED_ROWS';
  readonly tenantAuthoritySource: 'SERVER_SESSION' | 'DATABASE_CONTEXT' | 'CLIENT_CLAIM';
  readonly notes: string;
}

export const REQUIRED_TENANT_POLICY_SCENARIOS: readonly LiveTenantPolicyScenario[] = [
  'AUTHENTICATED_TENANT_A_OWN_ROW',
  'AUTHENTICATED_TENANT_B_OWN_ROW',
  'UNAUTHENTICATED_ACCESS',
  'CROSS_TENANT_SELECT',
  'CROSS_TENANT_UPDATE',
  'SAME_KEY_DIFFERENT_TENANTS',
  'MANIPULATED_TENANT_CONTEXT',
  'SERVER_SIDE_EXECUTION',
];

export interface DatabaseVerificationReport {
  readonly migrationVersion: string;
  readonly table: string;
  readonly objectVerification: DatabaseObjectVerification;
  readonly policyOutcomes: readonly LiveTenantPolicyOutcome[];
  readonly passed: boolean;
  readonly failures: readonly string[];
}

export function evaluateDatabaseVerification(
  objectVerification: DatabaseObjectVerification,
  policyOutcomes: readonly LiveTenantPolicyOutcome[],
): DatabaseVerificationReport {
  const failures: string[] = [];
  if (!objectVerification.tableExists) failures.push('table missing');
  if (!objectVerification.compositePrimaryKey) failures.push('composite PK missing');
  if (objectVerification.requiredIndexesMissing.length) failures.push(`indexes missing: ${objectVerification.requiredIndexesMissing.join(', ')}`);
  if (!objectVerification.rlsEnabled) failures.push('RLS not enabled');
  if (objectVerification.policiesMissing.length) failures.push(`policies missing: ${objectVerification.policiesMissing.join(', ')}`);
  if (objectVerification.grantsMissing.length) failures.push(`grants missing: ${objectVerification.grantsMissing.join(', ')}`);
  if (!objectVerification.retentionMetadataAvailable) failures.push('retention metadata unavailable');
  if (!objectVerification.atomicClaimSupported) failures.push('atomic-claim contract failed');

  const requiredSet = new Set<LiveTenantPolicyScenario>(REQUIRED_TENANT_POLICY_SCENARIOS);
  for (const outcome of policyOutcomes) {
    requiredSet.delete(outcome.scenario);
    if (outcome.observed !== outcome.expected) {
      failures.push(`policy scenario ${outcome.scenario}: expected ${outcome.expected}, observed ${outcome.observed}`);
    }
    if (outcome.tenantAuthoritySource === 'CLIENT_CLAIM') {
      failures.push(`policy scenario ${outcome.scenario}: tenant authority derived from client — not permitted`);
    }
  }
  if (requiredSet.size) failures.push(`missing policy scenarios: ${[...requiredSet].join(', ')}`);

  return {
    migrationVersion: PILOT_IDEMPOTENCY_MIGRATION.migrationId,
    table: PILOT_IDEMPOTENCY_TABLE,
    objectVerification,
    policyOutcomes,
    passed: failures.length === 0,
    failures,
  };
}
