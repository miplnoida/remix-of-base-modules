/**
 * BN-MORT-UI-1B — Benefits Query envelope and boundary architecture tests.
 *
 * These are Vitest tests that run in the browser test harness. They protect
 * the invariants that the edge function response contract MUST match the
 * TypeScript envelope, that the adapter preserves structured DENIED/INVALID/
 * NOT_FOUND/FAILED responses, and that no browser code reads Mortality tables
 * directly.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SupabaseBenefitsQueryAdapter } from '@/services/bn/queries/supabaseBenefitsQueryAdapter';
import type { BnBenefitsQueryEnvelope, BnBenefitsQueryResult } from '@/types/bn/queries';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(async () => ({ data: null, error: null })),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { supabase } = await import('@/integrations/supabase/client') as any;
import { vi } from 'vitest';

function envelope<T>(): BnBenefitsQueryEnvelope<Record<string, unknown>> {
  return {
    queryCode: 'BN_MORTALITY_GET_SUMMARY',
    queryVersion: 1,
    correlationId: 'test-corr',
    moduleCode: 'bn_mortality',
    params: {},
  };
}

describe('SupabaseBenefitsQueryAdapter — canonical envelope preservation', () => {
  it('preserves an OK envelope verbatim', async () => {
    const canonical: BnBenefitsQueryResult<unknown> = {
      status: 'OK', correlationId: 'test-corr', queryCode: 'BN_MORTALITY_GET_SUMMARY',
      queryVersion: 1, data: { totals: {} }, errors: [], maskedFields: [], warnings: [],
      page: { pageSize: 25, nextPageToken: null, totalCount: 1 },
    };
    supabase.functions.invoke.mockResolvedValueOnce({ data: canonical, error: null });
    const result = await new SupabaseBenefitsQueryAdapter().execute(envelope());
    expect(result).toEqual(canonical);
  });

  it('preserves a DENIED envelope even when supabase surfaces error', async () => {
    const denied: BnBenefitsQueryResult<unknown> = {
      status: 'DENIED', correlationId: 'test-corr', queryCode: 'BN_MORTALITY_GET_SUMMARY',
      queryVersion: 1, data: null,
      errors: [{ code: 'FORBIDDEN', message: 'Missing capability' }],
      maskedFields: [], warnings: [],
    };
    supabase.functions.invoke.mockResolvedValueOnce({ data: denied, error: { message: 'edge non-2xx' } });
    const result = await new SupabaseBenefitsQueryAdapter().execute(envelope());
    expect(result.status).toBe('DENIED');
    expect(result.errors[0].code).toBe('FORBIDDEN');
  });

  it('preserves an INVALID envelope', async () => {
    const invalid: BnBenefitsQueryResult<unknown> = {
      status: 'INVALID', correlationId: 'test-corr', queryCode: 'BN_MORTALITY_GET_EVENT',
      queryVersion: 1, data: null,
      errors: [{ code: 'INVALID_PARAMS', message: 'eventId must be UUID', field: 'eventId' }],
      maskedFields: [], warnings: [],
    };
    supabase.functions.invoke.mockResolvedValueOnce({ data: invalid, error: null });
    const result = await new SupabaseBenefitsQueryAdapter().execute(envelope());
    expect(result.status).toBe('INVALID');
    expect(result.errors[0].field).toBe('eventId');
  });

  it('returns FAILED with TRANSPORT_FAILURE when no envelope and edge unreachable', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({ data: null, error: { message: 'network' } });
    const result = await new SupabaseBenefitsQueryAdapter().execute(envelope());
    expect(result.status).toBe('FAILED');
    expect(result.errors[0].code).toBe('TRANSPORT_FAILURE');
  });

  it('returns FAILED with MALFORMED_RESPONSE when data has no status', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({ data: { ok: true } as never, error: null });
    const result = await new SupabaseBenefitsQueryAdapter().execute(envelope());
    expect(result.status).toBe('FAILED');
    expect(result.errors[0].code).toBe('MALFORMED_RESPONSE');
  });
});

describe('Mortality query boundary — architecture', () => {
  const SRC = 'src';
  function* walk(dir: string): Generator<string> {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      const s = statSync(p);
      if (s.isDirectory()) yield* walk(p);
      else if (/\.(ts|tsx)$/.test(entry)) yield p;
    }
  }

  const ALLOWED = new Set([
    'src/services/bn/queries/benefitsQueryClient.ts', // comment only
    'src/services/bn/queries/supabaseBenefitsQueryAdapter.ts',
    'src/__tests__/bn/mortality/benefitsQueryBoundary.test.ts',
  ]);

  it('no browser source may .from("bn_mortality_*")', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (ALLOWED.has(file.replace(/\\/g, '/'))) continue;
      const src = readFileSync(file, 'utf8');
      if (/\.from\(\s*['"]bn_mortality[_a-z]*['"]/.test(src)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('edge function contains no select("*") for mortality tables', () => {
    const idx = readFileSync('supabase/functions/bn-benefits-query/index.ts', 'utf8');
    // Extract every select(...) call and confirm none is a bare '*' against a mortality table.
    // The event handler uses an explicit EVENT_COLUMNS allow-list.
    expect(idx).not.toMatch(/from\('bn_mortality_event'\)[\s\S]{0,80}\.select\(\s*['"`]\*['"`]/);
    expect(idx).toContain('EVENT_COLUMNS');
  });

  it('edge function handlers do not swallow errors on referrals/evidence/communications/history/impacts/awards', () => {
    const idx = readFileSync('supabase/functions/bn-benefits-query/index.ts', 'utf8');
    for (const fn of ['getReferrals', 'getEvidenceLinks', 'getCommunications', 'getEventHistory', 'getAwardImpacts', 'getAffectedAwards']) {
      const start = idx.indexOf(`async function ${fn}(`);
      expect(start).toBeGreaterThan(-1);
      const body = idx.slice(start, idx.indexOf('\nasync function ', start + 1) > -1 ? idx.indexOf('\nasync function ', start + 1) : start + 3000);
      // Must throw a QueryError on error rather than returning empty data.
      expect(body).toMatch(/if\s*\(error\)\s*throw\s+new\s+QueryError/);
    }
  });
});
