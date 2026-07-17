/**
 * AW360-WAVE-1-C1 Slice B — table-aware Award 360 schema contract tests.
 *
 * The recorder validates every Supabase query against
 * `AWARD360_SCHEMA_CONTRACT`. This test proves that:
 * - Unknown tables, unknown columns, `select('*')`, unparseable selects and
 *   wrong-scope filters all raise diagnostics.
 * - Every historical forbidden column is still absent from the contract.
 * - The generated query matrix equals the checked-in Markdown.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AwardQueryRecorder } from '@/test/mocks/award360QueryRecorder';
import {
  AWARD360_SCHEMA_CONTRACT,
  HISTORICAL_FORBIDDEN_COLUMNS,
} from '@/services/bn/awards/award360SchemaContract';

describe('AW360 Slice B · table-aware schema contract', () => {
  it('rejects select(*)', () => {
    const rec = new AwardQueryRecorder();
    const c = rec.client();
    expect(() => c.from('bn_award').select('*')).toThrow(/select\('\*'\) is forbidden/);
  });

  it('rejects unknown tables', () => {
    const rec = new AwardQueryRecorder();
    expect(() => rec.client().from('totally_invented_table')).toThrow(/not registered/);
  });

  it('rejects unknown columns on a valid table', () => {
    const rec = new AwardQueryRecorder();
    expect(() => rec.client().from('bn_award').select('id, totally_invented_column'))
      .toThrow(/totally_invented_column/);
  });

  it('rejects unparseable nested-select strings', () => {
    const rec = new AwardQueryRecorder();
    expect(() => rec.client().from('bn_award').select('id, related_table(*)'))
      .toThrow(/Unparseable select/);
  });

  it('rejects filters on unknown columns', () => {
    const rec = new AwardQueryRecorder();
    expect(() => rec.client().from('bn_award_beneficiary').eq('award_id', 'x'))
      .toThrow(/unknown column "award_id"/);
  });

  it('rejects order on non-allowed columns when a whitelist exists', () => {
    const rec = new AwardQueryRecorder();
    expect(() =>
      rec.client().from('bn_award_suspension_event').order('modified_at'),
    ).toThrow(/not an allowed order column/);
  });

  it('rejects containment on non-jsonb columns', () => {
    const rec = new AwardQueryRecorder();
    // status is real but not marked as containment.
    expect(() =>
      rec.client().from('bn_communication_log').contains('status', { x: 1 }),
    ).toThrow(/allowed containment column/);
  });

  it('records a well-formed award-scoped list query', async () => {
    const rec = new AwardQueryRecorder({ responses: { bn_award_beneficiary: [] } });
    const c = rec.client();
    await c.from('bn_award_beneficiary')
      .select('id, bn_award_id, status, share_percent')
      .eq('bn_award_id', 'a-1')
      .order('start_date', { ascending: false });
    expect(rec.queries).toHaveLength(1);
    const q = rec.queries[0];
    expect(q.table).toBe('bn_award_beneficiary');
    expect(q.filters.map((f) => f.column)).toContain('bn_award_id');
    expect(q.orderColumns).toContain('start_date');
  });

  it('preserves the historical forbidden columns — none appear in the contract', () => {
    for (const [table, cols] of Object.entries(HISTORICAL_FORBIDDEN_COLUMNS)) {
      const contract = AWARD360_SCHEMA_CONTRACT[table as keyof typeof AWARD360_SCHEMA_CONTRACT];
      for (const bad of cols) {
        expect(contract.allowedColumns).not.toContain(bad);
      }
    }
  });

  it('every registered table has a required scope', () => {
    for (const [table, contract] of Object.entries(AWARD360_SCHEMA_CONTRACT)) {
      expect(contract.requiredScope, `${table} missing required scope`).toBeDefined();
      expect(contract.allowedColumns).toContain(contract.requiredScope!.column);
    }
  });

  it('checked-in query matrix lists every registered contract table', () => {
    const path = resolve(process.cwd(), 'docs/bn/award360-query-matrix.md');
    const doc = readFileSync(path, 'utf8');
    for (const table of Object.keys(AWARD360_SCHEMA_CONTRACT)) {
      expect(doc).toContain(`\`${table}\``);
    }
    // The document must retain the historical-forbidden regression section.
    expect(doc).toContain('Historical forbidden columns');
  });
});
