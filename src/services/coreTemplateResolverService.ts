import { supabase } from "@/integrations/supabase/client";
import type { CoreTemplate, CoreTemplateVersion, CoreTemplateLayout } from "./coreTemplateService";

/**
 * Central template resolver.
 *
 * `resolveTemplate` / `resolveActiveVersion` — pick the right template row
 * (COUNTRY override → GLOBAL base).
 *
 * `resolveRenderContext` — the one entrypoint every runtime path (email,
 * letter, notice, pdf, statement, receipt, sms, whatsapp, in-app) should
 * use to assemble the final render input. It merges:
 *   • the resolved template + active version
 *   • the base layout shell (BASE_EMAIL / BASE_LETTER / …)
 *   • the resolved letterhead (letter / notice / pdf / certificate / statement / receipt / report)
 *   • the resolved signature block   (via signatureResolver)
 *   • the resolved footer            (comm_print_footer + org / dept / module override)
 *   • the resolved disclaimer        (comm_disclaimer + channel + language)
 *
 * Templates never inline signature, footer, or disclaimer HTML — this
 * resolver returns them so the render engine can compose them centrally.
 */
const sb = supabase as any;

// ---------------------------------------------------------------------------
// Types

export interface RenderContextInput {
  /** Template code (e.g. LEGAL-NOTICE-HEARING, ORG-EMAIL-WELCOME). */
  template_code: string;
  /** ISO-2 country override; defaults to "KN". */
  country?: string;
  /** ISO language code for disclaimer/localization; defaults to "en". */
  language?: string;
  /** Optional channel hint (EMAIL / PRINT_LETTER / PDF / SMS / WHATSAPP / PORTAL_MSG). */
  channel?: string;
  /** Module override (falls back to the template's own module_code). */
  module_code?: string;
  /** Optional department, event, workflow-stage context. */
  department_code?: string | null;
  business_event?: string | null;
  workflow_stage?: string | null;
  /** Optional override IDs an operator picked at generation time. */
  letterhead_override_id?: string | null;
  signature_override_asset_id?: string | null;
  footer_override_id?: string | null;
  disclaimer_override_id?: string | null;
}

export interface ResolvedFooter {
  id: string;
  name: string;
  footer_html: string | null;
  page_footer: string | null;
  watermark_url: string | null;
  source: "template_override" | "module" | "department" | "organization" | "default" | "none";
}

export interface ResolvedDisclaimer {
  id: string;
  name: string;
  body: string | null;
  language: string | null;
  category: string | null;
  source: "template_override" | "channel" | "module" | "organization" | "default" | "none";
}

export interface ResolvedLetterhead {
  id: string;
  name: string;
  design_config: any;
  source: "template_override" | "module" | "department" | "organization" | "none";
}

