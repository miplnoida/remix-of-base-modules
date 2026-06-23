import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface LgActionCatalogEntry {
  id: string;
  source_mode: string;
  party_kind: "EMPLOYER" | "INSURED" | "INTERNAL" | "ANY";
  action_code: string;
  action_label: string;
  action_kind: "LIABILITY" | "BENEFIT" | "ADVISORY" | "COURT";
  category: string;
  description: string | null;
  requires_period: boolean;
  requires_amount: boolean;
  requires_court_ref: boolean;
  default_owner_role: string | null;
  display_order: number;
  is_active: boolean;
}

/**
 * Fetch catalog entries valid for a given source_mode + party_kind.
 * Includes entries scoped to "ANY" on either dimension.
 */
export async function listActionCatalog(opts: {
  source_mode?: string | null;
  party_kind?: "EMPLOYER" | "INSURED" | "INTERNAL" | null;
}): Promise<LgActionCatalogEntry[]> {
  let q = sb
    .from("lg_case_action_catalog")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const { data, error } = await q;
  if (error) {
    console.warn("[lg-action-catalog] list failed", error);
    return [];
  }

  const rows = (data ?? []) as LgActionCatalogEntry[];
  return rows.filter((r) => {
    const srcOk = !opts.source_mode || r.source_mode === "ANY" || r.source_mode === opts.source_mode;
    const partyOk = !opts.party_kind || r.party_kind === "ANY" || r.party_kind === opts.party_kind;
    return srcOk && partyOk;
  });
}

/** Resolve respondent_kind from a case row (best-effort). */
export function inferRespondentKind(caseData: any): "EMPLOYER" | "INSURED" | "INTERNAL" {
  if (caseData?.respondent_kind) return caseData.respondent_kind;
  const src = String(caseData?.source_mode ?? "").toUpperCase();
  if (src === "INTERNAL" || src === "INTERNAL_ADVISORY") return "INTERNAL";
  if (src === "BENEFIT_REFERRAL" || src === "MANUAL_MEMBER" || src === "MANUAL_INSURED") return "INSURED";
  if (caseData?.person_id && !caseData?.employer_id) return "INSURED";
  if (caseData?.employer_id) return "EMPLOYER";
  return "EMPLOYER";
}
