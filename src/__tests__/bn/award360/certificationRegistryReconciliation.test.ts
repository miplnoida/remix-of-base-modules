/**
 * AW360-WAVE-1-C1 Sub-batch B2-b.1b — Static registry / manifest / evidence
 * reconciliation.
 *
 * Runtime evidence (per-scenario table union, execution, zero-query
 * capture) is asserted in `award360LoaderCertification.test.ts` — this
 * file covers the structural, non-executing invariants only.
 */
import { describe, it, expect } from 'vitest';
import {
  AWARD360_CERTIFICATION_REGISTRY,
  certifiedLoaderNames,
  isCertifiedLoader,
} from '@/services/bn/awards/award360CertificationRegistry';
import {
  AWARD360_LOADER_MANIFEST,
} from '@/services/bn/awards/award360LoaderManifest';
import {
  AWARD360_CERTIFIED_LOADERS_BY_TABLE,
} from '@/services/bn/awards/award360LoaderEvidence';
import { AWARD360_SCHEMA_CONTRACT } from '@/services/bn/awards/award360SchemaContract';

const manifestByName = new Map(AWARD360_LOADER_MANIFEST.map((e) => [e.name, e]));
const certifiedNames = new Set(certifiedLoaderNames());

describe('AW360 B2-b.1b · registry/manifest structural reconciliation', () => {
  it('every certified loader exists in the manifest', () => {
    for (const name of certifiedNames) {
      expect(manifestByName.has(name), `missing manifest entry for certified loader ${name}`).toBe(true);
    }
  });

  it('no certified loader is marked pendingExecution', () => {
    for (const name of certifiedNames) {
      const entry = manifestByName.get(name)!;
      expect(entry.pendingExecution, `${name} is certified but manifest says pendingExecution`).not.toBe(true);
    }
  });

  it('every pending loader is absent from the registry', () => {
    for (const entry of AWARD360_LOADER_MANIFEST) {
      if (!entry.pendingExecution) continue;
      expect(
        isCertifiedLoader(entry.name),
        `${entry.name} is pending but appears in the certification registry`,
      ).toBe(false);
    }
  });

  it('every completed manifest QUERY_LOADER has a registry entry', () => {
    for (const entry of AWARD360_LOADER_MANIFEST) {
      if (entry.classification !== 'QUERY_LOADER') continue;
      if (entry.pendingExecution) continue;
      expect(
        isCertifiedLoader(entry.name),
        `${entry.name} is complete in the manifest but missing from the registry`,
      ).toBe(true);
    }
  });

  it('completed manifest scenarioIds equal registry scenarios (both directions)', () => {
    for (const [name, cert] of Object.entries(AWARD360_CERTIFICATION_REGISTRY)) {
      const entry = manifestByName.get(name)!;
      const registered = cert.scenarios.map((s) => s.id).sort();
      const manifested = [...(entry.scenarioIds ?? [])].sort();
      expect(manifested, `scenario drift for ${name}`).toEqual(registered);
    }
  });

  it('every registered loader has at least one scenario', () => {
    for (const [name, cert] of Object.entries(AWARD360_CERTIFICATION_REGISTRY)) {
      expect(cert.scenarios.length, `${name} has no registered scenarios`).toBeGreaterThan(0);
    }
  });

  it('scenario identity is unique per (loader, scenarioId) pair', () => {
    const seen = new Set<string>();
    for (const [name, cert] of Object.entries(AWARD360_CERTIFICATION_REGISTRY)) {
      for (const s of cert.scenarios) {
        const key = `${name}::${s.id}`;
        expect(seen.has(key), `duplicate scenario ${key}`).toBe(false);
        seen.add(key);
      }
    }
  });
});

describe('AW360 B2-b.1b · derived loader-to-table map hygiene', () => {
  it('map contains ONLY certified loaders', () => {
    for (const loaders of Object.values(AWARD360_CERTIFIED_LOADERS_BY_TABLE)) {
      for (const loader of loaders) {
        expect(certifiedNames.has(loader), `${loader} appears in map but is not certified`).toBe(true);
      }
    }
  });

  it('no pending loader appears in the generated map', () => {
    const pending = new Set(
      AWARD360_LOADER_MANIFEST.filter((e) => e.pendingExecution).map((e) => e.name),
    );
    for (const loaders of Object.values(AWARD360_CERTIFIED_LOADERS_BY_TABLE)) {
      for (const loader of loaders) {
        expect(pending.has(loader), `pending loader ${loader} leaked into map`).toBe(false);
      }
    }
  });

  it('every table in the derived map is declared in the schema contract', () => {
    for (const table of Object.keys(AWARD360_CERTIFIED_LOADERS_BY_TABLE)) {
      expect(
        Object.prototype.hasOwnProperty.call(AWARD360_SCHEMA_CONTRACT, table),
        `derived map references unknown table ${table}`,
      ).toBe(true);
    }
  });

  it('loader lists in the derived map are sorted deterministically', () => {
    for (const [table, loaders] of Object.entries(AWARD360_CERTIFIED_LOADERS_BY_TABLE)) {
      const sorted = [...loaders].sort();
      expect(loaders, `derived list for ${table} is not sorted`).toEqual(sorted);
    }
  });
});

// ─── B2-b.3b · registry accuracy corrections ─────────────────────────────
describe('AW360 B2-b.3b · registry accuracy', () => {
  it('synthetic Claim Deep negative-scope scenario is absent from the registry', () => {
    const claimDeep = AWARD360_CERTIFICATION_REGISTRY.getAwardClaimDeep;
    const ids = claimDeep.scenarios.map((s) => s.id);
    expect(ids).not.toContain('claim-deep-negative-scope-ssn-only');
  });

  it('Pensioner Deep no longer registers the mislabelled empty-related scenario', () => {
    const pensionerDeep = AWARD360_CERTIFICATION_REGISTRY.getAwardPensionerDeep;
    const ids = pensionerDeep.scenarios.map((s) => s.id);
    expect(ids).not.toContain('deep-empty-related');
  });

  it('Claim Deep has 21 registered production-loader scenarios', () => {
    expect(AWARD360_CERTIFICATION_REGISTRY.getAwardClaimDeep.scenarios.length).toBe(21);
  });
});
