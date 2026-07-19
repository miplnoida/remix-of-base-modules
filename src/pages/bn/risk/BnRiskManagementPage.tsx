import React from "react";
import {
  BnModuleRouteGate,
  type BnModuleAccessContext,
} from "@/components/bn/access/BnModuleRouteGate";
import { BnBenefitsCommandDiagnosticsCard } from "@/components/bn/diagnostics/BnBenefitsCommandDiagnosticsCard";
import { BN_RISK_COMMANDS } from "@/types/bn/risk/riskCommands";
import { BN_RISK_TRANSITIONS } from "@/types/bn/risk/riskStateMachine";

const commands = BN_RISK_COMMANDS.map((c) => ({
  code: c.command,
  label: c.command.replace(/^BN_RISK_/, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase()),
  verb: c.capability.replace(/^bn_risk_management:/, ""),
}));
const states = Object.keys(BN_RISK_TRANSITIONS);

export default function BnRiskManagementPage() {
  return (
    <BnModuleRouteGate moduleCode="bn_risk_management" requiredAction="view">
      {(ctx: BnModuleAccessContext) => (
        <BnBenefitsCommandDiagnosticsCard
          ctx={ctx}
          summary="Detect, score, triage and action fraud, error and risk signals with explainable severity and approval-gated controls."
          lifecycleStates={states}
          canonicalCommands={commands}
          handoffs={[
            { module: "bn_claim", description: "Places verification holds on high-severity signals during assessment." },
            { module: "bn_awards", description: "Requests suspension/review for benefit-affecting controls after approval." },
            { module: "bn_overpayments", description: "Raises overpayments where confirmed fraud/error is quantified." },
          ]}
        />
      )}
    </BnModuleRouteGate>
  );
}
