/**
 * BN-SEC-S1B — Award Suspension Access Foundation
 *
 * Verifies the static (in-repo) side of the access foundation:
 *   - Feature flag `bn.servicing.awardSuspension` exists and defaults to false
 *   - Route `/bn/award-suspension` maps to the new dedicated flag
 *   - Broad `bn.awards` no longer controls the suspension route
 *   - Other bn.awards routes remain unchanged
 *
 * Database-side seeds (module_actions, role_permissions) are verified by the
 * seed insert itself and by the pre/post-seed queries in the completion report.
 * A live DB permission integration test belongs in a later e2e epic.
 */
import { describe, it, expect } from 'vitest';
import {
  ROUTE_FEATURE_MAP,
  isFeatureEnabled,
  getAllFlags,
} from '@/lib/bn/featureToggles';

describe('BN-SEC-S1B: Award Suspension access foundation', () => {
  it('registers the dedicated feature flag', () => {
    const flags = getAllFlags();
    expect('bn.servicing.awardSuspension' in flags).toBe(true);
  });

  it('defaults the flag to true (BN-MENU-S1: menu-visible, read-only)', () => {
    // Guard: this test asserts the shipped default only. Operational mutations
    // remain disabled through app_modules.actions_enabled=false.
    expect(isFeatureEnabled('bn.servicing.awardSuspension')).toBe(true);
  });

  it('remaps /bn/award-suspension to the dedicated flag', () => {
    expect(ROUTE_FEATURE_MAP['/bn/award-suspension']).toBe(
      'bn.servicing.awardSuspension'
    );
  });

  it('does not use the broad bn.awards flag for suspension', () => {
    expect(ROUTE_FEATURE_MAP['/bn/award-suspension']).not.toBe('bn.awards');
  });

  it('leaves other bn.awards routes on bn.awards', () => {
    expect(ROUTE_FEATURE_MAP['/bn/awards']).toBe('bn.awards');
    expect(ROUTE_FEATURE_MAP['/bn/awards/survivors']).toBe('bn.awards');
    expect(ROUTE_FEATURE_MAP['/bn/awards/adjustments']).toBe('bn.awards');
    expect(ROUTE_FEATURE_MAP['/bn/entitlements']).toBe('bn.awards');
    expect(ROUTE_FEATURE_MAP['/bn/survivors']).toBe('bn.awards');
  });
});
