
-- 1) Extend action_type check to include the new nomination type
ALTER TABLE public.ce_planner_candidate_actions
  DROP CONSTRAINT IF EXISTS ce_planner_candidate_actions_action_type_check;

ALTER TABLE public.ce_planner_candidate_actions
  ADD CONSTRAINT ce_planner_candidate_actions_action_type_check
  CHECK (action_type = ANY (ARRAY[
    'pin','suppress','demote_watchlist','convert_exception',
    'merge_duplicate','recalc_request','nominate_for_planning'
  ]));

-- 2) Prevent duplicate active nominations for the same case/employer/officer/week
CREATE UNIQUE INDEX IF NOT EXISTS ux_ce_planner_actions_active_nomination
  ON public.ce_planner_candidate_actions (
    COALESCE(linked_case_id::text, ''),
    employer_id,
    COALESCE(requested_by_user_code, ''),
    week_start_date
  )
  WHERE action_type = 'nominate_for_planning' AND is_active = true;

-- 3) View: officer nominations not yet consumed by a weekly plan item
CREATE OR REPLACE VIEW public.ce_v_pending_case_nominations
WITH (security_invoker = true) AS
SELECT
  a.id                       AS nomination_id,
  a.linked_case_id           AS case_id,
  a.employer_id,
  a.week_start_date,
  a.requested_by_user_code   AS officer_user_code,
  a.reason,
  a.notes,
  a.created_at,
  c.case_number,
  c.employer_name,
  c.risk_band,
  c.fund_type
FROM public.ce_planner_candidate_actions a
LEFT JOIN public.ce_cases c ON c.id = a.linked_case_id
WHERE a.action_type = 'nominate_for_planning'
  AND a.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.ce_weekly_plan_items i
    JOIN public.ce_weekly_plans p ON p.id = i.plan_id
    WHERE p.week_start_date = a.week_start_date
      AND p.created_by = a.requested_by_user_code
      AND i.employer_id = a.employer_id
      AND i.source_type = 'MANUAL_CASE_NOMINATION'
      AND COALESCE(i.source_id, '') = a.id::text
  );

GRANT SELECT ON public.ce_v_pending_case_nominations TO authenticated;
