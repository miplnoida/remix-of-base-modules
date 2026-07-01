/**
 * Department Effective Resolver
 *
 * Wraps the central resolvers (resolveCommunicationContext,
 * coreTemplateResolverService, letterheadContentResolver, etc.) to compute
 * the *effective* branding + comm output for a given department, together
 * with a per-asset resolution trace and health warnings.
 *
 * This is the single source used by the Department Profile "Effective
 * Preview" tab. It never hardcodes preview data — every value comes from
 * the same runtime path real communications use.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  resolveCommunicationContext,
  type CommunicationContext,
} from "./communicationResolver";
import { coreTemplateResolverService, type RenderContext } from "@/services/coreTemplateResolverService";

const sb = supabase as any;

export type ResolutionSource =
  | "department_override"
  | "organization_default"
  | "module_default"
  | "workflow_default"
  | "event_default"
  | "template_override"
  | "none";

export interface ResolutionTraceEntry {
  key: string;                // e.g. "letterhead", "email_signature"
  label: string;              // human label
  effectiveId: string | null;
  effectiveName: string;
  source: ResolutionSource;
  overrideExists: boolean;
  active: boolean;
  steps: string[];            // ordered trace lines
}

export interface HealthWarning {
  severity: "error" | "warning" | "info";
  message: string;
  key?: string;
}

export interface DepartmentEffectiveResult {
  departmentCode: string;
  departmentName: string;
  organizationId: string | null;
  organizationName: string;
  context: CommunicationContext;
  trace: ResolutionTraceEntry[];
  warnings: HealthWarning[];
  raw: {
    department: any | null;
    organization: any | null;
  };
}

/** Slots we track in the inheritance trace. Each maps a
 *  department-profile override id + inherit flag onto the matching
 *  organization default column. */
const SLOTS: Array<{
  key: string;
  label: string;
  deptFlag: string;
  deptId: string;
  orgId: string;
  table: string;
  nameCol?: string;
}> = [
  { key: "letterhead",       label: "Default Letterhead",  deptFlag: "inherit_letterhead_from_org",      deptId: "default_letterhead_id",      orgId: "default_letterhead_id",      table: "comm_letterhead" },
  { key: "email_signature",  label: "Email Signature",     deptFlag: "inherit_email_signature_from_org", deptId: "default_email_signature_id", orgId: "default_email_signature_id", table: "comm_email_signature" },
  { key: "disclaimer",       label: "Disclaimer",          deptFlag: "inherit_disclaimer_from_org",      deptId: "default_disclaimer_id",      orgId: "default_disclaimer_id",      table: "comm_disclaimer" },
  { key: "print_footer",     label: "Print Footer",        deptFlag: "inherit_print_footer_from_org",    deptId: "default_print_footer_id",    orgId: "default_print_footer_id",    table: "comm_print_footer" },
  { key: "location",         label: "Primary Location",    deptFlag: "inherit_location_from_org",        deptId: "primary_location_id",        orgId: "default_location_id",        table: "office_locations", nameCol: "branch_name" },
];

/** Asset slots kept on core_department_profile (Phase 2). */
const ASSET_SLOTS: Array<{ key: string; label: string; col: string }> = [
  { key: "logo",         label: "Logo",             col: "default_logo_asset_id" },
  { key: "small_logo",   label: "Small Logo",       col: "default_small_logo_asset_id" },
  { key: "email_header", label: "Email Header",     col: "default_email_header_asset_id" },
  { key: "email_footer", label: "Email Footer",     col: "default_email_footer_asset_id" },
  { key: "letter_header",label: "Letterhead Header",col: "default_header_asset_id" },
  { key: "letter_footer",label: "Letterhead Footer",col: "default_footer_asset_id" },
  { key: "watermark",    label: "Watermark",        col: "default_watermark_asset_id" },
  { key: "seal",         label: "Seal",             col: "default_seal_asset_id" },
  { key: "stamp",        label: "Stamp",            col: "default_stamp_asset_id" },
  { key: "signature",    label: "Signature Asset",  col: "default_signature_asset_id" },
  { key: "qr_code",      label: "QR Code",          col: "default_qr_asset_id" },
];

async function fetchRow(table: string, id: string | null, nameCol = "name") {
  if (!id) return null;
  const { data } = await sb.from(table).select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return { ...data, __name: data[nameCol] ?? data.name ?? data.branch_name ?? "" };
}

