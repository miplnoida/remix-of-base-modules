import React from "react";
import {
  BnGapModuleRouteGate,
  type BnGapModuleAccessContext,
} from "@/components/bn/gap/BnGapModuleRouteGate";
import { BnGapModuleReadOnlyLanding } from "@/components/bn/gap/BnGapModuleReadOnlyLanding";
import { BN_MORTALITY_COMMANDS } from "@/types/bn/gap/mortality/mortalityCommands";
import { BN_MORTALITY_TRANSITIONS } from "@/types/bn/gap/mortality/mortalityStateMachine";

const commands = BN_MORTALITY_COMMANDS.map((c) => ({
  code: c.command,
  label: c.command
    .replace(/^BN_MORTALITY_/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (m) => m.toUpperCase()),
  verb: c.capability.replace(/^bn_mortality:/, ""),
}));

const states = Object.keys(BN_MORTALITY_TRANSITIONS);

export default function BnMortalityPage() {
  return (
    <BnGapModuleRouteGate moduleCode="bn_mortality" requiredAction="view">
      {(ctx: BnGapModuleAccessContext) => (
        <BnGapModuleReadOnlyLanding
          ctx={ctx}
          summary="Register, verify and action pensioner/claimant death reports. Server-authorised commands control payment holds, award termination and PAD overpayment creation."
          lifecycleStates={states}
          canonicalCommands={commands}
          handoffs={[
            { module: "bn_awards", description: "Places provisional payment hold and terminates awards on confirmation." },
            { module: "bn_overpayments", description: "Creates Payment-After-Death (PAD) overpayments." },
            { module: "bn_survivors", description: "Initiates survivor benefit follow-on when eligible." },
            { module: "communication_hub", description: "Sends condolence and next-of-kin communications." },
          ]}
        />
      )}
    </BnGapModuleRouteGate>
  );
}
