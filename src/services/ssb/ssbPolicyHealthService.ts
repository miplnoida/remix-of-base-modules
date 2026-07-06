/**
 * SSB Policy Health Service
 *
 * Inspects the ACTIVE / is_current row of every ssb_*_policy binding
 * for the KN profile and returns a health verdict per configuration
 * asset key. This replaces the old "Unknown" health column in the
 * Configuration Governance registry and drives the validation ruleset.
 *
 * Verdicts:
 *   ready    — required fields present, no known gaps
 *   partial  — policy exists but recommended items missing
 *   missing  — no current row exists for this asset
 *   deferred — an explicit deferral marker exists (e.g. SMS deferred)
 *   error    — overlapping active rows / invalid data detected
 */
import { supabase } from "@/integrations/supabase/client";
import { getKnProfile } from "@/services/ssb/ssbImplementationConfigService";

const db: any = supabase;

export type PolicyHealth = "ready" | "partial" | "missing" | "deferred" | "error";

export interface AssetHealth {
  asset_key: string;
  health: PolicyHealth;
  reasons: string[];
  active_count: number;
  current_count: number;
}

const ASSET_TO_TABLE: Record<string, string> = {
  "ssb.address": "ssb_address_policy",
  "ssb.identity": "ssb_identity_policy",
  "ssb.numbering": "ssb_numbering_policy",
  "ssb.contribution_calendar": "ssb_contribution_calendar_policy",
  "ssb.financial": "ssb_financial_policy",
  "ssb.legal": "ssb_legal_policy",
  "ssb.documents": "ssb_document_policy",
  "ssb.communication": "ssb_communication_policy",
  "ssb.workflow": "ssb_workflow_policy",
};

async function loadActive(table: string, profileId: string): Promise<any[]> {
  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("profile_id", profileId)
    .eq("is_current", true);
  if (error) return [];
  return data ?? [];
}

function isDeferred(row: any): boolean {
  const note = String(row?.notes ?? "").toUpperCase();
  return note.includes("DEFERRED") || row?.deferred === true;
}

