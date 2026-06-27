import { supabase } from "@/integrations/supabase/client";
import { resolveCommAssets, type ResolvedAsset } from "@/lib/comm/assetResolver";

const sb = supabase as any;

export interface OrgContextInput {
  moduleCode?: string | null;
  departmentCode?: string | null;
  organizationId?: string | null;
  locationId?: string | null;
  communicationType?: string | null;
  /** Per-transaction overrides — win over everything. */
  transactionOverrides?: Partial<Record<
    "letterhead" | "email_signature" | "disclaimer" | "print_footer" | "logo" | "seal",
    ResolvedAsset
  >>;
}

export interface OrgContext {
  organization: any | null;
  department: any | null;
  module: any | null;
  location: any | null;
  letterhead: ResolvedAsset | null;
  email_signature: ResolvedAsset | null;
  disclaimer: ResolvedAsset | null;
  print_footer: ResolvedAsset | null;
  logo: ResolvedAsset | null;
  seal: ResolvedAsset | null;
  dms: { folder_id: string | null; provider_id: string | null } | null;
  ai_context: { prefix: string | null; notes: string | null } | null;
}

/**
 * Enterprise resolver — single entry point for any module needing
 * organization/department/module branding and communication context.
 *
 * Resolution order (highest priority first):
 *   1. transaction override
 *   2. department profile (when inherit_*_from_org = false)
 *   3. module default (via app_modules.owner_department_id)
 *   4. organization default
 *   5. system fallback (null)
 */
export async function resolveOrganizationContext(
  input: OrgContextInput = {},
): Promise<OrgContext> {
  const { moduleCode, departmentCode, locationId, organizationId, communicationType, transactionOverrides } = input;

  // Module
  let mod: any = null;
  if (moduleCode) {
    const { data } = await sb
      .from("app_modules")
      .select("id,name,display_name,short_name,icon,route,owner_department_id,is_enabled")
      .eq("name", moduleCode)
      .maybeSingle();
    mod = data;
  }

  // Department profile
  let dept: any = null;
  if (moduleCode || departmentCode) {
    let q = sb.from("core_department_profile").select("*").limit(1);
    if (departmentCode) q = q.eq("department_code", departmentCode);
    if (moduleCode) q = q.eq("module_code", moduleCode);
    const { data } = await q.maybeSingle();
    dept = data;
  }

  // Organization
  const orgId = organizationId ?? dept?.organization_id ?? null;
  let org: any = null;
  if (orgId) {
    const { data } = await sb.from("core_organization").select("*").eq("id", orgId).maybeSingle();
    org = data;
  } else {
    // Fallback: first active organization
    const { data } = await sb.from("core_organization").select("*").eq("status", "active").limit(1).maybeSingle();
    org = data;
  }

  // Location
  const effectiveLocId = locationId ?? dept?.primary_location_id ?? org?.default_location_id ?? null;
  let location: any = null;
  if (effectiveLocId) {
    const { data } = await sb.from("office_locations").select("*").eq("id", effectiveLocId).maybeSingle();
    location = data;
  }

  // Assets — delegate to existing asset resolver, then layer transaction overrides
  const assets = await resolveCommAssets(
    ["letterhead_header", "email_header", "watermark", "letterhead_footer", "logo", "seal"],
    {
      organizationId: org?.id ?? null,
      departmentCode: dept?.department_code ?? departmentCode ?? null,
      moduleCode: moduleCode ?? null,
      locationId: effectiveLocId,
      communicationType: communicationType ?? null,
    },
  );

  const pick = (k: keyof NonNullable<OrgContextInput["transactionOverrides"]>, fallback: ResolvedAsset | null) =>
    transactionOverrides?.[k] ?? fallback;

  return {
    organization: org,
    department: dept,
    module: mod,
    location,
    letterhead: pick("letterhead", assets.letterhead_header ?? null),
    email_signature: pick("email_signature", assets.email_header ?? null),
    disclaimer: pick("disclaimer", null),
    print_footer: pick("print_footer", assets.letterhead_footer ?? null),
    logo: pick("logo", assets.logo ?? null),
    seal: pick("seal", assets.seal ?? null),
    dms: {
      folder_id: dept?.dms_folder_id ?? org?.default_dms_folder_id ?? null,
      provider_id: null,
    },
    ai_context: {
      prefix: dept?.ai_prompt_prefix ?? null,
      notes: (dept as any)?.ai_context_notes ?? null,
    },
  };
}
