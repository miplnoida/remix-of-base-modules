import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CoreOrganization {
  id: string;
  org_code: string;
  legal_name: string;
  short_name: string | null;
  country_code: string | null;
  default_currency: string | null;
  default_language: string | null;
  time_zone: string | null;
  website: string | null;
  primary_logo_url: string | null;
  secondary_logo_url: string | null;
  seal_url: string | null;
  status: string;
  description: string | null;
}

export interface CoreDepartmentProfile {
  id: string;
  organization_id: string | null;
  module_code: string;
  department_code: string;
  department_name: string;
  department_type: string | null;
  description: string | null;
  status: string;
  department_manager_user_code: string | null;
  deputy_manager_user_code: string | null;
  escalation_contact_user_code: string | null;
  default_team_id: string | null;
  default_workbasket_id: string | null;
  primary_location_id: string | null;
  default_letter_location_id: string | null;
  default_email_location_id: string | null;
  default_dms_location_id: string | null;
  default_letterhead_id: string | null;
  default_email_signature_id: string | null;
  default_disclaimer_id: string | null;
  default_print_footer_id: string | null;
  department_size_mode: string | null;
  auto_assign_mode: string | null;
  approvals_mode: string | null;
  assistant_review_required: boolean | null;
  manager_role_required: boolean | null;
  dms_folder_root: string | null;
  ai_prompt_prefix: string | null;
  show_on_pdfs: boolean | null;
  show_letterhead_on_reports: boolean | null;
  legacy_lg_profile_id: string | null;
}

const sb = supabase as any;

export const CORE_DEPT_PROFILE_KEY = (module: string) =>
  ["core_department_profile", module] as const;

/**
 * Loads the single enterprise department profile row for a module.
 * Falls back to null if not yet seeded; consumers can then read legacy
 * `lg_department_profile` for back-compat.
 */
export function useCoreDepartmentProfile(moduleCode: string = "LEGAL") {
  return useQuery({
    queryKey: CORE_DEPT_PROFILE_KEY(moduleCode),
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_department_profile")
        .select("*")
        .eq("module_code", moduleCode)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CoreDepartmentProfile | null;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCoreOrganization(organizationId?: string | null) {
  return useQuery({
    queryKey: ["core_organization", organizationId ?? "none"],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("core_organization")
        .select("*")
        .eq("id", organizationId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CoreOrganization | null;
    },
    staleTime: 10 * 60_000,
  });
}

export function useOfficeLocation(locationId?: string | null) {
  return useQuery({
    queryKey: ["office_location", locationId ?? "none"],
    enabled: !!locationId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("office_locations")
        .select("*")
        .eq("id", locationId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 10 * 60_000,
  });
}
