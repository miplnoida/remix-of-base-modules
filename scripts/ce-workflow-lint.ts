/**
 * CE Workflow Lint
 *
 * Verifies the Compliance status-workflow configuration is internally consistent:
 *
 *   1. Every `<entity>.status.<ACTION>` action declared in CE_ENTITY_STATUS_CATALOG
 *      has a corresponding entry in COMPLIANCE_EVENT_KEYS (and vice-versa).
 *   2. Every CE_ENTITY_STATUS_CATALOG action's `from[]` and `to` reference a
 *      status declared in the same entity's `statuses[]`.
 *   3. (Optional, runs only if SUPABASE_URL + SUPABASE_ANON_KEY are exported)
 *      Each status event key has at least one row in `ce_workflow_mappings`.
 *
 * Run:  bun run scripts/ce-workflow-lint.ts
 *  or:  npx tsx scripts/ce-workflow-lint.ts
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CE_ENTITY_STATUS_CATALOG,
  listCatalogStatusEventKeys,
} from '../src/services/ceEntityStatusCatalog';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Extract COMPLIANCE_EVENT_KEYS by parsing the service file as text — avoids
 * importing the supabase client (which requires `import.meta.env` from Vite).
 */
function loadComplianceEventKeys(): string[] {
  const path = resolve(__dirname, '../src/services/complianceWorkflowMappingService.ts');
  const src = readFileSync(path, 'utf8');
  const m = src.match(/COMPLIANCE_EVENT_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!m) throw new Error('Could not locate COMPLIANCE_EVENT_KEYS in service file.');
  return Array.from(m[1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
}

const COMPLIANCE_EVENT_KEYS = loadComplianceEventKeys();

const errors: string[] = [];
const warnings: string[] = [];

// 1. Catalog ↔ COMPLIANCE_EVENT_KEYS parity.
const catalogKeys = new Set(listCatalogStatusEventKeys());
const declaredStatusKeys = new Set(
  (COMPLIANCE_EVENT_KEYS as readonly string[]).filter((k) => k.includes('.status.'))
);

for (const k of catalogKeys) {
  if (!declaredStatusKeys.has(k)) {
    errors.push(`Catalog has "${k}" but COMPLIANCE_EVENT_KEYS does not.`);
  }
}
for (const k of declaredStatusKeys) {
  if (!catalogKeys.has(k)) {
    errors.push(`COMPLIANCE_EVENT_KEYS has "${k}" but the catalog does not.`);
  }
}

// 2. Action.from / Action.to must reference declared statuses.
for (const d of Object.values(CE_ENTITY_STATUS_CATALOG)) {
  const known = new Set(d.statuses);
  for (const a of d.actions) {
    if (!known.has(a.to)) {
      errors.push(`${d.entityType}.${a.code}: to="${a.to}" is not in statuses[].`);
    }
    for (const f of a.from) {
      if (!known.has(f)) {
        errors.push(`${d.entityType}.${a.code}: from="${f}" is not in statuses[].`);
      }
    }
  }
}

// 3. Optional DB cross-check.
async function dbCheck(): Promise<void> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    warnings.push('Skipping DB cross-check (SUPABASE_URL / SUPABASE_ANON_KEY not set).');
    return;
  }
  const { createClient } = await import('@supabase/supabase-js');
  const supa = createClient(url, key);
  const { data, error } = await supa.from('ce_workflow_mappings').select('event_key');
  if (error) {
    warnings.push(`DB cross-check failed: ${error.message}`);
    return;
  }
  const present = new Set((data ?? []).map((r: any) => r.event_key));
  for (const k of catalogKeys) {
    if (!present.has(k)) {
      errors.push(`ce_workflow_mappings missing row for "${k}".`);
    }
  }
}

(async () => {
  try {
    await dbCheck();
  } catch (e: any) {
    warnings.push(`DB cross-check threw: ${e?.message || e}`);
  }
  if (warnings.length) {
    console.warn('\nWarnings:');
    for (const w of warnings) console.warn('  - ' + w);
  }
  if (errors.length) {
    console.error('\nCE workflow lint FAILED:');
    for (const e of errors) console.error('  ✗ ' + e);
    process.exit(1);
  }
  console.log(
    `\nCE workflow lint OK — ${catalogKeys.size} status events, ${Object.keys(CE_ENTITY_STATUS_CATALOG).length} entities.`
  );
})();
