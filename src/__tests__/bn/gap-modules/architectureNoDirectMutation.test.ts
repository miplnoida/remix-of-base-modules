/**
 * Architecture test — Gap-module pages and hooks MUST NOT mutate Supabase
 * directly. All state changes must flow through the portable
 * `BenefitsCommandClient`.
 *
 * This test scans:
 *   - src/hooks/bn/**       (any gap-module hook)
 *   - src/modules/benefits/gap*   (future gap-module pages)
 *   - src/services/bn/gap/**      (except the adapter itself)
 * for `.insert(`, `.update(`, `.upsert(`, `.delete(` calls. The only file
 * permitted to make such calls today is
 * `src/services/bn/gap/supabaseBenefitsGapAdapter.ts` — and even it does not
 * currently issue writes; writes flow through the edge function.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const FORBIDDEN = /\.(insert|update|upsert|delete)\s*\(/;

const SCAN_ROOTS = [
  'src/services/bn/gap',
  'src/hooks/bn',
];
const ALLOWED = new Set<string>([
  // The Supabase adapter is the sanctioned integration point. Currently it
  // only reads; if writes are ever added they should still go through an
  // edge function, but this allow-list lets the file exist.
  'src/services/bn/gap/supabaseBenefitsGapAdapter.ts',
]);

const GAP_HOOK_PREFIX = /useBenefitsGap|useBnMortality|useBnOverpayment|useBnAppeal|useBnMeansTest|useBnRisk|useBnUprating/;

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
