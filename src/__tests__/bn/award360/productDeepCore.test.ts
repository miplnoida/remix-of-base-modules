/**
 * AW360-WAVE-1-C1 Sub-batch B2-c.1 — Product Deep core-path certification.
 *
 * Runs the REAL `getAwardProductDeep` loader through the shared
 * `AwardQueryRecorder` and validates every recorded query against
 * `AWARD360_SCHEMA_CONTRACT`. This is CORE_PATH_CERTIFIED evidence
 * only — the optional-source failure matrix is deferred to B2-c.2, so
 * this loader remains `pendingExecution: true` in the manifest and is
 * **not** added to `AWARD360_CERTIFICATION_REGISTRY`.
 *
 * Scope coverage in this file:
 *   • Primary Award/Product semantics
 *   • Version resolution via bn_award.bn_claim_id → bn_claim.product_version_id
 *   • Exact bn_product_version selection (every readiness field)
 *   • Configuration permission suppression
 *   • Full-ready readiness result
 *   • Missing / partial / not-applicable readiness result
 *   • Product-mismatch, publication and effective-date warnings
 *   • Exact scope/filter/count/head assertions
 *   • Negative scope-contract guards
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AwardQueryRecorder } from '@/test/mocks/award360QueryRecorder';

const holder = vi.hoisted(() => ({ recorder: null as AwardQueryRecorder | null }));

vi.mock('@/integrations/supabase/client', () => {
  const supabase = {
    from(table: string) {
      if (!holder.recorder) throw new Error('AwardQueryRecorder not initialised');
      return holder.recorder.client().from(table);
    },
  };
  return { supabase };
});

holder.recorder = new AwardQueryRecorder();
const recorder = holder.recorder;

import { getAwardProductDeep } from '@/services/bn/awards/award360DeepService';

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
  (recorder as any).opts.scenarioErrors = [];
  (recorder as any).opts.scenarioResponses = [];
});

// ─── fixtures ─────────────────────────────────────────────────────────────
const A_ID = 'a-1';
const P_ID = 'p-1';
const C_ID = 'c-1';
const PV_ID = 'pv-1';

/** Fixed-date award start well inside version effective range. */
const AWARD_START = '2024-06-01';

const AWARD_ROW = {
  id: A_ID,
  bn_product_id: P_ID,
  bn_claim_id: C_ID,
  start_date: AWARD_START,
  base_amount: 100,
};

const PRODUCT_ROW = {
  id: P_ID,
  benefit_code: 'RET',
  benefit_name: 'Retirement',
  description: 'Retirement benefit',
  scheme_id: 'S-1',
  branch_id: 'B-1',
  category: 'PENSION',
  branch: 'B-1',
  payment_type: 'RECURRING',
  country_code: 'KN',
  status: 'ACTIVE',
};

/** Every field the readiness resolver reads MUST be present here. */
const REQUIRED_VERSION_SELECT_FIELDS = [
  'id', 'product_id', 'version_number', 'status',
  'effective_from', 'effective_to',
  'entered_by', 'entered_at', 'modified_by', 'modified_at',
  'formula_template_id', 'workflow_template_id',
  'document_profile_id', 'screen_template_id',
  'payment_frequency',
  'life_certificate_policy', 'medical_review_policy',
  'review_policy', 'survivor_beneficiary_policy',
] as const;

function versionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: PV_ID,
    product_id: P_ID,
    version_number: 3,
    status: 'PUBLISHED',
    effective_from: '2024-01-01',
    effective_to: '2025-12-31',
    entered_by: 'u-1',
    entered_at: '2024-01-01T00:00:00Z',
    modified_by: 'u-1',
    modified_at: '2024-01-01T00:00:00Z',
    formula_template_id: 'ft-1',
    workflow_template_id: 'wf-1',
    document_profile_id: 'dp-1',
    screen_template_id: 'st-1',
    payment_frequency: 'MONTHLY',
    life_certificate_policy: { every: 'YEAR' },
    medical_review_policy: { every: '2Y' },
    review_policy: { window: '30D' },
    survivor_beneficiary_policy: { rule: 'SPOUSE_FIRST' },
    ...overrides,
  };
}

const FULL_ACCESS = { canViewConfiguration: true };
const NO_CONFIG = { canViewConfiguration: false };

const queriesByTable = () => {
  const map: Record<string, number> = {};
  for (const q of recorder.queries) map[q.table] = (map[q.table] ?? 0) + 1;
  return map;
};

