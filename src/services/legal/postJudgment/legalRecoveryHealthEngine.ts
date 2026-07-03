/**
 * EPIC-07 — Legal Recovery Health Engine
 * Single deterministic health scorer for post-judgment recovery.
 * Combines: judgment compliance, consent order status, settlement status,
 * enforcement activity, filing deadlines, counsel budget.
 */
import type {
  JudgmentCompliance, ConsentOrder, ConsentInstallment,
  CourtFiling, ExternalCounselEngagement, ExternalCounselInvoice, LegalCost,
  PostJudgmentHealth,
} from "@/types/legal/postJudgment";
import type { LegalSettlementStatus } from "@/types/legal/postJudgment";
import { computeComplianceCalc } from "./judgmentComplianceEngine";
import { computeConsentCompliance } from "./consentOrderEngine";
import { evaluateFilingDeadline } from "./courtFilingEngine";
import { summariseCounselFees } from "./externalCounselEngine";
import { summariseLegalCosts } from "./legalCostEngine";

// ---------- Configurable thresholds ----------
export interface LegalHealthThresholds {
  complianceDueSoonDays: number;   // < N days = COMPLIANCE_DUE
  filingRiskDays: number;          // <= N days to filing deadline = risk
  highRiskOutstanding: number;     // > this outstanding = HIGH_RISK
  counselBudgetWarnPct: number;    // utilisation warn threshold
}
export const DEFAULT_LEGAL_HEALTH_THRESHOLDS: LegalHealthThresholds = {
  complianceDueSoonDays: 7,
  filingRiskDays: 3,
  highRiskOutstanding: 50_000,
  counselBudgetWarnPct: 90,
};

// ---------- Snapshot input ----------
export interface LegalRecoverySnapshot {
  compliances: JudgmentCompliance[];
  consentOrders: Array<{ order: ConsentOrder; installments: ConsentInstallment[] }>;
  settlements: Array<{ status: LegalSettlementStatus; agreed_amount: number; paid_amount: number }>;
  enforcementActive: number;
  enforcementLastActionDays: number | null;
  filings: CourtFiling[];
  engagements: Array<{ engagement: ExternalCounselEngagement; invoices: ExternalCounselInvoice[] }>;
  costs: LegalCost[];
}

export interface LegalHealthResult {
  level: PostJudgmentHealth;
  score: number;                 // 0..100 (higher = healthier)
  reasons: string[];             // deterministic explanation
  outstanding: number;
  breachCount: number;
  overdueCount: number;
  atRiskCount: number;
}

export function evaluateLegalRecoveryHealth(
  snap: LegalRecoverySnapshot,
  thresholds: LegalHealthThresholds = DEFAULT_LEGAL_HEALTH_THRESHOLDS,
): LegalHealthResult {
  const reasons: string[] = [];
  let score = 100;
  let breachCount = 0;
  let overdueCount = 0;
  let atRiskCount = 0;

  // Judgment compliance
  let outstanding = 0;
  for (const jc of snap.compliances) {
    const c = computeComplianceCalc(jc);
    outstanding += c.outstanding;
    if (jc.compliance_status === "BREACHED") { breachCount++; score -= 25; reasons.push("Judgment breached"); }
    else if (c.is_overdue) { overdueCount++; score -= 15; reasons.push("Judgment compliance overdue"); }
    else if (c.days_to_due !== null && c.days_to_due <= thresholds.complianceDueSoonDays)
      { atRiskCount++; score -= 5; reasons.push("Judgment compliance due soon"); }
  }

  // Consent orders
  for (const { order, installments } of snap.consentOrders) {
    const cc = computeConsentCompliance(order, installments);
    outstanding += cc.outstanding;
    if (order.status === "BREACHED" || cc.is_breached) {
      breachCount++; score -= 20; reasons.push("Consent order breached");
    }
  }

  // Settlements
  for (const s of snap.settlements) {
    if (s.status === "BREACHED") { breachCount++; score -= 20; reasons.push("Settlement breached"); }
    outstanding += Math.max(Number(s.agreed_amount || 0) - Number(s.paid_amount || 0), 0);
  }

  // Enforcement
  if (snap.enforcementActive > 0 &&
      snap.enforcementLastActionDays !== null &&
      snap.enforcementLastActionDays > 30) {
    score -= 10; reasons.push("Enforcement action stalled > 30 days");
  }

  // Filing deadlines
  for (const f of snap.filings) {
    const d = evaluateFilingDeadline(f);
    if (d.is_overdue) { overdueCount++; score -= 10; reasons.push(`Filing overdue: ${f.title}`); }
    else if (d.is_at_risk) { atRiskCount++; score -= 3; reasons.push(`Filing due soon: ${f.title}`); }
  }

  // Counsel budget
  for (const { engagement, invoices } of snap.engagements) {
    const s = summariseCounselFees(engagement, invoices);
    if (s.is_over_budget) { score -= 10; reasons.push("Counsel engagement over budget"); }
    else if (s.utilisation_pct >= thresholds.counselBudgetWarnPct)
      { score -= 3; reasons.push("Counsel budget nearing limit"); }
  }

  // Costs recovery
  const costSummary = summariseLegalCosts(snap.costs);
  outstanding += costSummary.outstanding;

  // Final level
  let level: PostJudgmentHealth = "HEALTHY";
  if (breachCount > 0) {
    // Prioritise most-specific breach type in reasons order
    if (reasons.some((r) => r.startsWith("Consent"))) level = "CONSENT_BREACHED";
    else if (reasons.some((r) => r.startsWith("Settlement"))) level = "SETTLEMENT_BREACHED";
    else level = "HIGH_RISK";
  } else if (overdueCount > 0) level = "COMPLIANCE_OVERDUE";
  else if (atRiskCount > 0) level = "COMPLIANCE_DUE";
  else if (outstanding > thresholds.highRiskOutstanding) level = "HIGH_RISK";
  else if (snap.enforcementActive > 0) level = "ENFORCEMENT_DELAYED";
  else if (snap.compliances.every((c) => c.compliance_status === "COMPLIED")
       && snap.compliances.length > 0 && outstanding === 0) level = "COMPLETED";

  return {
    level,
    score: Math.max(0, Math.min(100, score)),
    reasons,
    outstanding,
    breachCount,
    overdueCount,
    atRiskCount,
  };
}
