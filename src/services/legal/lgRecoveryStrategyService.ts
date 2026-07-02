import type {
  RecoveryAssignment, NextRecommendedAction, RecoveryStrategyCode,
} from "@/types/legal/recoveryAssignment";
import { listStrategyTypes } from "@/services/legal/lgRecoveryCampaignService";

/**
 * Rule-based Next Recommended Action engine.
 * No AI. Deterministic priority ladder:
 *   1. Overdue court order / breached  → COURT_FU / ESCALATION
 *   2. Broken installment plan          → ESCALATION
 *   3. No action in 30+ days            → VISIT
 *   4. No action in 14+ days            → PHONE
 *   5. No action in 7+ days             → DEMAND (letter)
 *   6. Otherwise                        → follow strategy playbook
 */
export async function computeNextAction(a: RecoveryAssignment): Promise<NextRecommendedAction> {
  const days = a.last_action_at
    ? Math.floor((Date.now() - new Date(a.last_action_at).getTime()) / (24 * 60 * 60 * 1000))
    : 999;

  if (a.enforcement_count > 0 && a.health === "CRITICAL") {
    return { code: "COURT_FU", label: "Court follow-up",
      reason: "Active enforcement with critical health", due_in_days: 1, strategy_code: "COURT_FU" };
  }
  if (a.health === "CRITICAL") {
    return { code: "ESCALATION", label: "Escalate to supervisor",
      reason: "Assignment health is critical", due_in_days: 1, strategy_code: "ESCALATION" };
  }
  if (a.order_count > 0 && Number(a.total_outstanding) > 0 && days > 14) {
    return { code: "COURT_FU", label: "Court order follow-up",
      reason: `Order outstanding, no action for ${days} days`, due_in_days: 2, strategy_code: "COURT_FU" };
  }
  if (days >= 30) {
    return { code: "VISIT", label: "Field visit",
      reason: `No contact for ${days} days`, due_in_days: 3, strategy_code: "VISIT" };
  }
  if (days >= 14) {
    return { code: "PHONE", label: "Phone follow-up",
      reason: `No contact for ${days} days`, due_in_days: 2, strategy_code: "PHONE" };
  }
  if (days >= 7) {
    return { code: "DEMAND", label: "Send demand letter",
      reason: `No contact for ${days} days`, due_in_days: 3, strategy_code: "DEMAND" };
  }

  // Follow current strategy playbook if defined
  const strategies = await listStrategyTypes();
  const current = strategies.find((s) => s.code === a.strategy_type_code);
  const firstStep = current?.playbook_json?.[0];
  if (current && firstStep) {
    return {
      code: firstStep.action,
      label: `${current.name}: ${firstStep.action.replace(/_/g, " ").toLowerCase()}`,
      reason: `Playbook step 1 of ${current.name}`,
      due_in_days: firstStep.sla_days ?? 7,
      strategy_code: current.code as RecoveryStrategyCode,
    };
  }
  return {
    code: "PHONE", label: "Initial phone outreach",
    reason: "No strategy configured — default outreach",
    due_in_days: 3, strategy_code: "PHONE",
  };
}
