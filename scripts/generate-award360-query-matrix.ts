/**
 * AW360-WAVE-1-C1 Slice B.1 — generate `docs/bn/award360-query-matrix.md`
 * from the checked-in schema contract. Run:
 *
 *   bunx tsx scripts/generate-award360-query-matrix.ts
 */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { renderAward360QueryMatrixMarkdown } from '../src/services/bn/awards/award360SchemaContract';

const here = dirname(fileURLToPath(import.meta.url));
const liveSchemaPath = resolve(here, '..', 'src/services/bn/awards/award360.live-schema.json');
let liveSchemaMeta = '';
try {
  const raw = readFileSync(liveSchemaPath, 'utf8');
  const parsed = JSON.parse(raw);
  const tables = parsed?.tables ? Object.keys(parsed.tables) : Object.keys(parsed);
  const meta = parsed?.metadata;
  if (meta) {
    liveSchemaMeta = `Tables inspected: **${tables.length}** (source: \`${meta.source}\`, projectRef \`${meta.projectRef}\`, capturedAt \`${meta.capturedAt}\`).`;
  } else {
    liveSchemaMeta = `Tables inspected: **${tables.length}** (see \`src/services/bn/awards/award360.live-schema.json\`).`;
  }
} catch {
  liveSchemaMeta = 'Live schema snapshot not found.';
}

const target = resolve(here, '..', 'docs', 'bn', 'award360-query-matrix.md');
writeFileSync(target, renderAward360QueryMatrixMarkdown(liveSchemaMeta), 'utf8');
// eslint-disable-next-line no-console
console.log(`Wrote ${target}`);
