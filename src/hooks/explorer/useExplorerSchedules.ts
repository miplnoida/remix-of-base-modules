import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExplorerViewState } from "@/components/explorer/types";

export interface ExplorerSchedule {
  id: string;
  dataset_key: string;
  saved_view_id: string | null;
  name: string;
  view_state: ExplorerViewState;
  cadence: "daily" | "weekly" | "monthly";
  day_of_week: number | null;
  day_of_month: number | null;
  hour_utc: number;
  format: "excel" | "pdf" | "csv" | "html";
  recipients: string[];
  subject: string | null;
  message: string | null;
  active: boolean;
  last_run_at: string | null;
  last_run_status: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useExplorerSchedules(datasetKey: string) {
  return useQuery({
    queryKey: ["explorer-schedules", datasetKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("explorer_schedule")
        .select("*")
        .eq("dataset_key", datasetKey)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ExplorerSchedule[];
    },
  });
}

function nextRunAt(cadence: string, dayOfWeek: number | null, dayOfMonth: number | null, hourUtc: number): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hourUtc, 0, 0));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  if (cadence === "weekly" && dayOfWeek != null) {
    const delta = (dayOfWeek - next.getUTCDay() + 7) % 7;
    next.setUTCDate(next.getUTCDate() + delta);
  } else if (cadence === "monthly" && dayOfMonth != null) {
    next.setUTCDate(dayOfMonth);
    if (next <= now) next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next.toISOString();
}

export function useSaveExplorerSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<ExplorerSchedule> & { dataset_key: string; name: string; view_state: ExplorerViewState; recipients: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        dataset_key: s.dataset_key,
        saved_view_id: s.saved_view_id ?? null,
        name: s.name,
        view_state: s.view_state as any,
        cadence: s.cadence ?? "weekly",
        day_of_week: s.day_of_week ?? null,
        day_of_month: s.day_of_month ?? null,
        hour_utc: s.hour_utc ?? 6,
        format: s.format ?? "excel",
        recipients: s.recipients,
        subject: s.subject ?? null,
        message: s.message ?? null,
        active: s.active ?? true,
        next_run_at: nextRunAt(s.cadence ?? "weekly", s.day_of_week ?? null, s.day_of_month ?? null, s.hour_utc ?? 6),
        updated_by: (user?.user_metadata?.user_code as string) ?? null,
      };
      if (s.id) {
        const { error } = await (supabase as any).from("explorer_schedule").update(payload).eq("id", s.id);
        if (error) throw error;
        return s.id;
      }
      payload.created_by = payload.updated_by;
      const { data, error } = await (supabase as any).from("explorer_schedule").insert(payload).select("id").single();
      if (error) throw error;
      return data?.id as string;
    },
    onSuccess: (_id, vars) => qc.invalidateQueries({ queryKey: ["explorer-schedules", vars.dataset_key] }),
  });
}

export function useDeleteExplorerSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dataset_key }: { id: string; dataset_key: string }) => {
      const { error } = await (supabase as any).from("explorer_schedule").delete().eq("id", id);
      if (error) throw error;
      return { id, dataset_key };
    },
    onSuccess: (r) => qc.invalidateQueries({ queryKey: ["explorer-schedules", r.dataset_key] }),
  });
}
