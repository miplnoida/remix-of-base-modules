-- Update the partial unique index to also allow SUPERSEDED plans to coexist with their successor revisions.
-- This unblocks the revision flow where vN (APPROVED -> SUPERSEDED) and vN+1 (DRAFT) share the same inspector + week.
DROP INDEX IF EXISTS public.ce_weekly_plans_unique_active_per_week;

CREATE UNIQUE INDEX ce_weekly_plans_unique_active_per_week
  ON public.ce_weekly_plans (inspector_id, week_start_date)
  WHERE ((status)::text NOT IN ('WITHDRAWN', 'SUPERSEDED'));