// ═════════════════════════════════════════════════════════════════════════
describe('AW360 B2-c.1 · getAwardProductDeep — primary-source semantics', () => {
  it('scenario `product-deep-award-without-product` returns null and never queries downstream', async () => {
    setResponses({
      bn_award: { ...AWARD_ROW, bn_product_id: null, bn_claim_id: null },
    });
    const v = await recorder.runAs('getAwardProductDeep', 'product-deep-award-without-product', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    expect(v).toBeNull();
    expect(recorder.queries.map((q) => q.table)).toEqual(['bn_award']);
  });

  it('scenario `product-deep-award-query-error` rejects (no downstream queries)', async () => {
    setErrors({ bn_award: { message: 'award unavailable' } });
    await expect(
      recorder.runAs('getAwardProductDeep', 'product-deep-award-query-error', () =>
        getAwardProductDeep(A_ID, FULL_ACCESS),
      ),
    ).rejects.toBeTruthy();
    expect(recorder.queries.map((q) => q.table)).toEqual(['bn_award']);
  });

  it('scenario `product-deep-product-not-found` returns null after bn_product miss', async () => {
    setResponses({ bn_award: AWARD_ROW, bn_product: null });
    const v = await recorder.runAs('getAwardProductDeep', 'product-deep-product-not-found', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    expect(v).toBeNull();
    expect(recorder.queries.map((q) => q.table)).toEqual(['bn_award', 'bn_product']);
  });

  it('scenario `product-deep-product-query-error` rejects after bn_award succeeds', async () => {
    setResponses({ bn_award: AWARD_ROW });
    setErrors({ bn_product: { message: 'product unavailable' } });
    await expect(
      recorder.runAs('getAwardProductDeep', 'product-deep-product-query-error', () =>
        getAwardProductDeep(A_ID, FULL_ACCESS),
      ),
    ).rejects.toBeTruthy();
    expect(recorder.queries.map((q) => q.table)).toEqual(['bn_award', 'bn_product']);
  });

  it('product identity maps benefit_code / benefit_name / scheme_id / branch_id (never product_code)', async () => {
    setResponses({
      bn_award: { ...AWARD_ROW, bn_claim_id: null },
      bn_product: PRODUCT_ROW,
    });
    const v = await recorder.runAs('getAwardProductDeep', 'product-identity-mapping', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    expect(v).not.toBeNull();
    expect(v!.identity.productCode).toBe('RET');
    expect(v!.identity.productName).toBe('Retirement');
    expect(v!.identity.benefitCode).toBe('RET');
    expect(v!.identity.scheme).toBe('S-1');
    expect(v!.identity.branch).toBe('B-1');
    // Never selects a legacy `product_code` / `product_name` column.
    const pq = recorder.queries.find((q) => q.table === 'bn_product')!;
    expect(pq.selectedColumns).not.toContain('product_code');
    expect(pq.selectedColumns).not.toContain('product_name');
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('AW360 B2-c.1 · getAwardProductDeep — Product Version resolution', () => {
  it('scenario `product-deep-no-linked-claim` skips bn_claim/bn_product_version and leaves readiness NOT_APPLICABLE', async () => {
    setResponses({
      bn_award: { ...AWARD_ROW, bn_claim_id: null },
      bn_product: PRODUCT_ROW,
    });
    const v = await recorder.runAs('getAwardProductDeep', 'product-deep-no-linked-claim', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    expect(v).not.toBeNull();
    expect(v!.version.present).toBe(false);
    expect(v!.warnings.some((w) => w.key === 'MISSING_VERSION')).toBe(true);
    // 12 readiness rows, all NOT_APPLICABLE (configuration access granted,
    // no version resolved).
    expect(v!.readiness).toHaveLength(12);
    for (const r of v!.readiness) expect(r.state).toBe('NOT_APPLICABLE');
    const tables = new Set(recorder.queries.map((q) => q.table));
    expect(tables.has('bn_claim')).toBe(false);
    expect(tables.has('bn_product_version')).toBe(false);
  });

  it('scenario `product-deep-claim-without-version` queries bn_claim but not bn_product_version', async () => {
    setResponses({
      bn_award: AWARD_ROW,
      bn_product: PRODUCT_ROW,
      bn_claim: { product_version_id: null },
    });
    const v = await recorder.runAs('getAwardProductDeep', 'product-deep-claim-without-version', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    expect(v).not.toBeNull();
    expect(v!.version.present).toBe(false);
    expect(v!.warnings.some((w) => w.key === 'MISSING_VERSION')).toBe(true);
    const tables = recorder.queries.map((q) => q.table);
    expect(tables).toContain('bn_claim');
    expect(tables).not.toContain('bn_product_version');
    // Claim scope must be by id under this loader.
    const claimQ = recorder.queries.find((q) => q.table === 'bn_claim')!;
    expect(claimQ.filters.some((f) => f.method === 'eq' && f.column === 'id' && f.value === C_ID)).toBe(true);
  });

  it('bn_product_version select covers every readiness field (exact contract)', async () => {
    setResponses({
      bn_award: AWARD_ROW,
      bn_product: PRODUCT_ROW,
      bn_claim: { product_version_id: PV_ID },
      bn_product_version: versionRow(),
      // Config queries can return empty; this test asserts the SELECT only.
      bn_product_formula_binding: [],
      bn_eligibility_rule: [],
      bn_approval_policy: [],
      bn_comm_mapping: [],
    });
    await recorder.runAs('getAwardProductDeep', 'product-deep-version-select-contract', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    const pvQ = recorder.queries.find((q) => q.table === 'bn_product_version')!;
    for (const f of REQUIRED_VERSION_SELECT_FIELDS) {
      expect(pvQ.selectedColumns, `bn_product_version select missing "${f}"`).toContain(f);
    }
    // pv scope by id.
    expect(pvQ.filters.some((f) => f.method === 'eq' && f.column === 'id' && f.value === PV_ID)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('AW360 B2-c.1 · getAwardProductDeep — configuration permission suppression', () => {
  it('scenario `product-deep-configuration-restricted` never queries configuration sources', async () => {
    setResponses({
      bn_award: AWARD_ROW,
      bn_product: PRODUCT_ROW,
      bn_claim: { product_version_id: PV_ID },
      bn_product_version: versionRow(),
    });
    const v = await recorder.runAs('getAwardProductDeep', 'product-deep-configuration-restricted', () =>
      getAwardProductDeep(A_ID, NO_CONFIG),
    );
    expect(v).not.toBeNull();
    expect(v!.restrictedConfiguration).toBe(true);
    // Award / Product / Claim / Version still resolved.
    expect(v!.identity.productId).toBe(P_ID);
    expect(v!.version.present).toBe(true);
    // No configuration table was touched.
    const tables = new Set(recorder.queries.map((q) => q.table));
    for (const t of ['bn_product_formula_binding', 'bn_eligibility_rule', 'bn_approval_policy', 'bn_comm_mapping']) {
      expect(tables.has(t), `${t} must not be queried under restricted configuration`).toBe(false);
    }
    // All 12 readiness rows RESTRICTED — not MISSING.
    expect(v!.readiness).toHaveLength(12);
    for (const r of v!.readiness) expect(r.state).toBe('RESTRICTED');
    // No MISSING_* warning emitted merely because access is restricted.
    for (const w of v!.warnings) {
      expect(w.key.startsWith('MISSING_')).toBe(false);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('AW360 B2-c.1 · getAwardProductDeep — full-ready readiness', () => {
  it('scenario `product-deep-full-ready` yields READY on every row and clean version flags', async () => {
    setResponses({
      bn_award: AWARD_ROW,
      bn_product: PRODUCT_ROW,
      bn_claim: { product_version_id: PV_ID },
      bn_product_version: versionRow(),
      bn_product_formula_binding: [{ id: 'fb-1', formula_template_id: 'ft-1', formula_version_id: 'fv-1', calculation_stage: 'BASE' }],
      // Count queries: recorder returns count = data.length.
      bn_eligibility_rule: [{ id: 'er-1' }],
      bn_approval_policy: [{ id: 'ap-1' }],
      // Communication mappings require count >= 3 for READY.
      bn_comm_mapping: [{ id: 'cm-1' }, { id: 'cm-2' }, { id: 'cm-3' }],
    });
    const v = await recorder.runAs('getAwardProductDeep', 'product-deep-full-ready', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    expect(v).not.toBeNull();
    // Version flags.
    expect(v!.version.productMatchesAward).toBe(true);
    expect(v!.version.awardWithinEffective).toBe(true);
    expect(v!.version.published).toBe(true);
    // Every readiness row READY.
    const byKey = new Map(v!.readiness.map((r) => [r.key, r.state]));
    for (const key of ['FORMULA', 'ELIG', 'WF', 'APPROVAL', 'DOC', 'SCREEN', 'PAY', 'LC', 'MR', 'SUSP', 'BEN', 'COMM']) {
      expect(byKey.get(key), `readiness ${key} not READY`).toBe('READY');
    }
    // No missing-readiness warnings.
    for (const w of v!.warnings) {
      expect(w.key.startsWith('MISSING_')).toBe(false);
      expect(w.key).not.toBe('INCOMPLETE_COMM');
      expect(w.key).not.toBe('PRODUCT_VERSION_MISMATCH');
      expect(w.key).not.toBe('VERSION_NOT_PUBLISHED');
      expect(w.key).not.toBe('OUTSIDE_EFFECTIVE');
    }

    // Exact scope / filter / count / head contracts on readiness sources.
    const fbQ = recorder.queries.find((q) => q.table === 'bn_product_formula_binding')!;
    expect(fbQ.filters.some((f) => f.method === 'eq' && f.column === 'product_version_id' && f.value === PV_ID)).toBe(true);

    const eligQ = recorder.queries.find((q) => q.table === 'bn_eligibility_rule')!;
    expect(eligQ.filters.some((f) => f.method === 'eq' && f.column === 'product_version_id' && f.value === PV_ID)).toBe(true);
    expect(eligQ.filters.some((f) => f.method === 'eq' && f.column === 'is_active' && f.value === true)).toBe(true);
    expect(eligQ.countMode).toBe('exact');
    expect(eligQ.head).toBe(true);

    const apQ = recorder.queries.find((q) => q.table === 'bn_approval_policy')!;
    expect(apQ.filters.some((f) => f.method === 'eq' && f.column === 'product_version_id' && f.value === PV_ID)).toBe(true);
    expect(apQ.filters.some((f) => f.method === 'eq' && f.column === 'is_enabled' && f.value === true)).toBe(true);
    expect(apQ.countMode).toBe('exact');
    expect(apQ.head).toBe(true);

    const commQ = recorder.queries.find((q) => q.table === 'bn_comm_mapping')!;
    expect(commQ.filters.some((f) => f.method === 'eq' && f.column === 'bn_product_version_id' && f.value === PV_ID)).toBe(true);
    expect(commQ.filters.some((f) => f.method === 'eq' && f.column === 'active' && f.value === true)).toBe(true);
    expect(commQ.countMode).toBe('exact');
    expect(commQ.head).toBe(true);

    // No configuration source uses Award or Product ID as its scope.
    for (const t of ['bn_product_formula_binding', 'bn_eligibility_rule', 'bn_approval_policy', 'bn_comm_mapping']) {
      const q = recorder.queries.find((r) => r.table === t)!;
      for (const f of q.filters) {
        if (f.method === 'eq') {
          expect(f.column === 'product_id' && f.value === P_ID).toBe(false);
          expect(f.column === 'bn_award_id').toBe(false);
        }
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('AW360 B2-c.1 · getAwardProductDeep — consistency and date warnings', () => {
  it('scenario `product-deep-version-product-mismatch` emits PRODUCT_VERSION_MISMATCH', async () => {
    setResponses({
      bn_award: AWARD_ROW,
      bn_product: PRODUCT_ROW,
      bn_claim: { product_version_id: PV_ID },
      // Version belongs to a different product.
      bn_product_version: versionRow({ product_id: 'p-OTHER' }),
      bn_product_formula_binding: [],
      bn_eligibility_rule: [],
      bn_approval_policy: [],
      bn_comm_mapping: [],
    });
    const v = await recorder.runAs('getAwardProductDeep', 'product-deep-version-product-mismatch', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    expect(v).not.toBeNull();
    expect(v!.version.productMatchesAward).toBe(false);
    expect(v!.warnings.some((w) => w.key === 'PRODUCT_VERSION_MISMATCH')).toBe(true);
    // Product identity remains the Award-linked Product, not the version product.
    expect(v!.identity.productId).toBe(P_ID);
  });

  it('scenario `product-deep-version-not-published` emits VERSION_NOT_PUBLISHED', async () => {
    setResponses({
      bn_award: AWARD_ROW,
      bn_product: PRODUCT_ROW,
      bn_claim: { product_version_id: PV_ID },
      bn_product_version: versionRow({ status: 'DRAFT' }),
      bn_product_formula_binding: [],
      bn_eligibility_rule: [],
      bn_approval_policy: [],
      bn_comm_mapping: [],
    });
    const v = await recorder.runAs('getAwardProductDeep', 'product-deep-version-not-published', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    expect(v!.version.published).toBe(false);
    expect(v!.warnings.some((w) => w.key === 'VERSION_NOT_PUBLISHED')).toBe(true);
  });

  it('scenario `product-deep-award-outside-effective-period` emits OUTSIDE_EFFECTIVE', async () => {
    setResponses({
      bn_award: { ...AWARD_ROW, start_date: '2026-01-15' }, // after effective_to 2025-12-31
      bn_product: PRODUCT_ROW,
      bn_claim: { product_version_id: PV_ID },
      bn_product_version: versionRow(),
      bn_product_formula_binding: [],
      bn_eligibility_rule: [],
      bn_approval_policy: [],
      bn_comm_mapping: [],
    });
    const v = await recorder.runAs('getAwardProductDeep', 'product-deep-award-outside-effective-period', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    expect(v!.version.awardWithinEffective).toBe(false);
    expect(v!.warnings.some((w) => w.key === 'OUTSIDE_EFFECTIVE')).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('AW360 B2-c.1 · getAwardProductDeep — missing configuration semantics', () => {
  it('scenario `product-deep-missing-configuration` maps missing readiness exactly', async () => {
    setResponses({
      bn_award: AWARD_ROW,
      bn_product: PRODUCT_ROW,
      bn_claim: { product_version_id: PV_ID },
      bn_product_version: versionRow({
        formula_template_id: null,
        workflow_template_id: null,
        document_profile_id: null,
        screen_template_id: null,
        payment_frequency: null,
        life_certificate_policy: null,
        medical_review_policy: null,
        review_policy: null,
        survivor_beneficiary_policy: null,
      }),
      bn_product_formula_binding: [],
      bn_eligibility_rule: [],
      bn_approval_policy: [],
      bn_comm_mapping: [],
    });
    const v = await recorder.runAs('getAwardProductDeep', 'product-deep-missing-configuration', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    expect(v).not.toBeNull();
    const byKey = new Map(v!.readiness.map((r) => [r.key, r.state]));
    // Required missing items.
    expect(byKey.get('FORMULA')).toBe('MISSING'); // formula_template_id null → MISSING (not PARTIAL)
    expect(byKey.get('ELIG')).toBe('MISSING');
    expect(byKey.get('WF')).toBe('MISSING');
    expect(byKey.get('APPROVAL')).toBe('MISSING');
    expect(byKey.get('DOC')).toBe('MISSING');
    expect(byKey.get('SCREEN')).toBe('MISSING');
    expect(byKey.get('PAY')).toBe('MISSING');
    // Comm mappings at zero → MISSING.
    expect(byKey.get('COMM')).toBe('MISSING');
    // Optional policies genuinely not configured → NOT_APPLICABLE.
    expect(byKey.get('LC')).toBe('NOT_APPLICABLE');
    expect(byKey.get('MR')).toBe('NOT_APPLICABLE');
    expect(byKey.get('SUSP')).toBe('NOT_APPLICABLE');
    expect(byKey.get('BEN')).toBe('NOT_APPLICABLE');
    // Warning keys for the required-missing items.
    const wkeys = new Set(v!.warnings.map((w) => w.key));
    for (const key of ['MISSING_FORMULA', 'MISSING_ELIG', 'MISSING_WF', 'MISSING_DOC', 'MISSING_PAY']) {
      expect(wkeys.has(key), `expected ${key} warning`).toBe(true);
    }
    // INCOMPLETE_COMM must NOT be emitted at zero mappings.
    expect(wkeys.has('INCOMPLETE_COMM')).toBe(false);
  });

  it('formula_template_id present with zero bindings yields PARTIAL, not MISSING', async () => {
    setResponses({
      bn_award: AWARD_ROW,
      bn_product: PRODUCT_ROW,
      bn_claim: { product_version_id: PV_ID },
      bn_product_version: versionRow({ formula_template_id: 'ft-1' }),
      bn_product_formula_binding: [],
      bn_eligibility_rule: [],
      bn_approval_policy: [],
      bn_comm_mapping: [],
    });
    const v = await recorder.runAs('getAwardProductDeep', 'product-deep-formula-partial', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    const byKey = new Map(v!.readiness.map((r) => [r.key, r.state]));
    expect(byKey.get('FORMULA')).toBe('PARTIAL');
  });

  it('one or two active comm mappings → PARTIAL + INCOMPLETE_COMM warning', async () => {
    setResponses({
      bn_award: AWARD_ROW,
      bn_product: PRODUCT_ROW,
      bn_claim: { product_version_id: PV_ID },
      bn_product_version: versionRow(),
      bn_product_formula_binding: [{ id: 'fb-1' }],
      bn_eligibility_rule: [{ id: 'er-1' }],
      bn_approval_policy: [{ id: 'ap-1' }],
      bn_comm_mapping: [{ id: 'cm-1' }, { id: 'cm-2' }],
    });
    const v = await recorder.runAs('getAwardProductDeep', 'product-deep-comm-partial', () =>
      getAwardProductDeep(A_ID, FULL_ACCESS),
    );
    const byKey = new Map(v!.readiness.map((r) => [r.key, r.state]));
    expect(byKey.get('COMM')).toBe('PARTIAL');
    expect(v!.warnings.some((w) => w.key === 'INCOMPLETE_COMM')).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('AW360 B2-c.1 · getAwardProductDeep — scope / contract guards (negative)', () => {
  it('bn_claim scoped only by ssn fails under this loader (loader-specific eq(id) required)', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_claim: [] } });
    await expect(
      rec.runAs('getAwardProductDeep', 'neg-scope-ssn', async () => {
        await rec.client().from('bn_claim').select('id, ssn').eq('ssn', 'SSN-1');
      }),
    ).rejects.toThrow(/required scope/);
  });

  it('bn_claim scoped by eq(id) passes under this loader', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_claim: [] } });
    await rec.runAs('getAwardProductDeep', 'pos-scope-id', async () => {
      await rec.client().from('bn_claim').select('id, ssn').eq('id', 'c-1');
    });
    expect(rec.queries).toHaveLength(1);
  });

  it('configuration query scoped by product_id instead of product_version_id fails', async () => {
    const rec = new AwardQueryRecorder();
    await expect(
      rec.runAs('getAwardProductDeep', 'neg-scope-wrong-pv', async () => {
        await rec.client().from('bn_eligibility_rule')
          .select('id', { count: 'exact', head: true })
          .eq('product_id' as any, 'p-1');
      }),
    ).rejects.toThrow(); // either unknown-column or required-scope diagnostic
  });

  it('configuration query referencing an unapproved column fails', async () => {
    const rec = new AwardQueryRecorder();
    await expect(
      rec.runAs('getAwardProductDeep', 'neg-scope-unknown-col', async () => {
        await rec.client().from('bn_approval_policy')
          .select('id, nonexistent_column' as any)
          .eq('product_version_id', 'pv-1');
      }),
    ).rejects.toThrow(/unknown column/);
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe('AW360 B2-c.1 · Product Deep remains pending & absent from the registry', () => {
  it('manifest keeps getAwardProductDeep pendingExecution and lists 8 expected tables', async () => {
    const { AWARD360_LOADER_MANIFEST } = await import(
      '@/services/bn/awards/award360LoaderManifest'
    );
    const entry = AWARD360_LOADER_MANIFEST.find((e) => e.name === 'getAwardProductDeep')!;
    expect(entry.pendingExecution).toBe(true);
    expect([...(entry.expectedTables ?? [])].sort()).toEqual(
      [
        'bn_approval_policy',
        'bn_award',
        'bn_claim',
        'bn_comm_mapping',
        'bn_eligibility_rule',
        'bn_product',
        'bn_product_formula_binding',
        'bn_product_version',
      ].sort(),
    );
  });

  it('getAwardProductDeep is NOT in AWARD360_CERTIFICATION_REGISTRY (deferred to B2-c.2)', async () => {
    const { AWARD360_CERTIFICATION_REGISTRY } = await import(
      '@/services/bn/awards/award360CertificationRegistry'
    );
    expect(
      Object.prototype.hasOwnProperty.call(AWARD360_CERTIFICATION_REGISTRY, 'getAwardProductDeep'),
    ).toBe(false);
  });

  it('sanity: touched only Product-Deep-surface tables in this file', () => {
    const observed = new Set(recorder.queries.map((q) => q.table));
    for (const t of observed) {
      expect(
        [
          'bn_award', 'bn_product', 'bn_claim', 'bn_product_version',
          'bn_product_formula_binding', 'bn_eligibility_rule',
          'bn_approval_policy', 'bn_comm_mapping',
        ].includes(t),
        `unexpected table ${t}`,
      ).toBe(true);
    }
    // Reference queriesByTable helper (kept for scenario diagnostics).
    expect(typeof queriesByTable).toBe('function');
  });

});
