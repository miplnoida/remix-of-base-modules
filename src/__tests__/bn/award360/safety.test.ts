/**
 * BN-AWARD360-V2 — Static safety guards.
 *
 * Award 360 must not directly mutate DB rows for sensitive award-servicing
 * operations. All writes go through canonical server commands or specialist
 * workspaces. This test scans the Award 360 source tree for forbidden calls.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', 'pages', 'bn', 'awards', 'award-360');
const SERVICE = join(__dirname, '..', '..', '..', 'services', 'bn', 'awards', 'award360Service.ts');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const FORBIDDEN_METHODS = ['.insert(', '.update(', '.upsert(', '.delete('];
const FORBIDDEN_IMPORTS = [
  'awardServicingService',       // legacy unsafe mutations
  'suspendAward',
  'reinstateAward',
  'issuePayment',
  'cancelPayment(',
];

describe('BN-AWARD360-V2 · workspace safety', () => {
  const files = [...walk(ROOT), SERVICE];

  it('scans multiple source files', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('contains no direct supabase .insert/.update/.upsert/.delete calls', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const bad of FORBIDDEN_METHODS) {
        if (src.includes(bad)) offenders.push(`${f} :: ${bad}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not import unsafe servicing mutation modules', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const bad of FORBIDDEN_IMPORTS) {
        if (src.includes(bad)) offenders.push(`${f} :: ${bad}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not select * from any table', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      if (/\.select\(\s*['"`]\*['"`]\s*\)/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it('claim tab uses /bn/claims/:id workbench route (no /workbench suffix)', () => {
    const src = readFileSync(SERVICE, 'utf8');
    expect(src).toContain('workbenchRoute: `/bn/claims/${c.id}`');
    expect(src).not.toMatch(/\/bn\/claims\/\$\{[^}]+\}\/workbench/);
  });
});
