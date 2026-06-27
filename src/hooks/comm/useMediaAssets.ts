import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;
const BUCKET = "comm-assets";

export type CommAssetCategory =
  | "logo" | "logo_small" | "favicon" | "letterhead_header" | "letterhead_footer"
  | "signature" | "stamp" | "seal" | "qr_code" | "watermark" | "certificate_background"
  | "email_header" | "email_footer" | "login_logo" | "login_background"
  | "dashboard_banner" | "announcement_banner" | "maintenance_banner"
  | "app_icon" | "app_splash" | "other";

export type CommAssetSource = "upload" | "external_url";
export type CommAssetScope = "global" | "organization" | "department" | "location";

export interface CommMediaAsset {
  id: string;
  name: string;
  category: CommAssetCategory;
  source: CommAssetSource;
  scope: CommAssetScope;
  storage_path: string | null;
  external_url: string | null;
  preview_url: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  width_px: number | null;
  height_px: number | null;
  version: number;
  is_active: boolean;
  organization_id: string | null;
  department_id: string | null;
  location_id: string | null;
  usage_location: string | null;
  expiry_date: string | null;
  remarks: string | null;
  uploaded_by: string | null;
  link_last_checked_at: string | null;
  link_last_status: string | null;
  created_at: string;
  updated_at: string;
  asset_code: string | null;
  module_code: string | null;
  department_code: string | null;
  effective_from: string | null;
  effective_to: string | null;
  approval_status: "draft" | "pending_approval" | "approved" | "rejected" | "archived";
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  is_system_default: boolean;
  asset_type?: "MASTER_LOGO" | "DERIVED" | "STANDALONE";
  parent_asset_id?: string | null;
  derived_from_asset_id?: string | null;
  usage_slot?: string | null;
  generated_by_system?: boolean;
  generated_at?: string | null;
  replaced_by_asset_id?: string | null;
  version_no?: number;
  checksum_sha256?: string | null;
  is_default?: boolean;
}

export function useApprovalAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; action: "submit" | "approve" | "reject" | "archive" | "back_to_draft"; reason?: string; actor?: string }) => {
      const now = new Date().toISOString();
      const actor = args.actor ?? "system";
      const patch: Record<string, any> = {};
      switch (args.action) {
        case "submit":        patch.approval_status = "pending_approval"; patch.submitted_by = actor; patch.submitted_at = now; break;
        case "approve":       patch.approval_status = "approved";  patch.approved_by = actor; patch.approved_at = now; patch.rejection_reason = null; break;
        case "reject":        patch.approval_status = "rejected";  patch.rejected_by = actor; patch.rejected_at = now; patch.rejection_reason = args.reason ?? null; break;
        case "archive":       patch.approval_status = "archived";  patch.is_active = false; break;
        case "back_to_draft": patch.approval_status = "draft"; break;
      }
      const { error } = await sb.from("comm_media_asset").update(patch).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["comm_media_asset"] });
      toast.success(`Asset ${vars.action.replace("_", " ")}d`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Action failed"),
  });
}

export function useMediaAssets(filters?: { category?: CommAssetCategory; activeOnly?: boolean }) {
  return useQuery({
    queryKey: ["comm_media_asset", "list", filters],
    queryFn: async () => {
      let q = sb.from("comm_media_asset").select("*").order("created_at", { ascending: false });
      if (filters?.category) q = q.eq("category", filters.category);
      if (filters?.activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CommMediaAsset[];
    },
    staleTime: 60_000,
  });
}

export function useAssetVersions(assetId?: string | null) {
  return useQuery({
    queryKey: ["comm_media_asset_version", assetId],
    enabled: !!assetId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("comm_media_asset_version")
        .select("*")
        .eq("asset_id", assetId)
        .order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function uploadAssetFile(file: File, category: string) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${category}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return { storage_path: path, mime_type: file.type, file_size_bytes: file.size };
}

export async function getSignedUrl(storagePath: string, expiresIn = 3600) {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data?.signedUrl as string | undefined;
}

export function useSaveMediaAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<CommMediaAsset> & { id?: string }) => {
      if (row.id) {
        const { error } = await sb.from("comm_media_asset").update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("comm_media_asset").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm_media_asset"] });
      toast.success("Asset saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

export function useDeleteMediaAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("comm_media_asset").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comm_media_asset"] });
      toast.success("Asset deleted");
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });
}

export async function checkExternalLink(url: string): Promise<{ ok: boolean; status: string }> {
  try {
    // Use no-cors HEAD via image preload for image URLs
    return await new Promise((resolve) => {
      const img = new Image();
      const t = setTimeout(() => resolve({ ok: false, status: "timeout" }), 8000);
      img.onload = () => { clearTimeout(t); resolve({ ok: true, status: "loaded" }); };
      img.onerror = () => { clearTimeout(t); resolve({ ok: false, status: "error" }); };
      img.src = url;
    });
  } catch {
    return { ok: false, status: "error" };
  }
}
