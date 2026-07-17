/**
 * AW360-WAVE-1-C1 Slice B.1a — Executable loader certification.
 *
 * This test suite imports the REAL production Award 360 loaders and runs
 * them through the table-aware `AwardQueryRecorder`. Every recorded query
 * is validated against `AWARD360_SCHEMA_CONTRACT` — unknown columns,
 * missing scope, disallowed order columns, disallowed containment
 * operations, and unsupported query-builder verbs all fail here.
 *
 * Six checkpoint loaders are certified in this slice:
 *   • getAward360Header
 *   • getAwardClaim
 *   • getAwardProduct
 *   • listAwardCommunications
 *   • loadAwardAuditSources / listAwardAudit
 *   • getAward360Summary
 *
 * The remaining query loaders are enumerated in
 * `award360LoaderManifest.ts` with `pendingExecution: true` and will be
 * exercised in Slice B.1b.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AwardQueryRecorder } from '@/test/mocks/award360QueryRecorder';

// Hoisted holder so the vi.mock factory can reach the same recorder
// instance the test body operates on. Vitest hoists both `vi.hoisted`
// and `vi.mock` above ES imports; the recorder is therefore initialised
// before the production loader modules request the Supabase client.
const holder = vi.hoisted(() => ({ recorder: null as AwardQueryRecorder | null }));

vi.mock('@/integrations/supabase/client', () => ({
  get supabase() {
    if (!holder.recorder) throw new Error('AwardQueryRecorder not initialised');
    return holder.recorder.client();
  },
}));

// Initialised synchronously below (before any production import that
// destructures `supabase` at module top level).
holder.recorder = new AwardQueryRecorder();
const recorder = holder.recorder;

// Import the real production loaders AFTER the mock is registered.
import {
  getAward360Header,
  getAwardClaim,
  getAwardProduct,
  listAwardCommunications,
  loadAwardAuditSources,
  listAwardAudit,
} from '@/services/bn/awards/award360Service';
import { getAward360Summary } from '@/services/bn/awards/award360SummaryService';

// ─── helpers ──────────────────────────────────────────────────────────────
function setResponses(map: Record<string, unknown>) {
  (recorder as any).opts.responses = map;
}
function setErrors(map: Record<string, { message: string; code?: string }>) {
  (recorder as any).opts.errors = map;
}

beforeEach(() => {
  recorder.reset();
  (recorder as any).opts.responses = {};
  (recorder as any).opts.errors = {};
});

// ─── getAward360Header ────────────────────────────────────────────────────
describe('AW360 Slice B.1a · getAward360Header', () => {
  it('scenario `header-with-ssn-claim-and-version` queries award → ip_master → bn_product → bn_claim → bn_product_version', async () => {
    setResponses({
      bn_award: {
        id: 'a-1',
        award_number: 'AW-1',
        ssn: 'SSN-1',
        benefit_code: 'B',
        award_type: 'RET',
        status: 'ACTIVE',
        base_amount: 100,
        currency: 'USD',
        frequency: 'MONTHLY',
        start_date: '2024-01-01',
        end_date: null,
        bn_claim_id: 'c-1',
        bn_product_id: 'p-1',
      },
      ip_master: { firstname: 'A', middle_name: 'B', surname: 'C' },
      bn_product: { benefit_name: 'Retirement', benefit_code: 'RET' },
      bn_claim: { product_version_id: 'pv-1' },
      bn_product_version: { version_number: 3 },
    });
    const h = await recorder.runAs('getAward360Header', 'header-with-ssn-claim-and-version', () =>
      getAward360Header('a-1'),
    );
    expect(h.payeeName).toBe('A B C');
    expect(h.benefitName).toBe('Retirement');
    expect(h.productVersion).toBe('3');
    expect(h.claimId).toBe('c-1');
    const tables = recorder.queries.map((q) => q.table);
    expect(tables).toEqual([
      'bn_award',
      'ip_master',
      'bn_product',
      'bn_claim',
      'bn_product_version',
    ]);
  });

  it('scenario `header-without-ssn` skips ip_master', async () => {
    setResponses({
      bn_award: { id: 'a-1', award_number: 'AW', ssn: null, bn_claim_id: null, bn_product_id: null },
    });
    await recorder.runAs('getAward360Header', 'header-without-ssn', () => getAward360Header('a-1'));
    expect(recorder.queries.map((q) => q.table)).toEqual(['bn_award']);
  });

  it('scenario `header-without-claim` skips bn_claim + bn_product_version', async () => {
    setResponses({
      bn_award: {
        id: 'a-1', award_number: 'AW', ssn: 'S', bn_claim_id: null, bn_product_id: 'p-1',
      },
      ip_master: { firstname: 'A', middle_name: null, surname: 'C' },
      bn_product: { benefit_name: 'R', benefit_code: null },
    });
    await recorder.runAs('getAward360Header', 'header-without-claim', () => getAward360Header('a-1'));
    const tables = recorder.queries.map((q) => q.table);
    expect(tables).toContain('ip_master');
    expect(tables).toContain('bn_product');
    expect(tables).not.toContain('bn_claim');
    expect(tables).not.toContain('bn_product_version');
  });

  it('scenario `header-with-claim-no-version` skips bn_product_version', async () => {
    setResponses({
      bn_award: {
        id: 'a-1', award_number: 'AW', ssn: null, bn_claim_id: 'c-1', bn_product_id: null,
      },
      bn_claim: { product_version_id: null },
    });
    await recorder.runAs('getAward360Header', 'header-with-claim-no-version', () =>
      getAward360Header('a-1'),
    );
    const tables = recorder.queries.map((q) => q.table);
    expect(tables).toContain('bn_claim');
    expect(tables).not.toContain('bn_product_version');
  });
});

// ─── getAwardClaim ────────────────────────────────────────────────────────
describe('AW360 Slice B.1a · getAwardClaim', () => {
  it('scenario `claim-linked` reads bn_award then bn_claim scoped by claim id', async () => {
    setResponses({
      bn_award: { bn_claim_id: 'c-1' },
      bn_claim: {
        id: 'c-1', claim_number: 'CL-1', status: 'DECIDED', product_version_id: 'pv-1',
        submission_date: null, claim_date: null, application_channel: null, priority: null,
        assigned_to: 'user-1', decision_date: null,
      },
    });
    const c = await recorder.runAs('getAwardClaim', 'claim-linked', () => getAwardClaim('a-1'));
    expect(c?.claimId).toBe('c-1');
    expect(c?.assignedOfficer).toBe('user-1');
    const q = recorder.queriesFor('getAwardClaim');
    expect(q.map((r) => r.table)).toEqual(['bn_award', 'bn_claim']);
    expect(q[1].filters.some((f) => f.method === 'eq' && f.column === 'id' && f.value === 'c-1')).toBe(true);
  });

  it('scenario `claim-not-linked` returns null and skips bn_claim', async () => {
    setResponses({ bn_award: { bn_claim_id: null } });
    const c = await recorder.runAs('getAwardClaim', 'claim-not-linked', () => getAwardClaim('a-1'));
    expect(c).toBeNull();
    expect(recorder.queries.map((q) => q.table)).toEqual(['bn_award']);
  });

  it('scenario `claim-missing` returns null when bn_claim row absent', async () => {
    setResponses({ bn_award: { bn_claim_id: 'c-1' }, bn_claim: null });
    const c = await recorder.runAs('getAwardClaim', 'claim-missing', () => getAwardClaim('a-1'));
    expect(c).toBeNull();
  });
});

// ─── getAwardProduct ──────────────────────────────────────────────────────
describe('AW360 Slice B.1a · getAwardProduct', () => {
  it('scenario `product-with-version` reads bn_award → bn_product → bn_claim → bn_product_version', async () => {
    setResponses({
      bn_award: { bn_product_id: 'p-1', bn_claim_id: 'c-1' },
      bn_product: {
        id: 'p-1', benefit_code: 'RET', benefit_name: 'Retirement',
        scheme_id: 'sch', branch_id: 'br', category: 'cat', branch: null,
        payment_type: 'PT', status: 'ACTIVE', country_code: 'US',
      },
      bn_claim: { product_version_id: 'pv-1' },
      bn_product_version: {
        id: 'pv-1', version_number: 2, status: 'ACTIVE',
        effective_from: '2024-01-01', effective_to: null,
        benefit_duration_type: 'LIFETIME',
      },
    });
    const p = await recorder.runAs('getAwardProduct', 'product-with-version', () =>
      getAwardProduct('a-1'),
    );
    expect(p?.versionNumber).toBe('2');
    expect(p?.benefitDurationType).toBe('LIFETIME');
    expect(recorder.queries.map((q) => q.table)).toEqual([
      'bn_award', 'bn_product', 'bn_claim', 'bn_product_version',
    ]);
  });

  it('scenario `product-without-claim` skips bn_claim + bn_product_version', async () => {
    setResponses({
      bn_award: { bn_product_id: 'p-1', bn_claim_id: null },
      bn_product: { id: 'p-1', benefit_code: 'C', benefit_name: 'N' },
    });
    await recorder.runAs('getAwardProduct', 'product-without-claim', () => getAwardProduct('a-1'));
    const tables = recorder.queries.map((q) => q.table);
    expect(tables).toEqual(['bn_award', 'bn_product']);
  });

  it('scenario `product-with-claim-no-version` skips bn_product_version', async () => {
    setResponses({
      bn_award: { bn_product_id: 'p-1', bn_claim_id: 'c-1' },
      bn_product: { id: 'p-1', benefit_code: 'C', benefit_name: 'N' },
      bn_claim: { product_version_id: null },
    });
    await recorder.runAs('getAwardProduct', 'product-with-claim-no-version', () =>
      getAwardProduct('a-1'),
    );
    const tables = recorder.queries.map((q) => q.table);
    expect(tables).toEqual(['bn_award', 'bn_product', 'bn_claim']);
  });

  it('scenario `product-missing` returns null when no product id on award', async () => {
    setResponses({ bn_award: { bn_product_id: null, bn_claim_id: null } });
    const p = await recorder.runAs('getAwardProduct', 'product-missing', () => getAwardProduct('a-1'));
    expect(p).toBeNull();
  });
});

// ─── listAwardCommunications ──────────────────────────────────────────────
describe('AW360 Slice B.1a · listAwardCommunications', () => {
  it('scenario `comm-claim-and-context` issues both claim_id and context queries', async () => {
    setResponses({
      bn_award: { bn_claim_id: 'c-1' },
      bn_communication_log: [
        { id: 'x1', event_code: 'E', channel: 'EMAIL', created_at: '2026-01-01' },
      ],
    });
    const list = await recorder.runAs('listAwardCommunications', 'comm-claim-and-context', () =>
      listAwardCommunications('a-1'),
    );
    expect(list).toHaveLength(1);
    const logs = recorder.queries.filter((q) => q.table === 'bn_communication_log');
    expect(logs.length).toBe(2);
    // one query uses eq(claim_id), one uses contains(context)
    expect(logs.some((l) => l.filters.some((f) => f.method === 'eq' && f.column === 'claim_id'))).toBe(true);
    expect(logs.some((l) => l.filters.some((f) => f.method === 'contains' && f.column === 'context'))).toBe(true);
    // both are scoped, contract enforces anyOf → no throw
  });

  it('scenario `comm-context-only` runs a single contains query when award has no claim', async () => {
    setResponses({ bn_award: { bn_claim_id: null }, bn_communication_log: [] });
    await recorder.runAs('listAwardCommunications', 'comm-context-only', () =>
      listAwardCommunications('a-1'),
    );
    const logs = recorder.queries.filter((q) => q.table === 'bn_communication_log');
    expect(logs.length).toBe(1);
    expect(logs[0].filters[0]).toMatchObject({ method: 'contains', column: 'context' });
  });

  it('scenario `comm-empty` returns [] and still runs the context query', async () => {
    setResponses({ bn_award: { bn_claim_id: null }, bn_communication_log: [] });
    const list = await recorder.runAs('listAwardCommunications', 'comm-empty', () =>
      listAwardCommunications('a-1'),
    );
    expect(list).toEqual([]);
  });

  it('scenario `comm-query-error` — table error is isolated (loader still resolves)', async () => {
    setResponses({ bn_award: { bn_claim_id: 'c-1' } });
    setErrors({ bn_communication_log: { message: 'boom' } });
    const list = await recorder.runAs('listAwardCommunications', 'comm-query-error', () =>
      listAwardCommunications('a-1'),
    );
    // Promise.allSettled swallows the error → empty list, no throw.
    expect(list).toEqual([]);
  });
});

// ─── loadAwardAuditSources / listAwardAudit ───────────────────────────────
describe('AW360 Slice B.1a · loadAwardAuditSources', () => {
  it('scenario `audit-without-central` never queries core_audit_log', async () => {
    setResponses({
      bn_award_status_event: [],
      bn_award_rate_history: [],
      bn_award_suspension_event: [],
    });
    const res = await recorder.runAs('loadAwardAuditSources', 'audit-without-central', () =>
      loadAwardAuditSources('a-1', { includeCentralAudit: false }),
    );
    expect(res.items).toEqual([]);
    const tables = recorder.queries.map((q) => q.table);
    expect(tables).toContain('bn_award_status_event');
    expect(tables).toContain('bn_award_rate_history');
    expect(tables).toContain('bn_award_suspension_event');
    expect(tables).not.toContain('core_audit_log');
    // 'central' section should report restricted
    expect(res.sources.find((s) => s.key === 'central')?.restricted).toBe(true);
  });

  it('scenario `audit-with-central` uses composite entity_type=bn_award scope', async () => {
    setResponses({
      bn_award_status_event: [],
      bn_award_rate_history: [],
      bn_award_suspension_event: [],
      core_audit_log: [
        { id: 'a1', event_time: '2026-01-01', action: 'UPDATE', entity_type: 'bn_award', entity_id: 'a-1' },
      ],
    });
    await recorder.runAs('loadAwardAuditSources', 'audit-with-central', () =>
      loadAwardAuditSources('a-1', { includeCentralAudit: true }),
    );
    const central = recorder.queries.find((q) => q.table === 'core_audit_log');
    expect(central).toBeDefined();
    // Composite scope: entity_type=bn_award AND entity_id=a-1
    expect(
      central!.filters.some((f) => f.column === 'entity_type' && f.value === 'bn_award'),
    ).toBe(true);
    expect(central!.filters.some((f) => f.column === 'entity_id' && f.value === 'a-1')).toBe(true);
  });

  it('composite scope: filtering only on entity_id is NOT sufficient (contract enforcement)', async () => {
    // The recorder rejects a completed core_audit_log query that omits
    // entity_type='bn_award'. Prove it independently of the loader.
    const rec = new AwardQueryRecorder({ responses: { core_audit_log: [] } });
    await expect(async () => {
      await rec.client().from('core_audit_log').select('id').eq('entity_id', 'a-1');
    }).rejects.toThrow(/required scope.*entity_type.*bn_award/);
  });

  it('composite scope: wrong fixed value (entity_type=bn_claim) fails', async () => {
    const rec = new AwardQueryRecorder({ responses: { core_audit_log: [] } });
    await expect(async () => {
      await rec
        .client()
        .from('core_audit_log')
        .select('id')
        .eq('entity_type', 'bn_claim')
        .eq('entity_id', 'a-1');
    }).rejects.toThrow(/required scope/);
  });

  it('scenario `audit-source-failure` isolates a failing source', async () => {
    setResponses({ bn_award_status_event: [], bn_award_rate_history: [], bn_award_suspension_event: [] });
    setErrors({ bn_award_rate_history: { message: 'boom' } });
    const res = await recorder.runAs('loadAwardAuditSources', 'audit-source-failure', () =>
      loadAwardAuditSources('a-1', { includeCentralAudit: false }),
    );
    expect(res.warnings.some((w) => w.includes('Rate history unavailable'))).toBe(true);
    expect(res.items).toEqual([]); // other sources succeeded but empty
  });

  it('listAwardAudit (compat wrapper) executes the same three sources without central', async () => {
    setResponses({ bn_award_status_event: [], bn_award_rate_history: [], bn_award_suspension_event: [] });
    await recorder.runAs('listAwardAudit', 'audit-flat-without-central', () =>
      listAwardAudit('a-1'),
    );
    const tables = new Set(recorder.queries.map((q) => q.table));
    expect(tables.has('core_audit_log')).toBe(false);
  });
});

// ─── getAward360Summary ───────────────────────────────────────────────────
describe('AW360 Slice B.1a · getAward360Summary', () => {
  it('scenario `summary-all-restricted` issues no queries when every include flag is false', async () => {
    const s = await recorder.runAs('getAward360Summary', 'summary-all-restricted', () =>
      getAward360Summary('a-1', {}),
    );
    expect(recorder.queries).toHaveLength(0);
    expect(s.beneficiaries.status).toBe('restricted');
    expect(s.schedule.status).toBe('restricted');
    expect(s.payments.status).toBe('restricted');
    expect(s.lifeCertificates.status).toBe('restricted');
    expect(s.medical.status).toBe('restricted');
    expect(s.suspensions.status).toBe('restricted');
    expect(s.overpayments.status).toBe('restricted');
    expect(s.communications.status).toBe('restricted');
    expect(s.pensionerAlert.status).toBe('restricted');
  });

  it('scenario `summary-all-includes` queries every operational table with contract-approved columns', async () => {
    setResponses({
      bn_award_beneficiary: [],
      bn_payment_schedule: [],
      bn_payment_instruction: [],
      bn_life_certificate: [],
      bn_medical_review_schedule: [],
      bn_award_suspension_event: [],
      bn_overpayment: [],
      bn_award: { bn_claim_id: 'c-1', ssn: 'S1' },
      bn_communication_log: [],
      ip_master: { status: 'ACTIVE' },
      bn_payment_profile: [],
    });
    await recorder.runAs('getAward360Summary', 'summary-all-includes', () =>
      getAward360Summary('a-1', {
        includeBeneficiaries: true,
        includeSchedule: true,
        includePayments: true,
        includeLifeCertificates: true,
        includeMedical: true,
        includeSuspensions: true,
        includeOverpayments: true,
        includeCommunications: true,
        includePensionerAlert: true,
        canViewPerson360: true,
        canViewPaymentProfile: true,
      }),
    );
    const tables = new Set(recorder.queries.map((q) => q.table));
    for (const t of [
      'bn_award_beneficiary', 'bn_payment_schedule', 'bn_payment_instruction',
      'bn_life_certificate', 'bn_medical_review_schedule', 'bn_award_suspension_event',
      'bn_overpayment', 'bn_communication_log', 'ip_master', 'bn_payment_profile',
    ]) {
      expect(tables.has(t), `${t} was not queried`).toBe(true);
    }
  });

  it('scenario `summary-medical-error` isolates a failing medical source', async () => {
    setErrors({ bn_medical_review_schedule: { message: 'medical unavailable' } });
    const s = await recorder.runAs('getAward360Summary', 'summary-medical-error', () =>
      getAward360Summary('a-1', { includeMedical: true }),
    );
    expect(s.medical.status).toBe('unavailable');
    expect(s.warnings.some((w) => w.includes('Medical review summary unavailable'))).toBe(true);
  });

  it('scenario `summary-communications-error` isolates a failing communications source', async () => {
    setResponses({ bn_award: { bn_claim_id: null } });
    setErrors({ bn_communication_log: { message: 'comm down' } });
    const s = await recorder.runAs('getAward360Summary', 'summary-communications-error', () =>
      getAward360Summary('a-1', { includeCommunications: true }),
    );
    expect(s.communications.status).toBe('unavailable');
  });

  it('scenario `summary-pensioner-alert-restricted` skips ip_master when permission absent', async () => {
    await recorder.runAs('getAward360Summary', 'summary-pensioner-alert-restricted', () =>
      getAward360Summary('a-1', {
        includePensionerAlert: true,
        canViewPerson360: false,
        canViewPaymentProfile: false,
      }),
    );
    const tables = recorder.queries.map((q) => q.table);
    expect(tables).not.toContain('ip_master');
    expect(tables).not.toContain('bn_payment_profile');
  });
});
