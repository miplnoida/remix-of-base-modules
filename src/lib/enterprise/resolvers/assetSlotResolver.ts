/**
 * Asset Slot Resolver — the single source of truth for which asset fills
 * which slot on every generated document (Receipt, Statement, Certificate,
 * Letter, Notice, Memo, …) across every module.
 *
 * Resolution order (Phase 6):
 *
 *   Document Override   → comm_asset_mapping where communication_type = docProfileCode
 *           ↓
 *   Department Profile  → core_department_profile.default_<slot>_asset_id
 *           ↓
 *   Organization        → core_organization defaults
 *           ↓
 *   Approved Global     → comm_media_asset where is_system_default and approved
 *           ↓
 *   Validation Error    → returned in `errors[]` when slot is REQUIRED
 *
 * Archived / rejected / draft / pending_approval assets are filtered out
 * at every layer. Never returns a placeholder asset.
 */

import { supabase } from "@/integrations/supabase/client";
import { getSignedUrl } from "@/hooks/comm/useMediaAssets";

const sb = supabase as any;

export type AssetSlot =
  | "logo" | "small_logo"
  | "header" | "footer"
  | "email_header" | "email_footer"
  | "letterhead"
  | "watermark" | "seal" | "stamp"
  | "signature" | "qr";

export type SlotPolicy = "NONE" | "OPTIONAL" | "REQUIRED";

export type ResolutionSource =
  | "DOCUMENT_OVERRIDE"
  | "DEPARTMENT_PROFILE"
  | "ORGANIZATION"
  | "GLOBAL_APPROVED"
  | "MISSING";

export interface ResolveContext {
  organizationId?: string | null;
  departmentProfileId?: string | null;
  documentProfileId?: string | null;
  documentProfileCode?: string | null;
}

export interface ResolvedSlot {
  slot: AssetSlot;
  source: ResolutionSource;
  inheritedFrom: string;           // human label: "Benefits Department", "Organization Profile" …
  assetId: string | null;
  assetName: string | null;
  url: string;                     // signed/external; "" when nothing resolved
  isFallback: boolean;
  approvalStatus: string | null;
  warnings: string[];
  errors: string[];
}

const DEPT_COLUMN: Record<AssetSlot, string> = {
  logo: "default_logo_asset_id",
  small_logo: "default_small_logo_asset_id",
  header: "default_header_asset_id",
  footer: "default_footer_asset_id",
  email_header: "default_email_header_asset_id",
  email_footer: "default_email_footer_asset_id",
  letterhead: "default_letterhead_id",
  watermark: "default_watermark_asset_id",
  seal: "default_seal_asset_id",
  stamp: "default_stamp_asset_id",
  signature: "default_signature_asset_id",
  qr: "default_qr_asset_id",
};

const SLOT_CATEGORY: Record<AssetSlot, string> = {
  logo: "logo",
  small_logo: "logo_small",
  header: "letterhead_header",
  footer: "letterhead_footer",
  email_header: "email_header",
  email_footer: "email_footer",
  letterhead: "letterhead_header",
  watermark: "watermark",
  seal: "seal",
  stamp: "stamp",
  signature: "signature",
  qr: "qr_code",
};

const APPROVED_ONLY = ["approved"];

async function loadAsset(id: string | null | undefined) {
  if (!id) return null;
  const { data } = await sb
    .from("comm_media_asset")
    .select("id,name,source,storage_path,external_url,approval_status,is_active")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  if (!APPROVED_ONLY.includes(data.approval_status) || !data.is_active) return null;
  return data;
}

async function urlFor(row: any): Promise<string> {
  if (!row) return "";
  if (row.source === "external_url") return row.external_url ?? "";
  if (row.storage_path) return (await getSignedUrl(row.storage_path)) ?? "";
  return "";
}

