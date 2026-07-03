/**
 * EPIC-07 — Next Legal Action Engine
 * Rule-based deterministic recommender. Consumes the same snapshot as
 * legalRecoveryHealthEngine and emits one prioritised next action.
 * No AI.
 */
import type {
  NextLegalAction, JudgmentCompliance, ConsentOrder,
  ConsentInstallment, CourtFiling, ExternalCounselEngagement,
  ExternalCounselInvoice, LegalCost,
} from "@/types/legal/postJudgment";
import { computeComplianceCalc } from "./judgmentComplianceEngine";
import { computeConsentCompliance } from "./consentOrderEngine";
import { evaluateFilingDeadline } from "./courtFilingEngine";
import { summariseCounselFees } from "./externalCounselEngine";
import { summariseLegalCosts } from "./legalCostEngine";

export interface NextLegalActionInput {
  compliances: JudgmentCompliance[];
  consentOrders: Array<{ order: ConsentOrder; installments: ConsentInstallment[] }>;
  filings: CourtFiling[];
  engagements: Array<{ engagement: ExternalCounselEngagement; invoices: ExternalCounselInvoice[] }>;
  costs: LegalCost[];
  enforcementActive: number;
  hasActiveRecovery: boolean;
}

/**
 * Priority ladder — first hit wins:
 *  1. Filing overdue
 *  2. Judgment breached
 *  3. Consent order breached
 *  4. Filing at risk (<=3d)
 *  5. Judgment compliance overdue
 *  6. Judgment compliance due soon (<=7d)
 *  7. Counsel invoice disputed
 *  8. Counsel over budget
 *  9. Unrecovered legal costs > 0
 * 10. Enforcement stalled
 * 11. Otherwise routine monitoring
 */
export function computeNextLegalAction(input: NextLegalActionInput): NextLegalAction {
  // 1. Filing overdue
  for (const f of input.filings) {
    const d = evaluateFilingDeadline(f);
    if (d.is_overdue) return {
      code: "FILING_OVERDUE", label: "File overdue court document",
      reason: `${f.title} filing is overdue`,
      due_in_days: 0, target_entity: "FILING", target_id: f.id,
    };
  }
  // 2. Judgment breached
  for (const jc of input.compliances) {
    if (jc.compliance_status === "BREACHED") return {
      code: "JUDGMENT_ENFORCE", label: "Initiate enforcement on breached judgment",
      reason: "Judgment has been breached", due_in_days: 1,
      target_entity: "JUDGMENT", target_id: jc.id,
    };
  }
  // 3. Consent breached
  for (const { order } of input.consentOrders) {
    if (order.status === "BREACHED") return {
      code: "CONSENT_BREACH_ACTION",
      label: order.breach_recommendation === "VARIATION"
        ? "Apply for consent order variation"
        : order.breach_recommendation === "COURT_APPLICATION"
        ? "File court application on breach"
        : "Escalate consent order enforcement",
      reason: "Consent order is in breach", due_in_days: 2,
      target_entity: "CONSENT", target_id: order.id,
    };
  }
  // 4. Filing at risk
  for (const f of input.filings) {
    const d = evaluateFilingDeadline(f);
    if (d.is_at_risk) return {
      code: "FILING_PREPARE", label: "Prepare and file upcoming court document",
      reason: `${f.title} due in ${d.days_to_deadline}d`,
      due_in_days: d.days_to_deadline ?? 3,
      target_entity: "FILING", target_id: f.id,
    };
  }
  // 5-6. Judgment compliance timing
  for (const jc of input.compliances) {
    const c = computeComplianceCalc(jc);
    if (c.is_overdue) return {
      code: "COMPLIANCE_FOLLOWUP", label: "Follow up on overdue judgment compliance",
      reason: `Payment overdue by ${Math.abs(c.days_to_due ?? 0)}d`,
      due_in_days: 1, target_entity: "JUDGMENT", target_id: jc.id,
    };
    if (c.days_to_due !== null && c.days_to_due <= 7 && c.days_to_due >= 0) return {
      code: "COMPLIANCE_REMINDER", label: "Send compliance reminder",
      reason: `Compliance due in ${c.days_to_due}d`,
      due_in_days: c.days_to_due, target_entity: "JUDGMENT", target_id: jc.id,
    };
  }
  // 7-8. Counsel
  for (const { engagement, invoices } of input.engagements) {
    const disputed = invoices.find((i) => i.status === "DISPUTED");
    if (disputed) return {
      code: "INVOICE_DISPUTE_RESOLVE", label: "Resolve counsel invoice dispute",
      reason: `Invoice ${disputed.invoice_number} disputed`,
      due_in_days: 3, target_entity: "COUNSEL", target_id: engagement.id,
    };
    const s = summariseCounselFees(engagement, invoices);
    if (s.is_over_budget) return {
      code: "COUNSEL_BUDGET_REVIEW", label: "Review counsel budget",
      reason: "Engagement over budget", due_in_days: 5,
      target_entity: "COUNSEL", target_id: engagement.id,
    };
  }
  // 9. Consent installment upcoming
  for (const { order, installments } of input.consentOrders) {
    if (order.status !== "ACTIVE") continue;
    const cc = computeConsentCompliance(order, installments);
    if (cc.next_due_date) {
      const days = Math.floor(
        (new Date(cc.next_due_date).getTime() - Date.now()) / 86_400_000);
      if (days <= 3 && days >= 0) return {
        code: "CONSENT_INSTALLMENT_REMINDER",
        label: "Remind on upcoming consent installment",
        reason: `Next installment due in ${days}d`,
        due_in_days: days, target_entity: "CONSENT", target_id: order.id,
      };
    }
  }
  // 10. Legal costs unrecovered
  const costs = summariseLegalCosts(input.costs);
  if (costs.outstanding > 0 && input.hasActiveRecovery) return {
    code: "RECOVER_COSTS", label: "Pursue recovery of legal costs",
    reason: `Outstanding legal costs: ${costs.outstanding.toFixed(2)}`,
    due_in_days: 14, target_entity: "COST", target_id: null,
  };
  // 11. Enforcement stalled — handled at recovery level
  if (input.enforcementActive > 0) return {
    code: "ENFORCEMENT_FOLLOWUP", label: "Follow up on enforcement action",
    reason: "Active enforcement requires monitoring",
    due_in_days: 7, target_entity: "ENFORCEMENT", target_id: null,
  };
  return {
    code: "ROUTINE_MONITORING", label: "Routine monitoring",
    reason: "No immediate action required",
    due_in_days: 14, target_entity: "JUDGMENT", target_id: null,
  };
}
