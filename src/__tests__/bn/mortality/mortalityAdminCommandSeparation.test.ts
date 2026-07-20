/**
 * BN-MORT-UI-RECOVERY-2C §7 — Architecture parity test.
 *
 * The internal rollout-administration command
 * `BN_MORTALITY_ADMIN_SET_INTEGRATION_READINESS` MUST remain distinct
 * from the 26-command business catalogue. If this test fails, either:
 *   (a) the admin command was accidentally added to the business
 *       catalogue and its dispatch path now flows through
 *       COMMAND_MATRIX / actions_enabled, or
 *   (b) the business catalogue drifted from the canonical 26.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MORTALITY_COMMAND_CATALOG } from '@/types/bn/mortality/mortalityCommandCatalog';

const ADMIN_COMMAND = 'BN_MORTALITY_ADMIN_SET_INTEGRATION_READINESS';

describe('BN-MORT-UI-RECOVERY-2C — admin command separation', () => {
  it('business catalogue holds exactly 26 canonical commands', () => {
    expect(MORTALITY_COMMAND_CATALOG.length).toBe(26);
  });

  it('admin readiness command is NOT part of the business catalogue', () => {
    const names = MORTALITY_COMMAND_CATALOG.map((c) => c.command);
    expect(names).not.toContain(ADMIN_COMMAND);
  });

  it('edge function dispatches the admin command outside COMMAND_MATRIX', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'supabase/functions/bn-mortality-command/index.ts'),
      'utf8',
    );
    // Dispatch branch must run BEFORE the COMMAND_MATRIX lookup.
    const adminIdx = src.indexOf(`envelope.commandName === '${ADMIN_COMMAND}'`);
    const matrixIdx = src.indexOf('COMMAND_MATRIX[envelope.commandName]');
    expect(adminIdx).toBeGreaterThan(0);
    expect(matrixIdx).toBeGreaterThan(0);
    expect(adminIdx).toBeLessThan(matrixIdx);

    // Handler must derive actor from JWT and reject payload spoofing.
    expect(src).toContain('ACTOR_IDENTITY_MISMATCH');
    // Handler must call the hardened RPC.
    expect(src).toContain('bn_mortality_set_integration_readiness');
  });
});
