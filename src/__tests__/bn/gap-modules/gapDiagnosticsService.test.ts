import { describe, it, expect } from 'vitest';
import { buildGapDiagnosticsSnapshot, BN_GAP_CONTRACT_VERSION } from '@/services/bn/gap/gapDiagnosticsService';
import type { BenefitsGapApiClient } from '@/services/bn/gap/benefitsGapApiClient';

const stubApi: Pick<BenefitsGapApiClient, 'getAllModuleRolloutStates'> = {
  async getAllModuleRolloutStates() {
    return [
      { moduleCode: 'bn_mortality',       exists: true, isEnabled: true, routesEnabled: true, actionsEnabled: false, showInMenu: false, rolloutState: 'internal', releaseVersion: null },
      { moduleCode: 'bn_overpayments',    exists: true, isEnabled: true, routesEnabled: true, actionsEnabled: false, showInMenu: false, rolloutState: 'internal', releaseVersion: null },
      { moduleCode: 'bn_appeals',         exists: true, isEnabled: true, routesEnabled: true, actionsEnabled: true,  showInMenu: false, rolloutState: 'internal', releaseVersion: null },
      { moduleCode: 'bn_means_tests',     exists: true, isEnabled: true, routesEnabled: true, actionsEnabled: false, showInMenu: false, rolloutState: 'internal', releaseVersion: null },
      { moduleCode: 'bn_risk_management', exists: true, isEnabled: true, routesEnabled: true, actionsEnabled: false, showInMenu: false, rolloutState: 'internal', releaseVersion: null },
      { moduleCode: 'bn_uprating',        exists: true, isEnabled: true, routesEnabled: true, actionsEnabled: false, showInMenu: false, rolloutState: 'internal', releaseVersion: null },
    ];
  },
};

describe('BN Gap Modules — diagnostics snapshot', () => {
  it('produces a full snapshot with counts for all six modules', async () => {
    const s = await buildGapDiagnosticsSnapshot(stubApi);
    expect(s.modules).toHaveLength(6);
    expect(s.totals.modules).toBe(6);
    expect(s.totals.enabledModules).toBe(6);
    expect(s.totals.actionsEnabledModules).toBe(1); // Appeals is dark-launched off elsewhere
    expect(s.totals.commands).toBeGreaterThan(50);
    expect(s.totals.integrationFlows).toBe(6);
    expect(s.contractVersion).toBe(BN_GAP_CONTRACT_VERSION);
  });

  it('assigns commands and capabilities to every module', async () => {
    const s = await buildGapDiagnosticsSnapshot(stubApi);
    for (const m of s.modules) {
      expect(m.commandCount, `${m.moduleCode} has no commands`).toBeGreaterThan(0);
      expect(m.capabilityCount).toBeGreaterThan(0);
    }
  });
});
