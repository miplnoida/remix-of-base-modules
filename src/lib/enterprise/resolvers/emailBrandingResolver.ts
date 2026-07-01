/**
 * Enterprise Email Branding Resolver.
 *
 * Walks the inheritance chain:
 *   Global → Organization → Department → Module → Workflow → Workflow Stage
 *          → Business Event → Template explicit override
 *
 * Returns the effective email shell (layout, signature, footer, disclaimer,
 * logo, sender, reply-to, language) with per-field `source` badges.
 *
 * Email templates MUST NOT store shell HTML — the shell is composed at
 * render time by combining the resolved base layout with resolved branding
 * defaults and business content.
 */
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type EmailBrandingSource =
  | "GLOBAL"
  | "ORGANIZATION"
  | "DEPARTMENT"
  | "MODULE"
  | "WORKFLOW"
  | "WORKFLOW_STAGE"
  | "BUSINESS_EVENT"
  | "TEMPLATE_OVERRIDE"
  | "MISSING";

export interface EmailBrandingField<T> {
  value: T | null;
  source: EmailBrandingSource;
}

export interface EmailLayout {
  id: string;
  code: string;
  name: string;
  header_html: string | null;
  footer_html: string | null;
  body_placeholder_html: string | null;
  signature_slot: string | null;
  footer_slot: string | null;
  disclaimer_slot: string | null;
  logo_position: string | null;
  email_max_width: number | null;
  email_background_hex: string | null;
  email_font_family: string | null;
  email_button_style_json: Record<string, unknown> | null;
  email_divider_style_json: Record<string, unknown> | null;
  mobile_responsive: boolean;
  is_active: boolean;
}

export interface ResolvedEmailBranding {
  layout: EmailBrandingField<EmailLayout>;
  signatureId: EmailBrandingField<string>;
  footerId: EmailBrandingField<string>;
  disclaimerId: EmailBrandingField<string>;
  senderName: EmailBrandingField<string>;
  replyTo: EmailBrandingField<string>;
  language: EmailBrandingField<string>;
  organizationId: string | null;
  departmentCode: string | null;
  moduleCode: string | null;
  trace: Array<{ layer: EmailBrandingSource; field: string; picked: boolean }>;
}

export interface EmailBrandingRequest {
  moduleCode?: string | null;
  departmentCode?: string | null;
  templateId?: string | null;
  workflowCode?: string | null;
  workflowStageCode?: string | null;
  businessEventCode?: string | null;
}

async function fetchLayout(id?: string | null): Promise<EmailLayout | null> {
  if (!id) return null;
  const { data } = await sb
    .from("core_template_layout")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return data as EmailLayout;
}