export async function resolveAssetSlot(
  slot: AssetSlot,
  ctx: ResolveContext,
  policy: SlotPolicy = "OPTIONAL",
): Promise<ResolvedSlot> {
  const out: ResolvedSlot = {
    slot,
    source: "MISSING",
    inheritedFrom: "—",
    assetId: null,
    assetName: null,
    url: "",
    isFallback: true,
    approvalStatus: null,
    warnings: [],
    errors: [],
  };
  if (policy === "NONE") return out;

  // 1. Document override
  if (ctx.documentProfileCode) {
    const { data: ovr } = await sb
      .from("comm_asset_mapping")
      .select("asset_id, comm_media_asset:asset_id(id,name,source,storage_path,external_url,approval_status,is_active)")
      .eq("communication_type", ctx.documentProfileCode)
      .eq("category", SLOT_CATEGORY[slot])
      .eq("is_active", true)
      .maybeSingle();
    const a = ovr?.comm_media_asset;
    if (a && APPROVED_ONLY.includes(a.approval_status) && a.is_active) {
      out.source = "DOCUMENT_OVERRIDE";
      out.inheritedFrom = `Document Override (${ctx.documentProfileCode})`;
      out.assetId = a.id;
      out.assetName = a.name;
      out.url = await urlFor(a);
      out.approvalStatus = a.approval_status;
      out.isFallback = false;
      return out;
    }
  }

  // 2. Department profile
  if (ctx.departmentProfileId) {
    const col = DEPT_COLUMN[slot];
    const { data: dept } = await sb
      .from("core_department_profile")
      .select(`${col}, department_name`)
      .eq("id", ctx.departmentProfileId)
      .maybeSingle();
    const a = await loadAsset(dept?.[col]);
    if (a) {
      out.source = "DEPARTMENT_PROFILE";
      out.inheritedFrom = `Department: ${dept?.department_name ?? "—"}`;
      out.assetId = a.id;
      out.assetName = a.name;
      out.url = await urlFor(a);
      out.approvalStatus = a.approval_status;
      out.isFallback = false;
      return out;
    }
  }

  // 3. Organization (logo/seal/letterhead live on core_organization)
  if (ctx.organizationId) {
    const orgCol =
      slot === "logo" ? "logo_asset_id" :
      slot === "small_logo" ? "small_logo_asset_id" :
      slot === "seal" ? "seal_asset_id" :
      slot === "letterhead" ? "letterhead_asset_id" :
      null;
    if (orgCol) {
      const { data: org } = await sb
        .from("core_organization")
        .select(`${orgCol}, name`)
        .eq("id", ctx.organizationId)
        .maybeSingle();
      const a = await loadAsset(org?.[orgCol]);
      if (a) {
        out.source = "ORGANIZATION";
        out.inheritedFrom = `Organization: ${org?.name ?? "—"}`;
        out.assetId = a.id;
        out.assetName = a.name;
        out.url = await urlFor(a);
        out.approvalStatus = a.approval_status;
        out.isFallback = false;
        return out;
      }
    }
  }

  // 4. Approved global / system default by category
  const { data: global } = await sb
    .from("comm_media_asset")
    .select("id,name,source,storage_path,external_url,approval_status,is_active,is_system_default")
    .eq("category", SLOT_CATEGORY[slot])
    .eq("is_active", true)
    .eq("approval_status", "approved")
    .order("is_system_default", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (global) {
    out.source = "GLOBAL_APPROVED";
    out.inheritedFrom = global.is_system_default ? "Global System Default" : "Approved Global Asset";
    out.assetId = global.id;
    out.assetName = global.name;
    out.url = await urlFor(global);
    out.approvalStatus = global.approval_status;
    out.isFallback = true;
    out.warnings.push("Resolved from global fallback — consider configuring an explicit default.");
    return out;
  }

  // 5. Missing
  if (policy === "REQUIRED") {
    out.errors.push(`Required asset "${slot}" could not be resolved.`);
  } else {
    out.warnings.push(`Optional asset "${slot}" not configured.`);
  }
  return out;
}

export async function resolveAssetSlots(
  slots: Array<{ slot: AssetSlot; policy?: SlotPolicy }>,
  ctx: ResolveContext,
): Promise<ResolvedSlot[]> {
  return Promise.all(slots.map((s) => resolveAssetSlot(s.slot, ctx, s.policy)));
}
