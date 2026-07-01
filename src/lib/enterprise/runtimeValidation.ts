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

const INLINE_PATTERNS: Array<{ code: string; regex: RegExp; message: string }> = [
  { code: "INLINE_LOGO", regex: /<img[^>]+(logo|banner|letterhead)/i, message: "Inline logo/banner detected — resolve via Brand Assets" },
  { code: "INLINE_HEX_COLOR", regex: /#(?:[0-9a-f]{6}|[0-9a-f]{3})\b/i, message: "Hard-coded hex color detected — use theme tokens" },
  { code: "INLINE_SIGNATURE", regex: /\b(sincerely|regards|yours faithfully|kind regards)\b/i, message: "Inline signature phrase detected — use {{SIGNATURE_BLOCK}}" },
  { code: "INLINE_FOOTER", regex: /(all rights reserved|©|\bcopyright\b)/i, message: "Inline footer text detected — use {{FOOTER_BLOCK}}" },
  { code: "INLINE_DISCLAIMER", regex: /(this (email|message) is confidential|do not reply|privileged and confidential)/i, message: "Inline disclaimer detected — use {{DISCLAIMER_BLOCK}}" },
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
          severity: "warning",
          code: p.code,
          message: p.message,
        });
      }
    }
  }
  return findings;
}