export async function resolveEmailBranding(
  req: EmailBrandingRequest,
): Promise<ResolvedEmailBranding> {
  const trace: ResolvedEmailBranding["trace"] = [];

  // 1. Organization defaults
  const { data: org } = await sb
    .from("core_organization")
    .select(
      "id, default_email_layout_id, default_email_footer_id, default_email_disclaimer_id, default_email_sender_name, default_email_reply_to, default_email_language, default_email_signature_id, notification_sender_email, reply_to_email",
    )
    .limit(1)
    .maybeSingle();

  const orgId = org?.id ?? null;

  // 2. Module profile
  let modProf: any = null;
  if (req.moduleCode) {
    const { data } = await sb
      .from("core_module_profile")
      .select("*")
      .eq("module_code", req.moduleCode)
      .maybeSingle();
    modProf = data;
  }

  // 3. Department profile
  let deptProf: any = null;
  if (req.departmentCode) {
    const { data } = await sb
      .from("core_department_profile")
      .select("*")
      .eq("department_code", req.departmentCode)
      .maybeSingle();
    deptProf = data;
  }

  // 4. Template explicit overrides (optional)
  let tmpl: any = null;
  if (req.templateId) {
    const { data } = await sb
      .from("core_template")
      .select("id, default_layout_id, override_email_signature_id")
      .eq("id", req.templateId)
      .maybeSingle();
    tmpl = data;
  }

  // 5. Configuration Center assignments for workflow / stage / event
  //    (best-effort — silently ignored if the row shape differs)
  const cfgAssignments: Array<{
    scope: string;
    key: string | null;
    field: string;
    value_id: string | null;
    value_text: string | null;
  }> = [];
  try {
    const { data: rows } = await sb
      .from("core_configuration_assignment")
      .select("scope, scope_key, field_code, value_id, value_text")
      .in("field_code", [
        "EMAIL_LAYOUT",
        "EMAIL_SIGNATURE",
        "EMAIL_FOOTER",
        "EMAIL_DISCLAIMER",
        "EMAIL_SENDER_NAME",
        "EMAIL_REPLY_TO",
        "EMAIL_LANGUAGE",
      ])
      .limit(500);
    if (Array.isArray(rows)) {
      for (const r of rows as any[]) {
        cfgAssignments.push({
          scope: r.scope,
          key: r.scope_key ?? null,
          field: r.field_code,
          value_id: r.value_id ?? null,
          value_text: r.value_text ?? null,
        });
      }
    }
  } catch {
    /* table may not have field_code yet — safe to ignore */
  }

  function pickAssignment(field: string): {
    id?: string | null;
    text?: string | null;
    source: EmailBrandingSource;
  } | null {
    // Precedence: BUSINESS_EVENT > WORKFLOW_STAGE > WORKFLOW > MODULE
    const order: Array<[EmailBrandingSource, string, string | null | undefined]> = [
      ["BUSINESS_EVENT", "BUSINESS_EVENT", req.businessEventCode],
      ["WORKFLOW_STAGE", "WORKFLOW_STAGE", req.workflowStageCode],
      ["WORKFLOW", "WORKFLOW", req.workflowCode],
      ["MODULE", "MODULE", req.moduleCode],
    ];
    for (const [src, scope, key] of order) {
      if (!key) continue;
      const hit = cfgAssignments.find(
        (r) => r.field === field && r.scope === scope && r.key === key,
      );
      if (hit) return { id: hit.value_id, text: hit.value_text, source: src };
    }
    return null;
  }

  // ---------- LAYOUT ----------
  let layoutId: string | null = null;
  let layoutSrc: EmailBrandingSource = "MISSING";

  if (tmpl?.default_layout_id) {
    layoutId = tmpl.default_layout_id;
    layoutSrc = "TEMPLATE_OVERRIDE";
  } else {
    const assigned = pickAssignment("EMAIL_LAYOUT");
    if (assigned?.id) {
      layoutId = assigned.id;
      layoutSrc = assigned.source;
    } else if (deptProf && deptProf.inherit_email_layout_from_org === false && deptProf.default_email_layout_id) {
      layoutId = deptProf.default_email_layout_id;
      layoutSrc = "DEPARTMENT";
    } else if (modProf && modProf.inherit_email_layout_from_org === false && modProf.default_email_layout_id) {
      layoutId = modProf.default_email_layout_id;
      layoutSrc = "MODULE";
    } else if (org?.default_email_layout_id) {
      layoutId = org.default_email_layout_id;
      layoutSrc = "ORGANIZATION";
    }
  }

  const layout = await fetchLayout(layoutId);
  trace.push({ layer: layoutSrc, field: "layout", picked: !!layout });

  // Generic picker used for signature/footer/disclaimer/sender/reply-to/language
  function pick<T>(
    field: string,
    templateVal: T | null | undefined,
    deptOverride: { inherit: boolean | null; value: T | null | undefined } | null,
    modOverride: { inherit: boolean | null; value: T | null | undefined } | null,
    orgVal: T | null | undefined,
  ): EmailBrandingField<T> {
    if (templateVal) return { value: templateVal, source: "TEMPLATE_OVERRIDE" };
    const assigned = pickAssignment(field);
    if (assigned?.id) return { value: assigned.id as unknown as T, source: assigned.source };
    if (assigned?.text) return { value: assigned.text as unknown as T, source: assigned.source };
    if (deptOverride && deptOverride.inherit === false && deptOverride.value)
      return { value: deptOverride.value as T, source: "DEPARTMENT" };
    if (modOverride && modOverride.inherit === false && modOverride.value)
      return { value: modOverride.value as T, source: "MODULE" };
    if (orgVal) return { value: orgVal as T, source: "ORGANIZATION" };
    return { value: null, source: "MISSING" };
  }

  const signatureId = pick<string>(
    "EMAIL_SIGNATURE",
    tmpl?.override_email_signature_id,
    deptProf
      ? { inherit: deptProf.inherit_email_signature_from_org, value: deptProf.override_email_signature_id ?? deptProf.default_email_signature_id }
      : null,
    modProf
      ? { inherit: modProf.inherit_email_signature_from_org, value: modProf.override_email_signature_id ?? modProf.default_email_signature_id }
      : null,
    org?.default_email_signature_id,
  );

  const footerId = pick<string>(
    "EMAIL_FOOTER",
    null,
    deptProf ? { inherit: deptProf.inherit_email_footer_from_org, value: deptProf.default_email_footer_id } : null,
    modProf ? { inherit: modProf.inherit_email_footer_from_org, value: modProf.default_email_footer_id } : null,
    org?.default_email_footer_id,
  );

  const disclaimerId = pick<string>(
    "EMAIL_DISCLAIMER",
    null,
    deptProf ? { inherit: deptProf.inherit_email_disclaimer_from_org, value: deptProf.default_email_disclaimer_id } : null,
    modProf ? { inherit: modProf.inherit_email_disclaimer_from_org, value: modProf.default_email_disclaimer_id } : null,
    org?.default_email_disclaimer_id,
  );

  const senderName = pick<string>(
    "EMAIL_SENDER_NAME",
    null,
    deptProf ? { inherit: deptProf.inherit_email_sender_from_org, value: deptProf.default_email_sender_name } : null,
    modProf ? { inherit: modProf.inherit_email_sender_from_org, value: modProf.default_email_sender_name } : null,
    org?.default_email_sender_name ?? org?.notification_sender_email,
  );

  const replyTo = pick<string>(
    "EMAIL_REPLY_TO",
    null,
    deptProf ? { inherit: deptProf.inherit_email_sender_from_org, value: deptProf.default_email_reply_to } : null,
    modProf ? { inherit: modProf.inherit_email_sender_from_org, value: modProf.default_email_reply_to } : null,
    org?.default_email_reply_to ?? org?.reply_to_email,
  );

  const language = pick<string>(
    "EMAIL_LANGUAGE",
    null,
    deptProf ? { inherit: deptProf.inherit_email_language_from_org, value: deptProf.default_email_language } : null,
    modProf ? { inherit: modProf.inherit_email_language_from_org, value: modProf.default_email_language } : null,
    org?.default_email_language ?? "en",
  );

  return {
    layout: { value: layout, source: layout ? layoutSrc : "MISSING" },
    signatureId,
    footerId,
    disclaimerId,
    senderName,
    replyTo,
    language,
    organizationId: orgId,
    departmentCode: req.departmentCode ?? null,
    moduleCode: req.moduleCode ?? null,
    trace,
  };
}

