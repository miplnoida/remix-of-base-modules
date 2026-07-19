/**
 * AW360-WAVE-1 Stage S2 — Seed profiles.
 *
 * A profile is a named filter over the constraint-filtered scenario set.
 *
 *   smoke     — minimal cross-benefit set for quick deployment verification.
 *   lifecycle — every applicable claim state + award lifecycle state.
 *   financial — payment / adjustment / recovery / reconciliation cases.
 *   full      — every valid process + valid negative scenario after filter.
 */

import type { ScenarioRecord } from './seedScenarioManifest';

export type SeedProfile = 'smoke' | 'lifecycle' | 'financial' | 'full';

export interface ProfileResult {
  readonly profile: SeedProfile;
  readonly scenarios: readonly ScenarioRecord[];
  readonly countsByBenefit: Record<string, number>;
}

const SMOKE_VARIANTS_PER_BENEFIT = new Set([
  'CLAIM_HAPPY_PATH_ELIGIBLE',
  'CLAIM_APPROVED_WITH_AWARD',
  'AWARD_ACTIVE',
]);

export function applyProfile(
  profile: SeedProfile,
  persistable: readonly ScenarioRecord[],
): ProfileResult {
  let selected: readonly ScenarioRecord[];
  switch (profile) {
    case 'smoke': {
      // One representative claim + one representative award per benefit.
      const byBenefit = new Map<string, ScenarioRecord[]>();
      for (const s of persistable) {
        const variant = s.scenarioKey.split('::')[1] ?? '';
        if (!SMOKE_VARIANTS_PER_BENEFIT.has(variant)) continue;
        const arr = byBenefit.get(s.benefitType) ?? [];
        arr.push(s);
        byBenefit.set(s.benefitType, arr);
      }
      selected = [...byBenefit.values()].flat();
      break;
    }
    case 'lifecycle': {
      selected = persistable.filter(
        (s) => s.claimState !== undefined || s.expectedLifecycleState !== undefined,
      );
      break;
    }
    case 'financial': {
      selected = persistable.filter((s) => s.paymentState !== undefined);
      break;
    }
    case 'full':
    default: {
      selected = persistable;
      break;
    }
  }

  const counts: Record<string, number> = {};
  for (const s of selected) counts[s.benefitType] = (counts[s.benefitType] ?? 0) + 1;

  return { profile, scenarios: selected, countsByBenefit: counts };
}
