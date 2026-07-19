import React from "react";
import {
  BnGapModuleRouteGate,
  type BnGapModuleAccessContext,
} from "@/components/bn/gap/BnGapModuleRouteGate";
import { BnGapModuleReadOnlyLanding } from "@/components/bn/gap/BnGapModuleReadOnlyLanding";
import { MORTALITY_CANONICAL_STATES } from "@/types/bn/gap/mortality/mortalityStateMachine";
import { MORTALITY_CANONICAL_COMMANDS } from "@/types/bn/gap/mortality/mortalityCommands";

export default function BnMortalityPage() {
  return (
    <BnGapModuleRouteGate moduleCode="bn_mortality" requiredAction="view">
      {(ctx: BnGapModuleAccessContext) => (
        <BnGapModuleReadOnlyLanding
          ctx={ctx}
          summary="Register, verify and action reports of pensioner or claimant death. Server-authorised commands control payment holds, award termination and PAD overpayment creation."
          lifecycleStates={MORTALITY_CANONICAL_STATES as readonly string[]}
          canonicalCommands={MORTALITY_CANONICAL_COMMANDS.map((c) => ({
            code: c.code,
            label: c.label,
            verb: c.capability,
          }))}
          handoffs={[
            { module: "bn_awards", description: "Places provisional hold and terminates awards." },
            { module: "bn_overpayments", description: "Creates Payment-After-Death (PAD) overpayments." },
            { module: "bn_survivors", description: "Initiates survivor benefit follow-on when eligible." },
            { module: "communication_hub", description: "Sends condolence/next-of-kin communications." },
          ]}
        />
      )}
    </BnGapModuleRouteGate>
  );
}
