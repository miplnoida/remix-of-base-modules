/**
 * AW360-WAVE-1-C1 Slice B.1a Batch 2 §1 + §9 — recorder foundation.
 *
 * Certifies:
 *  §1  every wildcard-shaped .select() is rejected (no-arg, empty, whitespace, '*').
 *  §9  deterministic per-query error injection by (loader, scenario, table, occurrence).
 */
import { describe, it, expect } from 'vitest';
import { AwardQueryRecorder } from '@/test/mocks/award360QueryRecorder';

describe('AW360 Slice B.1a Batch 2 · recorder §1 — reject wildcard selects', () => {
  it('rejects .select() called with no argument', () => {
    const rec = new AwardQueryRecorder();
    expect(() => rec.client().from('bn_award').select()).toThrow(/without explicit columns/);
  });

  it("rejects .select('')", () => {
    const rec = new AwardQueryRecorder();
    expect(() => rec.client().from('bn_award').select('')).toThrow(/select\('\*'\) is forbidden/);
  });

  it("rejects .select('   ') (whitespace-only)", () => {
    const rec = new AwardQueryRecorder();
    expect(() => rec.client().from('bn_award').select('   ')).toThrow(/select\('\*'\) is forbidden/);
  });

  it("rejects .select('*')", () => {
    const rec = new AwardQueryRecorder();
    expect(() => rec.client().from('bn_award').select('*')).toThrow(/select\('\*'\) is forbidden/);
  });
});

describe('AW360 Slice B.1a Batch 2 · recorder §9 — deterministic per-query error injection', () => {
  it('fails only the Nth occurrence of a table query within a (loader, scenario)', async () => {
    const rec = new AwardQueryRecorder({
      responses: { bn_communication_log: [{ id: 'c-1' }] },
      scenarioErrors: [
        {
          loaderName: 'listAwardCommunications',
          scenarioId: 'occurrence-2-only',
          table: 'bn_communication_log',
          occurrence: 2,
          error: { code: 'TEST_ERROR', message: 'second call fails' },
        },
      ],
    });
    await rec.runAs('listAwardCommunications', 'occurrence-2-only', async () => {
      const c = rec.client();
      // First occurrence — succeeds.
      const r1 = await c.from('bn_communication_log')
        .select('id, claim_id')
        .eq('claim_id', 'cl-1');
      expect(r1.error).toBeNull();
      expect(r1.data).toEqual([{ id: 'c-1' }]);
      // Second occurrence — injected error.
      const r2 = await c.from('bn_communication_log')
        .select('id, claim_id')
        .eq('claim_id', 'cl-1');
      expect(r2.error).toMatchObject({ code: 'TEST_ERROR', message: 'second call fails' });
    });
  });

  it('scopes injection to loader/scenario — unrelated loaders are unaffected', async () => {
    const rec = new AwardQueryRecorder({
      responses: { bn_award: [{ id: 'a-1' }] },
      scenarioErrors: [
        {
          loaderName: 'loaderA',
          scenarioId: 'scenA',
          table: 'bn_award',
          error: { code: 'TEST_ERROR', message: 'A only' },
        },
      ],
    });
    await rec.runAs('loaderA', 'scenA', async () => {
      const r = await rec.client().from('bn_award').select('id').eq('id', 'a-1');
      expect(r.error).toMatchObject({ message: 'A only' });
    });
    await rec.runAs('loaderB', 'scenB', async () => {
      const r = await rec.client().from('bn_award').select('id').eq('id', 'a-1');
      expect(r.error).toBeNull();
      expect(r.data).toEqual([{ id: 'a-1' }]);
    });
  });

  it('a rule without occurrence applies to every query on the table', async () => {
    const rec = new AwardQueryRecorder({
      responses: { bn_award: [{ id: 'a-1' }] },
      scenarioErrors: [
        {
          loaderName: 'loaderA',
          scenarioId: 'scenA',
          table: 'bn_award',
          error: { code: 'TEST_ERROR', message: 'always' },
        },
      ],
    });
    await rec.runAs('loaderA', 'scenA', async () => {
      const c = rec.client();
      const r1 = await c.from('bn_award').select('id').eq('id', 'a-1');
      const r2 = await c.from('bn_award').select('id').eq('id', 'a-1');
      expect(r1.error).toMatchObject({ message: 'always' });
      expect(r2.error).toMatchObject({ message: 'always' });
    });
  });
});

// ─── Sub-batch B2-a §1 · construction-time occurrence + concurrent runAs ─
describe('AW360 Sub-batch B2-a · occurrence assigned at .from(table) time', () => {
  it('occurrence is immutable and reflects insertion order', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_award: [{ id: 'a-1' }] } });
    await rec.runAs('loaderA', 'scenA', async () => {
      const c = rec.client();
      const b1 = c.from('bn_award').select('id').eq('id', 'a-1');
      const b2 = c.from('bn_award').select('id').eq('id', 'a-1');
      // Occurrence set at construction time, not at await time.
      expect(rec.queries.map((q) => q.occurrence)).toEqual([1, 2]);
      await b1; await b2;
      expect(rec.queries.map((q) => q.occurrence)).toEqual([1, 2]);
    });
  });

  it('two concurrent runAs calls with identical (loader, scenario) tags do not share occurrences', async () => {
    const rec = new AwardQueryRecorder({
      responses: { bn_award: [{ id: 'a-1' }] },
      scenarioErrors: [
        {
          loaderName: 'loaderA', scenarioId: 'scenA', table: 'bn_award',
          occurrence: 1, error: { code: 'ONE', message: 'first only' },
        },
      ],
    });
    const runOne = () =>
      rec.runAs('loaderA', 'scenA', async () => {
        const c = rec.client();
        // Each parallel run's own first query hits occurrence=1 → error.
        const r = await c.from('bn_award').select('id').eq('id', 'a-1');
        expect(r.error).toMatchObject({ message: 'first only' });
      });
    await Promise.all([runOne(), runOne(), runOne()]);
    // Distinct executionIds prove per-call scoping.
    const execIds = new Set(rec.queries.map((q) => q.executionId));
    expect(execIds.size).toBe(3);
    for (const q of rec.queries) {
      expect(q.occurrence).toBe(1);
    }
  });

  it('occurrence resets between sequential runAs invocations', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_award: [{ id: 'a-1' }] } });
    await rec.runAs('loaderA', 'scenA', async () => {
      await rec.client().from('bn_award').select('id').eq('id', 'a-1');
      await rec.client().from('bn_award').select('id').eq('id', 'a-1');
    });
    await rec.runAs('loaderA', 'scenA', async () => {
      await rec.client().from('bn_award').select('id').eq('id', 'a-1');
    });
    const occs = rec.queries.map((q) => q.occurrence);
    expect(occs).toEqual([1, 2, 1]);
  });
});

// ─── Sub-batch B2-b.1b §1 · order diagnostic includes loader + scenario ──
describe('AW360 B2-b.1b · order() rejection includes loader and scenario', () => {
  it('surfaces loader=... and scenario=... in the diagnostic', async () => {
    const rec = new AwardQueryRecorder();
    let msg = '';
    try {
      await rec.runAs('someLoader', 'someScenario', async () => {
        rec.client().from('bn_payment_profile').order('updated_at');
      });
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/loader=someLoader/);
    expect(msg).toMatch(/scenario=someScenario/);
    expect(msg).toMatch(/Allowed order columns: effective_from/);
  });
});
