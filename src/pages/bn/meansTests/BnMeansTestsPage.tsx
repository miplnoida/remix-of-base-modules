import React from "react";
import {
  BnModuleRouteGate,
  type BnModuleAccessContext,
} from "@/components/bn/access/BnModuleRouteGate";
import { BnModuleReadOnlyPilotNotice } from "@/components/bn/access/BnModuleReadOnlyPilotNotice";

export default function BnMeansTestsPage() {
  return (
    <BnModuleRouteGate moduleCode="bn_means_tests" requiredAction="view">
      {(ctx: BnModuleAccessContext) => (
        <BnModuleReadOnlyPilotNotice
          ctx={ctx}
          title="Means-Tested Benefits"
          summary="Assess means-tested eligibility using canonical fact resolvers, disregards and household composition rules."
        />
      )}
    </BnModuleRouteGate>
  );
}
