/**
 * AW360-WAVE-1-C1 Slice B — generate `docs/bn/award360-action-matrix.md`
 * from the canonical action definition. Run with:
 *
 *   bunx tsx scripts/generate-award360-action-matrix.ts
 *
 * The action-contract test asserts the checked-in doc equals this output.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { renderAwardActionMatrixMarkdown } from '../src/services/bn/awards/awardActionCatalog';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '..', 'docs', 'bn', 'award360-action-matrix.md');
writeFileSync(target, renderAwardActionMatrixMarkdown(), 'utf8');
// eslint-disable-next-line no-console
console.log(`Wrote ${target}`);
