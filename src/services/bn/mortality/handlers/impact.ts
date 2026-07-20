/**
 * Impact-review lifecycle: prepare, submit, return, approve, terminate, PAD overpayment.
 */
import { createMortalityHandler, required } from './mortalityHandlerShared';
import type { BnGapCommandError } from '@/types/bn/commands/commandResult';

export const BN_MORTALITY_PREPARE_IMPACT_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_PREPARE_IMPACT',
});

export const BN_MORTALITY_SUBMIT_IMPACT_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_SUBMIT_IMPACT',
});

export const BN_MORTALITY_RETURN_IMPACT_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_RETURN_IMPACT',
  validate: (p) => {
    const r = required('reason', (p as any)?.reason);
    return r ? [r] : [];
  },
});

export const BN_MORTALITY_APPROVE_IMPACT_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_APPROVE_IMPACT',
});

export const BN_MORTALITY_TERMINATE_AWARD_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_TERMINATE_AWARD',
  validate: (p) => {
    const errs: BnGapCommandError[] = [];
    const r = required('reason', (p as any)?.reason);
    if (r) errs.push(r);
    return errs;
  },
});

export const BN_MORTALITY_CREATE_PAD_OVERPAYMENT_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_CREATE_PAD_OVERPAYMENT',
  validate: (p) => {
    const errs: BnGapCommandError[] = [];
    const amt = (p as any)?.amount_minor;
    if (amt === undefined || amt === null) {
      errs.push({ code: 'AMOUNT_REQUIRED', message: 'amount_minor is required.', field: 'amount_minor' });
    } else if (!Number.isFinite(Number(amt)) || Number(amt) <= 0) {
      errs.push({ code: 'AMOUNT_INVALID', message: 'amount_minor must be a positive integer.', field: 'amount_minor' });
    }
    return errs;
  },
});

export const IMPACT_HANDLERS = [
  BN_MORTALITY_PREPARE_IMPACT_HANDLER,
  BN_MORTALITY_SUBMIT_IMPACT_HANDLER,
  BN_MORTALITY_RETURN_IMPACT_HANDLER,
  BN_MORTALITY_APPROVE_IMPACT_HANDLER,
  BN_MORTALITY_TERMINATE_AWARD_HANDLER,
  BN_MORTALITY_CREATE_PAD_OVERPAYMENT_HANDLER,
];
