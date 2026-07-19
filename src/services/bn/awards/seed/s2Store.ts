/**
 * AW360-WAVE-1 Stage S2 — In-memory materialisation store, batch registry,
 * transactional materialiser, and creation-mode tagging.
 *
 * The store simulates the shape of the Benefits DB tables the framework
 * writes into. It is IN-MEMORY only — the S2 spec does not permit writes
 * to production or the D9 pilot tenant, and the sandbox has no dedicated
 * AWARD360_CERTIFICATION physical tenant. The materialiser is written so
 * an operator-run adapter can swap this in-memory store for a real DB
 * transaction against the seed tenant without any consumer changes.
 */

import {
  assertSeedExecutionAllowed,
  type SeedExecutionRequest,
  deterministicId,
  SeedGuardError,
} from './seedTenantGuard';
import type { ScenarioRecord } from './seedScenarioManifest';
import type { SeedProfile } from './s2Profiles';

// ─────────────────────────── Creation modes ────────────────────────────

export type CreationMode = 'DOMAIN_EXECUTED' | 'HISTORICAL_FIXTURE';

/**
 * Classify a scenario's persistence path. DOMAIN_EXECUTED means the state
 * is reachable through an executable canonical service. HISTORICAL_FIXTURE
 * is used for prerequisite historical states that cannot be produced today
 * because the mutation is dark-launched.
 */
export function creationModeFor(scenario: ScenarioRecord): CreationMode {
  const pilotAllowed =
    scenario.pilotActionState === 'ALLOWED' ||
    scenario.pilotActionState === 'IDEMPOTENT_REPLAY';
  const claimApproved =
    scenario.claimState === 'HAPPY_PATH_ELIGIBLE' ||
    scenario.claimState === 'APPROVED_NO_AWARD' ||
    scenario.claimState === 'APPROVED_WITH_AWARD';
  const isProposedOnly =
    scenario.expectedLifecycleState === 'SUSPENSION_PROPOSED' ||
    scenario.expectedLifecycleState === 'RESUMPTION_PROPOSED' ||
    scenario.expectedLifecycleState === 'CESSATION_PROPOSED';
  if (pilotAllowed || claimApproved || isProposedOnly) return 'DOMAIN_EXECUTED';
  // Final effects (SUSPENDED / CEASED / RESUMED / DEATH_RECORDED) or
  // deep historical fixtures needed as prerequisites.
  return 'HISTORICAL_FIXTURE';
}

// ─────────────────────────── Persisted-row shapes ──────────────────────

export interface PersistedRow {
  readonly table: string;
  readonly id: string;
  readonly scenarioKey: string;
  readonly seedBatchId: string;
  readonly tenantId: string;
  readonly creationMode: CreationMode;
  readonly syntheticDataMarker: true;
  readonly data: Record<string, unknown>;
}

// ─────────────────────────── Store ─────────────────────────────────────

export class SeedStore {
  private readonly rows = new Map<string, PersistedRow>();
  private readonly byTable = new Map<string, Set<string>>();
  private readonly byBatch = new Map<string, Set<string>>();

  insert(row: PersistedRow): void {
    if (this.rows.has(row.id)) return; // idempotent
    this.rows.set(row.id, row);
    const t = this.byTable.get(row.table) ?? new Set();
    t.add(row.id);
    this.byTable.set(row.table, t);
    const b = this.byBatch.get(row.seedBatchId) ?? new Set();
    b.add(row.id);
    this.byBatch.set(row.seedBatchId, b);
  }

