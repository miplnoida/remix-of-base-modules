/**
 * Verification lifecycle commands: submit, hold/release, conflict, confirm, reject.
 */
import { createMortalityHandler, required } from './mortalityHandlerShared';
import type { BnGapCommandError } from '@/types/bn/commands/commandResult';

const requireReason = (p: unknown): BnGapCommandError[] => {
  const r = required('reason', (p as any)?.reason);
  return r ? [r] : [];
};

export const BN_MORTALITY_SUBMIT_FOR_VERIFICATION_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_SUBMIT_FOR_VERIFICATION',
});

export const BN_MORTALITY_PLACE_PROVISIONAL_HOLD_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_PLACE_PROVISIONAL_HOLD',
  validate: requireReason,
});

export const BN_MORTALITY_RELEASE_HOLD_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_RELEASE_HOLD',
  validate: requireReason,
});

export const BN_MORTALITY_RECORD_CONFLICT_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_RECORD_CONFLICT',
  validate: requireReason,
});

export const BN_MORTALITY_RESOLVE_CONFLICT_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_RESOLVE_CONFLICT',
  validate: requireReason,
});

export const BN_MORTALITY_CONFIRM_VERIFICATION_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_CONFIRM_VERIFICATION',
});

export const BN_MORTALITY_REJECT_REPORT_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_REJECT_REPORT',
  validate: requireReason,
});

export const VERIFICATION_HANDLERS = [
  BN_MORTALITY_SUBMIT_FOR_VERIFICATION_HANDLER,
  BN_MORTALITY_PLACE_PROVISIONAL_HOLD_HANDLER,
  BN_MORTALITY_RELEASE_HOLD_HANDLER,
  BN_MORTALITY_RECORD_CONFLICT_HANDLER,
  BN_MORTALITY_RESOLVE_CONFLICT_HANDLER,
  BN_MORTALITY_CONFIRM_VERIFICATION_HANDLER,
  BN_MORTALITY_REJECT_REPORT_HANDLER,
];
