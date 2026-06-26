import type { LgDepartmentProfileFull } from "@/hooks/legal/useLgDepartmentProfileFull";

/**
 * Single source of truth for "Legal Department" identity exposed as template
 * merge tokens (Mustache-style `{{dept.*}}`) and as an AI/system prompt prefix.
 *
 * Consumers (letter templates, notices, PDFs, email notifications, AI prompts,
 * DMS metadata, dashboards) should resolve their dept variables through this
 * helper rather than hardcoding strings.
 */
export interface DepartmentMergeContext {
  institution: string;
  department: string;
  country: string;
  timeZone: string;
  email: string;
  replyTo: string;
  support: string;
  phone: string;
  fax: string;
  website: string;
  logoUrl: string;
  addressOneLine: string;
  addressBlock: string;
  signature: string;
  emailSignature: string;
  noticeFooter: string;
  salutation: string;
  dmsFolderRoot: string;
  aiPromptPrefix: string;
}

const blank = (v: string | null | undefined) => (v ?? "").trim();

export function buildDepartmentMergeContext(
  p: LgDepartmentProfileFull | null | undefined,
): DepartmentMergeContext {
  const addressParts = [
    blank(p?.address_line1),
    blank(p?.address_line2),
    [blank(p?.city), blank(p?.state_region), blank(p?.postal_code)]
      .filter(Boolean)
      .join(" "),
    blank(p?.country_code),
  ].filter(Boolean);

  return {
    institution: blank(p?.institution_name),
    department: blank(p?.department_name) || "Legal Department",
    country: blank(p?.country_code),
    timeZone: blank(p?.time_zone),
    email: blank(p?.email),
    replyTo: blank(p?.reply_to_email) || blank(p?.email),
    support: blank(p?.support_email) || blank(p?.email),
    phone: blank(p?.phone),
    fax: blank(p?.fax),
    website: blank(p?.website),
    logoUrl: blank(p?.logo_url),
    addressOneLine: addressParts.join(", "),
    addressBlock: addressParts.join("\n"),
    signature: blank(p?.letter_signature),
    emailSignature: blank(p?.email_signature),
    noticeFooter: blank(p?.notice_footer),
    salutation: blank(p?.default_salutation) || "Dear Sir/Madam",
    dmsFolderRoot: blank(p?.dms_folder_root),
    aiPromptPrefix: blank(p?.ai_prompt_prefix),
  };
}

/** Map context to flat `{{dept.<key>}}` token table for template renderers. */
export function departmentMergeTokens(
  ctx: DepartmentMergeContext,
): Record<string, string> {
  return {
    "dept.institution": ctx.institution,
    "dept.department": ctx.department,
    "dept.country": ctx.country,
    "dept.timeZone": ctx.timeZone,
    "dept.email": ctx.email,
    "dept.replyTo": ctx.replyTo,
    "dept.support": ctx.support,
    "dept.phone": ctx.phone,
    "dept.fax": ctx.fax,
    "dept.website": ctx.website,
    "dept.logoUrl": ctx.logoUrl,
    "dept.address": ctx.addressOneLine,
    "dept.addressBlock": ctx.addressBlock,
    "dept.signature": ctx.signature,
    "dept.emailSignature": ctx.emailSignature,
    "dept.noticeFooter": ctx.noticeFooter,
    "dept.salutation": ctx.salutation,
  };
}

/** Render `{{dept.x}}` placeholders in the given text. */
export function applyDepartmentTokens(
  text: string,
  ctx: DepartmentMergeContext,
): string {
  const tokens = departmentMergeTokens(ctx);
  return text.replace(/\{\{\s*(dept\.[a-zA-Z]+)\s*\}\}/g, (_m, key) => tokens[key] ?? "");
}

/** Standard AI/system prompt prefix anchoring the model to this department. */
export function departmentAiSystemPrompt(ctx: DepartmentMergeContext): string {
  const parts: string[] = [];
  if (ctx.institution || ctx.department) {
    parts.push(
      `You are assisting the ${ctx.department}${ctx.institution ? `, ${ctx.institution}` : ""}${ctx.country ? ` (${ctx.country})` : ""}.`,
    );
  }
  if (ctx.aiPromptPrefix) parts.push(ctx.aiPromptPrefix);
  return parts.join("\n").trim();
}
