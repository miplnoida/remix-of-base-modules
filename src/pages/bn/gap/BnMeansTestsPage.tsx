import React from "react";
import {
  BnGapModuleRouteGate,
  type BnGapModuleAccessContext,
} from "@/components/bn/gap/BnGapModuleRouteGate";
import { BnGapModuleReadOnlyLanding } from "@/components/bn/gap/BnGapModuleReadOnlyLanding";
import { BN_MEANS_COMMANDS } from "@/types/bn/gap/means/meansCommands";
import { BN_MEANS_TRANSITIONS } from "@/types/bn/gap/means/meansStateMachine";

const commands = BN_MEANS_COMMANDS.map((c) => ({
  code: c.command,
  label: c.command.replace(/^BN_MEANS_/, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase()),
  verb: c.capability.replace(/^bn_means_tests:/, ""),
}));
const states = Object.keys(BN_MEANS_TRANSITIONS);

export default function BnMeansTestsPage() {
  return (
    <BnGapModuleRouteGate moduleCode="bn_means_tests" requiredAction="view">
      {(ctx: BnGapModuleAccessContext) => (
        <BnGapModuleReadOnlyLanding
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
    </BnGapModuleRouteGate>
  );
}
