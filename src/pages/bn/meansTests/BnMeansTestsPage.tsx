import React from "react";
import {
  BnModuleRouteGate,
  type BnModuleAccessContext,
} from "@/components/bn/access/BnModuleRouteGate";
import { BnBenefitsCommandDiagnosticsCard } from "@/components/bn/diagnostics/BnBenefitsCommandDiagnosticsCard";
import { BN_MEANS_COMMANDS } from "@/types/bn/meansTests/meansCommands";
import { BN_MEANS_TRANSITIONS } from "@/types/bn/meansTests/meansStateMachine";

const commands = BN_MEANS_COMMANDS.map((c) => ({
  code: c.command,
  label: c.command.replace(/^BN_MEANS_/, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase()),
  verb: c.capability.replace(/^bn_means_tests:/, ""),
}));
const states = Object.keys(BN_MEANS_TRANSITIONS);

export default function BnMeansTestsPage() {
  return (
    <BnModuleRouteGate moduleCode="bn_means_tests" requiredAction="view">
      {(ctx: BnModuleAccessContext) => (
        <BnBenefitsCommandDiagnosticsCard
          ctx={ctx}
          summary="Effective-dated means-test assessments for assistance and non-contributory products. Publishes approved facts to the Benefits calculation engine."
          lifecycleStates={states}
          canonicalCommands={commands}
          handoffs={[
            { module: "bn_claim", description: "Consumes published means-test facts during eligibility evaluation." },
            { module: "bn_awards", description: "Triggers award re-assessment on ACTIVE fact changes." },
            { module: "communication_hub", description: "Sends assessment outcome and review-due notifications." },
          ]}
        />
      )}
    </BnModuleRouteGate>
  );
}
