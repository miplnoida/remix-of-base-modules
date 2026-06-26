import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface CountryOpt { code: string; description: string }
export interface RefOpt { code: string; label: string }
export interface TeamOpt { id: string; team_code: string; team_name: string; module_code: string; is_active: boolean }
export interface WorkbasketOpt { id: string; workbasket_code: string; workbasket_name: string; module_code: string; is_active: boolean }

/** Country master (tb_country). */
export function useCountryOptions() {
  return useQuery({
    queryKey: ["tb_country", "list"],
    queryFn: async () => {
      const { data, error } = await sb.from("tb_country").select("code,description").order("description");
      if (error) throw error;
      return (data ?? []) as CountryOpt[];
    },
    staleTime: 30 * 60_000,
  });
}

/** Generic reference-value lookup from core_reference_group + core_reference_value. */
export function useReferenceValues(groupCode: string) {
  return useQuery({
    queryKey: ["core_reference_value", groupCode],
    queryFn: async () => {
      const { data: grp } = await sb.from("core_reference_group").select("id").eq("group_code", groupCode).maybeSingle();
      if (!grp?.id) return [] as RefOpt[];
      const { data, error } = await sb
        .from("core_reference_value")
        .select("value_code,value_label,sort_order,is_active")
        .eq("group_id", grp.id)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ code: r.value_code, label: r.value_label })) as RefOpt[];
    },
    staleTime: 30 * 60_000,
  });
}

export const useCurrencyOptions = () => useReferenceValues("CORE_CURRENCY");
export const useTimezoneOptions = () => useReferenceValues("CORE_TIMEZONE");
export const useLanguageOptions = () => useReferenceValues("CORE_LANGUAGE");

/** Team master (core_team). Optional module filter. */
export function useTeams(moduleCode?: string) {
  return useQuery({
    queryKey: ["core_team", "list", moduleCode ?? "all"],
    queryFn: async () => {
      let q = sb.from("core_team").select("id,team_code,team_name,module_code,is_active").eq("is_active", true).order("team_name");
      if (moduleCode) q = q.eq("module_code", moduleCode);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TeamOpt[];
    },
    staleTime: 5 * 60_000,
  });
}

/** Workbasket master (core_workbasket). Optional module filter. */
export function useWorkbaskets(moduleCode?: string) {
  return useQuery({
    queryKey: ["core_workbasket", "list", moduleCode ?? "all"],
    queryFn: async () => {
      let q = sb.from("core_workbasket").select("id,workbasket_code,workbasket_name,module_code,is_active").eq("is_active", true).order("workbasket_name");
      if (moduleCode) q = q.eq("module_code", moduleCode);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WorkbasketOpt[];
    },
    staleTime: 5 * 60_000,
  });
}

/** @deprecated kept for backward compatibility — prefer useCurrencyOptions(). */
export const CURRENCY_OPTIONS = [
  { code: "XCD", label: "XCD — East Caribbean Dollar" },
  { code: "USD", label: "USD — US Dollar" },
];
/** @deprecated */
export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
];
/** @deprecated */
export const TIMEZONE_OPTIONS = ["America/St_Kitts", "UTC"];
