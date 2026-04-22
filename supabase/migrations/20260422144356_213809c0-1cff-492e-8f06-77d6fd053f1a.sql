CREATE TABLE IF NOT EXISTS public.ce_planner_candidate_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  plan_id uuid NULL REFERENCES public.ce_weekly_plans(id) ON DELETE CASCADE,
  inspector_id uuid NULL REFERENCES public.ce_inspectors(id) ON DELETE SET NULL,
  week_start_date date NOT NULL,

  -- Candidate identity (employer + audit program is the dedupe key)
  employer_id text NOT NULL,
  audit_program text NULL,
  zone_id uuid NULL,

  -- Action
  action_type text NOT NULL CHECK (action_type IN (
    'pin','suppress','demote_watchlist','convert_exception',
    'merge_duplicate','recalc_request'
  )),
  reason text NULL,
  notes text NULL,

  -- Exception payload (only when action_type = 'convert_exception')
  exception_category text NULL CHECK (exception_category IS NULL OR exception_category IN (
    'urgent_enforcement','court_legal','management_instruction',
    'field_intelligence','external_meeting','admin_workload',
    'zone_campaign','other'
  )),
  exception_justification text NULL,
  requested_by_user_code varchar(50) NULL,
  approval_required boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'NOT_REQUIRED'
    CHECK (approval_status IN ('NOT_REQUIRED','PENDING','APPROVED','REJECTED')),
  approved_by_user_code varchar(50) NULL,
  approved_at timestamptz NULL,

  -- Linkage (best-effort)
  linked_case_id uuid NULL,
  linked_violation_id uuid NULL,
  linked_campaign_id uuid NULL,

  -- Capacity flag (advisory only — UI shows warning, no enforcement)
  capacity_impact_hours numeric(6,2) NOT NULL DEFAULT 0,
  displaces_candidate boolean NOT NULL DEFAULT false,

  -- Lifecycle
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(50) NULL,
  updated_by varchar(50) NULL
);

CREATE INDEX IF NOT EXISTS idx_ce_planner_actions_week_inspector
  ON public.ce_planner_candidate_actions (week_start_date, inspector_id, is_active);

CREATE INDEX IF NOT EXISTS idx_ce_planner_actions_employer_program
  ON public.ce_planner_candidate_actions (employer_id, audit_program, week_start_date);

CREATE OR REPLACE FUNCTION public.fn_ce_planner_candidate_actions_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_ce_planner_candidate_actions_touch
  ON public.ce_planner_candidate_actions;
CREATE TRIGGER trg_ce_planner_candidate_actions_touch
BEFORE UPDATE ON public.ce_planner_candidate_actions
FOR EACH ROW EXECUTE FUNCTION public.fn_ce_planner_candidate_actions_touch();