import { supabase } from "@/integrations/supabase/client";

/**
 * Legal templates are sourced from the central notification_templates table
 * (category = 'legal'). Legal does NOT own its own template store — it reuses
 * the platform template framework.
 */

export interface LgTemplate {
  id: string;
  template_code: string | null;
  name: string;
  subject: string | null;
  body: string;
  placeholders: string[] | null;
  category: string | null;
  channel: string;
}

export interface LgTokenContext {
  legal: {
    case_no: string;
    case_type: string;
    stage: string;
    next_hearing_date: string;
    court_case_no: string;
  };
  employer: {
    name: string;
    account_no: string;
  };
  compliance: {
    case_no: string;
  };
  payment_arrangement: {
    reference: string;
    outstanding_amount: string;
  };
  legal_reference: {
    full: string;
  };
}

const EMPTY = "";

export async function listLegalTemplates(): Promise<LgTemplate[]> {
  const { data, error } = await (supabase as any)
    .from("notification_templates")
    .select("id, template_code, name, subject, body, placeholders, category, channel")
    .eq("category", "legal")
    .eq("is_enabled", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((t: any) => ({
    ...t,
    placeholders: Array.isArray(t.placeholders) ? t.placeholders : null,
  }));
}

export async function getTemplate(id: string): Promise<LgTemplate | null> {
  const { data, error } = await (supabase as any)
    .from("notification_templates")
    .select("id, template_code, name, subject, body, placeholders, category, channel")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...(data as any), placeholders: Array.isArray((data as any).placeholders) ? (data as any).placeholders : null };
}

/** Build the token context for a given legal case by joining referenced modules. */
export async function buildTokenContext(lgCaseId: string): Promise<LgTokenContext> {
  const { data: lg, error } = await (supabase as any)
    .from("lg_case")
    .select("*")
    .eq("id", lgCaseId)
    .maybeSingle();
  if (error) throw error;
  if (!lg) throw new Error("Legal case not found");

  const ctx: LgTokenContext = {
    legal: {
      case_no: lg.lg_case_no ?? EMPTY,
      case_type: lg.case_type_code ?? EMPTY,
      stage: lg.current_stage_code ?? EMPTY,
      next_hearing_date: lg.next_hearing_date ?? EMPTY,
      court_case_no: lg.court_case_no ?? EMPTY,
    },
    employer: { name: EMPTY, account_no: EMPTY },
    compliance: { case_no: EMPTY },
    payment_arrangement: { reference: EMPTY, outstanding_amount: EMPTY },
    legal_reference: { full: EMPTY },
  };

  // Employer (au_er_master)
  if (lg.employer_id) {
    const { data: er } = await (supabase as any)
      .from("au_er_master")
      .select("er_name, er_no")
      .eq("id", lg.employer_id as string)
      .maybeSingle();
    if (er) {
      ctx.employer.name = (er as any).er_name ?? EMPTY;
      ctx.employer.account_no = (er as any).er_no ?? EMPTY;
    }
  }

  // Compliance case (ce_cases)
  if (lg.compliance_case_id) {
    const { data: cc } = await (supabase as any)
      .from("ce_cases")
      .select("case_number, lg_case_no, lg_referral_no")
      .eq("id", lg.compliance_case_id as string)
      .maybeSingle();
    if (cc) ctx.compliance.case_no = (cc as any).case_number ?? (cc as any).lg_case_no ?? (cc as any).lg_referral_no ?? EMPTY;
  }

  // Payment arrangement
  if (lg.payment_arrangement_id) {
    const { data: pa } = await (supabase as any)
      .from("ce_payment_arrangements")
      .select("arrangement_no, total_amount, collected_amount, waived_amount")
      .eq("id", lg.payment_arrangement_id as string)
      .maybeSingle();
    if (pa) {
      ctx.payment_arrangement.reference = (pa as any).arrangement_no ?? EMPTY;
      const total = Number((pa as any).total_amount ?? 0);
      const collected = Number((pa as any).collected_amount ?? 0);
      const waived = Number((pa as any).waived_amount ?? 0);
      const outstanding = Math.max(0, total - collected - waived);
      ctx.payment_arrangement.outstanding_amount = outstanding.toFixed(2);
    }
  }

  if (!ctx.payment_arrangement.outstanding_amount && lg.outstanding_amount_snapshot != null) {
    ctx.payment_arrangement.outstanding_amount = Number(lg.outstanding_amount_snapshot).toFixed(2);
  }

  // Legal reference — placeholder until lg_case stores explicit citation.
  ctx.legal_reference.full = "Social Security Act";

  return ctx;
}

/** Mustache-lite renderer for `{{a.b.c}}` tokens. Unresolved tokens are kept as-is. */
export function renderTokens(text: string, ctx: LgTokenContext): { rendered: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const rendered = (text || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const parts = key.split(".");
    let cur: any = ctx;
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
      else { cur = undefined; break; }
    }
    if (cur === undefined || cur === null || cur === "") {
      unresolved.push(key);
      return `{{${key}}}`;
    }
    return String(cur);
  });
  return { rendered, unresolved: Array.from(new Set(unresolved)) };
}
