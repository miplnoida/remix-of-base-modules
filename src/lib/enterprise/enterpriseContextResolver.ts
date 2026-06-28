/**
 * Enterprise Context Resolver — THE single entry point for every module.
 *
 * Every module (Legal, Benefits, Compliance, Finance, HR, Procurement,
 * Employer Services, Registration, DMS, Reports, Notifications, AI) MUST
 * call `resolveEnterpriseContext()` to obtain organization / department /
 * module / location / branding / DMS / notification / AI context for any
 * outbound artifact (letter, email, PDF, report, notification, prompt).
 *
 * Resolution order for every asset slot:
 *   1. Template / document-type override (comm_asset_assignment scope=TEMPLATE/DOCUMENT_TYPE)
 *   2. Module override (core_module_profile when inherit_*_from_org = false)
 *   3. Department override (core_department_profile when inherit_*_from_org = false)
 *   4. Location override (comm_asset_assignment scope=LOCATION)
 *   5. Organization default (core_organization)
 *   6. System fallback (null + MISSING trace entry)
 *
 * Existing resolvers (`communicationResolver`, `organizationContextResolver`,
 * `CommunicationResolver`) delegate here — never call them from modules.
 */
import { supabase } from "@/integrations/supabase/client";
import { resolveCommunicationContext, type CommunicationContext } from "@/lib/comm/communicationResolver";

const sb = supabase as any;

export type AssetSlot =
  | "letterhead"
  | "email_signature"
  | "disclaimer"
  | "print_footer"
  | "logo"
  | "seal"
  | "watermark";

export type ScopeType = "TEMPLATE" | "DOCUMENT_TYPE" | "MODULE" | "DEPARTMENT" | "LOCATION" | "ORGANIZATION";

export interface EnterpriseContextInput {
  moduleCode: string;
  departmentId?: string | null;
  departmentCode?: string | null;
  locationId?: string | null;
  templateId?: string | null;
  documentType?: string | null;
  userCode?: string | null;
  language?: string | null;
}

export interface ResolvedAssetSlot {
  assetId: string | null;
  resolvedFrom: ScopeType | "SYSTEM_DEFAULT" | "MISSING";
}

export interface EnterpriseContextTrace {
  slot: AssetSlot | "module" | "department" | "location" | "organization";
  source: ScopeType | "SYSTEM_DEFAULT" | "MISSING";
  ok: boolean;
}

export interface EnterpriseContext {
  organization: CommunicationContext["organization"] & { id: string | null };
  department: CommunicationContext["department"] & { id: string | null };
  module: {
    id: string | null;
    code: string;
    displayName: string;
    ownerDepartmentId: string | null;
    defaultWorkbasketId: string | null;
    defaultDmsFolderId: string | null;
    defaultNotificationCategory: string | null;
  };
  location: CommunicationContext["location"] & { id: string | null };
  branding: {
    logoAssetId: string | null;
    sealAssetId: string | null;
    watermarkAssetId: string | null;
  };
  letterhead: { id: string | null } & CommunicationContext["letterhead"];
  footer: { id: string | null } & { html: string };
  email_signature: { id: string | null } & CommunicationContext["email"];
  disclaimer: { id: string | null } & CommunicationContext["disclaimer"];
  dms: { folderId: string | null };
  notification: { defaultCategory: string | null };
  ai_context: { systemPrompt: string; promptPrefix: string; notes: string | null };
  resolvedAssets: Record<AssetSlot, ResolvedAssetSlot>;
  trace: EnterpriseContextTrace[];
}

// ---------------------------------------------------------------- helpers
async function loadModule(moduleCode: string) {
  const { data } = await sb
    .from("app_modules")
    .select("id,name,display_name,owner_department_id")
    .eq("name", moduleCode)
    .maybeSingle();
  return data;
}
async function loadModuleProfile(moduleId: string | null) {
  if (!moduleId) return null;
  const { data } = await sb
    .from("core_module_profile")
    .select("*")
    .eq("module_id", moduleId)
    .maybeSingle();
  return data;
}
async function loadOrg() {
  const { data } = await sb
    .from("core_organization")
    .select("*")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return data;
}
async function loadAssignment(
  scopeType: ScopeType,
  scopeId: string,
  assetType: AssetSlot,
): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await sb
    .from("comm_asset_assignment")
    .select("asset_id, priority")
    .eq("scope_type", scopeType)
    .eq("scope_id", scopeId)
    .eq("asset_type", assetType)
    .eq("active", true)
    .or(`effective_from.is.null,effective_from.lte.${today}`)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order("priority", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.asset_id ?? null;
}

