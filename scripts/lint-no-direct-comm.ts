#!/usr/bin/env tsx
/**
 * Phase 7 lint: flags module code that reads `comm_*` tables directly instead
 * of going through `resolveConfiguration()` (or its `resolveCommunication()`
 * adapter). Modules must ask for INTENT (domain + business_event +
 * resource_type + scope) — never poke at communication storage tables.
 *
 * Allow-listed callers:
 *   - src/lib/comm/**                                 (the resolver itself)
 *   - src/lib/configuration/**                        (generic engine)
 *   - src/pages/admin/organization/**                 (the config surface)
 *   - src/hooks/comm/**                               (thin wrappers)
 *   - supabase/migrations/**, supabase/functions/**
 *   - scripts/**
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

const ALLOW_PREFIXES = [
  'src/lib/comm/',
  'src/lib/configuration/',
  'src/pages/admin/organization/',
  'src/pages/admin/OrganizationManagement',
  'src/hooks/comm/',
  'src/components/admin/organization/',
];

const COMM_TABLES = [
  'comm_letterhead',
  'comm_email_signature',
  'comm_disclaimer',
  'comm_print_footer',
  'comm_media_asset',
  'comm_asset_assignment',
  'comm_asset_mapping',
  'comm_asset_category_master',
  'core_text_block',
];

interface Violation { file: string; line: number; snippet: string; table: string; }

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
  if (ALLOW_PREFIXES.some((p) => rel.startsWith(p))) return [];
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const found: Violation[] = [];
  for (const table of COMM_TABLES) {
    const re = new RegExp(`\\.from\\(['"\`]${table}['"\`]\\)`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const upTo = src.slice(0, m.index);
      const line = upTo.split('\n').length;
      found.push({ file: rel, line, table, snippet: lines[line - 1]?.trim().slice(0, 160) ?? '' });
    }
  }
  return found;
}

const files = walk(SRC);
const violations = files.flatMap(scan);

if (violations.length) {
  console.error(`\n✖ Direct comm_* reads detected (${violations.length}):\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.table}]  ${v.snippet}`);
  }
  console.error(`\nRoute these through resolveConfiguration() (src/lib/configuration/resolver.ts)`);
  console.error(`or the resolveCommunicationContext() adapter (src/lib/comm/communicationResolver.ts).`);
  process.exit(1);
}

console.log('✓ No direct comm_* reads outside allow-list.');
