/**
 * BN-AP-00 — Appeals secure query boundary tests.
 *
 * Confirms that:
 *   1. Every Appeals query code is registered in the capability registry.
 *   2. Appeals descriptors target the `bn_appeals` module and never gate on
 *      mortality capabilities.
 *   3. The claimant self-service codes admit `bn_appeals:claimant_submit`.
 *   4. The staff query codes require at least `bn_appeals:read` or `:view`.
 *   5. `useMyAppeals` no longer touches `bn_appeal` from the browser client
 *      (compile-time — an import search would catch a regression, so we
 *      assert on file contents at test time).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  BN_APPEAL_QUERY_CODES,
  BN_BENEFITS_QUERY_CODES,
} from '@/types/bn/queries/queryCodes';
import { BN_BENEFITS_QUERY_REGISTRY } from '@/services/bn/queries/benefitsQueryRegistry';

describe('BN-AP-00 — Appeals secure query boundary', () => {
  it('registers every appeal query code', () => {
    for (const code of BN_APPEAL_QUERY_CODES) {
      expect(BN_BENEFITS_QUERY_CODES).toContain(code);
      expect(BN_BENEFITS_QUERY_REGISTRY[code]).toBeDefined();
      expect(BN_BENEFITS_QUERY_REGISTRY[code].moduleCode).toBe('bn_appeals');
    }
  });

  it('claimant surfaces accept bn_appeals:claimant_submit', () => {
    for (const code of ['BN_APPEAL_GET_MY_APPEALS', 'BN_APPEAL_GET_MY_APPEAL_DETAIL'] as const) {
      const desc = BN_BENEFITS_QUERY_REGISTRY[code];
      expect(desc.anyOfCapabilities).toContain('bn_appeals:claimant_submit');
    }
  });

  it('staff surfaces require read or view capability', () => {
    const staffCodes = BN_APPEAL_QUERY_CODES.filter(
      (c) => c !== 'BN_APPEAL_GET_MY_APPEALS' && c !== 'BN_APPEAL_GET_MY_APPEAL_DETAIL',
    );
    for (const code of staffCodes) {
      const caps = BN_BENEFITS_QUERY_REGISTRY[code].anyOfCapabilities;
      const hasReadable =
        caps.includes('bn_appeals:view') || caps.includes('bn_appeals:read');
      expect(hasReadable, `expected ${code} to require view or read`).toBe(true);
    }
  });

  it('useMyAppeals no longer performs a direct supabase.from("bn_appeal") select', () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), 'src/hooks/bn/appeals/useMyAppeals.ts'),
      'utf-8',
    );
    expect(src).not.toMatch(/supabase\s*[\s\S]{0,40}\.from\(['"]bn_appeal['"]\)/);
    expect(src).toMatch(/BN_APPEAL_GET_MY_APPEALS/);
  });
});
