/**
 * BN-SEC-S1B.1 — Production dark-launch protection for Award Suspension.
 *
 * The BN feature-toggle framework normally honours localStorage overrides for
 * developer convenience. Because Award Suspension still contains an unsafe
 * browser-side mutation until later epics complete, a production user must
 * not be able to casually activate it via localStorage['bn.featureToggles'].
 *
 * Approved environment configuration (VITE_BN_SERVICING_AWARDSUSPENSION) may
 * still enable the flag in an approved controlled environment.
 */
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

const setStoredOverrides = (obj: Record<string, boolean>) => {
  window.localStorage.setItem('bn.featureToggles', JSON.stringify(obj));
};

const reloadModule = async () => {
  vi.resetModules();
  return await import('@/lib/bn/featureToggles');
};

describe('BN-SEC-S1B.1: production dark-launch protection', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults bn.servicing.awardSuspension to false', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('PROD', true as unknown as string);
    const mod = await reloadModule();
    expect(mod.isFeatureEnabled('bn.servicing.awardSuspension')).toBe(false);
  });

  it('production localStorage override CANNOT enable Award Suspension', async () => {
    setStoredOverrides({ 'bn.servicing.awardSuspension': true });
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('PROD', true as unknown as string);
    const mod = await reloadModule();
    expect(mod.isFeatureEnabled('bn.servicing.awardSuspension')).toBe(false);
  });

  it('approved environment configuration CAN enable Award Suspension', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('PROD', true as unknown as string);
    vi.stubEnv('VITE_BN_SERVICING_AWARDSUSPENSION', 'true');
    const mod = await reloadModule();
    expect(mod.isFeatureEnabled('bn.servicing.awardSuspension')).toBe(true);
  });

  it('non-production localStorage override CAN still enable Award Suspension for dev', async () => {
    setStoredOverrides({ 'bn.servicing.awardSuspension': true });
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('PROD', false as unknown as string);
    const mod = await reloadModule();
    expect(mod.isFeatureEnabled('bn.servicing.awardSuspension')).toBe(true);
  });

  it('other BN localStorage overrides continue to work in production', async () => {
    // Only Award Suspension is on the production denylist.
    setStoredOverrides({
      'bn.servicing.lifeCert': true,
      'bn.servicing.overpayment': true,
      'bn.servicing.medicalReview': true,
    });
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('PROD', true as unknown as string);
    const mod = await reloadModule();
    expect(mod.isFeatureEnabled('bn.servicing.lifeCert')).toBe(true);
    expect(mod.isFeatureEnabled('bn.servicing.overpayment')).toBe(true);
    expect(mod.isFeatureEnabled('bn.servicing.medicalReview')).toBe(true);
    // And Award Suspension remains blocked in the same session.
    expect(mod.isFeatureEnabled('bn.servicing.awardSuspension')).toBe(false);
  });

  it('production localStorage override CANNOT disable a normally-on flag it was not asked to change', async () => {
    // Sanity: master switch remains on and unrelated defaults are unchanged.
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('PROD', true as unknown as string);
    const mod = await reloadModule();
    expect(mod.isFeatureEnabled('bn.enabled')).toBe(true);
    expect(mod.isFeatureEnabled('bn.awards')).toBe(true);
  });
});
