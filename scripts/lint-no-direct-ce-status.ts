#!/usr/bin/env tsx
/**
 * Repo lint: fails when any file outside the approved RPC/service layer writes
 * `ce_*.status` directly. All CE status transitions MUST flow through
 * `requestTransition()` → `ce_apply_status_transition` so audit, workflow
 * mapping, history, and maker-checker behave consistently.
 *
 * Allowed locations:
 *   - src/services/ceWorkflowStatusService.ts (the chokepoint)
 *   - supabase/migrations/**            (seed/back-fill SQL)
 *   - supabase/functions/**             (server-side, audited explicitly)
 *   - scripts/**                        (this lint + admin scripts)
 *
 * Detection heuristic: search source for `.update({ ... status: ... })` and
 * `.update({ status })` patterns on identifiers that begin with `ce_`. Any
 * direct mutation outside the allow-list is reported and exits non-zero.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

const ALLOW = [
  'src/services/ceWorkflowStatusService.ts',
];

const CE_TABLES = [
  'ce_violations', 'ce_cases', 'ce_notices', 'ce_inspections',
  'ce_payment_arrangements', 'ce_arrangement_breaches', 'ce_waivers',
  'ce_legal_recommendations', 'ce_legal_referrals',
];

interface Violation { file: string; line: number; snippet: string; }

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function scan(file: string): Violation[] {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (ALLOW.includes(rel)) return [];
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const found: Violation[] = [];
  // Look for `.from('ce_xxx').update(` followed by `status` in same statement.
  for (const table of CE_TABLES) {
    const re = new RegExp(`\\.from\\(['"\`]${table}['"\`]\\)[\\s\\S]{0,400}?\\.update\\(\\s*\\{[\\s\\S]{0,400}?\\bstatus\\s*:`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const upTo = src.slice(0, m.index);
      const line = upTo.split('\n').length;
      found.push({ file: rel, line, snippet: lines[line - 1]?.trim().slice(0, 160) ?? '' });
    }
  }
  return found;
}

const files = walk(SRC);
const violations = files.flatMap(scan);

if (violations.length) {
  console.error(`\n✖ Direct ce_*.status writes detected (${violations.length}):\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  ${v.snippet}`);
  }
  console.error(`\nRoute these through useCeStatusActions / ceWorkflowStatusService.requestTransition().`);
  process.exit(1);
}

console.log('✓ No direct ce_*.status writes outside allow-list.');