  countByTable(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [t, ids] of this.byTable) out[t] = ids.size;
    return out;
  }

  countByBatch(batchId: string): number {
    return this.byBatch.get(batchId)?.size ?? 0;
  }

  rowsForBatch(batchId: string): readonly PersistedRow[] {
    const ids = this.byBatch.get(batchId);
    if (!ids) return [];
    return [...ids].map((id) => this.rows.get(id)!).filter(Boolean);
  }

  deleteBatch(batchId: string, opts: { touchesNonSeed: () => boolean }): {
    deleted: number;
    blocked: boolean;
    reason?: string;
  } {
    if (opts.touchesNonSeed()) {
      return { deleted: 0, blocked: true, reason: 'would_touch_non_seed_rows' };
    }
    const ids = this.byBatch.get(batchId);
    if (!ids) return { deleted: 0, blocked: false };
    let deleted = 0;
    for (const id of ids) {
      const row = this.rows.get(id);
      if (!row) continue;
      this.rows.delete(id);
      this.byTable.get(row.table)?.delete(id);
      deleted++;
    }
    this.byBatch.delete(batchId);
    return { deleted, blocked: false };
  }

  totalRows(): number {
    return this.rows.size;
  }

  all(): readonly PersistedRow[] {
    return [...this.rows.values()];
  }
}

// ─────────────────────────── Batch registry ────────────────────────────

export type BatchStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'VERIFIED'
  | 'FAILED'
  | 'CLEANED_UP';

export interface SeedBatchRecord {
  readonly seedBatchId: string;
  readonly tenantId: string;
  readonly seedVersion: string;
  readonly profile: SeedProfile;
  readonly asOfDate: string;
  readonly catalogueFingerprint: string;
  readonly applicationCommit: string;
  readonly environment: string;
  readonly requestedBy: string;
  readonly creationModeCounts: Record<CreationMode, number>;
  readonly expectedRowCounts: Record<string, number>;
  readonly actualRowCounts: Record<string, number>;
  readonly startedAt: string;
  completedAt?: string;
  status: BatchStatus;
  cleanupStatus: 'NONE' | 'PLANNED' | 'DONE';
  errorSummary?: string;
}

export class SeedBatchRegistry {
  private readonly batches = new Map<string, SeedBatchRecord>();

  create(record: SeedBatchRecord): SeedBatchRecord {
    if (this.batches.has(record.seedBatchId)) {
      return this.batches.get(record.seedBatchId)!;
    }
    this.batches.set(record.seedBatchId, record);
    return record;
  }

  get(id: string): SeedBatchRecord | undefined {
    return this.batches.get(id);
  }

  update(id: string, patch: Partial<SeedBatchRecord>): SeedBatchRecord {
    const cur = this.batches.get(id);
    if (!cur) throw new SeedGuardError('BATCH_NOT_FOUND', `Batch ${id} not found.`);
    const next = { ...cur, ...patch };
    this.batches.set(id, next);
    return next;
  }

  list(): readonly SeedBatchRecord[] {
    return [...this.batches.values()];
  }
}

// ─────────────────────────── Materialiser ──────────────────────────────

export interface MaterialisationDependency {
  readonly table: string;
  readonly order: number;
}

export const MATERIALISATION_ORDER: readonly MaterialisationDependency[] = [
  { table: 'ip_master', order: 10 },
  { table: 'ip_depend', order: 15 },
  { table: 'au_er_master', order: 20 },
  { table: 'ip_wages', order: 25 },
  { table: 'bn_claim', order: 30 },
  { table: 'bn_claim_document', order: 35 },
  { table: 'bn_claim_eligibility', order: 40 },
  { table: 'bn_award', order: 50 },
  { table: 'bn_award_rate_history', order: 55 },
  { table: 'bn_award_status_event', order: 60 },
  { table: 'bn_award_suspension_event', order: 65 },
  { table: 'bn_life_certificate', order: 70 },
  { table: 'bn_medical_review_schedule', order: 75 },
  { table: 'bn_payment_schedule', order: 80 },
  { table: 'bn_payment_instruction', order: 85 },
  { table: 'bn_overpayment', order: 90 },
  { table: 'bn_communication_log', order: 95 },
  { table: 'core_audit_log', order: 99 },
];

export interface MaterialisationOptions {
  readonly requireApply: boolean;
  readonly touchesNonSeed?: () => boolean;
}

/**
 * Runs the materialiser under the seed guard. Persists rows into the
 * in-memory store using dependency order. Any failure marks the batch
 * FAILED and rolls back rows written under the batch id.
 */
