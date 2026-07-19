import React from "react";
import {
  BnModuleRouteGate,
  type BnModuleAccessContext,
} from "@/components/bn/access/BnModuleRouteGate";
import { BnModuleReadOnlyPilotNotice } from "@/components/bn/access/BnModuleReadOnlyPilotNotice";

export default function BnMortalityPage() {
  return (
    <BnModuleRouteGate moduleCode="bn_mortality" requiredAction="view">
      {(ctx: BnModuleAccessContext) => (
        <BnModuleReadOnlyPilotNotice
          ctx={ctx}
          title="Death & Mortality Processing"
          summary="Register, verify and action pensioner/claimant death reports. Server-authorised commands control payment holds, award termination and PAD overpayment creation."
        />
      )}
    </BnModuleRouteGate>
  );
}