export interface RenderContext {
  template: CoreTemplate;
  version: CoreTemplateVersion | null;
  layout: CoreTemplateLayout | null;
  letterhead: ResolvedLetterhead | null;
  signature: {
    resolved: boolean;
    source: string;
    payload: any | null;
  };
  footer: ResolvedFooter | null;
  disclaimer: ResolvedDisclaimer | null;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Core resolvers

async function resolveTemplateRow(code: string, country: string): Promise<CoreTemplate | null> {
  const { data, error } = await sb.rpc("core_resolve_template", { p_code: code, p_country: country });
  if (!error && data) return Array.isArray(data) ? data[0] : data;
  const { data: rows } = await sb.from("core_template").select("*").eq("code", code).eq("is_active", true);
  if (!rows?.length) return null;
  const country_match = rows.find((r: any) => r.scope === "COUNTRY" && r.country_code === country);
  return (country_match || rows.find((r: any) => r.scope === "GLOBAL") || rows[0]) as CoreTemplate | null;
}

async function resolveActiveVersionRow(tpl: CoreTemplate): Promise<CoreTemplateVersion | null> {
  if (!tpl.active_version_id) return null;
  const { data } = await sb.from("core_template_version").select("*").eq("id", tpl.active_version_id).maybeSingle();
  return (data || null) as CoreTemplateVersion | null;
}

async function resolveLayout(layoutId: string | null | undefined): Promise<CoreTemplateLayout | null> {
  if (!layoutId) return null;
  const { data } = await sb.from("core_template_layout").select("*").eq("id", layoutId).maybeSingle();
  return (data || null) as CoreTemplateLayout | null;
}

// ---------------------------------------------------------------------------
// Sub-resolvers: letterhead / footer / disclaimer

async function resolveLetterhead(input: RenderContextInput, tpl: CoreTemplate): Promise<ResolvedLetterhead | null> {
  const pick = async (id: string, source: ResolvedLetterhead["source"]) => {
    const { data } = await sb.from("comm_letterhead").select("*").eq("id", id).eq("is_active", true).maybeSingle();
    if (!data) return null;
    return { id: data.id, name: data.name, design_config: data.design_config, source };
  };

  if (input.letterhead_override_id) {
    const hit = await pick(input.letterhead_override_id, "template_override");
    if (hit) return hit;
  }

  const moduleCode = input.module_code || tpl.module_code;

  // Prefer letterhead pinned at module → department → organization defaults.
  const candidates = await sb
    .from("comm_letterhead")
    .select("id, name, design_config, module_code, department_code, is_default, is_active")
    .eq("is_active", true);

  const rows: any[] = candidates.data || [];
  if (input.department_code) {
    const hit = rows.find((r) => r.department_code === input.department_code && r.is_default);
    if (hit) return { id: hit.id, name: hit.name, design_config: hit.design_config, source: "department" };
  }
  const moduleHit = rows.find((r) => r.module_code === moduleCode && r.is_default);
  if (moduleHit) return { id: moduleHit.id, name: moduleHit.name, design_config: moduleHit.design_config, source: "module" };

  const orgHit = rows.find((r) => !r.module_code && !r.department_code && r.is_default);
  if (orgHit) return { id: orgHit.id, name: orgHit.name, design_config: orgHit.design_config, source: "organization" };
  return null;
}

async function resolveFooter(input: RenderContextInput): Promise<ResolvedFooter | null> {
  const pick = async (id: string, source: ResolvedFooter["source"]) => {
    const { data } = await sb.from("comm_print_footer").select("*").eq("id", id).eq("is_active", true).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      footer_html: data.footer_html,
      page_footer: data.page_footer,
      watermark_url: data.watermark_url,
      source,
    };
  };

  if (input.footer_override_id) {
    const hit = await pick(input.footer_override_id, "template_override");
    if (hit) return hit;
  }

  const { data } = await sb.from("comm_print_footer").select("*").eq("is_active", true).limit(1);
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    footer_html: row.footer_html,
    page_footer: row.page_footer,
    watermark_url: row.watermark_url,
    source: "organization",
  };
}

async function resolveDisclaimer(input: RenderContextInput, tpl: CoreTemplate): Promise<ResolvedDisclaimer | null> {
  const pick = async (id: string, source: ResolvedDisclaimer["source"]) => {
    const { data } = await sb.from("comm_disclaimer").select("*").eq("id", id).eq("is_active", true).maybeSingle();
    if (!data) return null;
    return { id: data.id, name: data.name, body: data.body, language: data.language, category: data.category, source };
  };

  if (input.disclaimer_override_id) {
    const hit = await pick(input.disclaimer_override_id, "template_override");
    if (hit) return hit;
  }

  const language = input.language || "en";
  const moduleCode = input.module_code || tpl.module_code;
  const { data } = await sb.from("comm_disclaimer").select("*").eq("is_active", true);
  const rows: any[] = data || [];

  const langRows = rows.filter((r) => !r.language || r.language === language);

  // Channel-specific disclaimer (category matches channel), then module, then generic.
  if (input.channel) {
    const chHit = langRows.find((r) => (r.category || "").toUpperCase() === input.channel!.toUpperCase());
    if (chHit) return { id: chHit.id, name: chHit.name, body: chHit.body, language: chHit.language, category: chHit.category, source: "channel" };
  }
  const modHit = langRows.find((r) => (r.category || "").toUpperCase() === (moduleCode || "").toUpperCase());
  if (modHit) return { id: modHit.id, name: modHit.name, body: modHit.body, language: modHit.language, category: modHit.category, source: "module" };

  const generic = langRows.find((r) => !r.category || r.category === "GENERAL" || r.category === "ORGANIZATION");
  if (generic) return { id: generic.id, name: generic.name, body: generic.body, language: generic.language, category: generic.category, source: "organization" };

  return null;
}

// ---------------------------------------------------------------------------
// Signature — thin wrapper around the existing signatureResolver so callers
// only need this one resolver. Kept optional so a build never breaks if the
// signature service isn't available in a given environment.