/**
 * Compose the final email HTML from a resolved base layout + business body.
 * Signature / footer / disclaimer HTML strings are substituted into the
 * layout slots. All token expansion is done by the caller (NotificationResolver).
 */
export function composeEmailFromLayout(input: {
  layout: EmailLayout | null;
  bodyHtml: string;
  signatureHtml?: string | null;
  footerHtml?: string | null;
  disclaimerHtml?: string | null;
}): string {
  const { layout, bodyHtml } = input;
  const signature = input.signatureHtml ?? "";
  const footer = input.footerHtml ?? "";
  const disclaimer = input.disclaimerHtml ?? "";

  if (!layout) {
    // Fallback: no shell — return body as-is (preserves current behaviour)
    return bodyHtml;
  }

  const bodyRegion = (layout.body_placeholder_html ?? "{{BODY}}")
    .replace(/\{\{\s*BODY\s*\}\}/g, bodyHtml);

  const shell = `
<!doctype html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:${layout.email_background_hex ?? "#f4f4f4"};font-family:${layout.email_font_family ?? "Arial, sans-serif"}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
<table role="presentation" width="${layout.email_max_width ?? 640}" cellpadding="0" cellspacing="0" border="0" style="max-width:${layout.email_max_width ?? 640}px;background:#ffffff">
<tr><td>${layout.header_html ?? ""}</td></tr>
<tr><td>${bodyRegion}</td></tr>
<tr><td style="padding:16px 24px">${signature}</td></tr>
<tr><td>${(layout.footer_html ?? "").replace(/\{\{\s*FOOTER_BLOCK\s*\}\}/g, footer).replace(/\{\{\s*DISCLAIMER_BLOCK\s*\}\}/g, disclaimer)}</td></tr>
</table>
</td></tr></table>
</body></html>`.trim();

  return shell
    .replace(/\{\{\s*SIGNATURE_BLOCK\s*\}\}/g, signature)
    .replace(/\{\{\s*FOOTER_BLOCK\s*\}\}/g, footer)
    .replace(/\{\{\s*DISCLAIMER_BLOCK\s*\}\}/g, disclaimer);
}

/**
 * Extremely simple HTML → plain-text for the plain-text fallback preview.
 * Not intended for high-fidelity conversion — good enough for previews and
 * email clients that fall back to text/plain.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/**
 * Convenience helper: load the signature / footer / disclaimer HTML for a
 * resolved branding record. Returns empty strings when the reference is
 * missing — callers should surface a validation warning separately.
 */
export async function loadBrandingContent(
  branding: ResolvedEmailBranding,
): Promise<{ signatureHtml: string; footerHtml: string; disclaimerHtml: string }> {
  const [sig, foot, disc] = await Promise.all([
    branding.signatureId.value
      ? sb
          .from("comm_email_signature")
          .select("body_html, signature_html")
          .eq("id", branding.signatureId.value)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    branding.footerId.value
      ? sb
          .from("comm_print_footer")
          .select("body_html, footer_html")
          .eq("id", branding.footerId.value)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    branding.disclaimerId.value
      ? sb
          .from("comm_disclaimer")
          .select("body_html, disclaimer_text")
          .eq("id", branding.disclaimerId.value)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    signatureHtml: (sig as any)?.data?.signature_html ?? (sig as any)?.data?.body_html ?? "",
    footerHtml: (foot as any)?.data?.footer_html ?? (foot as any)?.data?.body_html ?? "",
    disclaimerHtml: (disc as any)?.data?.disclaimer_text ?? (disc as any)?.data?.body_html ?? "",
  };
}
