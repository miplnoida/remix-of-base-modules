import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LgDepartmentProfileFull {
  id: string;
  // Identity
  institution_name: string | null;
  department_name: string | null;
  country_code: string | null;
  time_zone: string | null;
  website: string | null;
  logo_url: string | null;
  // Contact
  email: string | null;
  phone: string | null;
  fax: string | null;
  reply_to_email: string | null;
  support_email: string | null;
  // Address
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_region: string | null;
  postal_code: string | null;
  // Leadership
  head_of_legal_staff_id: string | null;
  deputy_head_staff_id: string | null;
  // Communication
  letter_signature: string | null;
  email_signature: string | null;
  notice_footer: string | null;
  default_salutation: string | null;
  // Operations
  default_team_id: string | null;
  default_workbasket_id: string | null;
  department_size_mode: "SMALL" | "MEDIUM" | "LARGE" | null;
  auto_assign_mode: "SELF_ASSIGN" | "ROUND_ROBIN" | "MANAGER_ASSIGN" | null;
  approvals_mode: "LIGHT" | "STANDARD" | "STRICT" | null;
  assistant_review_required: boolean | null;
  manager_role_required: boolean | null;
  // Integrations
  dms_folder_root: string | null;
  ai_prompt_prefix: string | null;
  show_on_pdfs: boolean | null;
  show_letterhead_on_reports: boolean | null;
  // Audit
  updated_at: string | null;
  updated_by: string | null;
}

export const LG_DEPT_PROFILE_FULL_KEY = ["lg_department_profile", "full"] as const;

export function useLgDepartmentProfileFull() {
  return useQuery({
    queryKey: LG_DEPT_PROFILE_FULL_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lg_department_profile")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as LgDepartmentProfileFull | null;
    },
    staleTime: 5 * 60_000,
  });
}
