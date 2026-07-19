import React from "react";
import {
  BnModuleRouteGate,
  type BnModuleAccessContext,
} from "@/components/bn/access/BnModuleRouteGate";
import { BnBenefitsCommandDiagnosticsCard } from "@/components/bn/diagnostics/BnBenefitsCommandDiagnosticsCard";
import { BN_APPEAL_COMMANDS } from "@/types/bn/appeals/appealCommands";
import { BN_APPEAL_TRANSITIONS } from "@/types/bn/appeals/appealStateMachine";

const commands = BN_APPEAL_COMMANDS.map((c) => ({
  code: c.command,
  label: c.command.replace(/^BN_APPEAL_/, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase()),
  verb: c.capability.replace(/^bn_appeals:/, ""),
}));
const states = Object.keys(BN_APPEAL_TRANSITIONS);

export default function BnAppealsWorkspacePage() {
  return (
    <BnModuleRouteGate moduleCode="bn_appeals" requiredAction="view">
      {(ctx: BnModuleAccessContext) => (
        <BnBenefitsCommandDiagnosticsCard
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
    </BnModuleRouteGate>
  );
}
