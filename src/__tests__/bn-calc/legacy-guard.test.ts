/**
 * Phase 5 acceptance guard.
 *
 * Fails the build if legacy hard-coded calculation markers leak back into
 * runtime code paths exercised by the new BN Calculation Engine v2.
 *
 * Allowed locations (quarantine zones):
 *   - src/services/bn/_legacy/**          (intentionally kept, never imported by v2)
 *   - **\/__tests__/**                     (test fixtures may reference)
 *   - src/services/benefitRulesConfigService.ts  (legacy config service, not imported by calc/*)
 *   - src/components/nbenefit/**           (legacy module, separate from src/components/bn/**)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(process.cwd(), 'src');

const FORBIDDEN_MARKERS = [
  'MOCK_BENEFIT_RULES',
  '{AWE}',
  '{AIW}',
  '{PensionRate}',
  '{TotalContributions}',
];

const ALLOW_PATH_PATTERNS = [
  /\/_legacy\//,
  /\/__tests__\//,
  /\.test\.ts$/,
  /^services\/benefitRulesConfigService\.ts$/,
  /^components\/nbenefit\//,
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe('BN Calculation Engine v2 — legacy guard', () => {
  it('no forbidden hardcoded calculation markers in runtime code', () => {
    const violations: string[] = [];
    for (const file of walk(ROOT)) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      if (ALLOW_PATH_PATTERNS.some((re) => re.test(rel))) continue;
      const src = readFileSync(file, 'utf8');
      for (const marker of FORBIDDEN_MARKERS) {
        if (src.includes(marker)) {
          violations.push(`${rel}: ${marker}`);
        }
      }
    }
    if (violations.length) {
      throw new Error(
        'Hardcoded calculation markers found in runtime code (move to src/services/bn/_legacy/):\n' +
          violations.join('\n'),
      );
    }
    expect(violations).toEqual([]);
  });

  it('calc/* does not import legacy markers', () => {
    const calcDir = join(ROOT, 'services/bn/calc');
    for (const file of walk(calcDir)) {
      const src = readFileSync(file, 'utf8');
      for (const marker of FORBIDDEN_MARKERS) {
        expect(src.includes(marker), `${file} contains ${marker}`).toBe(false);
      }
      expect(src.includes('_legacy'), `${file} imports from _legacy`).toBe(false);
    }
  });
});