export function materialise(
  req: SeedExecutionRequest,
  scenarios: readonly ScenarioRecord[],
  rowsToWrite: readonly PersistedRow[],
  registry: SeedBatchRegistry,
  store: SeedStore,
  opts: MaterialisationOptions,
): SeedBatchRecord {
  assertSeedExecutionAllowed(req, { requireApply: opts.requireApply });

  if (opts.touchesNonSeed && opts.touchesNonSeed()) {
    throw new SeedGuardError('WOULD_TOUCH_NON_SEED', 'Materialisation would touch non-seed rows.');
  }

  const record = registry.get(req.seedBatchId);
  if (!record) throw new SeedGuardError('BATCH_MISSING', 'Batch must be registered before materialise.');

  registry.update(req.seedBatchId, { status: 'IN_PROGRESS' });

  const orderMap = new Map(MATERIALISATION_ORDER.map((d) => [d.table, d.order]));
  const sorted = [...rowsToWrite].sort(
    (a, b) => (orderMap.get(a.table) ?? 999) - (orderMap.get(b.table) ?? 999),
  );

  const writtenIds: string[] = [];
  const started = new Date().toISOString();
  try {
    for (const row of sorted) {
      if (row.tenantId !== req.tenant.tenantId) {
        throw new SeedGuardError('TENANT_MISMATCH', `Row ${row.id} tenant mismatch.`);
      }
      if (row.seedBatchId !== req.seedBatchId) {
        throw new SeedGuardError('BATCH_MISMATCH', `Row ${row.id} batch mismatch.`);
      }
      store.insert(row);
      writtenIds.push(row.id);
    }
    const actualCounts = store.countByTable();
    return registry.update(req.seedBatchId, {
      status: 'VERIFIED',
      completedAt: new Date().toISOString(),
      actualRowCounts: actualCounts,
    });
  } catch (err: any) {
    // Roll back rows we wrote as part of this batch.
    store.deleteBatch(req.seedBatchId, { touchesNonSeed: () => false });
    return registry.update(req.seedBatchId, {
      status: 'FAILED',
      completedAt: new Date().toISOString(),
      errorSummary: err?.message ?? String(err),
    });
  } finally {
    // started is captured; use variable to satisfy TS if unused.
    void started;
  }
}

// ─────────────────────────── Row builder ───────────────────────────────

export interface ScenarioRowBuildInput {
  readonly req: SeedExecutionRequest;
  readonly scenario: ScenarioRecord;
  readonly profile: SeedProfile;
}

/**
 * Deterministically expand a scenario into concrete DB-shaped rows across
 * dependency-ordered tables. Every row is tagged with tenant, batch,
 * creation mode, and a synthetic-data marker.
 */
