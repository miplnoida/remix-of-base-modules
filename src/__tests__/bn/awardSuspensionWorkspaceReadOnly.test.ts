/**
 * BN-UI-S1 — Source-level guarantees for the Award Suspension workspace.
 *
 * These tests read the redesigned UI/service source files and assert that:
 *   1. `awardSuspensionViewService.ts` performs NO Supabase writes.
 *   2. Redesigned components do NOT import `updateAwardStatus`.
 *   3. Redesigned components do NOT ship hardcoded reason arrays.
 *   4. Redesigned components do NOT gate actions on hardcoded role arrays.
 *   5. Dark-launch guard (ACTIONS_ENABLED=false) remains committed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const WORKSPACE_DIR = join(process.cwd(), 'src/pages/bn/servicing/award-suspension');
const SERVICE_FILE = join(process.cwd(), 'src/services/bn/awardSuspensionViewService.ts');
const CONSOLE_FILE = join(process.cwd(), 'src/pages/bn/servicing/AwardSuspensionConsole.tsx');
const VIEWMODELS_FILE = join(WORKSPACE_DIR, 'suspensionViewModels.ts');

const listWorkspaceFiles = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name)) out.push(p);
    }
  };
  walk(WORKSPACE_DIR);
  return out;
};

/** Strip /* … *\/ and // … comments so docstring mentions don't fool checks. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');

describe('BN-UI-S1 · Award Suspension read-only guarantees', () => {
  it('awardSuspensionViewService.ts contains no Supabase write calls and only allow-listed RPCs', async () => {
    const src = stripComments(readFileSync(SERVICE_FILE, 'utf8'));
    for (const token of ['.insert(', '.update(', '.delete(', '.upsert(']) {
      expect(
        src.includes(token),
        `awardSuspensionViewService.ts must not use "${token}"`
      ).toBe(false);
    }
    // .rpc() is allowed ONLY for names in the exported ALLOWED_READ_RPCS list.
    const rpcCalls = Array.from(src.matchAll(/\.rpc\(\s*['"]([^'"]+)['"]/g)).map((m) => m[1]);
    const mod = await import('@/services/bn/awardSuspensionViewService');
    const allowed = new Set(mod.ALLOWED_READ_RPCS);
    for (const name of rpcCalls) {
      expect(allowed.has(name), `RPC "${name}" is not in ALLOWED_READ_RPCS`).toBe(true);
    }
  });

  it('AwardSuspensionConsole.tsx does not import updateAwardStatus', () => {
    const src = stripComments(readFileSync(CONSOLE_FILE, "utf8"));
    // Allow references inside comments/docs but forbid actual imports/calls.
    expect(/import[^;]*updateAwardStatus/.test(src)).toBe(false);
    expect(/\bupdateAwardStatus\s*\(/.test(src)).toBe(false);
  });

  it('redesigned workspace does not import updateAwardStatus', () => {
    for (const f of listWorkspaceFiles()) {
      const src = stripComments(readFileSync(f, "utf8"));
      expect(
        /import[^;]*updateAwardStatus/.test(src),
        `${f} must not import updateAwardStatus`
      ).toBe(false);
      expect(
        /\bupdateAwardStatus\s*\(/.test(src),
        `${f} must not call updateAwardStatus`
      ).toBe(false);
    }
  });

  it('redesigned workspace does not ship hardcoded suspension reason arrays', () => {
    const forbiddenNames = ['SUSPEND_REASONS', 'RESUME_REASONS', 'TERMINATE_REASONS'];
    for (const f of listWorkspaceFiles()) {
      const src = stripComments(readFileSync(f, "utf8"));
      for (const name of forbiddenNames) {
        expect(src.includes(name), `${f} must not declare ${name}`).toBe(false);
      }
    }
  });

  it('redesigned workspace does not gate actions on hardcoded role arrays', () => {
    for (const f of listWorkspaceFiles()) {
      const src = stripComments(readFileSync(f, "utf8"));
      expect(
        /hasAnyRole\s*\(\s*\[/.test(src),
        `${f} must not authorise via hardcoded role arrays`
      ).toBe(false);
    }
  });

  it('dark-launch guard remains committed to false', () => {
    const src = readFileSync(VIEWMODELS_FILE, 'utf8');
    expect(/ACTIONS_ENABLED\s*=\s*false\s+as\s+const/.test(src)).toBe(true);
  });
});