// ---------------------------------------------------------------- resolver
export async function resolveEnterpriseContext(
  input: EnterpriseContextInput,
): Promise<EnterpriseContext> {
  const trace: EnterpriseContextTrace[] = [];
  const [module, baseCtx, org] = await Promise.all([
    loadModule(input.moduleCode),
    resolveCommunicationContext(input.moduleCode),
    loadOrg(),
  ]);
  const moduleProfile = await loadModuleProfile(module?.id ?? null);

  trace.push({ slot: "organization", source: org ? "ORGANIZATION" : "MISSING", ok: !!org });
  trace.push({ slot: "module", source: module ? "MODULE" : "MISSING", ok: !!module });

  // Department profile is already loaded into baseCtx by the comm resolver;
  // we also need the raw row for inherit_* + override IDs.
  let deptRow: any = null;
  if (input.departmentCode || input.departmentId || module?.owner_department_id) {
    let q = sb.from("core_department_profile").select("*").limit(1);
    if (input.departmentId) q = q.eq("department_id", input.departmentId);
    else if (input.departmentCode) q = q.eq("department_code", input.departmentCode);
    else if (input.moduleCode) q = q.eq("module_code", input.moduleCode);
    const { data } = await q.maybeSingle();
    deptRow = data;
  }
  trace.push({ slot: "department", source: deptRow ? "DEPARTMENT" : "MISSING", ok: !!deptRow });

  async function resolveSlot(
    slot: AssetSlot,
    orgAssetId: string | null,
    deptAssetId: string | null,
    deptInherit: boolean,
    moduleAssetId: string | null,
    moduleInherit: boolean,
  ): Promise<ResolvedAssetSlot> {
    // 1. Template override
    if (input.templateId) {
      const a = await loadAssignment("TEMPLATE", input.templateId, slot);
      if (a) return { assetId: a, resolvedFrom: "TEMPLATE" };
    }
    // 2. Document-type override
    if (input.documentType) {
      const a = await loadAssignment("DOCUMENT_TYPE", input.documentType, slot);
      if (a) return { assetId: a, resolvedFrom: "DOCUMENT_TYPE" };
    }
    // 3. Module override
    if (module?.id) {
      if (moduleAssetId && !moduleInherit) return { assetId: moduleAssetId, resolvedFrom: "MODULE" };
      const a = await loadAssignment("MODULE", module.id, slot);
      if (a) return { assetId: a, resolvedFrom: "MODULE" };
    }
    // 4. Department override
    if (deptRow?.id) {
      if (deptAssetId && !deptInherit) return { assetId: deptAssetId, resolvedFrom: "DEPARTMENT" };
      const a = await loadAssignment("DEPARTMENT", deptRow.id, slot);
      if (a) return { assetId: a, resolvedFrom: "DEPARTMENT" };
    }
    // 5. Location override
    if (input.locationId) {
      const a = await loadAssignment("LOCATION", input.locationId, slot);
      if (a) return { assetId: a, resolvedFrom: "LOCATION" };
    }
    // 6. Organization default
    if (orgAssetId) return { assetId: orgAssetId, resolvedFrom: "ORGANIZATION" };
    return { assetId: null, resolvedFrom: "MISSING" };
  }

  const slotDefs: Array<{
    slot: AssetSlot;
    orgCol: string;
    deptCol: string;
    deptInheritCol: string;
    moduleCol: string;
    moduleInheritCol: string;
  }> = [
    { slot: "letterhead", orgCol: "default_letterhead_id", deptCol: "default_letterhead_id", deptInheritCol: "inherit_letterhead_from_org", moduleCol: "override_letterhead_id", moduleInheritCol: "inherit_letterhead_from_org" },
    { slot: "email_signature", orgCol: "default_email_signature_id", deptCol: "default_email_signature_id", deptInheritCol: "inherit_email_signature_from_org", moduleCol: "override_email_signature_id", moduleInheritCol: "inherit_email_signature_from_org" },
    { slot: "disclaimer", orgCol: "default_disclaimer_id", deptCol: "default_disclaimer_id", deptInheritCol: "inherit_disclaimer_from_org", moduleCol: "override_disclaimer_id", moduleInheritCol: "inherit_disclaimer_from_org" },
    { slot: "print_footer", orgCol: "default_print_footer_id", deptCol: "default_print_footer_id", deptInheritCol: "inherit_print_footer_from_org", moduleCol: "override_print_footer_id", moduleInheritCol: "inherit_print_footer_from_org" },
    { slot: "logo", orgCol: "default_logo_asset_id", deptCol: "default_logo_asset_id", deptInheritCol: "inherit_logo_from_org", moduleCol: "override_logo_asset_id", moduleInheritCol: "inherit_logo_from_org" },
    { slot: "seal", orgCol: "default_seal_asset_id", deptCol: "default_small_logo_asset_id", deptInheritCol: "inherit_seal_from_org", moduleCol: "override_seal_asset_id", moduleInheritCol: "inherit_seal_from_org" },
    { slot: "watermark", orgCol: "default_watermark_asset_id", deptCol: "default_watermark_asset_id", deptInheritCol: "inherit_logo_from_org", moduleCol: "override_logo_asset_id", moduleInheritCol: "inherit_logo_from_org" },
  ];

  const resolvedAssets = {} as Record<AssetSlot, ResolvedAssetSlot>;
  for (const def of slotDefs) {
    const r = await resolveSlot(
      def.slot,
      org?.[def.orgCol] ?? null,
      deptRow?.[def.deptCol] ?? null,
      deptRow?.[def.deptInheritCol] ?? true,
      moduleProfile?.[def.moduleCol] ?? null,
      moduleProfile?.[def.moduleInheritCol] ?? true,
    );
    resolvedAssets[def.slot] = r;
    trace.push({ slot: def.slot, source: r.resolvedFrom, ok: r.assetId !== null });
  }

  return {
    organization: { ...baseCtx.organization, id: org?.id ?? null },
    department: { ...baseCtx.department, id: deptRow?.id ?? null },
    module: {
      id: module?.id ?? null,
      code: input.moduleCode,
      displayName: module?.display_name ?? input.moduleCode,
      ownerDepartmentId: moduleProfile?.owner_department_id ?? module?.owner_department_id ?? null,
      defaultWorkbasketId: moduleProfile?.default_workbasket_id ?? null,
      defaultDmsFolderId: moduleProfile?.default_dms_folder_id ?? null,
      defaultNotificationCategory: moduleProfile?.default_notification_category ?? null,
    },
    location: { ...baseCtx.location, id: input.locationId ?? null },
    branding: {
      logoAssetId: resolvedAssets.logo.assetId,
      sealAssetId: resolvedAssets.seal.assetId,
      watermarkAssetId: resolvedAssets.watermark.assetId,
    },
    letterhead: { id: resolvedAssets.letterhead.assetId, ...baseCtx.letterhead },
    footer: { id: resolvedAssets.print_footer.assetId, html: baseCtx.print.pageFooter || baseCtx.print.footer || "" },
    email_signature: { id: resolvedAssets.email_signature.assetId, ...baseCtx.email },
    disclaimer: { id: resolvedAssets.disclaimer.assetId, ...baseCtx.disclaimer },
    dms: {
      folderId:
        moduleProfile?.default_dms_folder_id ??
        (deptRow?.dms_folder_id ?? null) ??
        (org?.default_dms_folder_id ?? null),
    },
    notification: {
      defaultCategory: moduleProfile?.default_notification_category ?? null,
    },
    ai_context: {
      systemPrompt: baseCtx.ai.systemPrompt,
      promptPrefix: baseCtx.ai.promptPrefix,
      notes: moduleProfile?.ai_context_notes ?? deptRow?.ai_prompt_prefix ?? null,
    },
    resolvedAssets,
    trace,
  };
}

export const enterpriseContextResolver = { resolve: resolveEnterpriseContext };