export async function resolveDepartmentEffective(
  departmentCode: string,
): Promise<DepartmentEffectiveResult> {
  const warnings: HealthWarning[] = [];

  // 1. Load department + organization
  const { data: dept } = await sb
    .from("core_department_profile")
    .select("*")
    .eq("department_code", departmentCode)
    .limit(1)
    .maybeSingle();

  let org: any = null;
  if (dept?.organization_id) {
    const r = await sb.from("core_organization").select("*").eq("id", dept.organization_id).maybeSingle();
    org = r.data ?? null;
  }

  // 2. Runtime context via the central resolver (same one that renders
  //    real emails and letters).
  const context = await resolveCommunicationContext(departmentCode);

  // 3. Per-slot resolution trace
  const trace: ResolutionTraceEntry[] = [];
  for (const slot of SLOTS) {
    const inherit = dept ? dept[slot.deptFlag] !== false : true;
    const overrideId = dept ? dept[slot.deptId] : null;
    const orgDefaultId = org ? org[slot.orgId] : null;
    const overrideExists = !!overrideId;

    let effectiveId: string | null = null;
    let source: ResolutionSource = "none";
    const steps: string[] = [];

    if (!inherit && overrideId) {
      effectiveId = overrideId;
      source = "department_override";
      steps.push(`Department override active → ${overrideId}`);
    } else {
      if (inherit) steps.push(`Department set to inherit from Organization`);
      else steps.push(`Department override not set`);
      if (orgDefaultId) {
        effectiveId = orgDefaultId;
        source = "organization_default";
        steps.push(`Organization default found → ${orgDefaultId}`);
      } else if (overrideId) {
        effectiveId = overrideId;
        source = "department_override";
        steps.push(`Falling back to department override → ${overrideId}`);
      } else {
        steps.push(`No organization default and no department override — unresolved`);
      }
    }

    const row = await fetchRow(slot.table, effectiveId, slot.nameCol);
    const active = row ? (row.is_active !== false) : false;
    if (effectiveId && !row) {
      warnings.push({ severity: "error", key: slot.key, message: `${slot.label}: referenced record ${effectiveId} not found` });
    } else if (row && !active) {
      warnings.push({ severity: "warning", key: slot.key, message: `${slot.label}: inactive asset in use (${row.__name || effectiveId})` });
    } else if (!effectiveId) {
      warnings.push({ severity: "warning", key: slot.key, message: `${slot.label}: not configured at any level` });
    }

    trace.push({
      key: slot.key,
      label: slot.label,
      effectiveId,
      effectiveName: row?.__name || "",
      source,
      overrideExists,
      active,
      steps,
    });
  }

  // 4. Asset slots (Phase-2 columns on department profile) — no inherit
  //    flag; presence == override, absence == inherit from org where
  //    equivalent asset exists.
  for (const a of ASSET_SLOTS) {
    const overrideId = dept ? dept[a.col] : null;
    const orgFallback = null; // organization asset slots are configured via portal branding elsewhere
    const effectiveId = overrideId || orgFallback;
    const source: ResolutionSource = overrideId ? "department_override" : (effectiveId ? "organization_default" : "none");
    const row = await fetchRow("comm_media_asset", effectiveId);
    const active = row ? (row.is_active !== false && row.status !== "inactive") : false;
    if (effectiveId && !row) {
      warnings.push({ severity: "error", key: a.key, message: `${a.label}: media asset ${effectiveId} not found` });
    } else if (row && !active) {
      warnings.push({ severity: "warning", key: a.key, message: `${a.label}: inactive asset` });
    }
    trace.push({
      key: `asset.${a.key}`,
      label: a.label,
      effectiveId,
      effectiveName: row?.__name || row?.file_name || "",
      source,
      overrideExists: !!overrideId,
      active,
      steps: overrideId
        ? [`Department asset override → ${overrideId}`]
        : [`Department asset not set; no equivalent organization slot — using resolver default`],
    });
  }

  // 5. Language
  const effectiveLanguage = (dept?.default_language || org?.default_language || context.organization.language || "").toString();
  trace.push({
    key: "language",
    label: "Default Language",
    effectiveId: effectiveLanguage || null,
    effectiveName: effectiveLanguage,
    source: dept?.default_language ? "department_override" : (org?.default_language ? "organization_default" : "none"),
    overrideExists: !!dept?.default_language,
    active: !!effectiveLanguage,
    steps: [
      dept?.default_language ? `Department language override → ${dept.default_language}` : `No department language override`,
      org?.default_language ? `Organization default → ${org.default_language}` : `No organization default`,
    ],
  });
  if (!effectiveLanguage) warnings.push({ severity: "warning", key: "language", message: "No default language configured" });

  // 6. Sanity health checks from context
  if (!context.email.signatureHtml && !context.email.signatureText)
    warnings.push({ severity: "warning", key: "email_signature", message: "Effective email signature is empty" });
  if (!context.print.footer && !context.print.pageFooter)
    warnings.push({ severity: "warning", key: "print_footer", message: "Effective print footer is empty" });
  if (!context.disclaimer.standard)
    warnings.push({ severity: "warning", key: "disclaimer", message: "Effective disclaimer body is empty" });
  if (!context.letterhead.header && !context.letterhead.logo)
    warnings.push({ severity: "warning", key: "letterhead", message: "Effective letterhead has no header or logo" });

  return {
    departmentCode,
    departmentName: dept?.department_name || context.department.name || departmentCode,
    organizationId: dept?.organization_id ?? null,
    organizationName: org?.legal_name || context.organization.name || "",
    context,
    trace,
    warnings,
    raw: { department: dept ?? null, organization: org ?? null },
  };
}

/** Resolve a template render context with department scope. Delegates to
 *  the central `coreTemplateResolverService`. */
export async function resolveTemplateForDepartment(input: {
  templateCode: string;
  departmentCode: string;
  language?: string;
  channel?: string;
  moduleCode?: string;
  businessEvent?: string;
  workflowStage?: string;
  country?: string;
}): Promise<RenderContext | null> {
  return coreTemplateResolverService.resolveRenderContext({
    template_code: input.templateCode,
    country: input.country || "KN",
    language: input.language || "en",
    channel: input.channel,
    module_code: input.moduleCode,
    department_code: input.departmentCode,
    business_event: input.businessEvent ?? null,
    workflow_stage: input.workflowStage ?? null,
  });
}
