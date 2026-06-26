import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

/**
 * Single source of truth for all communication tokens across letters,
 * emails, PDFs, notifications, DMS metadata and AI prompts.
 *
 * Resolves from the new enterprise tables:
 *   core_organization → core_department_profile → office_locations
 *   comm_letterhead / comm_email_signature / comm_disclaimer / comm_print_footer
 *
 * Falls back to legacy `lg_department_profile` columns when an enterprise
 * record or asset reference is missing, preserving backward compatibility
 * for templates and code still expecting `{{dept.*}}` tokens.
 */
export interface CommunicationContext {
  organization: {
    name: string;
    shortName: string;
    country: string;
    currency: string;
    language: string;
    timeZone: string;
    website: string;
    primaryLogoUrl: string;
    secondaryLogoUrl: string;
    sealUrl: string;
  };
  department: {
    name: string;
    code: string;
    type: string;
    description: string;
    manager: string;
    deputy: string;
  };
  location: {
    name: string;
    address: string;
    addressBlock: string;
    phone: string;
    email: string;
    officeHours: string;
    gps: string;
  };
  letterhead: {
    name: string;
    logo: string;
    secondaryLogo: string;
    header: string;
    footer: string;
    qrCode: string;
  };
  email: {
    signatureHtml: string;
    signatureText: string;
    senderEmail: string;
  };
  disclaimer: {
    standard: string;
    name: string;
  };
  print: {
    footer: string;
    watermark: string;
    pageFooter: string;
  };
  ai: {
    systemPrompt: string;
    promptPrefix: string;
  };
}

const empty = (): CommunicationContext => ({
  organization: { name: "", shortName: "", country: "", currency: "", language: "", timeZone: "", website: "", primaryLogoUrl: "", secondaryLogoUrl: "", sealUrl: "" },
  department: { name: "", code: "", type: "", description: "", manager: "", deputy: "" },
  location: { name: "", address: "", addressBlock: "", phone: "", email: "", officeHours: "", gps: "" },
  letterhead: { name: "", logo: "", secondaryLogo: "", header: "", footer: "", qrCode: "" },
  email: { signatureHtml: "", signatureText: "", senderEmail: "" },
  disclaimer: { standard: "", name: "" },
  print: { footer: "", watermark: "", pageFooter: "" },
  ai: { systemPrompt: "", promptPrefix: "" },
});

const s = (v: any) => (v == null ? "" : String(v)).trim();

export async function resolveCommunicationContext(
  moduleCode = "LEGAL",
): Promise<CommunicationContext> {
  const ctx = empty();

  // 1. Enterprise dept profile
  const { data: dept } = await sb
    .from("core_department_profile")
    .select("*")
    .eq("module_code", moduleCode)
    .limit(1)
    .maybeSingle();

  // 2. Legacy fallback (Legal only)
  let legacy: any = null;
  if (moduleCode === "LEGAL") {
    const { data: lp } = await sb
      .from("lg_department_profile")
      .select("*")
      .limit(1)
      .maybeSingle();
    legacy = lp ?? null;
  }

  if (dept) {
    ctx.department = {
      name: s(dept.department_name) || s(legacy?.department_name) || "Legal Department",
      code: s(dept.department_code),
      type: s(dept.department_type),
      description: s(dept.description),
      manager: s(dept.department_manager_user_code),
      deputy: s(dept.deputy_manager_user_code),
    };
    ctx.ai.promptPrefix = s(dept.ai_prompt_prefix) || s(legacy?.ai_prompt_prefix);

    // 3. Organization
    if (dept.organization_id) {
      const { data: org } = await sb
        .from("core_organization")
        .select("*")
        .eq("id", dept.organization_id)
        .maybeSingle();
      if (org) {
        ctx.organization = {
          name: s(org.legal_name) || s(legacy?.institution_name),
          shortName: s(org.short_name),
          country: s(org.country_code) || s(legacy?.country_code),
          currency: s(org.default_currency) || s(legacy?.currency),
          language: s(org.default_language) || s(legacy?.language),
          timeZone: s(org.time_zone) || s(legacy?.time_zone),
          website: s(org.website) || s(legacy?.website),
          primaryLogoUrl: s(org.primary_logo_url) || s(legacy?.logo_url),
          secondaryLogoUrl: s(org.secondary_logo_url),
          sealUrl: s(org.seal_url) || s(legacy?.seal_url),
        };
      }
    }

    // 4. Primary location
    if (dept.primary_location_id) {
      const { data: loc } = await sb
        .from("office_locations")
        .select("*")
        .eq("id", dept.primary_location_id)
        .maybeSingle();
      if (loc) {
        const parts = [s(loc.address_line1), s(loc.address_line2), s(loc.city), s(loc.state_region ?? loc.parish), s(loc.postal_code), s(loc.country_code)].filter(Boolean);
        ctx.location = {
          name: s(loc.name ?? loc.location_name),
          address: parts.join(", "),
          addressBlock: parts.join("\n"),
          phone: s(loc.phone),
          email: s(loc.email),
          officeHours: s(loc.office_hours),
          gps: loc.gps_lat && loc.gps_lng ? `${loc.gps_lat},${loc.gps_lng}` : "",
        };
      }
    }

    // 5. Letterhead
    if (dept.default_letterhead_id) {
      const { data: lh } = await sb.from("comm_letterhead").select("*").eq("id", dept.default_letterhead_id).maybeSingle();
      if (lh) ctx.letterhead = {
        name: s(lh.name), logo: s(lh.logo_url), secondaryLogo: s(lh.secondary_logo_url),
        header: s(lh.header_html), footer: s(lh.footer_html), qrCode: s(lh.qr_code_url),
      };
    }
    // 6. Email signature
    if (dept.default_email_signature_id) {
      const { data: es } = await sb.from("comm_email_signature").select("*").eq("id", dept.default_email_signature_id).maybeSingle();
      if (es) ctx.email = {
        signatureHtml: s(es.html_signature), signatureText: s(es.plain_text_signature),
        senderEmail: s(legacy?.notification_sender_email) || s(legacy?.email),
      };
    }
    // 7. Disclaimer
    if (dept.default_disclaimer_id) {
      const { data: ds } = await sb.from("comm_disclaimer").select("*").eq("id", dept.default_disclaimer_id).maybeSingle();
      if (ds) ctx.disclaimer = { standard: s(ds.body), name: s(ds.name) };
    }
    // 8. Print footer
    if (dept.default_print_footer_id) {
      const { data: pf } = await sb.from("comm_print_footer").select("*").eq("id", dept.default_print_footer_id).maybeSingle();
      if (pf) ctx.print = { footer: s(pf.footer_html), watermark: s(pf.watermark_url), pageFooter: s(pf.page_footer) };
    }
  } else if (legacy) {
    // Pure legacy fallback
    ctx.organization.name = s(legacy.institution_name);
    ctx.organization.country = s(legacy.country_code);
    ctx.organization.timeZone = s(legacy.time_zone);
    ctx.organization.website = s(legacy.website);
    ctx.organization.primaryLogoUrl = s(legacy.logo_url);
    ctx.department.name = s(legacy.department_name) || "Legal Department";
    ctx.department.code = s(legacy.department_code);
    const parts = [s(legacy.address_line1), s(legacy.address_line2), s(legacy.city), s(legacy.state_region), s(legacy.postal_code), s(legacy.country_code)].filter(Boolean);
    ctx.location.address = parts.join(", ");
    ctx.location.addressBlock = parts.join("\n");
    ctx.location.phone = s(legacy.phone);
    ctx.location.email = s(legacy.email);
    ctx.letterhead.header = s(legacy.letterhead_header);
    ctx.letterhead.footer = s(legacy.letterhead_footer);
    ctx.email.signatureText = s(legacy.email_signature);
    ctx.disclaimer.standard = s(legacy.legal_disclaimer);
    ctx.print.footer = s(legacy.print_footer);
    ctx.ai.promptPrefix = s(legacy.ai_prompt_prefix);
  }

  // Build AI system prompt
  const intro = (ctx.department.name || ctx.organization.name)
    ? `You are assisting the ${ctx.department.name || "department"}${ctx.organization.name ? `, ${ctx.organization.name}` : ""}${ctx.organization.country ? ` (${ctx.organization.country})` : ""}.`
    : "";
  ctx.ai.systemPrompt = [intro, ctx.ai.promptPrefix].filter(Boolean).join("\n").trim();

  return ctx;
}

