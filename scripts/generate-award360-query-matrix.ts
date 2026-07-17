/**
 * AW360-WAVE-1-C1 Slice B — generate `docs/bn/award360-query-matrix.md`
 * from the checked-in schema contract. Run:
 *
 *   bunx tsx scripts/generate-award360-query-matrix.ts
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  AWARD360_SCHEMA_CONTRACT,
  HISTORICAL_FORBIDDEN_COLUMNS,
} from '../src/services/bn/awards/award360SchemaContract';

const here = dirname(fileURLToPath(import.meta.url));
const liveSchemaPath = resolve(here, '..', 'src/services/bn/awards/award360.live-schema.json');
let liveSchemaMeta = '';
try {
  const stat = readFileSync(liveSchemaPath, 'utf8');
  const parsed = JSON.parse(stat);
  const tables = Object.keys(parsed).length;
  liveSchemaMeta = `Tables inspected: **${tables}** (see \`src/services/bn/awards/award360.live-schema.json\`).`;
} catch {
  liveSchemaMeta = 'Live schema snapshot not found.';
}

const lines: string[] = [];
lines.push('# Award 360 — Query Matrix (generated)');
lines.push('');
lines.push('<!--');
lines.push('This document is generated from `src/services/bn/awards/award360SchemaContract.ts`.');
lines.push('Do not edit table rows manually. Regenerate with:');
lines.push('  bunx tsx scripts/generate-award360-query-matrix.ts');
lines.push('-->');
lines.push('');
lines.push(liveSchemaMeta);
lines.push('');
lines.push('## Table contracts');
lines.push('');
lines.push('| Table | Allowed columns | Scope | Order columns | Containment | Sensitive |');
lines.push('| --- | --- | --- | --- | --- | --- |');
for (const [table, contract] of Object.entries(AWARD360_SCHEMA_CONTRACT)) {
  const cols = contract.allowedColumns.join(', ');
  const scope = contract.requiredScope ? `\`${contract.requiredScope.column}\` — ${contract.requiredScope.description}` : '—';
  const order = contract.allowedOrderColumns?.join(', ') ?? '—';
  const contain = contract.allowedContainmentColumns?.join(', ') ?? '—';
  const sens = contract.sensitiveColumns?.join(', ') ?? '—';
  lines.push(`| \`${table}\` | ${cols} | ${scope} | ${order} | ${contain} | ${sens} |`);
}
lines.push('');
lines.push('## Historical forbidden columns (regression guard)');
lines.push('');
lines.push('| Table | Never selected |');
lines.push('| --- | --- |');
for (const [table, cols] of Object.entries(HISTORICAL_FORBIDDEN_COLUMNS)) {
  lines.push(`| \`${table}\` | ${cols.join(', ')} |`);
}
lines.push('');

const target = resolve(here, '..', 'docs', 'bn', 'award360-query-matrix.md');
writeFileSync(target, lines.join('\n'), 'utf8');
// eslint-disable-next-line no-console
console.log(`Wrote ${target}`);
