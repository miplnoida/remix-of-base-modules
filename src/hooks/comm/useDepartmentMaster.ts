import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sb = supabase as any;

export interface DepartmentMaster {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Department Master — single source of truth. */
export function useDepartmentMasters() {
  return useQuery({
    queryKey: ["core_department", "list"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_department")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as DepartmentMaster[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useDepartmentMasterMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<DepartmentMaster> & { id?: string }) => {
      if (row.id) {
        const { error } = await sb.from("core_department").update(row).eq("id", row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("core_department").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["core_department"] });
      qc.invalidateQueries({ queryKey: ["core_department_profile"] });
      toast.success("Department saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

/**
 * Combined view: every department master row joined with its profile (if any).
 * Profile is auto-created by DB trigger, so `profile` is normally present.
 */
export interface DepartmentWithProfile {
  master: DepartmentMaster;
  profile: any | null;
}

export function useDepartmentsWithProfiles() {
  return useQuery({
    queryKey: ["core_department", "with_profiles"],
    queryFn: async () => {
      const [{ data: masters, error: e1 }, { data: profiles, error: e2 }] = await Promise.all([
        sb.from("core_department").select("*").order("sort_order").order("name"),
        sb.from("core_department_profile").select("*"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const byDeptId = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => p.department_id && byDeptId.set(p.department_id, p));
      return (masters ?? []).map((m: any) => ({
        master: m as DepartmentMaster,
        profile: byDeptId.get(m.id) ?? null,
      })) as DepartmentWithProfile[];
    },
    staleTime: 60_000,
  });
}

/** Create missing profiles for any master rows that don't have one. */
export function useBackfillProfilesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const [{ data: masters }, { data: profiles }] = await Promise.all([
        sb.from("core_department").select("*"),
        sb.from("core_department_profile").select("department_id"),
      ]);
      const have = new Set((profiles ?? []).map((p: any) => p.department_id).filter(Boolean));
      const missing = (masters ?? []).filter((m: any) => !have.has(m.id));
      if (!missing.length) return 0;
      const rows = missing.map((m: any) => ({
        department_id: m.id,
        organization_id: m.organization_id,
        department_code: m.code,
        department_name: m.name,
        module_code: m.code,
        status: m.is_active ? "ACTIVE" : "INACTIVE",
        inherit_letterhead_from_org: true,
        inherit_email_signature_from_org: true,
        inherit_disclaimer_from_org: true,
        inherit_print_footer_from_org: true,
        inherit_logo_from_org: true,
        inherit_seal_from_org: true,
        inherit_location_from_org: true,
        inherit_dms_folder_from_org: true,
      }));
      const { error } = await sb.from("core_department_profile").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["core_department"] });
      qc.invalidateQueries({ queryKey: ["core_department_profile"] });
      toast.success(n ? `Created ${n} missing profiles` : "All profiles already exist");
    },
    onError: (e: any) => toast.error(e?.message ?? "Backfill failed"),
  });
}

/** Reset a department profile to inherit everything from organization defaults. */
export function useResetProfileToDefaultsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      const { error } = await sb
        .from("core_department_profile")
        .update({
          inherit_letterhead_from_org: true,
          inherit_email_signature_from_org: true,
          inherit_disclaimer_from_org: true,
          inherit_print_footer_from_org: true,
          inherit_logo_from_org: true,
          inherit_seal_from_org: true,
          inherit_location_from_org: true,
          inherit_dms_folder_from_org: true,
        })
        .eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["core_department_profile"] });
      qc.invalidateQueries({ queryKey: ["core_department"] });
      toast.success("Profile reset to organization defaults");
    },
    onError: (e: any) => toast.error(e?.message ?? "Reset failed"),
  });
}
