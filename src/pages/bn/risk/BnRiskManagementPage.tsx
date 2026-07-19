import React from "react";
import {
  BnModuleRouteGate,
  type BnModuleAccessContext,
} from "@/components/bn/access/BnModuleRouteGate";
import { BnModuleReadOnlyPilotNotice } from "@/components/bn/access/BnModuleReadOnlyPilotNotice";

export default function BnRiskManagementPage() {
  return (
    <BnModuleRouteGate moduleCode="bn_risk_management" requiredAction="view">
      {(ctx: BnModuleAccessContext) => (
        <BnModuleReadOnlyPilotNotice
          ctx={ctx}
          title="Risk Management"
          summary="Enrich claims and awards with deterministic risk signals and category scoring for downstream decisioning."
        />
      )}
    </BnModuleRouteGate>
  );
}
