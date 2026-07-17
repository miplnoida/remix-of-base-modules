/**
 * AW360-WAVE-1-C1 Slice B.1a — Loader manifest drift test.
 *
 * A new async/query export in any of the three Award 360 service files
 * must be classified in `award360LoaderManifest.ts`. Manifest entries
 * pointing at missing exports and query loaders lacking any scenario id
 * also fail here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AWARD360_LOADER_MANIFEST,
  type Award360ExportEntry,
} from '@/services/bn/awards/award360LoaderManifest';

const SERVICE_FILES = [
  'src/services/bn/awards/award360Service.ts',
  'src/services/bn/awards/award360DeepService.ts',
  'src/services/bn/awards/award360SummaryService.ts',
] as const;

interface DiscoveredExport {
  name: string;
  sourceFile: string;
  isAsync: boolean;
}

const EXPORT_RE =
  /^export\s+(?:(async)\s+)?(?:function|const)\s+([A-Za-z0-9_]+)/gm;

function discoverExports(file: string): DiscoveredExport[] {
  const raw = readFileSync(resolve(process.cwd(), file), 'utf8');
  const out: DiscoveredExport[] = [];
  for (const match of raw.matchAll(EXPORT_RE)) {
    out.push({ name: match[2], sourceFile: file, isAsync: match[1] === 'async' });
  }
  return out;
}

describe('AW360 Slice B.1a · loader manifest drift', () => {
  const discovered = SERVICE_FILES.flatMap(discoverExports);
  const manifestByName = new Map<string, Award360ExportEntry>(
    AWARD360_LOADER_MANIFEST.map((e) => [e.name, e]),
  );

  it('every exported symbol from the three services is classified', () => {
    const missing = discovered.filter((d) => !manifestByName.has(d.name));
    expect(
      missing,
      `Unclassified exports: ${missing.map((m) => `${m.name} (${m.sourceFile})`).join(', ')}`,
    ).toEqual([]);
  });

  it('every async export is classified as QUERY_LOADER (unless it is an intentionally pure helper)', () => {
    const wrongClass = discovered
      .filter((d) => d.isAsync)
      .filter((d) => manifestByName.get(d.name)?.classification !== 'QUERY_LOADER');
    // Currently no async pure helpers exist. If one is added it must be
    // explicitly reclassified in the manifest; the test then guides the
    // developer to justify the reclassification here.
    expect(
      wrongClass,
      `Async exports not classified as QUERY_LOADER: ${wrongClass.map((w) => w.name).join(', ')}`,
    ).toEqual([]);
  });

  it('every manifest entry points to a real export', () => {
    const known = new Set(discovered.map((d) => d.name));
    const dangling = AWARD360_LOADER_MANIFEST.filter((e) => !known.has(e.name));
    expect(
      dangling,
      `Manifest entries pointing at missing exports: ${dangling.map((d) => d.name).join(', ')}`,
    ).toEqual([]);
  });

  it('every QUERY_LOADER has at least one scenario id (executed OR pending)', () => {
    const noScenario = AWARD360_LOADER_MANIFEST.filter(
      (e) =>
        e.classification === 'QUERY_LOADER' &&
        !e.pendingExecution &&
        (!e.scenarioIds || e.scenarioIds.length === 0),
    );
    expect(
      noScenario,
      `Query loaders missing scenarios: ${noScenario.map((n) => n.name).join(', ')}`,
    ).toEqual([]);
  });

  it('every QUERY_LOADER declares its category and expected tables', () => {
    const missingMeta = AWARD360_LOADER_MANIFEST.filter(
      (e) =>
        e.classification === 'QUERY_LOADER' &&
        (!e.category || !e.expectedTables || e.expectedTables.length === 0),
    );
    expect(missingMeta.map((e) => e.name)).toEqual([]);
  });
});
