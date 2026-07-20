/**
 * Follow-on referrals: survivor, funeral, legal, complete.
 */
import { createMortalityHandler } from './mortalityHandlerShared';

export const BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT',
});

export const BN_MORTALITY_INITIATE_FUNERAL_GRANT_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_INITIATE_FUNERAL_GRANT',
});

export const BN_MORTALITY_REFER_LEGAL_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_REFER_LEGAL',
  validate: (p) => {
    const r = (p as any)?.reason;
    return r ? [] : [{ code: 'FIELD_REQUIRED', message: 'reason is required.', field: 'reason' }];
  },
});

export const BN_MORTALITY_COMPLETE_FOLLOWON_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_COMPLETE_FOLLOWON',
});

export const FOLLOWON_HANDLERS = [
  BN_MORTALITY_INITIATE_SURVIVOR_ASSESSMENT_HANDLER,
  BN_MORTALITY_INITIATE_FUNERAL_GRANT_HANDLER,
  BN_MORTALITY_REFER_LEGAL_HANDLER,
  BN_MORTALITY_COMPLETE_FOLLOWON_HANDLER,
];
