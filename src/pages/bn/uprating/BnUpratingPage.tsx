import React from "react";
import {
  BnModuleRouteGate,
  type BnModuleAccessContext,
} from "@/components/bn/access/BnModuleRouteGate";
import { BnBenefitsCommandDiagnosticsCard } from "@/components/bn/diagnostics/BnBenefitsCommandDiagnosticsCard";
import { BN_UPRATING_CANONICAL_COMMANDS } from "@/types/bn/uprating/upratingCanonicalCommands";
import { BN_UPRATING_RUN_TRANSITIONS } from "@/types/bn/uprating/upratingRunCanonicalStateMachine";

const commands = BN_UPRATING_CANONICAL_COMMANDS.map((c) => ({
  code: c.command,
  label: c.command.replace(/^BN_UPRATING_/, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase()),
  verb: c.capability.replace(/^bn_uprating:/, ""),
}));
const states = Object.keys(BN_UPRATING_RUN_TRANSITIONS);

export default function BnUpratingPage() {
  return (
    <BnModuleRouteGate moduleCode="bn_uprating" requiredAction="view">
      {(ctx: BnModuleAccessContext) => (
        <BnBenefitsCommandDiagnosticsCard
          ctx={ctx}
          summary="Configure, simulate, approve and execute bulk uprating and indexation runs against active awards with reconciliation and arrears support."
          lifecycleStates={states}
          canonicalCommands={commands}
          handoffs={[
            { module: "bn_awards", description: "Applies approved uprating adjustments to award rates on execution." },
            { module: "bn_payments", description: "Schedules arrears and next-cycle differential payments." },
            { module: "communication_hub", description: "Sends award rate change notifications to affected pensioners." },
          ]}
        />
      )}
    </BnModuleRouteGate>
  );
}
