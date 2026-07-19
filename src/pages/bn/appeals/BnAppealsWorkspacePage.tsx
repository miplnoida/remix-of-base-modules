import React from "react";
import {
  BnModuleRouteGate,
  type BnModuleAccessContext,
} from "@/components/bn/access/BnModuleRouteGate";
import { BnModuleReadOnlyPilotNotice } from "@/components/bn/access/BnModuleReadOnlyPilotNotice";

export default function BnAppealsWorkspacePage() {
  return (
    <BnModuleRouteGate moduleCode="bn_appeals" requiredAction="view">
      {(ctx: BnModuleAccessContext) => (
        <BnModuleReadOnlyPilotNotice
          ctx={ctx}
          title=Appeals Workspace
          summary=Register and process appeals against benefit decisions. Server-authorised commands drive intake, evidence, decision and appellate lifecycle.
        />
      )}
    </BnModuleRouteGate>
  );
}
