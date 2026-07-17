/**
 * AW360-WAVE-1-C1 Slice B — Award action contract tests.
 *
 * Prove:
 * - Every AwardActionKey has exactly one definition.
 * - Every definition maps to a binding, capability and rule.
 * - Every navigation action has a route template.
 * - Mutations advertise `serverCommandAvailable=false` in Wave 1.
 * - The generator output equals the checked-in Markdown (drift guard).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  AWARD_ACTION_DEFINITIONS,
  renderAwardActionMatrixMarkdown,
} from '@/services/bn/awards/awardActionCatalog';
import {
  AWARD_ACTION_BINDINGS,
  AWARD_ACTION_IS_MUTATION,
  AWARD_ACTION_SERVER_COMMAND_AVAILABLE,
  type AwardActionKey,
} from '@/services/bn/awards/awardActionAvailability';

const ACTION_KEYS = Object.keys(AWARD_ACTION_BINDINGS) as AwardActionKey[];

describe('AW360 Slice B · action contract', () => {
  it('has exactly one definition per AwardActionKey', () => {
    const keys = AWARD_ACTION_DEFINITIONS.map((d) => d.key).sort();
    expect(keys).toEqual([...ACTION_KEYS].sort());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every binding is reachable and consistent with the resolver rules', () => {
    for (const def of AWARD_ACTION_DEFINITIONS) {
      const binding = AWARD_ACTION_BINDINGS[def.key];
      expect(binding).toBeDefined();
      expect(def.requiredCapability).toBe(binding.requiredCapability);
      expect(def.isMutation).toBe(AWARD_ACTION_IS_MUTATION[def.key]);
      expect(def.serverCommandAvailable).toBe(AWARD_ACTION_SERVER_COMMAND_AVAILABLE[def.key]);
    }
  });

  it('navigation actions carry a route template', () => {
    for (const def of AWARD_ACTION_DEFINITIONS) {
      if (!def.isMutation) {
        expect(def.routeTemplate).toMatch(/^\/[a-z]/);
      }
    }
  });

  it('no mutation advertises server-command availability in Wave 1', () => {
    for (const def of AWARD_ACTION_DEFINITIONS) {
      if (def.isMutation) expect(def.serverCommandAvailable).toBe(false);
    }
  });

  it('generated Markdown matches the checked-in action matrix', () => {
    const expected = renderAwardActionMatrixMarkdown().trim();
    const actual = readFileSync(
      resolve(process.cwd(), 'docs/bn/award360-action-matrix.md'),
      'utf8',
    ).trim();
    expect(actual).toBe(expected);
  });

  it('does not introduce disallowed action aliases', () => {
    const forbidden = ['OPEN_PENSIONER_360', 'OPEN_CLAIM_WORKBENCH', 'OPEN_PRODUCT_VERSION'];
    for (const bad of forbidden) {
      expect(ACTION_KEYS).not.toContain(bad as AwardActionKey);
    }
  });
});
