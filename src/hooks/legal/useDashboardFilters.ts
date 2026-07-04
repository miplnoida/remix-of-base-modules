/**
 * EPIC-09C Parts 2 & 3 — Global Dashboard Filters
 *
 * Central store of dashboard/report filters that reads and writes
 * URL query-string so every drilldown and refresh keeps state.
 * Every dashboard widget and report page reads from the same source.
 */
import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  matterType?: string;
  courtId?: string;
  judgeId?: string;
  fundCode?: string;
  employerId?: string;
  officerId?: string;
  counselId?: string;
  status?: string;
  priority?: string;
  territory?: string;
  riskRating?: string;
  recoveryStage?: string;
  consentStatus?: string;
  today?: string;
  view?: string;
  cat?: string;
}

const FIELD_KEYS: Array<keyof DashboardFilters> = [
  "dateFrom", "dateTo", "matterType", "courtId", "judgeId", "fundCode",
  "employerId", "officerId", "counselId", "status", "priority", "territory",
  "riskRating", "recoveryStage", "consentStatus", "today", "view", "cat",
];

export function useDashboardFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<DashboardFilters>(() => {
    const out: DashboardFilters = {};
    for (const k of FIELD_KEYS) {
      const v = params.get(k);
      if (v != null && v !== "") (out as any)[k] = v;
    }
    return out;
  }, [params]);

  const patch = useCallback((updates: Partial<DashboardFilters>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, String(v));
    }
    setParams(next, { replace: true });
  }, [params, setParams]);

  const reset = useCallback(() => {
    const next = new URLSearchParams(params);
    for (const k of FIELD_KEYS) next.delete(k);
    setParams(next, { replace: true });
  }, [params, setParams]);

  const chips = useMemo(
    () => Object.entries(filters).filter(([, v]) => v != null && v !== "") as Array<[keyof DashboardFilters, string]>,
    [filters],
  );

  return { filters, patch, reset, chips };
}