/** Flatten a context into the `{{group.key}}` token table for templates. */
export function communicationTokens(ctx: CommunicationContext): Record<string, string> {
  return {
    "organization.name": ctx.organization.name,
    "organization.shortName": ctx.organization.shortName,
    "organization.country": ctx.organization.country,
    "organization.currency": ctx.organization.currency,
    "organization.language": ctx.organization.language,
    "organization.website": ctx.organization.website,
    "organization.logo": ctx.organization.primaryLogoUrl,
    "organization.seal": ctx.organization.sealUrl,
    "department.name": ctx.department.name,
    "department.code": ctx.department.code,
    "department.type": ctx.department.type,
    "department.manager": ctx.department.manager,
    "location.name": ctx.location.name,
    "location.address": ctx.location.address,
    "location.addressBlock": ctx.location.addressBlock,
    "location.phone": ctx.location.phone,
    "location.email": ctx.location.email,
    "location.hours": ctx.location.officeHours,
    "letterhead.logo": ctx.letterhead.logo,
    "letterhead.header": ctx.letterhead.header,
    "letterhead.footer": ctx.letterhead.footer,
    "letterhead.qr": ctx.letterhead.qrCode,
    "email.signature": ctx.email.signatureHtml || ctx.email.signatureText,
    "email.signatureHtml": ctx.email.signatureHtml,
    "email.signatureText": ctx.email.signatureText,
    "email.sender": ctx.email.senderEmail,
    "disclaimer.standard": ctx.disclaimer.standard,
    "print.footer": ctx.print.footer,
    "print.watermark": ctx.print.watermark,
    "ai.systemPrompt": ctx.ai.systemPrompt,
    // Back-compat aliases for legacy {{dept.*}} tokens
    "dept.institution": ctx.organization.name,
    "dept.department": ctx.department.name,
    "dept.country": ctx.organization.country,
    "dept.timeZone": ctx.organization.timeZone,
    "dept.email": ctx.location.email,
    "dept.phone": ctx.location.phone,
    "dept.website": ctx.organization.website,
    "dept.logoUrl": ctx.organization.primaryLogoUrl,
    "dept.address": ctx.location.address,
    "dept.addressBlock": ctx.location.addressBlock,
    "dept.signature": ctx.email.signatureText,
    "dept.noticeFooter": ctx.print.pageFooter,
    "dept.salutation": "Dear Sir/Madam",
  };
}

export function applyCommunicationTokens(text: string, ctx: CommunicationContext): string {
  const tokens = communicationTokens(ctx);
  return text.replace(/\{\{\s*([a-zA-Z][\w.]*)\s*\}\}/g, (_m, key) => tokens[key] ?? `{{${key}}}`);
}
