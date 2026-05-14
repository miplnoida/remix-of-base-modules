
-- ============================================================
-- PHASE 2: Audit Priority Scoring + Weights
-- ============================================================

-- 1) Configurable weights table for the audit-priority model
CREATE TABLE IF NOT EXISTS public.ce_audit_priority_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  weight_pct numeric(5,2) NOT NULL CHECK (weight_pct >= 0 AND weight_pct <= 100),
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(50),
  updated_by varchar(50)
);

INSERT INTO public.ce_audit_priority_weights (weight_key, label, description, weight_pct, sort_order)
VALUES
  ('INHERENT_RISK',       'Inherent Employer Risk',  'Long-term employer risk profile (risk band & score)', 25.00, 1),
  ('TRIGGER_URGENCY',     'Trigger Urgency',         'Open violations, escalations, breaches, complaints',  25.00, 2),
  ('AUDIT_DUENESS',       'Audit Due-ness / Cycle',  'Cycle overdue or upcoming audit due date',            20.00, 3),
  ('ENFORCEMENT_STAGE',   'Enforcement / Case',      'Active cases, legal stage, post-enforcement recheck', 15.00, 4),
  ('FOLLOW_UP_AGING',     'Follow-up / Carry Forward','Overdue follow-ups and carry-forward items',         10.00, 5),
  ('OPERATIONAL_FIT',     'Operational Fit / Zone',  'Zone clustering and travel-efficiency boost',          5.00, 6)
ON CONFLICT (weight_key) DO NOTHING;

-- Touch trigger
CREATE OR REPLACE FUNCTION public.fn_ce_audit_priority_weights_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_ce_audit_priority_weights_touch ON public.ce_audit_priority_weights;
CREATE TRIGGER trg_ce_audit_priority_weights_touch
BEFORE UPDATE ON public.ce_audit_priority_weights
FOR EACH ROW EXECUTE FUNCTION public.fn_ce_audit_priority_weights_touch();

-- 2) Replace fn_ce_score_candidates_v3 with extended output
DROP FUNCTION IF EXISTS public.fn_ce_score_candidates_v3(uuid, uuid, integer);

CREATE OR REPLACE FUNCTION public.fn_ce_score_candidates_v3(
  p_zone_id uuid DEFAULT NULL,
  p_inspector_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 200
)
RETURNS TABLE(
  employer_id text,
  employer_name text,
  territory text,
  zone_id uuid,
  audit_program text,
  candidate_source text,
  candidate_reason text,
  derived_priority text,
  risk_band text,
  risk_score numeric,
  inherent_risk_score numeric,
  audit_priority_score numeric,
  days_since_last_inspection integer,
  last_audit_date date,
  next_due_date date,
  overdue_days integer,
  open_violation_count bigint,
  escalated_violation_count bigint,
  overdue_followup_count bigint,
  violation_count bigint,
  case_count bigint,
  financial_exposure numeric,
  notice_days_remaining integer,
  any_breach_detected boolean,
  carry_forward_count bigint,
  audit_cycle_due_date date,
  cycle_overdue_days integer,
  is_cycle_overdue boolean,
  recommendation_score numeric,
  recommendation_reasons jsonb,
  why_selected text
)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_inspector_zone uuid;
  -- weights (resolved once; default to spec if row missing/disabled)
  w_inherent      numeric := 25;
  w_trigger       numeric := 25;
  w_dueness       numeric := 20;
  w_enforcement   numeric := 15;
  w_followup      numeric := 10;
  w_opfit         numeric := 5;
