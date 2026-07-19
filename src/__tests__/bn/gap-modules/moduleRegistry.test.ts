import { describe, it, expect } from 'vitest';
import { BN_GAP_MODULES, BN_GAP_MODULE_CODES, isBnGapModuleCode } from '@/types/bn/commands/moduleCodes';
import { BN_GAP_CAPABILITIES, BN_GAP_COMMAND_CAPABILITY, requiredCapabilityFor } from '@/services/bn/commands';
import { BN_GAP_REGISTERED_COMMANDS } from '@/services/bn/commands';

describe('BN Gap — module + capability registration', () => {
  it('exposes exactly six modules', () => {
    expect(BN_GAP_MODULES).toHaveLength(6);
    expect(new Set(BN_GAP_MODULE_CODES)).toEqual(new Set([
      'bn_mortality',
      'bn_overpayments',
      'bn_appeals',
      'bn_means_tests',
      'bn_risk_management',
      'bn_uprating',
    ]));
  });

  it('every module has four verbs registered', () => {
    for (const code of BN_GAP_MODULE_CODES) {
      for (const verb of ['read', 'write', 'decide', 'admin']) {
        expect(BN_GAP_CAPABILITIES).toContain(`${code}:${verb}`);
      }
    }
  });

  it('every registered command has a capability mapping', () => {
    for (const c of BN_GAP_REGISTERED_COMMANDS) {
      const cap = requiredCapabilityFor(c.commandName);
      expect(cap, `missing capability mapping for ${c.commandName}`).not.toBeNull();
      const [modulePart] = (cap as string).split(':');
      expect(BN_GAP_MODULE_CODES).toContain(modulePart as any);
    }
  });

  it('rejects unknown module codes', () => {
    expect(isBnGapModuleCode('bn_mortality')).toBe(true);
    expect(isBnGapModuleCode('bn_pizza')).toBe(false);
  });

  it('exposes a capability for the PING command mapped to a gap module', () => {
    expect(BN_GAP_COMMAND_CAPABILITY.BN_GAP_PING).toMatch(/^bn_/);
  });
});
