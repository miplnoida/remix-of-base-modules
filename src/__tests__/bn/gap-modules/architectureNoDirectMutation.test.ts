/**
 * Architecture test — Benefits command-boundary pages and hooks MUST NOT
 * mutate Supabase directly. All state changes must flow through the portable
 * `BenefitsCommandClient`.
 *
 * This test scans:
 *   - src/hooks/bn/**                        (any command-boundary hook)
 *   - src/services/bn/commands/**            (except the adapter itself)
 *   - src/services/bn/{mortality,appeals,overpayments,meansTests,risk,uprating}/**
 * for `.insert(`, `.update(`, `.upsert(`, `.delete(` calls. The only file
 * permitted to make such calls today is
 * `src/services/bn/commands/supabaseBenefitsCommandAdapter.ts` — and even it
 * does not currently issue writes; writes flow through the edge function.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const FORBIDDEN = /\.(insert|update|upsert|delete)\s*\(/;

const SCAN_ROOTS = [
  'src/services/bn/commands',
  'src/services/bn/mortality',
  'src/services/bn/appeals',
  'src/services/bn/overpayments',
  'src/services/bn/meansTests',
  'src/services/bn/risk',
  'src/services/bn/uprating',
  'src/hooks/bn',
];
const ALLOWED = new Set<string>([
  'src/services/bn/commands/supabaseBenefitsCommandAdapter.ts',
]);

const GAP_HOOK_PREFIX = /useBenefitsCommand|useBenefitsGap|useBnMortality|useBnOverpayment|useBnAppeal|useBnMeansTest|useBnRisk|useBnUprating/;

function walk(dir: string, files: string[] = []): string[] {
  const abs = join(ROOT, dir);
  try {
    for (const name of readdirSync(abs)) {
      const rel = join(dir, name);
      const st = statSync(join(ROOT, rel));
      if (st.isDirectory()) walk(rel, files);
      else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') && !name.endsWith('.test.tsx')) files.push(rel);
    }
  } catch { /* dir missing is fine */ }
  return files;
}

describe('architecture: gap-module code has no direct Supabase mutation', () => {
  it('no forbidden mutation calls under gap-module boundaries', () => {
    const offenders: string[] = [];
    for (const root of SCAN_ROOTS) {
      for (const f of walk(root)) {
        const rel = relative(ROOT, join(ROOT, f)).replace(/\\/g, '/');
        if (ALLOWED.has(rel)) continue;
        // For hooks/bn/**, only scan gap-module hooks (identifiable by prefix).
        if (rel.startsWith('src/hooks/bn/') && !GAP_HOOK_PREFIX.test(rel)) continue;
        const src = readFileSync(join(ROOT, f), 'utf8');
        if (FORBIDDEN.test(src)) offenders.push(rel);
      }
    }
    expect(offenders, `Forbidden direct-mutation calls:\n${offenders.join('\n')}`).toEqual([]);
  });
});
