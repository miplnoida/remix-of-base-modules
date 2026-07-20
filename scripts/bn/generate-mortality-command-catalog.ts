/**
 * BN-MORT-UI-1D §D — Deterministic generator.
 *
 * Reads the canonical `MORTALITY_COMMAND_CATALOG` and rewrites
 * `supabase/functions/bn-benefits-query/_generated_command_catalog.ts`.
 *
 * Run:
 *   bunx tsx scripts/bn/generate-mortality-command-catalog.ts
 *
 * The parity test verifies field-by-field agreement across all 26 commands
 * regardless; run this whenever the canonical catalogue changes.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MORTALITY_COMMAND_CATALOG } from '../../src/types/bn/mortality/mortalityCommandCatalog';

const HEADER =
  `/**\n * DO NOT EDIT — generated from src/types/bn/mortality/mortalityCommandCatalog.ts\n` +
  ` * by scripts/bn/generate-mortality-command-catalog.ts.\n` +
  ` *\n * This mirrors the canonical browser catalogue for the Deno edge function,\n` +
  ` * which cannot import from the browser tree. The parity test\n` +
  ` * \`src/__tests__/bn/mortality/mortalityCommandCatalogParity.test.ts\`\n` +
  ` * fails the build if this file diverges from the canonical source.\n */\n` +
  `// deno-lint-ignore-file\n` +
  `export const MORTALITY_COMMAND_CATALOG_GENERATED = ${JSON.stringify(MORTALITY_COMMAND_CATALOG, null, 2)} as const;\n\n` +
  `export const MORTALITY_COMMAND_COUNT_GENERATED = MORTALITY_COMMAND_CATALOG_GENERATED.length;\n`;

const outPath = resolve(process.cwd(), 'supabase/functions/bn-benefits-query/_generated_command_catalog.ts');
writeFileSync(outPath, HEADER, 'utf8');
// eslint-disable-next-line no-console
console.log(`Wrote ${MORTALITY_COMMAND_CATALOG.length} canonical commands to ${outPath}`);
