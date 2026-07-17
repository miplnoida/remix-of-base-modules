/**
 * BN-AWARD360-B5 — Award 360 lightweight summary certification.
 *
 * Proves:
 *   1. Restricted sections return status:'restricted' (not zero).
 *   2. Failed sections return status:'unavailable' (not zero).
 *   3. Confirmed empty returns status:'ok' with zero-valued fields.
 *   4. Sensitive medical columns (provider, outcome, remarks) are NEVER
 *      selected by the summary service.
 *   5. Communication rendered content (body/html/rendered) is NEVER selected.
 *   6. No `select('*')` is issued.
 *   7. Section-level failures are isolated (do not blank out other sections).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase client mock ────────────────────────────────────────────────
type BuilderRecording = {
  table: string;
  selects: string[];
  head: boolean;
  ops: Array<{ op: string; args: unknown[] }>;
};

const recordings: BuilderRecording[] = [];

// Per-table controls
type TableSpec = {
  data?: any[];
  count?: number;
  error?: { message: string } | null;
  failEachCall?: boolean;
};
const tableSpecs = new Map<string, TableSpec>();

function makeBuilder(table: string) {
  const rec: BuilderRecording = { table, selects: [], head: false, ops: [] };
  recordings.push(rec);
  const spec = tableSpecs.get(table) ?? {};
  const settle = () => {
    if (spec.error) return Promise.resolve({ data: null, error: spec.error, count: null });
    if (rec.head) return Promise.resolve({ data: null, error: null, count: spec.count ?? 0 });
    return Promise.resolve({ data: spec.data ?? [], error: null, count: spec.count ?? (spec.data?.length ?? 0) });
  };
  const settleSingle = () => {
    if (spec.error) return Promise.resolve({ data: null, error: spec.error });
    const first = (spec.data ?? [])[0] ?? null;
    return Promise.resolve({ data: first, error: null });
  };
  const chain: any = {
    select: (cols: string, opts?: { count?: 'exact'; head?: boolean }) => {
      rec.selects.push(cols);
      if (opts?.head) rec.head = true;
      return chain;
    },
    eq: (...args: unknown[]) => { rec.ops.push({ op: 'eq', args }); return chain; },
    neq: (...args: unknown[]) => { rec.ops.push({ op: 'neq', args }); return chain; },
    in: (...args: unknown[]) => { rec.ops.push({ op: 'in', args }); return chain; },
    lt: (...args: unknown[]) => { rec.ops.push({ op: 'lt', args }); return chain; },
    lte: (...args: unknown[]) => { rec.ops.push({ op: 'lte', args }); return chain; },
    gte: (...args: unknown[]) => { rec.ops.push({ op: 'gte', args }); return chain; },
    not: (...args: unknown[]) => { rec.ops.push({ op: 'not', args }); return chain; },
    is: (...args: unknown[]) => { rec.ops.push({ op: 'is', args }); return chain; },
    contains: (...args: unknown[]) => { rec.ops.push({ op: 'contains', args }); return chain; },
    order: (...args: unknown[]) => { rec.ops.push({ op: 'order', args }); return chain; },
    limit: (...args: unknown[]) => { rec.ops.push({ op: 'limit', args }); return chain; },
    maybeSingle: () => settleSingle(),
    single: () => settleSingle(),
    then: (resolve: any, reject: any) => settle().then(resolve, reject),
  };
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => makeBuilder(table),
  },
}));

import { getAward360Summary } from '@/services/bn/awards/award360SummaryService';

const AWARD_ID = 'award-cert-1';

const allInclude = {
  includeBeneficiaries: true,
  includeSchedule: true,
  includePayments: true,
  includeLifeCertificates: true,
  includeMedical: true,
  includeSuspensions: true,
  includeOverpayments: true,
  includeCommunications: true,
};

beforeEach(() => {
  recordings.length = 0;
  tableSpecs.clear();
});

describe('BN-AWARD360-B5 · Award 360 summary certification', () => {
  it('restricted sections are not queried and return status:"restricted"', async () => {
    const s = await getAward360Summary(AWARD_ID, {
      includeBeneficiaries: false,
      includeSchedule: false,
      includePayments: false,
      includeLifeCertificates: false,
      includeMedical: false,
      includeSuspensions: false,
      includeOverpayments: false,
      includeCommunications: false,
    });
    expect(recordings).toHaveLength(0);
    expect(s.beneficiaries.status).toBe('restricted');
    expect(s.schedule.status).toBe('restricted');
    expect(s.payments.status).toBe('restricted');
    expect(s.lifeCertificates.status).toBe('restricted');
    expect(s.medical.status).toBe('restricted');
    expect(s.suspensions.status).toBe('restricted');
    expect(s.overpayments.status).toBe('restricted');
    expect(s.communications.status).toBe('restricted');
    expect(s.warnings).toEqual([]);
  });

  it('empty data returns status:"ok" with zero-valued fields (confirmed zero)', async () => {
    // All tables return empty results
    const s = await getAward360Summary(AWARD_ID, allInclude);
    expect(s.beneficiaries.status).toBe('ok');
    if (s.beneficiaries.status === 'ok') {
      expect(s.beneficiaries.value.count).toBe(0);
      expect(s.beneficiaries.value.activeCount).toBe(0);
    }
    expect(s.schedule.status).toBe('ok');
    expect(s.medical.status).toBe('ok');
    expect(s.warnings).toEqual([]);
  });

  it('per-section failure surfaces status:"unavailable" without collapsing others', async () => {
    tableSpecs.set('bn_medical_review_schedule', { error: { message: 'medical query failed' } });
    tableSpecs.set('bn_award_beneficiary', { data: [{ status: 'ACTIVE', share_percent: 100 }] });
    const s = await getAward360Summary(AWARD_ID, allInclude);
    expect(s.medical.status).toBe('unavailable');
    if (s.medical.status === 'unavailable') {
      expect(s.medical.reason).toContain('medical query failed');
    }
    // Beneficiaries still resolves OK
    expect(s.beneficiaries.status).toBe('ok');
    if (s.beneficiaries.status === 'ok') {
      expect(s.beneficiaries.value.count).toBe(1);
    }
    expect(s.warnings.some((w) => w.includes('Medical review summary unavailable'))).toBe(true);
  });

  it('never selects sensitive medical columns', async () => {
    await getAward360Summary(AWARD_ID, allInclude);
    const medicalCalls = recordings.filter((r) => r.table === 'bn_medical_review_schedule');
    expect(medicalCalls.length).toBeGreaterThan(0);
    for (const call of medicalCalls) {
      for (const sel of call.selects) {
        expect(sel).not.toMatch(/provider/i);
        expect(sel).not.toMatch(/outcome/i);
        expect(sel).not.toMatch(/remarks/i);
      }
    }
  });

  it('never selects communication rendered content (body/html)', async () => {
    await getAward360Summary(AWARD_ID, allInclude);
    const commCalls = recordings.filter((r) => r.table === 'bn_communication_log');
    for (const call of commCalls) {
      for (const sel of call.selects) {
        expect(sel).not.toMatch(/body/i);
        expect(sel).not.toMatch(/html/i);
        expect(sel).not.toMatch(/rendered/i);
        expect(sel).not.toMatch(/content/i);
      }
    }
  });

  it('never issues select("*")', async () => {
    await getAward360Summary(AWARD_ID, allInclude);
    for (const rec of recordings) {
      for (const sel of rec.selects) {
        expect(sel).not.toBe('*');
      }
    }
  });

  it('queries are always scoped by award_id', async () => {
    await getAward360Summary(AWARD_ID, allInclude);
    for (const rec of recordings) {
      const eqOps = rec.ops.filter((o) => o.op === 'eq');
      const scopedByAward = eqOps.some((o) => o.args[0] === 'award_id' && o.args[1] === AWARD_ID);
      expect(scopedByAward, `${rec.table} not scoped by award_id`).toBe(true);
    }
  });

  it('uses count/head queries for pure counts (communications failed count)', async () => {
    tableSpecs.set('bn_communication_log', { count: 3 });
    const s = await getAward360Summary(AWARD_ID, {
      ...allInclude,
      includeBeneficiaries: false,
      includeSchedule: false,
      includePayments: false,
      includeLifeCertificates: false,
      includeMedical: false,
      includeSuspensions: false,
      includeOverpayments: false,
    });
    const commRec = recordings.find((r) => r.table === 'bn_communication_log');
    expect(commRec?.head).toBe(true);
    expect(s.communications.status).toBe('ok');
    if (s.communications.status === 'ok') {
      expect(s.communications.value.failedCount).toBe(3);
    }
  });
});