BEGIN
  IF p_zone_id IS NULL AND p_inspector_id IS NOT NULL THEN
    SELECT primary_zone_id INTO v_inspector_zone
      FROM public.ce_inspectors WHERE id = p_inspector_id;
  END IF;

  -- Load weights (only enabled ones)
  SELECT COALESCE(MAX(CASE WHEN weight_key='INHERENT_RISK'     THEN weight_pct END), w_inherent),
         COALESCE(MAX(CASE WHEN weight_key='TRIGGER_URGENCY'   THEN weight_pct END), w_trigger),
         COALESCE(MAX(CASE WHEN weight_key='AUDIT_DUENESS'     THEN weight_pct END), w_dueness),
         COALESCE(MAX(CASE WHEN weight_key='ENFORCEMENT_STAGE' THEN weight_pct END), w_enforcement),
         COALESCE(MAX(CASE WHEN weight_key='FOLLOW_UP_AGING'   THEN weight_pct END), w_followup),
         COALESCE(MAX(CASE WHEN weight_key='OPERATIONAL_FIT'   THEN weight_pct END), w_opfit)
    INTO w_inherent, w_trigger, w_dueness, w_enforcement, w_followup, w_opfit
    FROM public.ce_audit_priority_weights
   WHERE enabled = true;

  RETURN QUERY
  WITH base AS (
    SELECT
      c.*,
      rp.zone_id              AS rp_zone_id,
      rp.next_review_date     AS rp_next_review,
      rp.last_inspected_at    AS rp_last_inspected,
      rp.last_audit_date      AS rp_last_audit_date,
      rp.next_audit_due_date  AS rp_next_audit_due,
      rp.overdue_audit_days   AS rp_overdue_audit_days,
      rp.audit_program        AS rp_audit_program,
      rp.consecutive_cycles_skipped AS rp_skipped,
      CASE
        WHEN rp.next_audit_due_date IS NOT NULL
          THEN GREATEST(0, (CURRENT_DATE - rp.next_audit_due_date))
        WHEN rp.next_review_date IS NOT NULL
          THEN GREATEST(0, (CURRENT_DATE - rp.next_review_date))
        ELSE 0
      END AS rp_overdue_days,
      (SELECT COUNT(*) FROM public.ce_cases cs
        WHERE cs.employer_id = c.employer_id
          AND COALESCE(cs.status,'') NOT IN ('CLOSED','RESOLVED','WITHDRAWN')) AS case_cnt
    FROM public.ce_v_plan_candidates_v2 c
    LEFT JOIN public.ce_risk_profiles rp ON rp.employer_id = c.employer_id
  ),
  filtered AS (
    SELECT * FROM base
     WHERE (p_zone_id IS NULL AND v_inspector_zone IS NULL)
        OR (p_zone_id IS NOT NULL AND rp_zone_id = p_zone_id)
        OR (v_inspector_zone IS NOT NULL AND rp_zone_id = v_inspector_zone)
  ),
  scored AS (
    SELECT
      f.*,
      -- Inherent risk: normalize risk_score (assume 0..100) blended with band
      LEAST(100, COALESCE(f.risk_score, 0)) AS s_inherent,

      -- Trigger urgency 0..100
      LEAST(100,
        (COALESCE(f.escalated_violation_count,0) * 25)
      + (COALESCE(f.open_violation_count,0) * 6)
      + (CASE WHEN f.any_breach_detected THEN 20 ELSE 0 END)
      + (CASE WHEN COALESCE(f.notice_days_remaining,99) <= 3 THEN 25
              WHEN COALESCE(f.notice_days_remaining,99) <= 7 THEN 15 ELSE 0 END)
      ) AS s_trigger,

      -- Audit due-ness 0..100
      LEAST(100,
        (CASE WHEN f.rp_overdue_days > 0
              THEN LEAST(60, f.rp_overdue_days)            -- 1pt/day cap 60
              ELSE 0 END)
      + (COALESCE(f.rp_skipped,0) * 20)                     -- 20 per skipped cycle
      + (CASE WHEN f.rp_next_audit_due IS NOT NULL
                AND f.rp_next_audit_due <= (CURRENT_DATE + INTERVAL '14 day')
              THEN 20 ELSE 0 END)
      ) AS s_dueness,

      -- Enforcement / case stage 0..100
      LEAST(100,
        (f.case_cnt * 20)
      + (CASE WHEN COALESCE(f.financial_exposure,0) > 50000 THEN 30
              WHEN COALESCE(f.financial_exposure,0) > 10000 THEN 15
              WHEN COALESCE(f.financial_exposure,0) > 0     THEN 5 ELSE 0 END)
      ) AS s_enforcement,

      -- Follow-up aging / carry-forward 0..100
      LEAST(100,
        (COALESCE(f.overdue_followup_count,0) * 15)
      + (COALESCE(f.carry_forward_count,0) * 10)
      ) AS s_followup,

      -- Operational fit (zone match boost) 0..100
      CASE
        WHEN p_zone_id IS NOT NULL AND f.rp_zone_id = p_zone_id THEN 100
        WHEN v_inspector_zone IS NOT NULL AND f.rp_zone_id = v_inspector_zone THEN 100
        WHEN f.rp_zone_id IS NOT NULL THEN 40
        ELSE 0
      END AS s_opfit
    FROM filtered f
  ),
  ranked AS (
    SELECT
      s.*,
      -- Audit priority blended 0..100
      ROUND(
          (s.s_inherent    * w_inherent
         + s.s_trigger     * w_trigger
         + s.s_dueness     * w_dueness
         + s.s_enforcement * w_enforcement
         + s.s_followup    * w_followup
         + s.s_opfit       * w_opfit) / NULLIF(w_inherent+w_trigger+w_dueness+w_enforcement+w_followup+w_opfit, 0)
      , 2) AS audit_priority,

      -- Override candidate_reason with richer codes when applicable
      CASE
        WHEN s.any_breach_detected
             OR (s.candidate_reason IN ('ARRANGEMENT_DEFAULT','ARRANGEMENT_AT_RISK'))
          THEN 'ARRANGEMENT_BREACH'
        WHEN s.case_cnt > 0 AND s.escalated_violation_count > 0
          THEN 'LEGAL_STAGE_TRIGGER'
        WHEN s.case_cnt > 0
          THEN 'POST_ENFORCEMENT_RECHECK'
        WHEN s.rp_overdue_days > 0 OR COALESCE(s.rp_skipped,0) > 0
          THEN 'ROUTINE_CYCLE_DUE'
        WHEN s.risk_band IN ('HIGH','CRITICAL') AND COALESCE(s.days_since_last_inspection, 9999) > 180
          THEN 'MANDATORY_HIGH_RISK_REVIEW'
        ELSE s.candidate_reason
      END AS reason_v3
    FROM scored s
  ),
  with_reasons AS (
    SELECT
      r.*,
      jsonb_strip_nulls(jsonb_build_array(
        CASE WHEN r.s_inherent    > 0 THEN jsonb_build_object('code','INHERENT_RISK','label','Inherent risk',           'weight', r.s_inherent)    END,
        CASE WHEN r.s_trigger     > 0 THEN jsonb_build_object('code','TRIGGER_URGENCY','label','Active triggers',       'weight', r.s_trigger)     END,
        CASE WHEN r.s_dueness     > 0 THEN jsonb_build_object('code','AUDIT_DUENESS','label','Audit due / overdue',     'weight', r.s_dueness)     END,
        CASE WHEN r.s_enforcement > 0 THEN jsonb_build_object('code','ENFORCEMENT_STAGE','label','Enforcement / cases', 'weight', r.s_enforcement) END,
        CASE WHEN r.s_followup    > 0 THEN jsonb_build_object('code','FOLLOW_UP_AGING','label','Follow-up / carry fwd', 'weight', r.s_followup)    END,
        CASE WHEN r.s_opfit       > 0 THEN jsonb_build_object('code','OPERATIONAL_FIT','label','Zone fit',              'weight', r.s_opfit)       END
      )) AS reasons_json,
      -- Build why_selected one-liner
      CONCAT_WS(' • ',
        NULLIF(CASE WHEN r.risk_band IS NOT NULL THEN r.risk_band || ' risk' END,''),
        NULLIF(CASE WHEN r.rp_overdue_days > 0 THEN r.rp_overdue_days || 'd overdue' END,''),
        NULLIF(CASE WHEN r.open_violation_count > 0 THEN r.open_violation_count || ' open viol.' END,''),
        NULLIF(CASE WHEN r.case_cnt > 0 THEN r.case_cnt || ' active case(s)' END,''),
        NULLIF(CASE WHEN r.any_breach_detected THEN 'arrangement breach' END,''),
        NULLIF(CASE WHEN r.notice_days_remaining IS NOT NULL AND r.notice_days_remaining <= 7 THEN 'notice in ' || r.notice_days_remaining || 'd' END,'')
      ) AS why_line
    FROM ranked r
  )
  SELECT
    w.employer_id::text,
    w.employer_name::text,
    w.territory::text,
    w.rp_zone_id,
    w.rp_audit_program::text,
    w.candidate_source::text,
    w.reason_v3::text,
    w.derived_priority::text,
    w.risk_band::text,
    w.risk_score,
    w.s_inherent      AS inherent_risk_score,
    w.audit_priority  AS audit_priority_score,
    w.days_since_last_inspection,
    w.rp_last_audit_date,
    w.rp_next_audit_due,
    w.rp_overdue_days::int,
    w.open_violation_count,
    w.escalated_violation_count,
    w.overdue_followup_count,
    w.open_violation_count AS violation_count,
    w.case_cnt::bigint     AS case_count,
    w.financial_exposure,
    w.notice_days_remaining,
    w.any_breach_detected,
    w.carry_forward_count,
    w.rp_next_review                    AS audit_cycle_due_date,
    w.rp_overdue_days::int              AS cycle_overdue_days,
    (w.rp_overdue_days > 0)             AS is_cycle_overdue,
    w.audit_priority                    AS recommendation_score,
    w.reasons_json                      AS recommendation_reasons,
    w.why_line                          AS why_selected
  FROM with_reasons w
  ORDER BY w.audit_priority DESC NULLS LAST, w.s_trigger DESC, w.s_dueness DESC
  LIMIT p_limit;
END
$function$;
