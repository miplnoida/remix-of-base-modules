/**
 * AW360-WAVE-1-C1 Sub-batch B2-b.1b — Derived loader-to-table evidence.
 *
 * The Query Matrix `Loaders` column is derived from the certification
 * registry + loader manifest. Because the runtime evidence tests prove
 * (actual union == manifest.expectedTables) for every certified loader,
 * we can safely project via `expectedTables` here.
 *
 * Cycle rule: this module imports the registry and manifest. It must
 * NOT be imported by either. The schema-contract renderer receives the
 * derived map as a parameter — no reverse dependency.
 */
import {
  AWARD360_CERTIFICATION_REGISTRY,
  isCertifiedLoader,
  type Award360LoaderCertification,
} from './award360CertificationRegistry';
import {
  AWARD360_LOADER_MANIFEST,
  type Award360ExportEntry,
} from './award360LoaderManifest';

export function deriveCertifiedLoadersByTable(
  registry: Readonly<Record<string, Award360LoaderCertification>>,
  manifest: readonly Award360ExportEntry[],
): Readonly<Record<string, readonly string[]>> {
  const certified = new Set(Object.keys(registry));
  const out: Record<string, string[]> = {};
  for (const entry of manifest) {
    if (!certified.has(entry.name)) continue;
    if (entry.pendingExecution) continue;
    if (!entry.expectedTables?.length) continue;
    for (const table of entry.expectedTables) {
      if (!out[table]) out[table] = [];
      if (!out[table].includes(entry.name)) out[table].push(entry.name);
    }
  }
  for (const table of Object.keys(out)) out[table].sort();
  return out;
}

export const AWARD360_CERTIFIED_LOADERS_BY_TABLE = deriveCertifiedLoadersByTable(
  AWARD360_CERTIFICATION_REGISTRY,
  AWARD360_LOADER_MANIFEST,
);

export { isCertifiedLoader };
