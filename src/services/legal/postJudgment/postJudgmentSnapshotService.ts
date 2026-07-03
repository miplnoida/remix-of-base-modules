/**
 * EPIC-07 Phase 3 — Post-Judgment Snapshot Service
 * Aggregates all post-judgment data for one case into a single snapshot
 * that Workspace tabs and the Health Engine consume. UI never queries
 * these tables directly.
 */
import { supabase } from "@/integrations/supabase/client";
import { listComplianceForCase } from "./judgmentComplianceEngine";
import { listConsentOrders, listInstallments } from "./consentOrderEngine";
import { listSettlementsForCase } from "./settlementEngine";
import { listFilings } from "./courtFilingEngine";
import { listEngagements, listInvoices } from "./externalCounselEngine";
import { listLegalCosts } from "./legalCostEngine";
import {
  evaluateLegalRecoveryHealth,
  type LegalRecoverySnapshot,
  type LegalHealthResult,
} from "./legalRecoveryHealthEngine";
import { computeNextLegalAction } from "./nextLegalActionEngine";
import type { NextLegalAction } from "@/types/legal/postJudgment";

const sb = supabase as any;

export interface PostJudgmentSnapshot extends LegalRecoverySnapshot {
  case_id: string;
  health: LegalHealthResult;
  nextAction: NextLegalAction;
}

async function loadEnforcement(caseId: string) {
  const { data, error } = await sb
    .from("lg_enforcement_action")
    .select("id,status,updated_at")
    .eq("case_id", caseId);
  if (error) return { active: 0, lastDays: null as number | null };
  const rows = (data ?? []) as Array<{ status: string; updated_at: string }>;
  const active = rows.filter((r) =>
    ["INITIATED", "IN_PROGRESS", "ACTIVE"].includes(String(r.status || "").toUpperCase()),
  );
  const last = active
    .map((r) => new Date(r.updated_at).getTime())
    .sort((a, b) => b - a)[0];
  const lastDays = last ? Math.floor((Date.now() - last) / 86_400_000) : null;
  return { active: active.length, lastDays };
}

async function loadSettlements(caseId: string) {
  const rows = await listSettlementsForCase(caseId);
  return (rows ?? []).map((s: any) => ({
    status: s.status,
    agreed_amount: Number(s.agreed_amount ?? s.proposed_amount ?? 0),
    paid_amount: Number(s.paid_amount ?? 0),
  }));
}

export async function loadPostJudgmentSnapshot(caseId: string): Promise<PostJudgmentSnapshot> {
  const [
    compliances,
    consentRaw,
    settlements,
    filings,
    engagementsRaw,
    costs,
    enforcement,
  ] = await Promise.all([
    listComplianceForCase(caseId),
    listConsentOrders(caseId),
    loadSettlements(caseId),
    listFilings(caseId),
    listEngagements(caseId),
    listLegalCosts(caseId),
    loadEnforcement(caseId),
  ]);

  const consentOrders = await Promise.all(
    consentRaw.map(async (order) => ({
      order,
      installments: await listInstallments(order.id),
    })),
  );
  const engagements = await Promise.all(
    engagementsRaw.map(async (engagement) => ({
      engagement,
      invoices: await listInvoices(engagement.id),
    })),
  );

  const base: LegalRecoverySnapshot = {
    compliances,
    consentOrders,
    settlements,
    enforcementActive: enforcement.active,
    enforcementLastActionDays: enforcement.lastDays,
    filings,
    engagements,
    costs,
  };
  const health = evaluateLegalRecoveryHealth(base);
  const nextAction = computeNextLegalAction({
    ...base,
    hasActiveRecovery: true,
  });
  return { ...base, case_id: caseId, health, nextAction };
}
