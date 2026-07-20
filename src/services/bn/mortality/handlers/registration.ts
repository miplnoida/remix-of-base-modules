/**
 * Registration + intake commands (draft, register, cancel, assign, evidence).
 */
import { createMortalityHandler, required } from './mortalityHandlerShared';
import type { BnGapCommandError } from '@/types/bn/commands/commandResult';

export const BN_MORTALITY_DRAFT_SAVE_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_DRAFT_SAVE',
  validate: () => [],
});

export const BN_MORTALITY_REGISTER_REPORT_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_REGISTER_REPORT',
  validate: (p) => {
    const errs: BnGapCommandError[] = [];
    const rn = required('deceased_full_name', (p as any).deceased_full_name);
    if (rn) errs.push(rn);
    const rs = required('source', (p as any).source);
    if (rs) errs.push(rs);
    return errs;
  },
});

export const BN_MORTALITY_CANCEL_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_CANCEL',
});

export const BN_MORTALITY_ASSIGN_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_ASSIGN',
  validate: (p) => {
    const has = (p as any).assigned_to || (p as any).workbasket_id;
    return has ? [] : [{ code: 'ASSIGN_TARGET_REQUIRED', message: 'assigned_to or workbasket_id required.' }];
  },
});

export const BN_MORTALITY_ATTACH_EVIDENCE_HANDLER = createMortalityHandler({
  commandName: 'BN_MORTALITY_ATTACH_EVIDENCE',
});

export const REGISTRATION_HANDLERS = [
  BN_MORTALITY_DRAFT_SAVE_HANDLER,
  BN_MORTALITY_REGISTER_REPORT_HANDLER,
  BN_MORTALITY_CANCEL_HANDLER,
  BN_MORTALITY_ASSIGN_HANDLER,
  BN_MORTALITY_ATTACH_EVIDENCE_HANDLER,
];
