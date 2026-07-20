/**
 * BN Gap Modules — Handler registry.
 *
 * A closed list. Adding a handler is a source-code change AND requires a
 * capability mapping in `gapCapabilityRegistry.ts`. Unmapped or unregistered
 * commands fail closed.
 */
import { BN_GAP_PING_HANDLER } from './pingCommand';
import { BN_MORTALITY_HANDLERS } from '@/services/bn/mortality/handlers';
import type { CommandHandler, HandlerRegistry } from './benefitsCommandPipeline';

const HANDLERS: readonly CommandHandler<any, any>[] = [
  BN_GAP_PING_HANDLER,
  ...BN_MORTALITY_HANDLERS,
];

export const benefitsCommandHandlerRegistry: HandlerRegistry = {
  get(commandName: string, commandVersion: number): CommandHandler | null {
    return (
      HANDLERS.find(
        (h) => h.commandName === commandName && h.commandVersion === commandVersion,
      ) ?? null
    );
  },
};

export const BN_GAP_REGISTERED_COMMANDS: readonly {
  commandName: string;
  commandVersion: number;
  moduleCode: string;
}[] = HANDLERS.map((h) => ({
  commandName: h.commandName,
  commandVersion: h.commandVersion,
  moduleCode: h.moduleCode,
}));
