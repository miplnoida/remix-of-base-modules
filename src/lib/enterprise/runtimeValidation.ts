/**
 * Runtime validation for enterprise communication templates.
 *
 * Scans a template body for inline branding / inline footer / inline signature
 * and reports missing layout, signature, footer, disclaimer and language.
 * Used by the Business Templates tab of Notification Templates.
 */
import { supabase } from "@/integrations/supabase/client";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationFinding {
  templateId: string;
  templateCode: string;
  templateName: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
}

const INLINE_PATTERNS: Array<{ code: string; regex: RegExp; message: string; severity?: ValidationSeverity }> = [
  { code: "INLINE_LOGO", regex: /<img[^>]+(logo|banner|letterhead)/i, message: "Inline logo/banner detected — resolve via Brand Assets" },
  { code: "INLINE_HEX_COLOR", regex: /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/i, message: "Hard-coded hex color detected — use theme tokens" },
  { code: "INLINE_SIGNATURE_IN_BODY", regex: /\b(sincerely|regards|yours faithfully|kind regards|best regards)\b/i, message: "Inline signature phrase detected — use {{SIGNATURE_BLOCK}}", severity: "warning" },
  { code: "INLINE_FOOTER_IN_BODY", regex: /(all rights reserved|©|\bcopyright\b|unsubscribe)/i, message: "Inline footer text detected — use {{FOOTER_BLOCK}}", severity: "warning" },
  { code: "INLINE_DISCLAIMER", regex: /(this (email|message) is confidential|do not reply|privileged and confidential)/i, message: "Inline disclaimer detected — use {{DISCLAIMER_BLOCK}}" },
  { code: "INLINE_HTML_SHELL", regex: /<\s*(html|body|head)\b/i, message: "Full HTML shell detected in body — shell must come from the base layout", severity: "error" },
];

export async function runTemplateValidation(): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];

  const { data: templates, error } = await supabase
    .from("core_template")
    .select("id, code, name, default_layout_id, is_active, template_type")
    .eq("is_active", true)
    .eq("is_base_layout", false as never)
    .limit(1000);
  if (error || !templates) return findings;

  // Pre-load active layout ids (used to detect inactive-layout references)
  const activeLayoutIds = new Set<string>();
  try {
    const { data: layouts } = await (supabase as any)
      .from("core_template_layout")
      .select("id, is_active")
      .eq("is_active", true)
      .limit(1000);
    for (const l of (layouts ?? []) as Array<{ id: string }>) activeLayoutIds.add(l.id);
  } catch { /* ignore */ }

  for (const t of templates as Array<{ id: string; code: string; name: string; default_layout_id: string | null; template_type: string | null }>) {
    if (!t.default_layout_id) {
      findings.push({
        templateId: t.id,
        templateCode: t.code,
        templateName: t.name,
        severity: "error",
        code: "MISSING_LAYOUT",
        message: "Template has no base layout assigned",
      });
    } else if (activeLayoutIds.size > 0 && !activeLayoutIds.has(t.default_layout_id)) {
      findings.push({
        templateId: t.id,
        templateCode: t.code,
        templateName: t.name,
        severity: "warning",
        code: "INACTIVE_LAYOUT",
        message: "Template references an inactive base layout",
      });
    }

    // Load active version body when available
    const versionsRes = await (supabase as any)
      .from("core_template_version")
      .select("body_html")
      .eq("template_id", t.id)
      .eq("is_active", true)
      .limit(1);
    const versions = versionsRes.data as Array<{ body_html?: string }> | null;
    const body = versions?.[0]?.body_html ?? "";
    if (!body) continue;


    for (const p of INLINE_PATTERNS) {
      if (p.regex.test(body)) {
        findings.push({
          templateId: t.id,
          templateCode: t.code,
          templateName: t.name,
          severity: p.severity ?? "warning",
          code: p.code,
          message: p.message,
        });
      }
    }

    // Unresolved token check (any {{...}} left after known-good patterns)
    const unresolved = body.match(/\{\{\s*[^}]+\s*\}\}/g) ?? [];
    const badTokens = unresolved.filter((t) => !/^\{\{\s*(BODY|SIGNATURE_BLOCK|FOOTER_BLOCK|DISCLAIMER_BLOCK|asset\.[A-Z0-9_]+|text_block\.[A-Z0-9_]+|org\.[a-z_]+|dept\.[a-z_]+|user\.[a-z_]+|case\.[a-z_.]+|application\.[a-z_.]+)\s*\}\}$/i.test(t));
    if (badTokens.length > 0) {
      findings.push({
        templateId: t.id,
        templateCode: t.code,
        templateName: t.name,
        severity: "info",
        code: "UNRESOLVED_TOKENS",
        message: `Unrecognised tokens: ${Array.from(new Set(badTokens)).slice(0, 5).join(", ")}`,
      });
    }
  }

  // ---- Module-level checks ----
  // MISSING_LAYOUT_ASSIGNMENT_FOR_MODULE: any active module_profile that has
  // no MODULE-scope EMAIL_LAYOUT assignment and no default_email_layout_id
  try {
    const [profRes, cfgRes] = await Promise.all([
      (supabase as any).from("core_module_profile").select("module_code, default_email_layout_id").limit(1000),
      (supabase as any).from("core_configuration_assignment").select("scope_ref")
        .eq("domain", "EMAIL").eq("scope_level", "MODULE").eq("resource_type", "EMAIL_LAYOUT").eq("is_active", true).limit(1000),
    ]);
    const assigned = new Set<string>();
    for (const r of (cfgRes.data ?? []) as any[]) {
      const k = r.scope_ref?.code ?? r.scope_ref?.module_code;
      if (k) assigned.add(k);
    }
    for (const m of (profRes.data ?? []) as any[]) {
      if (!m.default_email_layout_id && !assigned.has(m.module_code)) {
        findings.push({
          templateId: `module:${m.module_code}`,
          templateCode: m.module_code,
          templateName: `Module ${m.module_code}`,
          severity: "info",
          code: "MISSING_LAYOUT_ASSIGNMENT_FOR_MODULE",
          message: "Module has no email layout override — will inherit organization default",
        });
      }
    }
  } catch { /* ignore */ }

  // LEGACY_TEMPLATE_UNMAPPED: legacy notification_templates without
  // mapped_core_template_id
  try {
    const { data: legacy } = await (supabase as any)
      .from("notification_templates")
      .select("id, template_code, name")
      .is("mapped_core_template_id", null)
      .eq("is_enabled", true)
      .limit(500);
    for (const l of (legacy ?? []) as Array<{ id: string; template_code: string; name: string }>) {
      findings.push({
        templateId: l.id,
        templateCode: l.template_code ?? "—",
        templateName: l.name ?? "Legacy template",
        severity: "warning",
        code: "LEGACY_TEMPLATE_UNMAPPED",
        message: "Legacy notification_template is not mapped to a core_template — will bypass enterprise inheritance",
      });
    }
  } catch { /* ignore */ }

  return findings;
}
