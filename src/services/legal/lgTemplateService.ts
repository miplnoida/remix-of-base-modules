import { supabase } from "@/integrations/supabase/client";
import { coreTemplateResolverService } from "@/services/coreTemplateResolverService";

/**
 * Legal templates are sourced exclusively from the central Core Template system
 * (core_template + core_template_version, filtered by module_code = 'LEGAL').
 *
 * Legal does NOT own template content. Legal owns only the mapping/reference:
 *   lg_stage_template_mapping (stage/event → core_template)
 *
 * The legacy `legal_templates` and `notification_templates` (category='legal')
 * rows have been deprecated (see docs/legal/lg-template-cutover-comparison.md).
 */

export interface LgTemplate {
  id: string;                 // core_template.id (single source of truth)
  template_code: string | null; // core_template.code
  name: string;
  subject: string | null;
  body: string;               // resolved from active core_template_version.body_html
  placeholders: string[] | null;
  category: string | null;    // core_template.template_category
  channel: string;            // 'LETTER' | 'NOTICE' | ... (template_type)
  version_no?: number | null;
  status?: string | null;
  country_code?: string | null;
  scope?: string | null;
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

/**
 * List all active Core Legal templates (module_code = LEGAL).
 * For duplicate codes across scope (COUNTRY vs GLOBAL), the country-scoped
 * row wins for the current country. Body is fetched lazily on selection.
 */
export async function listLegalTemplates(country: string = "KN"): Promise<LgTemplate[]> {
  const { data, error } = await (supabase as any)
    .from("core_template")
    .select("id, code, name, template_type, template_category, status, is_active, scope, country_code, active_version_id")
    .eq("module_code", "LEGAL")
    .eq("is_active", true)
    .in("status", ["ACTIVE", "PUBLISHED"])
    .order("name", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as any[];

  // De-duplicate by code: prefer COUNTRY match for target country, else GLOBAL.
  const bestByCode = new Map<string, any>();
  for (const r of rows) {
    const key = r.code as string;
    const existing = bestByCode.get(key);
    if (!existing) { bestByCode.set(key, r); continue; }
    const rIsCountry = r.scope === "COUNTRY" && r.country_code === country;
    const eIsCountry = existing.scope === "COUNTRY" && existing.country_code === country;
    if (rIsCountry && !eIsCountry) bestByCode.set(key, r);
  }

  return Array.from(bestByCode.values()).map((t) => ({
    id: t.id,
    template_code: t.code ?? null,
    name: t.name,
    subject: null,
    body: "",
    placeholders: null,
    category: t.template_category ?? null,
    channel: t.template_type ?? "LETTER",
    status: t.status ?? null,
    country_code: t.country_code ?? null,
    scope: t.scope ?? null,
  }));
}

/**
 * Load a single Core Legal template, resolving the ACTIVE published version
 * body/subject via the central resolver.
 */
export async function getTemplate(id: string, country: string = "KN"): Promise<LgTemplate | null> {
  const { data: t, error } = await (supabase as any)
    .from("core_template")
    .select("id, code, name, template_type, template_category, status, is_active, scope, country_code, active_version_id, module_code")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!t || t.module_code !== "LEGAL") return null;

  // Resolve the active version (respects COUNTRY→GLOBAL fallback for the code).
  let ver: any = null;
  if (t.code) {
    ver = await coreTemplateResolverService.resolveActiveVersion(t.code as string, country);
  }
  if (!ver && t.active_version_id) {
    const { data: v } = await (supabase as any)
      .from("core_template_version")
      .select("subject, body_html, body_text, version_no, status")
      .eq("id", t.active_version_id)
      .maybeSingle();
    ver = v ?? null;
  }

  return {
    id: t.id,
    template_code: t.code ?? null,
    name: t.name,
    subject: ver?.subject ?? null,
    body: ver?.body_html ?? ver?.body_text ?? "",
    placeholders: null,
    category: t.template_category ?? null,
    channel: t.template_type ?? "LETTER",
    version_no: ver?.version_no ?? null,
    status: ver?.status ?? t.status ?? null,
    country_code: t.country_code ?? null,
    scope: t.scope ?? null,
  };
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

  if (lg.compliance_case_id) {
    const { data: cc } = await (supabase as any)
      .from("ce_cases")
      .select("case_number, lg_case_no, lg_referral_no")
      .eq("id", lg.compliance_case_id as string)
      .maybeSingle();
    if (cc) ctx.compliance.case_no = (cc as any).case_number ?? (cc as any).lg_case_no ?? (cc as any).lg_referral_no ?? EMPTY;
  }

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
