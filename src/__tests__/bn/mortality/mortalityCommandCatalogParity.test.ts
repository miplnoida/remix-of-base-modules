/**
 * BN-MORT-UI-1D §D — Command-catalogue PARITY test.
 *
 * The browser canonical catalogue (`mortalityCommandCatalog.ts`) and the
 * generated edge mirror
 * (`supabase/functions/bn-benefits-query/_generated_command_catalog.ts`)
 * MUST agree on every field of every command, or drift will let the UI
 * offer actions the server rejects (or hide actions the server allows).
 *
 * If this test fails, run:
 *   bunx tsx scripts/bn/generate-mortality-command-catalog.ts
 * and re-commit.
 */
import { describe, it, expect } from 'vitest';
import {
  MORTALITY_COMMAND_CATALOG,
  MORTALITY_COMMAND_COUNT,
} from '@/types/bn/mortality/mortalityCommandCatalog';
import {
  MORTALITY_COMMAND_CATALOG_GENERATED,
  MORTALITY_COMMAND_COUNT_GENERATED,
} from '../../../../supabase/functions/bn-benefits-query/_generated_command_catalog';

describe('BN Mortality — canonical command parity', () => {
  it('canonical catalogue exposes exactly 26 commands', () => {
    expect(MORTALITY_COMMAND_COUNT).toBe(26);
  });

  it('generated edge mirror exposes exactly 26 commands', () => {
    expect(MORTALITY_COMMAND_COUNT_GENERATED).toBe(26);
  });

  it('generated mirror matches canonical field-by-field', () => {
    // Normalise both to plain JSON for a deterministic byte-compare.
    const canonical = JSON.parse(JSON.stringify(MORTALITY_COMMAND_CATALOG));
    const mirror = JSON.parse(JSON.stringify(MORTALITY_COMMAND_CATALOG_GENERATED));
    expect(mirror).toEqual(canonical);
  });

  it('every command carries a capability in the bn_mortality namespace', () => {
    for (const c of MORTALITY_COMMAND_CATALOG) {
      expect(c.capability.startsWith('bn_mortality:')).toBe(true);
    }
  });

  it('unimplemented commands have a blocker explanation', () => {
    for (const c of MORTALITY_COMMAND_CATALOG) {
      if (!c.implemented) {
        expect(c.blocker, `Command ${c.command} is not implemented but has no blocker text`).toBeTruthy();
      }
    }
  });

  it('maker-source, when set, points at a real command in the catalogue', () => {
    const names = new Set(MORTALITY_COMMAND_CATALOG.map((c) => c.command));
    for (const c of MORTALITY_COMMAND_CATALOG) {
      if (c.makerSource) {
        expect(names.has(c.makerSource), `${c.command}.makerSource "${c.makerSource}" is not a known command`).toBe(true);
      }
    }
  });
});
