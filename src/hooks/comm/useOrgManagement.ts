import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export interface OfficeLocation {
  id: string;
  branch_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  location_type: string | null;
  island_or_region: string | null;
  parish_city: string | null;
  office_hours: string | null;
  phone: string | null;
  email: string | null;
  fax: string | null;
  is_primary: boolean | null;
  is_active: boolean | null;
  organization_id: string | null;
  manager_user_code: string | null;
  logo_override_url: string | null;
}

export interface DepartmentLocationLink {
  id: string;
  department_id: string;
  location_id: string;
  is_primary: boolean;
  use_for_letters: boolean;
  use_for_emails: boolean;
  use_for_dms: boolean;
  is_active: boolean;
}

const LOCATION_SELECTION_KEY = "__locationSelections";
const LOCATION_FIELD_CONFIG = {
  primary_office_location_id: { is_primary: true, use_for_letters: true, use_for_emails: true, use_for_dms: true },
  secondary_office_location_id: { is_primary: false, use_for_letters: false, use_for_emails: false, use_for_dms: false },
  primary_mailing_location_id: { is_primary: false, use_for_letters: true, use_for_emails: false, use_for_dms: false },
  primary_physical_location_id: { is_primary: false, use_for_letters: false, use_for_emails: false, use_for_dms: false },
} as const;

async function ensureDepartmentLocationLink(
  profileId: string,
  officeLocationId: string,
  flags: { is_primary: boolean; use_for_letters: boolean; use_for_emails: boolean; use_for_dms: boolean },
) {
  const { data: existing, error: lookupError } = await sb
    .from("core_department_location")
    .select("id")
    .eq("department_id", profileId)
    .eq("location_id", officeLocationId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing?.id) {
    const { error } = await sb
      .from("core_department_location")
      .update({ ...flags, is_active: true })
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id as string;
  }

  const { data, error } = await sb
    .from("core_department_location")
    .insert({ department_id: profileId, location_id: officeLocationId, ...flags, is_active: true })
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data?.id as string;
}

function hasAnyValue(row: Record<string, any>, keys: string[]) {
  return keys.some((key) => row[key] !== null && row[key] !== undefined && row[key] !== "");
}

function normalizeDepartmentProfileInheritance(row: Record<string, any>) {
  row.inherit_letterhead_from_org = !hasAnyValue(row, ["default_letterhead_id"]);
  row.inherit_email_signature_from_org = !hasAnyValue(row, ["default_email_signature_id", "default_signature_asset_id"]);
  row.inherit_disclaimer_from_org = !hasAnyValue(row, ["default_disclaimer_id", "default_disclaimer_text_block_code"]);
  row.inherit_print_footer_from_org = !hasAnyValue(row, ["default_print_footer_id", "default_footer_asset_id"]);
  row.inherit_logo_from_org = !hasAnyValue(row, [
    "default_logo_asset_id",
    "default_small_logo_asset_id",
    "default_header_asset_id",
    "default_email_header_asset_id",
    "default_email_footer_asset_id",
    "default_watermark_asset_id",
  ]);
  row.inherit_seal_from_org = !hasAnyValue(row, ["default_seal_asset_id", "default_stamp_asset_id"]);
  row.inherit_location_from_org = !hasAnyValue(row, [
    "primary_location_id",
    "primary_office_location_id",
    "secondary_office_location_id",
    "primary_mailing_location_id",
    "primary_physical_location_id",
  ]);
  row.inherit_dms_folder_from_org = !hasAnyValue(row, ["dms_folder_root", "dms_folder_id", "dms_folder_pattern"]);
}

