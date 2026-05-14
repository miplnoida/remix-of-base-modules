-- ============================================================
-- PHASE 2 — Smarter, zone-aware, explainable scoring wrapper
-- Pure addition. No existing object is altered.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_ce_score_candidates_v3(
  p_zone_id      uuid    DEFAULT NULL,
  p_inspector_id uuid    DEFAULT NULL,
  p_limit        integer DEFAULT 200
)
RETURNS TABLE (
  employer_id              text,
  employer_name            text,
  territory                text,
  zone_id                  uuid,
  candidate_source         text,
  candidate_reason         text,
  derived_priority         text,
  risk_band                text,
  risk_score               numeric,
  days_since_last_inspection integer,
  open_violation_count     bigint,
  escalated_violation_count bigint,
  overdue_followup_count   bigint,
  financial_exposure       numeric,
  notice_days_remaining    integer,
  any_breach_detected      boolean,
  carry_forward_count      bigint,
  audit_cycle_due_date     date,
  cycle_overdue_days       integer,
  is_cycle_overdue         boolean,
  recommendation_score     numeric,
  recommendation_reasons   jsonb
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_inspector_zone uuid;
BEGIN
  -- Resolve the inspector's primary zone if zone wasn't explicitly given
  IF p_zone_id IS NULL AND p_inspector_id IS NOT NULL THEN
    SELECT primary_zone_id INTO v_inspector_zone
      FROM public.ce_inspectors
     WHERE id = p_inspector_id;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      c.*,
      rp.zone_id          AS rp_zone_id,
      rp.next_review_date AS rp_next_review,
      rp.last_inspected_at AS rp_last_inspected,
      CASE
        WHEN rp.next_review_date IS NULL THEN 0
        ELSE GREATEST(0, (CURRENT_DATE - rp.next_review_date))
      END AS rp_overdue_days
    FROM public.ce_v_plan_candidates_v2 c
    LEFT JOIN public.ce_risk_profiles rp
      ON rp.employer_id = c.employer_id
  ),
  filtered AS (
    SELECT *
    FROM base
    WHERE
      -- Zone filter: explicit > inspector-derived > none
      ( COALESCE(p_zone_id, v_inspector_zone) IS NULL
        OR rp_zone_id = COALESCE(p_zone_id, v_inspector_zone) )
  ),
  scored AS (
    SELECT
      f.*,
      -- Same-zone signal for the existing scorer
      (f.rp_zone_id IS NOT NULL
        AND f.rp_zone_id = COALESCE(p_zone_id, v_inspector_zone)) AS is_same_zone,
      public.fn_ce_score_plan_candidate(
        p_source_type            := f.candidate_source,
        p_priority               := f.derived_priority,
        p_risk_band              := f.risk_band,
        p_days_overdue           := GREATEST(0, COALESCE(f.days_since_last_inspection, 0)),
        p_overdue_followup_count := COALESCE(f.overdue_followup_count, 0)::int,
        p_notice_days_remaining  := f.notice_days_remaining,
        p_financial_exposure     := COALESCE(f.financial_exposure, 0),
        p_prior_violation_count  := COALESCE(f.open_violation_count, 0)::int,
        p_days_since_last_visit  := f.days_since_last_inspection,
        p_is_same_zone           := (f.rp_zone_id IS NOT NULL
                                     AND f.rp_zone_id = COALESCE(p_zone_id, v_inspector_zone)),
        p_is_manager_flagged     := false,
        p_scouting_confidence    := CASE WHEN f.candidate_source = 'SCOUTING_LEAD'
                                         THEN f.derived_priority ELSE NULL END
      ) AS base_score
    FROM filtered f
  )
  SELECT
    s.employer_id::text,
    s.employer_name::text,
    s.territory::text,
    s.rp_zone_id,
    s.candidate_source::text,
    s.candidate_reason::text,
    s.derived_priority::text,
    s.risk_band::text,
    s.risk_score,
    s.days_since_last_inspection,
    s.open_violation_count,
    s.escalated_violation_count,
    s.overdue_followup_count,
    s.financial_exposure,
    s.notice_days_remaining,
    s.any_breach_detected,
    s.carry_forward_count,
    s.rp_next_review                                       AS audit_cycle_due_date,
    s.rp_overdue_days                                      AS cycle_overdue_days,
    (s.rp_overdue_days > 0)                                AS is_cycle_overdue,
    -- Final score = base + audit-cycle boost (capped at 100)
    LEAST(100,
      s.base_score
      + CASE
          WHEN s.rp_overdue_days >= 60 THEN 15
          WHEN s.rp_overdue_days >= 30 THEN 10
          WHEN s.rp_overdue_days > 0   THEN  5
          ELSE 0
        END
    )                                                       AS recommendation_score,
    -- Explainability: only include reasons that actually fired
    (
      SELECT jsonb_agg(elem ORDER BY (elem->>'weight')::int DESC)
      FROM (
        SELECT jsonb_build_object(
                 'code','RISK_BAND','label','Risk band: '|| COALESCE(s.risk_band,'UNRATED'),
                 'weight', CASE UPPER(COALESCE(s.risk_band,''))
                             WHEN 'CRITICAL' THEN 30 WHEN 'HIGH' THEN 22
                             WHEN 'MEDIUM' THEN 12 WHEN 'LOW' THEN 6 ELSE 5 END,
                 'detail', 'Composite risk score '|| COALESCE(s.risk_score::text,'n/a')
               ) AS elem
        WHERE s.risk_band IS NOT NULL
        UNION ALL
        SELECT jsonb_build_object(
                 'code','CYCLE_OVERDUE','label','Audit cycle overdue',
                 'weight', CASE WHEN s.rp_overdue_days >= 60 THEN 30
                                WHEN s.rp_overdue_days >= 30 THEN 20
                                ELSE 10 END,
                 'detail', s.rp_overdue_days::text || ' day(s) past due review on '||
                           COALESCE(s.rp_next_review::text,'n/a')
               )
        WHERE s.rp_overdue_days > 0
        UNION ALL
        SELECT jsonb_build_object(
                 'code','ESCALATED_VIOLATION','label','Escalated violation(s)',
                 'weight',28,
                 'detail', s.escalated_violation_count::text ||' escalated open violation(s)'
               )
        WHERE COALESCE(s.escalated_violation_count,0) > 0
        UNION ALL
        SELECT jsonb_build_object(
                 'code','OPEN_VIOLATIONS','label','Open violations',
                 'weight',16,
                 'detail', s.open_violation_count::text ||' open violation(s)'
               )
        WHERE COALESCE(s.open_violation_count,0) > 0
        UNION ALL
        SELECT jsonb_build_object(
                 'code','OVERDUE_FOLLOWUP','label','Overdue follow-ups',
                 'weight',18,
                 'detail', s.overdue_followup_count::text ||' overdue follow-up(s)'
               )
        WHERE COALESCE(s.overdue_followup_count,0) > 0
        UNION ALL
        SELECT jsonb_build_object(
                 'code','NOTICE_RESPONSE','label','Notice response window closing',
                 'weight', CASE WHEN s.notice_days_remaining <= 3 THEN 26
                                WHEN s.notice_days_remaining <= 7 THEN 18 ELSE 10 END,
                 'detail', s.notice_days_remaining::text ||' day(s) remaining'
               )
        WHERE s.notice_days_remaining IS NOT NULL AND s.notice_days_remaining <= 14
        UNION ALL
        SELECT jsonb_build_object(
                 'code','FINANCIAL_EXPOSURE','label','High financial exposure',
                 'weight', CASE WHEN s.financial_exposure > 50000 THEN 22
                                WHEN s.financial_exposure > 20000 THEN 16
                                WHEN s.financial_exposure > 10000 THEN 10 ELSE 6 END,
                 'detail', '$'|| to_char(COALESCE(s.financial_exposure,0),'FM999,999,990')
               )
        WHERE COALESCE(s.financial_exposure,0) > 5000
        UNION ALL
        SELECT jsonb_build_object(
                 'code','BREACH','label','Arrangement breach detected',
                 'weight',24,
                 'detail','Payment arrangement in default'
               )
        WHERE s.any_breach_detected = true
        UNION ALL
        SELECT jsonb_build_object(
                 'code','CARRY_FORWARD','label','Carried forward from prior week',
                 'weight',12,
                 'detail', s.carry_forward_count::text ||' carry-forward item(s)'
               )
        WHERE COALESCE(s.carry_forward_count,0) > 0
        UNION ALL
        SELECT jsonb_build_object(
                 'code','NO_RECENT_VISIT','label','No recent inspection',
                 'weight', CASE WHEN s.days_since_last_inspection > 180 THEN 18
                                WHEN s.days_since_last_inspection > 90 THEN 12 ELSE 6 END,
                 'detail', s.days_since_last_inspection::text ||' day(s) since last visit'
               )
        WHERE s.days_since_last_inspection IS NOT NULL AND s.days_since_last_inspection > 60
        UNION ALL
        SELECT jsonb_build_object(
                 'code','SAME_ZONE','label','In your assigned zone',
                 'weight',8,
                 'detail','Reduces travel time'
               )
        WHERE s.is_same_zone = true
      ) reasons
    ) AS recommendation_reasons
  FROM scored s
  ORDER BY recommendation_score DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.fn_ce_score_candidates_v3 IS
'Phase 2: zone-aware, audit-cycle-aware, explainable candidate scoring. Wraps fn_ce_score_plan_candidate without modifying it. Use p_zone_id or p_inspector_id to enforce zone visibility server-side.';