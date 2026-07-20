/**
 * Matching + duplicate-detection commands.
 */
import { createMortalityHandler, required } from './mortalityHandlerShared';
import type { BnGapCommandError } from '@/types/bn/commands/commandResult';

export const BN_MORTALITY_MATCH_PERSON_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_MATCH_PERSON',
  validate: (p) => {
    const errs: BnGapCommandError[] = [];
    const ip = required('ip_id', (p as any).ip_id);
    if (ip) errs.push(ip);
    return errs;
  },
});

export const BN_MORTALITY_MARK_DUPLICATE_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_MARK_DUPLICATE',
  validate: (p) => {
    const errs: BnGapCommandError[] = [];
    const dup = required('duplicate_of_event_id', (p as any).duplicate_of_event_id);
    if (dup) errs.push(dup);
    return errs;
  },
});

export const MATCHING_HANDLERS = [
  BN_MORTALITY_MATCH_PERSON_HANDLER,
  BN_MORTALITY_MARK_DUPLICATE_HANDLER,
];