export function useOfficeLocations() {
  return useQuery({
    queryKey: ["office_locations", "list"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("office_locations")
        .select("*")
        .order("is_primary", { ascending: false })
        .order("branch_name");
      if (error) throw error;
      return (data ?? []) as OfficeLocation[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useDepartmentLocationLinks() {
  return useQuery({
    queryKey: ["core_department_location", "list"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_department_location")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as DepartmentLocationLink[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useOfficeLocationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<OfficeLocation> & { id?: string }) => {
      const payload = { ...row };
      let savedId = row.id;
      if (row.id) {
        const { error } = await sb.from("office_locations").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("office_locations").insert(payload).select("id").maybeSingle();
        if (error) throw error;
        savedId = data?.id;
      }
      // Enforce single-primary: if this row is primary, unset all others
      if (row.is_primary && savedId) {
        const { error } = await sb
          .from("office_locations")
          .update({ is_primary: false })
          .eq("is_primary", true)
          .neq("id", savedId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["office_locations"] });
      toast.success("Location saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

export function useOrganizationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await sb.from("core_organization").update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("core_organization").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["core_organization"] });
      qc.invalidateQueries({ queryKey: ["comm_context"] });
      toast.success("Organization profile saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

export function useOrganizations() {
  return useQuery({
    queryKey: ["core_organization", "list"],
    queryFn: async () => {
      const { data, error } = await sb.from("core_organization").select("*").order("legal_name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useDepartmentProfiles(filters?: { module_code?: string; department_type?: string }) {
  return useQuery({
    queryKey: ["core_department_profile", "list", filters],
    queryFn: async () => {
      let q = sb.from("core_department_profile").select("*").order("department_name");
      if (filters?.module_code) q = q.eq("module_code", filters.module_code);
      if (filters?.department_type) q = q.eq("department_type", filters.department_type);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useDepartmentProfileMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      const payload = { ...row };
      const locationSelections = payload[LOCATION_SELECTION_KEY] as Record<string, string | null> | undefined;
      delete payload[LOCATION_SELECTION_KEY];

      if (payload.id && locationSelections) {
        for (const [field, flags] of Object.entries(LOCATION_FIELD_CONFIG)) {
          if (!(field in locationSelections)) continue;
          const officeLocationId = locationSelections[field];
          payload[field] = officeLocationId
            ? await ensureDepartmentLocationLink(payload.id, officeLocationId, flags)
            : null;
          if (field === "primary_office_location_id") {
            payload.primary_location_id = officeLocationId || null;
          }
        }
      }

      normalizeDepartmentProfileInheritance(payload);

      if (row.id) {
        const { data, error } = await sb
          .from("core_department_profile")
          .update(payload)
          .eq("id", payload.id)
          .select("*")
          .maybeSingle();
        if (error) throw error;
        return data ?? payload;
      } else {
        const { data, error } = await sb
          .from("core_department_profile")
          .insert(payload)
          .select("*")
          .maybeSingle();
        if (error) throw error;
        return data ?? payload;
      }
    },
    onSuccess: async (saved: any) => {
      if (saved?.department_id) {
        qc.setQueriesData({ queryKey: ["core_department", "with_profiles"] }, (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((row: any) =>
            row?.master?.id === saved.department_id ? { ...row, profile: saved } : row
          );
        });
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["core_department_profile"] }),
        qc.invalidateQueries({ queryKey: ["core_department", "with_profiles"] }),
        qc.invalidateQueries({ queryKey: ["core_department_location"] }),
        qc.invalidateQueries({ queryKey: ["comm_context"] }),
      ]);
      toast.success("Department profile saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

/** Aggregated usage counts for the Usage & Validation page. */
export function useOrgUsageCounts() {
  return useQuery({
    queryKey: ["org_usage_counts"],
    queryFn: async () => {
      const [orgs, depts, locs, lhs, sigs, discs, foots] = await Promise.all([
        sb.from("core_organization").select("id", { count: "exact", head: true }),
        sb.from("core_department_profile").select("id", { count: "exact", head: true }),
        sb.from("office_locations").select("id", { count: "exact", head: true }).eq("is_active", true),
        sb.from("comm_letterhead").select("id", { count: "exact", head: true }).eq("is_active", true),
        sb.from("comm_email_signature").select("id", { count: "exact", head: true }).eq("is_active", true),
        sb.from("comm_disclaimer").select("id", { count: "exact", head: true }).eq("is_active", true),
        sb.from("comm_print_footer").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      return {
        organizations: orgs.count ?? 0,
        departments: depts.count ?? 0,
        active_locations: locs.count ?? 0,
        active_letterheads: lhs.count ?? 0,
        active_signatures: sigs.count ?? 0,
        active_disclaimers: discs.count ?? 0,
        active_footers: foots.count ?? 0,
      };
    },
    staleTime: 60_000,
  });
}
