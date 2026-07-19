import React from "react";
import {
  BnGapModuleRouteGate,
  type BnGapModuleAccessContext,
} from "@/components/bn/gap/BnGapModuleRouteGate";
import { BnGapModuleReadOnlyLanding } from "@/components/bn/gap/BnGapModuleReadOnlyLanding";
import { BN_APPEAL_COMMANDS } from "@/types/bn/gap/appeals/appealCommands";
import { BN_APPEAL_TRANSITIONS } from "@/types/bn/gap/appeals/appealStateMachine";

const commands = BN_APPEAL_COMMANDS.map((c) => ({
  code: c.command,
  label: c.command.replace(/^BN_APPEAL_/, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase()),
  verb: c.capability.replace(/^bn_appeals:/, ""),
}));
const states = Object.keys(BN_APPEAL_TRANSITIONS);

export default function BnAppealsWorkspacePage() {
  return (
    <BnGapModuleRouteGate moduleCode="bn_appeals" requiredAction="view">
      {(ctx: BnGapModuleAccessContext) => (
        <BnGapModuleReadOnlyLanding
          ctx={ctx}
          summary="Manage claimant appeals and disputes from submission through reconsideration, hearing and outcome implementation."
          lifecycleStates={states}
          canonicalCommands={commands}
          handoffs={[
            { module: "bn_claim", description: "Reads decision snapshot; posts reconsidered outcomes back to claim." },
            { module: "bn_awards", description: "Implements award reinstatement or rate changes on allowed appeals." },
            { module: "bn_overpayments", description: "Cancels or adjusts overpayments when the underlying decision is overturned." },
            { module: "communication_hub", description: "Issues acknowledgement, hearing notice and outcome letters." },
          ]}
        />
      )}
    </BnGapModuleRouteGate>
  );
}
