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
  is_primary: boolean | null;
  is_active: boolean | null;
  organization_id: string | null;
  manager_user_code: string | null;
  logo_override_url: string | null;
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

export function useOfficeLocationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<OfficeLocation> & { id?: string }) => {
      const payload = { ...row };
      if (row.id) {
        const { error } = await sb.from("office_locations").update(payload).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("office_locations").insert(payload);
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
      if (row.id) {
        const { error } = await sb.from("core_department_profile").update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("core_department_profile").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["core_department_profile"] });
      qc.invalidateQueries({ queryKey: ["comm_context"] });
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