export function buildRowsForScenario(input: ScenarioRowBuildInput): readonly PersistedRow[] {
  const { req, scenario } = input;
  const mode = creationModeFor(scenario);
  const rows: PersistedRow[] = [];

  const base = {
    scenarioKey: scenario.scenarioKey,
    seedBatchId: req.seedBatchId,
    tenantId: req.tenant.tenantId,
    creationMode: mode,
    syntheticDataMarker: true as const,
  };

  // Person
  rows.push({
    ...base,
    table: 'ip_master',
    id: scenario.identifiers.personId,
    data: {
      ssn: `SYN-${scenario.identifiers.personId.slice(0, 8)}`,
      first_name: `Synth`,
      last_name: `Fixture-${scenario.benefitType}`,
      benefit_context: scenario.benefitType,
      is_synthetic: true,
    },
  });

  // Employer (only when insured class implies employment)
  if (scenario.claimantClass === 'EMPLOYEE') {
    rows.push({
      ...base,
      table: 'au_er_master',
      id: deterministicId(req.tenant.tenantId, req.seedVersion, scenario.scenarioKey, 'EMPLOYER'),
      data: { regno: `SYN-ER-${scenario.benefitType}`, name: `Synthetic Employer ${scenario.benefitType}` },
    });
  }

  // Claim
  rows.push({
    ...base,
    table: 'bn_claim',
    id: scenario.identifiers.claimId,
    data: {
      benefit_code: scenario.benefitType,
      claimant_person_id: scenario.identifiers.personId,
      status: scenario.claimState ?? 'DRAFT',
      expected_eligibility: scenario.expectedEligibility,
    },
  });

  // Claim documents
  for (const doc of scenario.requiredDocuments) {
    rows.push({
      ...base,
      table: 'bn_claim_document',
      id: deterministicId(req.tenant.tenantId, req.seedVersion, scenario.scenarioKey, `DOC:${doc}`),
      data: { bn_claim_id: scenario.identifiers.claimId, doc_type: doc },
    });
  }

  // Eligibility fact (when scenario has a definitive expectation)
  if (scenario.expectedEligibility !== 'PENDING') {
    rows.push({
      ...base,
      table: 'bn_claim_eligibility',
      id: deterministicId(req.tenant.tenantId, req.seedVersion, scenario.scenarioKey, 'ELIG'),
      data: {
        bn_claim_id: scenario.identifiers.claimId,
        eligibility: scenario.expectedEligibility,
      },
    });
  }

  // Award and lifecycle history
  if (scenario.identifiers.awardId) {
    rows.push({
      ...base,
      table: 'bn_award',
      id: scenario.identifiers.awardId,
      data: {
        bn_claim_id: scenario.identifiers.claimId,
        benefit_code: scenario.benefitType,
        lifecycle_state: scenario.expectedLifecycleState ?? 'ACTIVE',
        outcome: scenario.expectedAwardOutcome,
      },
    });
    rows.push({
      ...base,
      table: 'bn_award_status_event',
      id: deterministicId(req.tenant.tenantId, req.seedVersion, scenario.scenarioKey, 'AWARD_STATUS'),
      data: {
        bn_award_id: scenario.identifiers.awardId,
        status: scenario.expectedLifecycleState ?? 'ACTIVE',
      },
    });
    if (
      scenario.expectedLifecycleState === 'SUSPENSION_PROPOSED' ||
      scenario.expectedLifecycleState === 'SUSPENDED' ||
      scenario.expectedLifecycleState === 'RESUMPTION_PROPOSED' ||
      scenario.expectedLifecycleState === 'RESUMED'
    ) {
      rows.push({
        ...base,
        table: 'bn_award_suspension_event',
        id: deterministicId(req.tenant.tenantId, req.seedVersion, scenario.scenarioKey, 'AWARD_SUSPENSION'),
        data: {
          bn_award_id: scenario.identifiers.awardId,
          event_type: scenario.expectedLifecycleState,
        },
      });
    }
  }

  // Payment instruction (only when scenario has a payment identifier AND scenario is payable)
  if (scenario.identifiers.paymentId && scenario.identifiers.awardId) {
    rows.push({
      ...base,
      table: 'bn_payment_instruction',
      id: scenario.identifiers.paymentId,
      data: {
        bn_award_id: scenario.identifiers.awardId,
        payment_state: scenario.paymentState,
        outcome: scenario.expectedPaymentOutcome,
      },
    });
  }

  // Audit trail
  for (const evt of scenario.expectedAuditEvents) {
    rows.push({
      ...base,
      table: 'core_audit_log',
      id: deterministicId(req.tenant.tenantId, req.seedVersion, scenario.scenarioKey, `AUD:${evt}`),
      data: {
        actor: scenario.actor.personId,
        event: evt,
        reason: 'SEED_SCENARIO',
        correlation_id: scenario.scenarioKey,
      },
    });
  }

  // Communication (safe interception — never dispatches)
  for (const evt of scenario.expectedCommunicationEvents) {
    rows.push({
      ...base,
      table: 'bn_communication_log',
      id: deterministicId(req.tenant.tenantId, req.seedVersion, scenario.scenarioKey, `COM:${evt}`),
      data: {
        recipient: 'synthetic:intercepted',
        channel: 'INTERCEPTED',
        event: evt,
        delivery: 'SUPPRESSED_SYNTHETIC',
      },
    });
  }

  return rows;
}
