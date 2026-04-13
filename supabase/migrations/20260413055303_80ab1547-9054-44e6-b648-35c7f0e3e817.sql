-- ============================================
-- WP-2: Weekly Planning Enterprise Foundation
-- ============================================

-- 1. EXTEND ce_weekly_plans
ALTER TABLE public.ce_weekly_plans
  ADD COLUMN IF NOT EXISTS reviewer_id UUID,
  ADD COLUMN IF NOT EXISTS reviewer_comments TEXT,
  ADD COLUMN IF NOT EXISTS rejected_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carry_forward_from UUID REFERENCES public.ce_weekly_plans(id),
  ADD COLUMN IF NOT EXISTS narrative TEXT,
  ADD COLUMN IF NOT EXISTS outcome_narrative TEXT,
  ADD COLUMN IF NOT EXISTS outcome_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS outcome_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS outcome_reviewed_by VARCHAR,
  ADD COLUMN IF NOT EXISTS updated_by VARCHAR;

-- 2. CREATE ce_weekly_plan_items
CREATE TABLE IF NOT EXISTS public.ce_weekly_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.ce_weekly_plans(id) ON DELETE CASCADE,
  item_type VARCHAR NOT NULL DEFAULT 'EMPLOYER_VISIT',
  day_of_week VARCHAR,
  scheduled_date DATE,
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  duration VARCHAR,
  source_type VARCHAR,
  source_id UUID,
  source_ref VARCHAR,
  employer_id VARCHAR,
  employer_name VARCHAR,
  area_name VARCHAR,
  territory VARCHAR,
  scouting_type VARCHAR,
  scouting_confidence VARCHAR,
  visit_type VARCHAR,
  purpose TEXT,
  priority VARCHAR DEFAULT 'MEDIUM',
  recommendation_score NUMERIC(5,2),
  is_mandatory BOOLEAN DEFAULT false,
  execution_status VARCHAR NOT NULL DEFAULT 'PLANNED',
  check_in_time TIMESTAMPTZ,
  check_in_gps_lat NUMERIC(10,7),
  check_in_gps_lng NUMERIC(10,7),
  check_out_time TIMESTAMPTZ,
  check_out_gps_lat NUMERIC(10,7),
  check_out_gps_lng NUMERIC(10,7),
  outcome_notes TEXT,
  findings TEXT,
  rescheduled_to DATE,
  reschedule_reason TEXT,
  not_done_reason TEXT,
  carried_forward_to UUID,
  created_by VARCHAR,
  updated_by VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_wpi_plan_id ON public.ce_weekly_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_ce_wpi_scheduled_date ON public.ce_weekly_plan_items(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_ce_wpi_execution_status ON public.ce_weekly_plan_items(execution_status);
CREATE INDEX IF NOT EXISTS idx_ce_wpi_source ON public.ce_weekly_plan_items(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ce_wpi_employer ON public.ce_weekly_plan_items(employer_id);

ALTER TABLE public.ce_weekly_plan_items 
  ADD CONSTRAINT fk_ce_wpi_carried_forward 
  FOREIGN KEY (carried_forward_to) REFERENCES public.ce_weekly_plan_items(id);

-- 3. CREATE ce_weekly_plan_reviews
CREATE TABLE IF NOT EXISTS public.ce_weekly_plan_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.ce_weekly_plans(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  comments TEXT,
  performed_by VARCHAR NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_wpr_plan_id ON public.ce_weekly_plan_reviews(plan_id);

-- 4. CREATE ce_scouting_leads
CREATE TABLE IF NOT EXISTS public.ce_scouting_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_number VARCHAR NOT NULL UNIQUE,
  lead_type VARCHAR NOT NULL,
  business_name VARCHAR,
  location_description TEXT,
  territory VARCHAR,
  zone_id UUID REFERENCES public.ce_zones(id),
  estimated_employees INTEGER,
  activity_type VARCHAR,
  confidence_level VARCHAR DEFAULT 'MEDIUM',
  source VARCHAR,
  source_details TEXT,
  reported_by VARCHAR,
  reported_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR NOT NULL DEFAULT 'NEW',
  assigned_to_user_id VARCHAR,
  investigation_notes TEXT,
  linked_violation_id UUID REFERENCES public.ce_violations(id),
  linked_employer_id VARCHAR,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  created_by VARCHAR,
  updated_by VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_scouting_status ON public.ce_scouting_leads(status);
CREATE INDEX IF NOT EXISTS idx_ce_scouting_assigned ON public.ce_scouting_leads(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_ce_scouting_territory ON public.ce_scouting_leads(territory);

-- 5. CREATE ce_scouting_lead_history
CREATE TABLE IF NOT EXISTS public.ce_scouting_lead_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.ce_scouting_leads(id) ON DELETE CASCADE,
  old_status VARCHAR,
  new_status VARCHAR NOT NULL,
  changed_by VARCHAR NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_slh_lead_id ON public.ce_scouting_lead_history(lead_id);

-- 6. Triggers
CREATE OR REPLACE FUNCTION public.fn_ce_log_scouting_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ce_scouting_lead_history (lead_id, old_status, new_status, changed_by, change_reason)
    VALUES (NEW.id, OLD.status, NEW.status, COALESCE(NEW.updated_by, 'SYSTEM'), NULL);
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ce_scouting_lead_status
  BEFORE UPDATE ON public.ce_scouting_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_ce_log_scouting_status_change();

CREATE OR REPLACE FUNCTION public.fn_ce_update_plan_item_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ce_wpi_updated_at
  BEFORE UPDATE ON public.ce_weekly_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_ce_update_plan_item_timestamp();

-- 7. Candidate view with correct column types
CREATE OR REPLACE VIEW public.ce_v_weekly_plan_candidates AS

SELECT 
  'VIOLATION'::text AS source_type,
  v.id AS source_id,
  v.violation_number AS source_ref,
  v.employer_id,
  COALESCE(v.employer_name, em.name) AS employer_name,
  v.territory,
  v.priority,
  v.status AS source_status,
  v.total_amount AS financial_exposure,
  v.due_date::timestamptz AS due_date,
  v.assigned_to_user_id::text AS assigned_to_user_id,
  v.created_at AS source_created_at,
  ('Violation: ' || COALESCE(v.summary, v.violation_number))::text AS description
FROM public.ce_violations v
LEFT JOIN public.er_master em ON v.employer_id = em.regno
WHERE v.status IN ('OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED')

UNION ALL

SELECT
  'FOLLOW_UP'::text,
  fa.id,
  fa.id::text,
  fa.employer_id,
  fa.employer_name,
  NULL::varchar,
  fa.priority,
  fa.status,
  NULL::numeric,
  fa.due_date::timestamptz,
  fa.assigned_to_user_id::text,
  fa.created_at,
  ('Follow-up: ' || COALESCE(fa.action_type, '') || ' - ' || COALESCE(fa.description, ''))::text
FROM public.ce_follow_up_actions fa
WHERE fa.status IN ('PLANNED', 'SCHEDULED', 'OVERDUE')

UNION ALL

SELECT
  'SCOUTING_LEAD'::text,
  sl.id,
  sl.lead_number,
  sl.linked_employer_id,
  sl.business_name,
  sl.territory,
  sl.confidence_level,
  sl.status,
  NULL::numeric,
  NULL::timestamptz,
  sl.assigned_to_user_id::text,
  sl.created_at,
  ('Scouting: ' || COALESCE(sl.lead_type, '') || ' - ' || COALESCE(sl.business_name, sl.location_description, ''))::text
FROM public.ce_scouting_leads sl
WHERE sl.status IN ('NEW', 'UNDER_INVESTIGATION')

UNION ALL

SELECT
  'CASE'::text,
  c.id,
  c.case_number,
  c.employer_id,
  c.employer_name,
  NULL::varchar,
  c.priority,
  c.status,
  c.total_amount,
  NULL::timestamptz,
  c.assigned_officer_id::text,
  c.created_at,
  ('Case: ' || COALESCE(c.case_number, '') || ' - ' || COALESCE(c.summary, ''))::text
FROM public.ce_cases c
WHERE c.status IN ('ACTIVE', 'ESCALATED_LEGAL')

UNION ALL

SELECT
  'NOTICE'::text,
  n.id,
  n.notice_number,
  n.employer_id,
  n.employer_name,
  NULL::varchar,
  'MEDIUM'::varchar,
  n.status,
  NULL::numeric,
  n.due_response_date::timestamptz,
  NULL::text,
  n.created_at,
  ('Notice: ' || COALESCE(n.notice_number, '') || ' response due ' || COALESCE(n.due_response_date::text, 'N/A'))::text
FROM public.ce_notices n
WHERE n.status IN ('SENT', 'DELIVERED')
  AND n.due_response_date IS NOT NULL
  AND n.due_response_date >= CURRENT_DATE;

-- 8. Scoring function
CREATE OR REPLACE FUNCTION public.fn_ce_score_plan_candidate(
  p_source_type TEXT,
  p_priority TEXT DEFAULT 'MEDIUM',
  p_risk_band TEXT DEFAULT NULL,
  p_days_overdue INTEGER DEFAULT 0,
  p_overdue_followup_count INTEGER DEFAULT 0,
  p_notice_days_remaining INTEGER DEFAULT NULL,
  p_financial_exposure NUMERIC DEFAULT 0,
  p_prior_violation_count INTEGER DEFAULT 0,
  p_days_since_last_visit INTEGER DEFAULT NULL,
  p_is_same_zone BOOLEAN DEFAULT false,
  p_is_manager_flagged BOOLEAN DEFAULT false,
  p_scouting_confidence TEXT DEFAULT NULL
)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_score NUMERIC(5,2) := 0;
  v_sev NUMERIC; v_risk NUMERIC; v_over NUMERIC; v_fu NUMERIC;
  v_not NUMERIC; v_fin NUMERIC; v_rep NUMERIC; v_rec NUMERIC;
  v_zone NUMERIC; v_mgr NUMERIC; v_scout NUMERIC;
BEGIN
  v_sev := CASE UPPER(COALESCE(p_priority,''))
    WHEN 'CRITICAL' THEN 100 WHEN 'HIGH' THEN 75 WHEN 'MEDIUM' THEN 50 WHEN 'LOW' THEN 25 ELSE 40 END;
  v_risk := CASE UPPER(COALESCE(p_risk_band,''))
    WHEN 'CRITICAL' THEN 100 WHEN 'HIGH' THEN 75 WHEN 'MEDIUM' THEN 50 WHEN 'LOW' THEN 25 ELSE 30 END;
  v_over := CASE
    WHEN p_days_overdue > 90 THEN 100 WHEN p_days_overdue > 60 THEN 75
    WHEN p_days_overdue > 30 THEN 50 WHEN p_days_overdue > 14 THEN 25 ELSE 0 END;
  v_fu := LEAST(p_overdue_followup_count * 20, 100);
  v_not := CASE
    WHEN p_notice_days_remaining IS NULL THEN 0
    WHEN p_notice_days_remaining <= 3 THEN 100 WHEN p_notice_days_remaining <= 7 THEN 75
    WHEN p_notice_days_remaining <= 14 THEN 50 ELSE 0 END;
  v_fin := CASE
    WHEN p_financial_exposure > 50000 THEN 100 WHEN p_financial_exposure > 20000 THEN 75
    WHEN p_financial_exposure > 10000 THEN 50 WHEN p_financial_exposure > 5000 THEN 25 ELSE 0 END;
  v_rep := LEAST(p_prior_violation_count * 15, 100);
  v_rec := CASE
    WHEN p_days_since_last_visit IS NULL THEN 50
    WHEN p_days_since_last_visit > 180 THEN 100 WHEN p_days_since_last_visit > 90 THEN 75
    WHEN p_days_since_last_visit > 60 THEN 50 ELSE 0 END;
  v_zone := CASE WHEN p_is_same_zone THEN 100 ELSE 0 END;
  v_mgr := CASE WHEN p_is_manager_flagged THEN 100 ELSE 0 END;
  v_scout := CASE UPPER(COALESCE(p_scouting_confidence,''))
    WHEN 'HIGH' THEN 100 WHEN 'MEDIUM' THEN 60 WHEN 'LOW' THEN 30 ELSE 0 END;

  v_score := (v_sev*0.20)+(v_risk*0.15)+(v_over*0.15)+(v_fu*0.10)
           +(v_not*0.10)+(v_fin*0.10)+(v_rep*0.05)+(v_rec*0.05)
           +(v_zone*0.05)+(v_mgr*0.03)+(v_scout*0.02);

  RETURN ROUND(v_score, 2);
END;
$$;