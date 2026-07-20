/**
 * Reversal + closure commands.
 */
import { createMortalityHandler, required } from './mortalityHandlerShared';

export const BN_MORTALITY_REVERSE_CONFIRMATION_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_REVERSE_CONFIRMATION',
  validate: (p) => {
    const r = required('reason', (p as any)?.reason);
    return r ? [r] : [];
  },
});

export const BN_MORTALITY_CLOSE_EVENT_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_CLOSE_EVENT',
});

export const CLOSURE_HANDLERS = [
  BN_MORTALITY_REVERSE_CONFIRMATION_HANDLER,
  BN_MORTALITY_CLOSE_EVENT_HANDLER,
];