function evaluate(assetKey: string, rows: any[]): AssetHealth {
  const reasons: string[] = [];
  const active = rows.length;
  if (active === 0) {
    return { asset_key: assetKey, health: "missing", reasons: ["No active/current policy row"], active_count: 0, current_count: 0 };
  }

  switch (assetKey) {
    case "ssb.address": {
      // Only one row per (profile, country) expected
      if (active > 1) return { asset_key: assetKey, health: "error", reasons: ["Multiple current address policies for same country"], active_count: active, current_count: active };
      const r = rows[0];
      if (!r.country_code) reasons.push("Country code missing");
      // Mandatory field configuration lives in the relational child table
      // ssb_address_policy_field (field_kind = 'mandatory').
      try {
        const { data: mand } = await db
          .from("ssb_address_policy_field")
          .select("field_code")
          .eq("policy_id", r.id)
          .eq("field_kind", "mandatory");
        if (!mand || mand.length === 0) reasons.push("No mandatory address fields configured");
      } catch {
        reasons.push("Unable to read address field configuration");
      }
      // Admin hierarchy is also relational — surface as info if empty.
      try {
        const { data: lvl } = await db
          .from("ssb_address_policy_admin_level")
          .select("admin_level_code")
          .eq("policy_id", r.id);
        if (!lvl || lvl.length === 0) reasons.push("No admin hierarchy levels enabled");
      } catch { /* non-fatal */ }
      break;
    }
    case "ssb.identity": {
      const primary = rows.filter((r) => r.is_primary);
      if (primary.length === 0) reasons.push("No primary identity type set (e.g. NIS)");
      if (primary.length > 1) return { asset_key: assetKey, health: "error", reasons: ["Multiple primary identity types"], active_count: active, current_count: active };
      const accepted = rows.filter((r) => r.is_accepted);
      if (accepted.length < 2) reasons.push("Fewer than 2 accepted identity types");
      break;
    }
    case "ssb.numbering": {
      const codes = new Set(rows.map((r) => r.entity_code));
      for (const req of ["MEMBER", "EMPLOYER"]) {
        if (!codes.has(req)) reasons.push(`Missing numbering for ${req}`);
      }
      for (const opt of ["CLAIM", "BENEFIT"]) {
        if (!codes.has(opt)) reasons.push(`Recommended numbering for ${opt} not set`);
      }
      break;
    }
    case "ssb.contribution_calendar": {
      if (active > 1) return { asset_key: assetKey, health: "error", reasons: ["Multiple current contribution calendars"], active_count: active, current_count: active };
      const r = rows[0];
      if (!r.contribution_period) reasons.push("Contribution period not set");
      const rule = r.due_date_rule_type;
      if (!rule && r.payment_due_day == null && r.filing_due_day == null) {
        reasons.push("Due date rule not set");
      } else if (rule) {
        if ((rule === "fixed_day_of_current_month" || rule === "fixed_day_of_next_month")
            && r.due_day == null && r.payment_due_day == null) reasons.push("Due day required for fixed-day rule");
        if (rule === "days_after_period_end" && r.days_after_period_end == null)
          reasons.push("Days after period end required");
        if (rule === "nth_working_day_after_period_end" && r.nth_working_day == null)
          reasons.push("Nth working day required");
        if (rule === "custom_formula_text" && !r.custom_formula_text)
          reasons.push("Custom formula text required");
      }
      if (!r.working_day_adjustment) reasons.push("Working-day adjustment not set");
      break;
    }
    case "ssb.financial": {
      const kinds = new Set(rows.map((r) => r.binding_kind));
      if (!kinds.has("CURRENCY")) reasons.push("No default currency binding");
      const channels = rows.filter((r) => r.binding_kind === "PAYMENT_CHANNEL" && r.is_active);
      if (channels.length === 0) reasons.push("No active payment channel");
      const banks = rows.filter((r) => r.binding_kind === "BANK_LIST");
      const bankDeferred = banks.some(isDeferred);
      if (banks.length === 0) reasons.push("Bank list not bound");
      else if (bankDeferred) reasons.push("Bank list explicitly deferred");
      break;
    }
    case "ssb.legal": {
      const acts = rows.filter((r) => (r.applies_to ?? "").toUpperCase() === "ACT" || (r.legal_reference_code ?? "").match(/CAP|ACT/i));
      if (rows.length === 0) reasons.push("No legal reference bound");
      if (acts.length === 0) reasons.push("No governing act bound");
      if (rows.length < 3) reasons.push("Fewer than 3 legal sections bound");
      break;
    }
    case "ssb.documents": {
      const processes = new Set(rows.map((r) => (r.applies_to ?? "").toUpperCase()));
      for (const req of ["MEMBER", "EMPLOYER"]) {
        if (!processes.has(req)) reasons.push(`No document policy for ${req}`);
      }
      const mandatory = rows.filter((r) => r.is_mandatory);
      if (mandatory.length === 0) reasons.push("No mandatory documents configured");
      break;
    }
    case "ssb.communication": {
      const smsDeferred = rows.some((r) => (r.channel === "SMS") && isDeferred(r));
      const letter = rows.filter((r) => r.channel === "LETTER" && r.is_active);
      if (letter.length === 0) reasons.push("No active LETTER template bound");
      if (smsDeferred && letter.length > 0) {
        return {
          asset_key: assetKey,
          health: "deferred",
          reasons: ["SMS channel explicitly deferred; letter channel active"],
          active_count: active, current_count: active,
        };
      }
      if (rows.length < 3) reasons.push("Fewer than 3 template bindings");
      break;
    }
    case "ssb.workflow": {
      const processes = new Set(rows.map((r) => (r.applies_to ?? "").toUpperCase()));
      for (const req of ["MEMBER", "EMPLOYER", "CLAIM"]) {
        if (!processes.has(req)) reasons.push(`No workflow for ${req}`);
      }
      const badSla = rows.find((r) => r.sla_hours == null || r.sla_hours <= 0);
      if (badSla) reasons.push("At least one workflow has no SLA hours");
      break;
    }
  }

  if (reasons.length === 0) {
    return { asset_key: assetKey, health: "ready", reasons: ["All required fields present"], active_count: active, current_count: active };
  }
  // Distinguish partial vs missing: if we still have rows, this is partial
  return { asset_key: assetKey, health: "partial", reasons, active_count: active, current_count: active };
}

export async function evaluateAllAssetHealth(): Promise<AssetHealth[]> {
  const profile = await getKnProfile();
  if (!profile) {
    return Object.keys(ASSET_TO_TABLE).map((k) => ({
      asset_key: k, health: "missing" as PolicyHealth,
      reasons: ["KN implementation profile not created"], active_count: 0, current_count: 0,
    }));
  }
  const results = await Promise.all(
    Object.entries(ASSET_TO_TABLE).map(async ([assetKey, table]) => {
      const rows = await loadActive(table, profile.id);
      return evaluate(assetKey, rows);
    })
  );
  return results;
}

export async function evaluateAssetHealth(assetKey: string): Promise<AssetHealth | null> {
  const table = ASSET_TO_TABLE[assetKey];
  if (!table) return null;
  const profile = await getKnProfile();
  if (!profile) {
    return { asset_key: assetKey, health: "missing", reasons: ["KN profile missing"], active_count: 0, current_count: 0 };
  }
  const rows = await loadActive(table, profile.id);
  return evaluate(assetKey, rows);
}

/** Maps asset_key → SSB Setup section key for deep-linking. */
export const ASSET_TO_SECTION: Record<string, string> = {
  "ssb.address": "address",
  "ssb.identity": "identity",
  "ssb.numbering": "numbering",
  "ssb.contribution_calendar": "contribution",
  "ssb.financial": "financial",
  "ssb.legal": "legal",
  "ssb.documents": "documents",
  "ssb.communication": "communication",
  "ssb.workflow": "workflow",
};

export const ssbPolicyHealthService = {
  evaluateAllAssetHealth,
  evaluateAssetHealth,
  ASSET_TO_SECTION,
};
