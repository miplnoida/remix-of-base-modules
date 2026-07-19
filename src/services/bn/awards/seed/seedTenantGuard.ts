/**
 * AW360-WAVE-1 Stage S1 — Seed tenant guard + deterministic identity helpers.
 *
 * Enforces the executional preconditions the spec requires BEFORE any
 * `--apply` operation is permitted:
 *   - environment ∈ {development, automated_test, approved_uat}
 *   - tenant is an explicit seed tenant
 *   - tenant is NOT production and NOT the D9 pilot tenant
 *   - a seed batch ID is supplied
 *   - operator holds an authorised seed role
 *   - an explicit `--apply` flag is present for writes
 *
 * Also provides deterministic identifier generation (UUID-v5-style) so
 * repeated seed runs at the same seedVersion produce the SAME ids.
 */

import { AWARD_PILOT_SCOPE_FREEZE } from '../pilot/awardPilotScopeFreeze';

export type SeedEnvironment = 'development' | 'automated_test' | 'approved_uat';
export type SeedOperatorRole = 'SEED_ADMIN' | 'SEED_AUTOMATION' | 'QA_LEAD';

export interface SeedTenantDescriptor {
  readonly tenantId: string;
  readonly isSeedTenant: boolean;
  readonly isProduction: boolean;
  readonly isD9Pilot: boolean;
  readonly displayName: string;
}

export const AWARD360_CERTIFICATION_TENANT: SeedTenantDescriptor = {
  tenantId: 'AWARD360_CERTIFICATION',
  isSeedTenant: true,
  isProduction: false,
  isD9Pilot: false,
  displayName: 'Award 360 Certification Seed Tenant',
};

export interface SeedExecutionRequest {
  readonly environment: SeedEnvironment;
  readonly tenant: SeedTenantDescriptor;
  readonly seedBatchId: string;         // caller-supplied
  readonly seedVersion: string;         // e.g. 'AW360-S1-v1'
  readonly asOfDate: string;            // ISO
  readonly operator: {
    readonly id: string;
    readonly role: SeedOperatorRole;
  };
  readonly apply: boolean;              // must be true for writes
}

export class SeedGuardError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'SeedGuardError';
  }
}

const AUTHORISED_ROLES: readonly SeedOperatorRole[] = ['SEED_ADMIN', 'SEED_AUTOMATION', 'QA_LEAD'];

/**
 * Throws if the request violates any guard. Called by every write-capable
 * command; also called by `verify` and `dry-run` so authorised-role and
 * tenant checks stay consistent.
 */
export function assertSeedExecutionAllowed(
  req: SeedExecutionRequest,
  opts: { requireApply: boolean },
): void {
  if (!['development', 'automated_test', 'approved_uat'].includes(req.environment)) {
    throw new SeedGuardError('ENV_FORBIDDEN', `Seed forbidden in environment: ${req.environment}`);
  }
  if (!req.tenant.isSeedTenant) {
    throw new SeedGuardError('TENANT_NOT_SEED', `Tenant ${req.tenant.tenantId} is not a seed tenant.`);
  }
  if (req.tenant.isProduction) {
    throw new SeedGuardError('TENANT_PRODUCTION', 'Refusing to seed against production tenant.');
  }
  if (req.tenant.isD9Pilot) {
    throw new SeedGuardError('TENANT_D9_PILOT', 'Refusing to seed against D9 pilot tenant.');
  }
  if (AWARD_PILOT_SCOPE_FREEZE.approvedTenants.includes(req.tenant.tenantId)) {
    throw new SeedGuardError(
      'TENANT_PILOT_FROZEN',
      `Tenant ${req.tenant.tenantId} is a D9 pilot-scope-freeze tenant.`,
    );
  }
  if (!req.seedBatchId || req.seedBatchId.trim().length < 4) {
    throw new SeedGuardError('BATCH_ID_MISSING', 'seedBatchId is required.');
  }
  if (!req.seedVersion) {
    throw new SeedGuardError('SEED_VERSION_MISSING', 'seedVersion is required.');
  }
  if (!/^\d{4}-\d{2}-\d{2}/.test(req.asOfDate)) {
    throw new SeedGuardError('ASOF_INVALID', 'asOfDate must be a full ISO date.');
  }
  if (!AUTHORISED_ROLES.includes(req.operator.role)) {
    throw new SeedGuardError('OPERATOR_UNAUTHORISED', `Role ${req.operator.role} cannot seed.`);
  }
  if (opts.requireApply && !req.apply) {
    throw new SeedGuardError('APPLY_REQUIRED', 'Write operations require explicit --apply.');
  }
}

// ---------- deterministic identity ----------

// Small non-crypto stable hash (FNV-1a 32-bit) — sufficient for deterministic
// fixture id derivation; NOT security-sensitive.
function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/**
 * UUID-v5-shaped deterministic identifier derived from
 * (tenant | seedVersion | scenarioKey | entityType). Same inputs → same UUID.
 */
export function deterministicId(
  tenantId: string,
  seedVersion: string,
  scenarioKey: string,
  entityType: string,
): string {
  const seed = `${tenantId}|${seedVersion}|${scenarioKey}|${entityType}`;
  // Produce 4 32-bit chunks by salting the input.
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) parts.push(fnv1a32(`${seed}#${i}`).toString(16).padStart(8, '0'));
  const hex = parts.join('');
  // Force v5 variant nibbles for shape compliance.
  const v5 = `${hex.substring(0, 8)}-${hex.substring(8, 12)}-5${hex.substring(13, 16)}-a${hex.substring(17, 20)}-${hex.substring(20, 32)}`;
  return v5;
}

export interface SeedProvenance {
  readonly seed_batch_id: string;
  readonly seed_version: string;
  readonly scenario_key: string;
  readonly seed_as_of_date: string;
  readonly is_test_data: true;
  readonly seed_tenant_id: string;
}

export function buildProvenance(
  req: SeedExecutionRequest,
  scenarioKey: string,
): SeedProvenance {
  return {
    seed_batch_id: req.seedBatchId,
    seed_version: req.seedVersion,
    scenario_key: scenarioKey,
    seed_as_of_date: req.asOfDate,
    is_test_data: true,
    seed_tenant_id: req.tenant.tenantId,
  };
}
