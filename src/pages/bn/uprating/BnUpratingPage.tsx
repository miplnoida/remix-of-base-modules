import React from "react";
import {
  BnModuleRouteGate,
  type BnModuleAccessContext,
} from "@/components/bn/access/BnModuleRouteGate";
import { BnModuleReadOnlyPilotNotice } from "@/components/bn/access/BnModuleReadOnlyPilotNotice";

export default function BnUpratingPage() {
  return (
    <BnModuleRouteGate moduleCode="bn_uprating" requiredAction="view">
      {(ctx: BnModuleAccessContext) => (
        <BnModuleReadOnlyPilotNotice
          ctx={ctx}
          title="Uprating"
          summary="Apply policy-driven periodic uprating to awards using canonical policy types, indices and rounding modes."
        />
      )}
    </BnModuleRouteGate>
  );
}