async function resolveSignatureSafe(input: RenderContextInput, tpl: CoreTemplate): Promise<RenderContext["signature"]> {
  try {
    const mod: any = await import("@/lib/comm/signatureResolver");
    const fn = mod?.signatureResolver?.resolve || mod?.resolveSignature || mod?.default?.resolve;
    if (typeof fn !== "function") {
      return { resolved: false, source: "none", payload: null };
    }
    const payload = await fn({
      selected_signature_asset_id: input.signature_override_asset_id ?? null,
      department_id: input.department_code ?? null,
      organization_id: null,
      module_code: input.module_code || tpl.module_code,
    });
    return { resolved: !!payload, source: payload?.source || "organization", payload: payload ?? null };
  } catch {
    return { resolved: false, source: "none", payload: null };
  }
}

// ---------------------------------------------------------------------------
// Public API

export const coreTemplateResolverService = {
  async resolveTemplate(code: string, country: string = "KN"): Promise<CoreTemplate | null> {
    return resolveTemplateRow(code, country);
  },

  async resolveActiveVersion(code: string, country: string = "KN"): Promise<CoreTemplateVersion | null> {
    const { data, error } = await sb.rpc("core_resolve_template_version", { p_code: code, p_country: country });
    if (!error && data) return Array.isArray(data) ? data[0] : data;
    const tpl = await resolveTemplateRow(code, country);
    if (!tpl) return null;
    return resolveActiveVersionRow(tpl);
  },

  /**
   * Central render-context resolver. Every module should call this instead
   * of stitching letterhead/signature/footer/disclaimer inline.
   */
  async resolveRenderContext(input: RenderContextInput): Promise<RenderContext | null> {
    const warnings: string[] = [];
    const country = input.country || "KN";

    const template = await resolveTemplateRow(input.template_code, country);
    if (!template) return null;

    const [version, layout, letterhead, footer, disclaimer, signature] = await Promise.all([
      resolveActiveVersionRow(template),
      resolveLayout(template.default_layout_id),
      resolveLetterhead(input, template),
      resolveFooter(input),
      resolveDisclaimer(input, template),
      resolveSignatureSafe(input, template),
    ]);

    if (!version) warnings.push("No active version — template body will be empty.");
    if (!layout) warnings.push("No base layout — falling back to unstyled render.");
    const needsLetterhead = ["LETTER", "NOTICE", "PDF", "CERTIFICATE", "STATEMENT", "RECEIPT", "REPORT", "DOCUMENT"].includes(template.template_type);
    if (needsLetterhead && !letterhead) warnings.push("No letterhead resolved for this template type.");
    if (!footer) warnings.push("No footer resolved.");
    if (!disclaimer) warnings.push("No disclaimer resolved for language/channel.");
    if (!signature.resolved) warnings.push("Signature not resolved — organization default missing or no signature service.");

    // Respect legacy inline blocks so we never inject twice.
    const meta: any = (version as any)?.body_metadata || {};
    if (meta.inline_blocks_legacy) {
      warnings.push("Template body still carries inline signature/footer/disclaimer (legacy). Central blocks skipped to avoid duplication. Re-author the body to use {{SIGNATURE_BLOCK}} / {{FOOTER_BLOCK}} / {{DISCLAIMER_BLOCK}} tokens.");
    }

    return { template, version, layout, letterhead, signature, footer, disclaimer, warnings };
  },

  /**
   * Compose the final HTML for a resolved render context: swaps
   * {{SIGNATURE_BLOCK}}, {{FOOTER_BLOCK}}, {{DISCLAIMER_BLOCK}} tokens
   * with resolved content. Legacy bodies (inline_blocks_legacy=true) are
   * returned untouched so we never double-render.
   */
  composeFinalHtml(ctx: RenderContext): string {
    const meta: any = (ctx.version as any)?.body_metadata || {};
    const body = (ctx.version?.body_html || "") as string;
    if (meta.inline_blocks_legacy) return body;

    const sigHtml = (ctx.signature?.payload as any)?.html || "";
    const footerHtml = ctx.footer?.footer_html || ctx.footer?.page_footer || "";
    const discHtml = ctx.disclaimer?.body || "";

    return body
      .replaceAll("{{SIGNATURE_BLOCK}}", sigHtml)
      .replaceAll("{{FOOTER_BLOCK}}", footerHtml)
      .replaceAll("{{DISCLAIMER_BLOCK}}", discHtml);
  },
};
