/**
 * BN-MORT-UI-1C — Benefits Query envelope, boundary, and adapter behaviour.
 *
 * The adapter must throw {@link BenefitsQueryExecutionError} for every
 * DENIED / INVALID / FAILED envelope so React Query flips isError=true and
 * the UI cannot render these as successful empty datasets.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SupabaseBenefitsQueryAdapter } from '@/services/bn/queries/supabaseBenefitsQueryAdapter';
import { BenefitsQueryExecutionError } from '@/services/bn/queries/benefitsQueryExecutionError';
import { validateBenefitsQueryEnvelope } from '@/services/bn/queries/envelopeValidator';
import type { BnBenefitsQueryEnvelope, BnBenefitsQueryResult } from '@/types/bn/queries';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { supabase } = (await import('@/integrations/supabase/client')) as any;

function envelope(): BnBenefitsQueryEnvelope<Record<string, unknown>> {
  return {
    queryCode: 'BN_MORTALITY_GET_SUMMARY',
    queryVersion: 1,
    correlationId: 'test-corr',
    moduleCode: 'bn_mortality',
    params: {},
  };
}

function canonical<TData>(
  status: BnBenefitsQueryResult<TData>['status'],
  overrides: Partial<BnBenefitsQueryResult<TData>> = {},
): BnBenefitsQueryResult<TData> {
  return {
    status,
    correlationId: 'test-corr',
    queryCode: 'BN_MORTALITY_GET_SUMMARY',
    queryVersion: 1,
    data: null,
    errors: [],
    maskedFields: [],
    warnings: [],
    ...overrides,
  };
}

describe('SupabaseBenefitsQueryAdapter — non-OK envelopes throw typed errors', () => {
  beforeEach(() => supabase.functions.invoke.mockReset());

  it('returns OK envelopes verbatim', async () => {
    const ok = canonical('OK', { data: { totals: {} } });
    supabase.functions.invoke.mockResolvedValueOnce({ data: ok, error: null });
    const result = await new SupabaseBenefitsQueryAdapter().execute(envelope());
    expect(result.status).toBe('OK');
  });

  it('returns NOT_FOUND envelopes verbatim (data = null, callers distinguish)', async () => {
    const nf = canonical('NOT_FOUND', { data: null });
    supabase.functions.invoke.mockResolvedValueOnce({ data: nf, error: null });
    const result = await new SupabaseBenefitsQueryAdapter().execute(envelope());
    expect(result.status).toBe('NOT_FOUND');
    expect(result.data).toBeNull();
  });

  it('throws BenefitsQueryExecutionError for DENIED', async () => {
    const denied = canonical('DENIED', { errors: [{ code: 'FORBIDDEN', message: 'no capability' }] });
    supabase.functions.invoke.mockResolvedValueOnce({ data: denied, error: null });
    await expect(new SupabaseBenefitsQueryAdapter().execute(envelope()))
      .rejects.toBeInstanceOf(BenefitsQueryExecutionError);
  });

  it('throws BenefitsQueryExecutionError for INVALID (with field)', async () => {
    const inv = canonical('INVALID', {
      errors: [{ code: 'INVALID_PARAMS', message: 'bad eventId', field: 'eventId' }],
    });
    supabase.functions.invoke.mockResolvedValueOnce({ data: inv, error: null });
    try {
      await new SupabaseBenefitsQueryAdapter().execute(envelope());
      throw new Error('should not resolve');
    } catch (err) {
      expect(err).toBeInstanceOf(BenefitsQueryExecutionError);
      const e = err as BenefitsQueryExecutionError;
      expect(e.status).toBe('INVALID');
      expect(e.errors[0].field).toBe('eventId');
    }
  });

  it('throws BenefitsQueryExecutionError for FAILED', async () => {
    const failed = canonical('FAILED', { errors: [{ code: 'INTERNAL_ERROR', message: 'boom' }] });
    supabase.functions.invoke.mockResolvedValueOnce({ data: failed, error: null });
    await expect(new SupabaseBenefitsQueryAdapter().execute(envelope()))
      .rejects.toMatchObject({ status: 'FAILED' });
  });

  it('throws TRANSPORT_FAILURE when supabase surfaces error and no envelope', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({ data: null, error: { message: 'network' } });
    try {
      await new SupabaseBenefitsQueryAdapter().execute(envelope());
      throw new Error('should not resolve');
    } catch (err) {
      const e = err as BenefitsQueryExecutionError;
      expect(e.status).toBe('FAILED');
      expect(e.errors[0].code).toBe('TRANSPORT_FAILURE');
      expect(e.isRetryable).toBe(true);
    }
  });

  it('throws MALFORMED_RESPONSE when payload is not a canonical envelope', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({ data: { ok: true } as never, error: null });
    await expect(new SupabaseBenefitsQueryAdapter().execute(envelope()))
      .rejects.toMatchObject({ status: 'FAILED', errors: [expect.objectContaining({ code: 'MALFORMED_RESPONSE' })] });
  });

  it('rejects envelopes with a valid-looking status but wrong shape (missing arrays)', async () => {
    const bogus = { status: 'OK', correlationId: 'c', queryCode: 'Q', queryVersion: 1, data: [] };
    supabase.functions.invoke.mockResolvedValueOnce({ data: bogus as never, error: null });
    await expect(new SupabaseBenefitsQueryAdapter().execute(envelope()))
      .rejects.toMatchObject({ errors: [expect.objectContaining({ code: 'MALFORMED_RESPONSE' })] });
  });
});

describe('validateBenefitsQueryEnvelope — runtime shape guard', () => {
  it('accepts a fully-formed OK envelope', () => {
    expect(validateBenefitsQueryEnvelope(canonical('OK', { data: [] })).ok).toBe(true);
  });
  it('rejects a plain object with just {status}', () => {
    expect(validateBenefitsQueryEnvelope({ status: 'OK' }).ok).toBe(false);
  });
  it('rejects unknown statuses', () => {
    expect(validateBenefitsQueryEnvelope(canonical('OK' as never, { status: 'MAYBE' as never })).ok).toBe(false);
  });
  it('rejects malformed error entries', () => {
    expect(validateBenefitsQueryEnvelope(
      canonical('DENIED', { errors: [{ code: 1 as never, message: 'x' } as never] }),
    ).ok).toBe(false);
  });
  it('rejects malformed page structure', () => {
    const bad: any = canonical('OK', { data: [] });
    bad.page = { pageSize: 'twenty' };
    expect(validateBenefitsQueryEnvelope(bad).ok).toBe(false);
  });
});

describe('Mortality query boundary — architecture guards', () => {
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
    'src/services/bn/queries/benefitsQueryClient.ts',
    'src/services/bn/queries/supabaseBenefitsQueryAdapter.ts',
    'src/__tests__/bn/mortality/benefitsQueryBoundary.test.ts',
  ]);

  it('no browser source calls .from("bn_mortality_*")', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (ALLOWED.has(file.replace(/\\/g, '/'))) continue;
      const src = readFileSync(file, 'utf8');
      if (/\.from\(\s*['"]bn_mortality[_a-z]*['"]/.test(src)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('no browser source performs mutating supabase.from() on mortality tables', () => {
    // We only allow bn_mortality_* access via the query edge function.
    // A search for .from('bn_mortality... .insert/update/delete anywhere in src.
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const src = readFileSync(file, 'utf8');
      if (/from\(['"]bn_mortality[_a-z]*['"]\)[\s\S]{0,200}\.(insert|update|delete|upsert)\(/.test(src)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('edge function contains no select("*") for the mortality event table', () => {
    const idx = readFileSync('supabase/functions/bn-benefits-query/index.ts', 'utf8');
    expect(idx).not.toMatch(/from\('bn_mortality_event'\)[\s\S]{0,80}\.select\(\s*['"`]\*['"`]/);
    expect(idx).toContain('EVENT_COLUMNS');
  });

  it('shared edge module exposes the pure functions the tests must exercise', () => {
    const shared = readFileSync('supabase/functions/bn-benefits-query/_shared.ts', 'utf8');
    for (const fn of [
      'export function decideModuleAccess',
      'export function resolveRequiredVerbs',
      'export function validatePaging',
      'export function calculateNextPageToken',
      'export function buildEnvelope',
      'export function validateEnvelopeInput',
      'export function calculateActionAvailability',
    ]) {
      expect(shared).toContain(fn);
    }
  });

  it('index.ts imports its shared helpers from _shared.ts (no copied logic in tests)', () => {
    const idx = readFileSync('supabase/functions/bn-benefits-query/index.ts', 'utf8');
    expect(idx).toMatch(/from ['"]\.\/_shared\.ts['"]/);
  });
});
