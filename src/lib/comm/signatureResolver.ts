/**
 * Signature & stamp resolution.
 * Resolution order (per template config):
 *  1. explicit user selection at generation time
 *  2. template fixed asset
 *  3. approval officer signature
 *  4. case owner signature
 *  5. department manager signature
 *  6. organization default signature
 */
import { supabase } from "@/integrations/supabase/client";
import type { SignatureBlockConfig } from "@/lib/comm/templateCatalog";

const sb = supabase as any;

export interface ResolutionContext {
  case_owner_user_code?: string | null;
  department_manager_user_code?: string | null;
  approver_user_code?: string | null;
  selected_signature_asset_id?: string | null;
  selected_signature_user_code?: string | null;
  department_id?: string | null;
  organization_id?: string | null;
}

export interface ResolvedAsset {
  id: string;
  name: string;
  category: string;
  approval_status: string;
  storage_path: string | null;
  external_url: string | null;
  source: string;
  effective_from: string | null;
  effective_to: string | null;
  transparent_background_required: boolean | null;
  linked_user_code: string | null;
  is_active: boolean;
}

export type ResolutionStatus = "resolved" | "pending" | "blocked";

export interface SignatureResolutionResult {
  status: ResolutionStatus;
  signature_asset?: ResolvedAsset | null;
  stamp_asset?: ResolvedAsset | null;
  seal_asset?: ResolvedAsset | null;
  approval_stamp_asset?: ResolvedAsset | null;
  signature_user_code?: string | null;
  reasons: string[];
  warnings: string[];
}

async function fetchAsset(id: string | null | undefined): Promise<ResolvedAsset | null> {
  if (!id) return null;
  const { data } = await sb
    .from("comm_media_asset")
    .select("id,name,category,approval_status,storage_path,external_url,source,effective_from,effective_to,transparent_background_required,linked_user_code,is_active")
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as ResolvedAsset | null;
}

async function fetchSignatureForUser(userCode: string | null | undefined, category = "signature"): Promise<ResolvedAsset | null> {
  if (!userCode) return null;
  const { data } = await sb
    .from("comm_media_asset")
    .select("id,name,category,approval_status,storage_path,external_url,source,effective_from,effective_to,transparent_background_required,linked_user_code,is_active")
    .eq("category", category)
    .eq("linked_user_code", userCode)
    .eq("is_active", true)
    .eq("approval_status", "approved")
    .order("updated_at", { ascending: false })
    .limit(1);
  return (data?.[0] ?? null) as ResolvedAsset | null;
}

async function fetchOrgDefaultSignature(): Promise<ResolvedAsset | null> {
  const { data } = await sb
    .from("comm_media_asset")
    .select("id,name,category,approval_status,storage_path,external_url,source,effective_from,effective_to,transparent_background_required,linked_user_code,is_active")
    .eq("category", "signature")
    .eq("is_system_default", true)
    .eq("is_active", true)
    .eq("approval_status", "approved")
    .limit(1);
  return (data?.[0] ?? null) as ResolvedAsset | null;
}

function isAssetUsable(a: ResolvedAsset | null): { ok: boolean; reason?: string } {
  if (!a) return { ok: false, reason: "asset not found" };
  if (!a.is_active) return { ok: false, reason: `${a.name}: asset archived/inactive` };
  if (a.approval_status !== "approved") return { ok: false, reason: `${a.name}: not approved (status=${a.approval_status})` };
  const today = new Date().toISOString().slice(0, 10);
  if (a.effective_from && today < a.effective_from) return { ok: false, reason: `${a.name}: not yet effective` };
  if (a.effective_to && today > a.effective_to) return { ok: false, reason: `${a.name}: expired on ${a.effective_to}` };
  return { ok: true };
}

export async function resolveSignatureBlock(
  block: SignatureBlockConfig,
  ctx: ResolutionContext,
): Promise<SignatureResolutionResult> {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const result: SignatureResolutionResult = { status: "resolved", reasons, warnings };

  // Resolve signature
  if (block.show_signature) {
    let sig: ResolvedAsset | null = null;
    let sigUser: string | null = null;

    // 1. Explicit selection
    if (ctx.selected_signature_asset_id) {
      sig = await fetchAsset(ctx.selected_signature_asset_id);
      sigUser = ctx.selected_signature_user_code ?? sig?.linked_user_code ?? null;
    } else if (ctx.selected_signature_user_code) {
      sig = await fetchSignatureForUser(ctx.selected_signature_user_code);
      sigUser = ctx.selected_signature_user_code;
    }

    // 2. Fixed asset / template config sources
    if (!sig) {
      switch (block.signature_source) {
        case "FIXED_ASSET":
          sig = await fetchAsset(block.signature_asset_id);
          sigUser = sig?.linked_user_code ?? null;
          break;
        case "APPROVER":
          sig = await fetchSignatureForUser(ctx.approver_user_code);
          sigUser = ctx.approver_user_code ?? null;
          break;
        case "CASE_OWNER":
          sig = await fetchSignatureForUser(ctx.case_owner_user_code);
          sigUser = ctx.case_owner_user_code ?? null;
          break;
        case "DEPARTMENT_MANAGER":
          sig = await fetchSignatureForUser(ctx.department_manager_user_code);
          sigUser = ctx.department_manager_user_code ?? null;
          break;
        case "SELECT_AT_GENERATION":
          reasons.push("Signature must be selected at generation time.");
          break;
        case "NONE":
          break;
      }
    }

    // 3. Fallback: org default
    if (!sig && block.signature_source !== "NONE" && block.signature_source !== "SELECT_AT_GENERATION") {
      sig = await fetchOrgDefaultSignature();
    }

    const check = isAssetUsable(sig);
    if (sig && !check.ok) {
      reasons.push(check.reason!);
    } else if (!sig && block.show_signature) {
      reasons.push("No valid approved signature could be resolved.");
    } else if (sig) {
      result.signature_asset = sig;
      result.signature_user_code = sigUser;
      if (sig.transparent_background_required === false) {
        warnings.push(`${sig.name}: signature is not marked as transparent — may render with a background.`);
      }
    }
  }

  // Stamp / Seal / Approval Stamp — use fixed asset only for now
  if (block.show_stamp) {
    const a = await fetchAsset(block.stamp_asset_id);
    const c = isAssetUsable(a);
    if (!c.ok) reasons.push(`Stamp: ${c.reason}`);
    else result.stamp_asset = a;
  }
  if (block.show_seal) {
    const a = await fetchAsset(block.seal_asset_id);
    const c = isAssetUsable(a);
    if (!c.ok) reasons.push(`Seal: ${c.reason}`);
    else result.seal_asset = a;
  }
  if (block.show_approval_stamp) {
    const a = await fetchAsset(block.approval_stamp_asset_id);
    const c = isAssetUsable(a);
    if (!c.ok) reasons.push(`Approval Stamp: ${c.reason}`);
    else result.approval_stamp_asset = a;
  }

  if (reasons.length > 0) {
    result.status = block.require_approval_before_final ? "blocked" : "pending";
  }
  return result;
}
