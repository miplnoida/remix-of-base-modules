import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LgReportFilters {
  dateFrom?: string;
  dateTo?: string;
  territory?: string; // country_code
  officerId?: string;
  status?: string;
  stage?: string;
}

const inRange = (d: string | null | undefined, from?: string, to?: string) => {
  if (!d) return !from && !to;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

/** Fetch all cases + join lookup fields we need for reports. */
export function useLgReportCases(filters: LgReportFilters) {
  return useQuery({
    queryKey: ["lg-report-cases", filters],
    queryFn: async () => {
      let q = supabase.from("lg_case").select("*").order("opened_date", { ascending: false });
      if (filters.territory) q = q.eq("country_code", filters.territory);
      if (filters.officerId) q = q.eq("assigned_legal_officer_id", filters.officerId);
      if (filters.status) q = q.eq("status_code", filters.status);
      if (filters.stage) q = q.eq("current_stage_code", filters.stage);
      if (filters.dateFrom) q = q.gte("opened_date", filters.dateFrom);
      if (filters.dateTo) q = q.lte("opened_date", filters.dateTo);
      const { data, error } = await q.limit(1000);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useLgReportHearings(filters: LgReportFilters) {
  return useQuery({
    queryKey: ["lg-report-hearings", filters],
    queryFn: async () => {
      let q = supabase.from("lg_hearing").select("*, lg_case:lg_case_id(lg_case_no, country_code, assigned_legal_officer_id, status_code, current_stage_code)");
      if (filters.dateFrom) q = q.gte("scheduled_date", filters.dateFrom);
      if (filters.dateTo) q = q.lte("scheduled_date", filters.dateTo);
      const { data, error } = await q.limit(1000);
      if (error) throw error;
      let rows = data || [];
      if (filters.territory) rows = rows.filter((r: any) => r.lg_case?.country_code === filters.territory);
      if (filters.officerId) rows = rows.filter((r: any) => r.lg_case?.assigned_legal_officer_id === filters.officerId);
      if (filters.status) rows = rows.filter((r: any) => r.lg_case?.status_code === filters.status);
      return rows;
    },
    staleTime: 30_000,
  });
}

export function useLgReportOrders(filters: LgReportFilters) {
  return useQuery({
    queryKey: ["lg-report-orders", filters],
    queryFn: async () => {
      let q = supabase.from("lg_order").select("*, lg_case:lg_case_id(lg_case_no, country_code, assigned_legal_officer_id, status_code)");
      if (filters.dateFrom) q = q.gte("order_date", filters.dateFrom);
      if (filters.dateTo) q = q.lte("order_date", filters.dateTo);
      const { data, error } = await q.limit(1000);
      if (error) throw error;
      let rows = data || [];
      if (filters.territory) rows = rows.filter((r: any) => r.lg_case?.country_code === filters.territory);
      if (filters.officerId) rows = rows.filter((r: any) => r.lg_case?.assigned_legal_officer_id === filters.officerId);
      return rows;
    },
    staleTime: 30_000,
  });
}

export function useLgReportTasks(filters: LgReportFilters) {
  return useQuery({
    queryKey: ["lg-report-tasks", filters],
    queryFn: async () => {
      let q = supabase.from("lg_case_task").select("*, lg_case:lg_case_id(lg_case_no, country_code, assigned_legal_officer_id, status_code, current_stage_code)");
      if (filters.dateFrom) q = q.gte("due_date", filters.dateFrom);
      if (filters.dateTo) q = q.lte("due_date", filters.dateTo);
      const { data, error } = await q.limit(1000);
      if (error) throw error;
      let rows = data || [];
      if (filters.territory) rows = rows.filter((r: any) => r.lg_case?.country_code === filters.territory);
      if (filters.officerId) rows = rows.filter((r: any) => r.lg_case?.assigned_legal_officer_id === filters.officerId);
      if (filters.status) rows = rows.filter((r: any) => r.lg_case?.status_code === filters.status);
      return rows;
    },
    staleTime: 30_000,
  });
}

export function useLgReportIntake(filters: LgReportFilters) {
  return useQuery({
    queryKey: ["lg-report-intake", filters],
    queryFn: async () => {
      let q = supabase.from("lg_case_intake").select("*");
      if (filters.territory) q = q.eq("country_code", filters.territory);
      if (filters.dateFrom) q = q.gte("submitted_at", filters.dateFrom);
      if (filters.dateTo) q = q.lte("submitted_at", filters.dateTo);
      const { data, error } = await q.limit(1000);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useLgOfficers() {
  return useQuery({
    queryKey: ["lg-officers-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lg_staff").select("id, user_id, full_name, staff_role_code").order("full_name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useLgTerritories() {
  return useQuery({
    queryKey: ["lg-territories-report"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lg_case").select("country_code").not("country_code", "is", null).limit(1000);
      if (error) throw error;
      const uniq = Array.from(new Set((data || []).map((r: any) => r.country_code).filter(Boolean)));
      return uniq.sort();
    },
    staleTime: 5 * 60_000,
  });
}

/** Compute ageing bucket by opened_date. */
export function ageBucket(openedDate: string | null | undefined): string {
  if (!openedDate) return "Unknown";
  const days = Math.floor((Date.now() - new Date(openedDate).getTime()) / 86_400_000);
  if (days <= 30) return "0-30 days";
  if (days <= 60) return "31-60 days";
  if (days <= 90) return "61-90 days";
  if (days <= 180) return "91-180 days";
  if (days <= 365) return "181-365 days";
  return "> 365 days";
}

export const daysBetween = (a: string | null | undefined, b?: string): number => {
  if (!a) return 0;
  const end = b ? new Date(b).getTime() : Date.now();
  return Math.floor((end - new Date(a).getTime()) / 86_400_000);
};

export { inRange };
