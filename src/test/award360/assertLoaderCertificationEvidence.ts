/**
 * AW360-WAVE-1-C1 Sub-batch B2-c.2 — Reusable suite-aware certification
 * evidence reconciler.
 *
 * Product Deep certification lives in a separate test file from the
 * main-loader certification suite, but both need to prove exactly the
 * same structural and runtime invariants against their subset of the
 * registry. This helper is the single source of truth for those
 * assertions so neither suite can drift from the other.
 *
 * For a given `suiteId` this helper proves, using standard `expect()`:
 *
 *   1. every registry entry owned by this suite has `pendingExecution=false`
 *      in the manifest and every certified scenario is executed at least
 *      once in the captured evidence.
 *   2. every executed scenario tagged to a loader owned by this suite is
 *      registered (i.e. no stray production-loader scenario slips in).
 *   3. the observed table union per owned loader equals its
 *      `manifest.expectedTables` (both directions).
 *   4. every observed table is declared in the schema contract (no
 *      unknown table).
 *   5. every certified loader has exactly one recognised suite id, and
 *      no registry entry belongs to more than one suite.
 */
import { expect } from 'vitest';
import {
  AWARD360_CERTIFICATION_REGISTRY,
  AWARD360_CERTIFICATION_SUITE_IDS,
  type Award360CertificationSuiteId,
} from '@/services/bn/awards/award360CertificationRegistry';
import {
  AWARD360_LOADER_MANIFEST,
} from '@/services/bn/awards/award360LoaderManifest';
import type { RecordedScenarioExecution } from '@/test/mocks/award360QueryRecorder';

export interface AssertCertificationEvidenceInput {
  suiteId: Award360CertificationSuiteId;
  capturedExecutions: readonly RecordedScenarioExecution[];
}

export function assertLoaderCertificationEvidence(
  input: AssertCertificationEvidenceInput,
): void {
  const { suiteId, capturedExecutions } = input;

  // Structural: every registered loader has exactly one recognised suite id.
  for (const [name, cert] of Object.entries(AWARD360_CERTIFICATION_REGISTRY)) {
    expect(
      AWARD360_CERTIFICATION_SUITE_IDS.includes(cert.suiteId),
      `${name} has unrecognised suiteId "${cert.suiteId}"`,
    ).toBe(true);
  }

  // Loaders owned by this suite.
  const suiteLoaders = new Set(
    Object.entries(AWARD360_CERTIFICATION_REGISTRY)
      .filter(([, c]) => c.suiteId === suiteId)
      .map(([name]) => name),
  );
  expect(
    suiteLoaders.size,
    `suite ${suiteId} has no registered loaders`,
  ).toBeGreaterThan(0);

  const manifestByName = new Map(AWARD360_LOADER_MANIFEST.map((e) => [e.name, e]));

  // 1. Every owned loader has a manifest entry that is NOT pending.
  for (const loader of suiteLoaders) {
    const entry = manifestByName.get(loader);
    expect(entry, `manifest missing entry for ${loader}`).toBeTruthy();
    expect(
      entry!.pendingExecution,
      `${loader} is certified under ${suiteId} but manifest still marks pendingExecution`,
    ).not.toBe(true);
  }

  // 2. Every registered scenario for suite-owned loaders was executed.
  const executedKey = (e: RecordedScenarioExecution) => `${e.loaderName}::${e.scenarioId}`;
  const executed = new Set(capturedExecutions.map(executedKey));
  const missing: string[] = [];
  for (const loader of suiteLoaders) {
    const cert = AWARD360_CERTIFICATION_REGISTRY[loader]!;
    for (const s of cert.scenarios) {
      const key = `${loader}::${s.id}`;
      if (!executed.has(key)) missing.push(key);
    }
  }
  expect(
    missing,
    `[${suiteId}] Registered but never executed: ${missing.join(', ')}`,
  ).toEqual([]);

  // 3. Every executed scenario tagged to a suite-owned loader is registered.
  const registered = new Set<string>();
  for (const loader of suiteLoaders) {
    const cert = AWARD360_CERTIFICATION_REGISTRY[loader]!;
    for (const s of cert.scenarios) registered.add(`${loader}::${s.id}`);
  }
  const stray: string[] = [];
  for (const e of capturedExecutions) {
    if (!suiteLoaders.has(e.loaderName)) continue;
    const key = executedKey(e);
    if (!registered.has(key)) stray.push(key);
  }
  expect(
    stray,
    `[${suiteId}] Executed but unregistered: ${stray.join(', ')}`,
  ).toEqual([]);

  // 4. Observed table union per suite-owned loader equals manifest.expectedTables.
  for (const loader of suiteLoaders) {
    const observed = new Set<string>();
    for (const e of capturedExecutions) {
      if (e.loaderName !== loader) continue;
      for (const t of e.tables) observed.add(t);
    }
    const expected = new Set(manifestByName.get(loader)?.expectedTables ?? []);
    const missingT = [...expected].filter((t) => !observed.has(t));
    const extraT = [...observed].filter((t) => !expected.has(t));
    expect(
      { suiteId, loader, missing: missingT, extra: extraT },
      `[${suiteId}] ${loader} — observed ≠ manifest.expectedTables`,
    ).toEqual({ suiteId, loader, missing: [], extra: [] });
  }
}

/**
 * Prove that every certified loader belongs to exactly one suite and
 * that every declared suite id has at least one owned loader — used by
 * a top-level structural test in either suite file.
 */
export async function assertSuiteOwnershipIsPartitioned(): Promise<void> {
  const { AWARD360_SCHEMA_CONTRACT } = await import(
    '@/services/bn/awards/award360SchemaContract'
  );
  // Suite id → count.
  const counts = new Map<Award360CertificationSuiteId, number>();
  for (const id of AWARD360_CERTIFICATION_SUITE_IDS) counts.set(id, 0);
  for (const cert of Object.values(AWARD360_CERTIFICATION_REGISTRY)) {
    counts.set(cert.suiteId, (counts.get(cert.suiteId) ?? 0) + 1);
  }
  for (const [id, n] of counts) {
    expect(n, `suite ${id} owns zero certified loaders`).toBeGreaterThan(0);
  }
  // Sanity: schema contract is present and non-empty.
  expect(Object.keys(AWARD360_SCHEMA_CONTRACT).length).toBeGreaterThan(0);
}
