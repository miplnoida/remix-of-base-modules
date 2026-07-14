/**
 * BN-AWARD360-V2 — Action availability & permission gating.
 */
import { describe, it, expect } from 'vitest';
import { getAwardActionAvailability, getAllAwardActions } from '@/services/bn/awards/awardActionAvailability';

describe('BN-AWARD360-V2 · action availability', () => {
  it('never returns enabled=true — no server-authorized commands are wired in', () => {
    const actions = getAllAwardActions('award-1', 'user-1');
    for (const a of Object.values(actions)) {
      expect(a.enabled).toBe(false);
      expect(a.reason).toContain('Server-authorized');
    }
  });

  it('provides a targetRoute to the canonical specialist workspace for each action', () => {
    const actions = getAllAwardActions('award-1');
    for (const a of Object.values(actions)) {
      expect(a.targetRoute).toBeTruthy();
      expect(String(a.targetRoute).startsWith('/')).toBe(true);
    }
  });

  it('VERIFY_LIFE_CERTIFICATE routes to /bn/servicing/life-certificates', () => {
    const r = getAwardActionAvailability('VERIFY_LIFE_CERTIFICATE');
    expect(r.targetRoute).toBe('/bn/servicing/life-certificates');
    expect(r.enabled).toBe(false);
  });

  it('PROPOSE_SUSPENSION routes to /bn/award-suspension and is disabled', () => {
    const r = getAwardActionAvailability('PROPOSE_SUSPENSION');
    expect(r.targetRoute).toBe('/bn/award-suspension');
    expect(r.enabled).toBe(false);
  });

  it('SEND_AWARD_COMMUNICATION routes to /communication-hub', () => {
    const r = getAwardActionAvailability('SEND_AWARD_COMMUNICATION');
    expect(r.targetRoute).toBe('/communication-hub');
    expect(r.enabled).toBe(false);
  });
});
