/**
 * EPIC-07 — Legal Workflow / State Transition Engine
 * Unified façade over ALL post-judgment state machines. UI and other
 * services must consume this engine rather than importing individual
 * transition tables. Guarantees single source of truth for allowed moves.
 */
import { canTransitionCompliance, assertComplianceTransition } from "./judgmentComplianceEngine";
import { canTransitionConsent, assertConsentTransition } from "./consentOrderEngine";
import { canTransitionSettlement, assertSettlementTransition } from "./settlementEngine";
import { canTransitionFiling, assertFilingTransition } from "./courtFilingEngine";
import {
  canTransitionEngagement, canTransitionInvoice,
} from "./externalCounselEngine";
import { canTransitionCost } from "./legalCostEngine";
import {
  canTransitionLgOrder, assertLgOrderTransition,
} from "@/services/legal/lgOrderStateMachine";

export type LegalDomain =
  | "ORDER" | "JUDGMENT_COMPLIANCE" | "CONSENT_ORDER" | "SETTLEMENT"
  | "COURT_FILING" | "COUNSEL_ENGAGEMENT" | "COUNSEL_INVOICE" | "LEGAL_COST";

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

export function canTransition(
  domain: LegalDomain, from: string, to: string,
): TransitionResult {
  switch (domain) {
    case "ORDER":               return canTransitionLgOrder(from, to);
    case "JUDGMENT_COMPLIANCE": return canTransitionCompliance(from, to as never);
    case "CONSENT_ORDER":       return canTransitionConsent(from, to as never);
    case "SETTLEMENT":          return canTransitionSettlement(from as never, to as never);
    case "COURT_FILING":        return canTransitionFiling(from, to as never);
    case "COUNSEL_ENGAGEMENT":  return canTransitionEngagement(from, to as never);
    case "COUNSEL_INVOICE":     return canTransitionInvoice(from, to as never);
    case "LEGAL_COST":          return canTransitionCost(from, to as never);
    default: return { allowed: false, reason: `Unknown domain: ${domain}` };
  }
}

export function assertTransition(domain: LegalDomain, from: string, to: string): void {
  const r = canTransition(domain, from, to);
  if (!r.allowed) throw new Error(r.reason ?? "Invalid transition");
  // Domain-specific stricter asserts already invoked above where present.
  if (domain === "ORDER") assertLgOrderTransition(from, to);
  if (domain === "JUDGMENT_COMPLIANCE") assertComplianceTransition(from, to as never);
  if (domain === "CONSENT_ORDER") assertConsentTransition(from, to as never);
  if (domain === "SETTLEMENT") assertSettlementTransition(from as never, to as never);
  if (domain === "COURT_FILING") assertFilingTransition(from, to as never);
}

/**
 * Governance evaluation — decides whether the transition requires
 * checker/approver based on domain rules. Deterministic policy.
 */
export interface TransitionGovernance {
  requires_maker_checker: boolean;
  requires_court_approval: boolean;
  fires_notification: boolean;
  fires_task_automation: boolean;
}

export function evaluateGovernance(
  domain: LegalDomain, to: string,
): TransitionGovernance {
  const highRisk = new Set([
    "BREACHED", "REJECTED", "WRITTEN_OFF", "TERMINATED", "CANCELLED", "OVERRIDDEN",
  ]);
  const court = new Set([
    "COURT_APPROVAL_REQUIRED", "COURT_APPROVED",
    "PENDING_COURT_APPROVAL", "FILED", "SERVED",
  ]);
  const notify = new Set([
    "BREACHED", "COMPLIED", "COMPLETED", "APPROVED", "ACTIVE",
    "PAID", "RECOVERED", "OVERDUE", "WITHDRAWN",
  ]);
  const tasks = new Set([
    "BREACHED", "ACTIVE", "FILED", "SERVED", "GRANTED",
    "PENDING_COURT_APPROVAL",
  ]);
  return {
    requires_maker_checker: highRisk.has(to),
    requires_court_approval: court.has(to) &&
      (domain === "SETTLEMENT" || domain === "CONSENT_ORDER" || domain === "COURT_FILING"),
    fires_notification: notify.has(to),
    fires_task_automation: tasks.has(to),
  };
}
