DROP INDEX IF EXISTS public.ce_weekly_plans_unique_active_per_week;

CREATE UNIQUE INDEX ce_weekly_plans_unique_active_per_week
  ON public.ce_weekly_plans (inspector_id, week_start_date)
  WHERE (
    is_current_version = true
    AND (status)::text NOT IN ('WITHDRAWN', 'SUPERSEDED')
  );