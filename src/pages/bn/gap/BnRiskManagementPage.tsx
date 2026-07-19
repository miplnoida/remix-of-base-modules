import React from "react";
import {
  BnGapModuleRouteGate,
  type BnGapModuleAccessContext,
} from "@/components/bn/gap/BnGapModuleRouteGate";
import { BnGapModuleReadOnlyLanding } from "@/components/bn/gap/BnGapModuleReadOnlyLanding";
import { BN_RISK_COMMANDS } from "@/types/bn/gap/risk/riskCommands";
import { BN_RISK_TRANSITIONS } from "@/types/bn/gap/risk/riskStateMachine";

const commands = BN_RISK_COMMANDS.map((c) => ({
  code: c.command,
  label: c.command.replace(/^BN_RISK_/, "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase()),
  verb: c.capability.replace(/^bn_risk_management:/, ""),
}));
const states = Object.keys(BN_RISK_TRANSITIONS);

export default function BnRiskManagementPage() {
  return (
    <BnGapModuleRouteGate moduleCode="bn_risk_management" requiredAction="view">
      {(ctx: BnGapModuleAccessContext) => (
        <BnGapModuleReadOnlyLanding
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
    </BnGapModuleRouteGate>
  );
}
