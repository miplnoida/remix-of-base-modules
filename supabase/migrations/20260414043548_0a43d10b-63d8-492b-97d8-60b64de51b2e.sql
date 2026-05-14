
-- ============================================================
-- STEP 1: Employer Fact View
-- One row per active employer with all planning-relevant signals
-- ============================================================
CREATE OR REPLACE VIEW public.ce_v_plan_employer_facts AS
SELECT
  em.regno AS employer_id,
  em.name  AS employer_name,
  em.village_code AS territory,

  -- Risk profile
  rp.risk_band,
  rp.total_score      AS risk_score,
  rp.arrears_score,
  rp.violation_score   AS risk_violation_score,
  rp.filing_score,
  rp.payment_behavior_score,
  rp.enforcement_risk_score,

  -- Inspection / visit recency
  insp.last_inspection_date,
  insp.last_inspection_type,
  EXTRACT(DAY FROM NOW() - insp.last_inspection_date::timestamp)::int
    AS days_since_last_inspection,

  -- Violation signals
  COALESCE(viol.open_violation_count, 0)      AS open_violation_count,
  COALESCE(viol.escalated_violation_count, 0)  AS escalated_violation_count,
  viol.oldest_open_violation_date,
  EXTRACT(DAY FROM NOW() - viol.oldest_open_violation_date)::int
    AS days_oldest_violation,
  COALESCE(viol.total_violation_exposure, 0)   AS total_violation_exposure,

  -- Follow-up signals
  COALESCE(fu.overdue_followup_count, 0)  AS overdue_followup_count,
  COALESCE(fu.planned_followup_count, 0)  AS planned_followup_count,
  fu.oldest_overdue_followup_date,

  -- Notice signals
  COALESCE(ntc.pending_notice_count, 0)   AS pending_notice_count,
  ntc.nearest_response_due,
  EXTRACT(DAY FROM ntc.nearest_response_due - NOW())::int
    AS notice_days_remaining,

  -- Arrangement signals
  COALESCE(arr.active_arrangement_count, 0)      AS active_arrangement_count,
  COALESCE(arr.breached_arrangement_count, 0)     AS breached_arrangement_count,
  COALESCE(arr.total_arrangement_outstanding, 0)  AS total_arrangement_outstanding,
  COALESCE(arr.any_breach_detected, false)        AS any_breach_detected,
  COALESCE(arr.max_missed_payments, 0)            AS max_missed_payments,

  -- Scouting
  COALESCE(scout.active_scouting_leads, 0) AS active_scouting_leads,

  -- Carry-forward
  COALESCE(cf.carry_forward_count, 0) AS carry_forward_count

FROM public.er_master em

LEFT JOIN public.ce_risk_profiles rp
  ON rp.employer_id = em.regno

LEFT JOIN LATERAL (
  SELECT
    MAX(i.scheduled_date) AS last_inspection_date,
    (ARRAY_AGG(i.inspection_type ORDER BY i.scheduled_date DESC))[1]
      AS last_inspection_type
  FROM public.ce_inspections i
  WHERE i.employer_id = em.regno
    AND i.status IN ('COMPLETED','IN_PROGRESS')
) insp ON true

LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (
      WHERE v.status IN ('OPEN','IN_PROGRESS','UNDER_REVIEW','ESCALATED')
    ) AS open_violation_count,
    COUNT(*) FILTER (
      WHERE v.status = 'ESCALATED'
    ) AS escalated_violation_count,
    MIN(v.created_at) FILTER (
      WHERE v.status IN ('OPEN','IN_PROGRESS','UNDER_REVIEW','ESCALATED')
    ) AS oldest_open_violation_date,
    COALESCE(SUM(v.total_amount) FILTER (
      WHERE v.status IN ('OPEN','IN_PROGRESS','UNDER_REVIEW','ESCALATED')
    ), 0) AS total_violation_exposure
  FROM public.ce_violations v
  WHERE v.employer_id = em.regno AND v.is_deleted = false
) viol ON true

LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE fa.status = 'OVERDUE')
      AS overdue_followup_count,
    COUNT(*) FILTER (WHERE fa.status IN ('PLANNED','SCHEDULED'))
      AS planned_followup_count,
    MIN(fa.due_date) FILTER (WHERE fa.status = 'OVERDUE')
      AS oldest_overdue_followup_date
  FROM public.ce_follow_up_actions fa
  WHERE fa.employer_id = em.regno AND fa.is_deleted = false
) fu ON true

LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS pending_notice_count,
    MIN(n.due_response_date) AS nearest_response_due
  FROM public.ce_notices n
  WHERE n.employer_id = em.regno
    AND n.status IN ('SENT','DELIVERED')
    AND n.due_response_date >= CURRENT_DATE
) ntc ON true

LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE pa.status = 'ACTIVE')
      AS active_arrangement_count,
    COUNT(*) FILTER (WHERE pa.breach_detected = true)
      AS breached_arrangement_count,
    COALESCE(
      SUM(pa.total_debt - pa.total_paid) FILTER (WHERE pa.status = 'ACTIVE'),
      0
    ) AS total_arrangement_outstanding,
    BOOL_OR(pa.breach_detected) AS any_breach_detected,
    MAX(pa.missed_payments) AS max_missed_payments
  FROM public.ce_payment_arrangements pa
  WHERE pa.employer_id = em.regno
) arr ON true

LEFT JOIN LATERAL (
  SELECT COUNT(*) AS active_scouting_leads
  FROM public.ce_scouting_leads sl
  WHERE sl.linked_employer_id = em.regno
    AND sl.status IN ('NEW','UNDER_INVESTIGATION')
) scout ON true

LEFT JOIN LATERAL (
  SELECT COUNT(*) AS carry_forward_count
  FROM public.ce_weekly_plan_items wpi
  WHERE wpi.employer_id = em.regno
    AND wpi.execution_status IN ('NOT_DONE','RESCHEDULED')
    AND wpi.carried_forward_to IS NULL
) cf ON true

WHERE em.status = 'A';


-- ============================================================
-- STEP 2: Enriched Candidate View v2
-- Two-layer: hard inclusion rules + explicit candidate_reason
-- ============================================================
CREATE OR REPLACE VIEW public.ce_v_plan_candidates_v2 AS

-- Layer 1: Employers with open violations
SELECT
  ef.employer_id,
  ef.employer_name,
  ef.territory,
  'VIOLATION'::text            AS candidate_source,
  ef.risk_band,
  ef.risk_score,
  ef.days_since_last_inspection,
  ef.open_violation_count,
  ef.escalated_violation_count,
  ef.overdue_followup_count,
  ef.total_violation_exposure  AS financial_exposure,
  ef.notice_days_remaining,
  ef.any_breach_detected,
  ef.carry_forward_count,
  CASE
    WHEN ef.escalated_violation_count > 0     THEN 'ESCALATED_VIOLATION'
    WHEN ef.days_oldest_violation > 90        THEN 'AGING_VIOLATION'
    WHEN ef.open_violation_count >= 3         THEN 'MULTIPLE_VIOLATIONS'
    ELSE 'OPEN_VIOLATION'
  END::text AS candidate_reason,
  CASE
    WHEN ef.escalated_violation_count > 0 THEN 'CRITICAL'
    WHEN ef.days_oldest_violation > 90    THEN 'HIGH'
    WHEN ef.open_violation_count >= 3     THEN 'HIGH'
    ELSE 'MEDIUM'
  END::text AS derived_priority
FROM public.ce_v_plan_employer_facts ef
WHERE ef.open_violation_count > 0

UNION ALL

-- Layer 2: Overdue follow-ups
SELECT
  ef.employer_id, ef.employer_name, ef.territory,
  'OVERDUE_FOLLOW_UP'::text, ef.risk_band, ef.risk_score,
  ef.days_since_last_inspection, ef.open_violation_count,
  ef.escalated_violation_count, ef.overdue_followup_count,
  0::numeric, ef.notice_days_remaining, ef.any_breach_detected,
  ef.carry_forward_count,
  'OVERDUE_FOLLOW_UP'::text, 'HIGH'::text
FROM public.ce_v_plan_employer_facts ef
WHERE ef.overdue_followup_count > 0

UNION ALL

-- Layer 3: Arrangement breaches / missed payments
SELECT
  ef.employer_id, ef.employer_name, ef.territory,
  'ARRANGEMENT_BREACH'::text, ef.risk_band, ef.risk_score,
  ef.days_since_last_inspection, ef.open_violation_count,
  ef.escalated_violation_count, ef.overdue_followup_count,
  ef.total_arrangement_outstanding, ef.notice_days_remaining,
  ef.any_breach_detected, ef.carry_forward_count,
  CASE WHEN ef.breached_arrangement_count > 0
       THEN 'ARRANGEMENT_DEFAULT'
       ELSE 'ARRANGEMENT_AT_RISK'
  END::text,
  'CRITICAL'::text
FROM public.ce_v_plan_employer_facts ef
WHERE ef.any_breach_detected = true OR ef.max_missed_payments > 0

UNION ALL

-- Layer 4: Notice response approaching
SELECT
  ef.employer_id, ef.employer_name, ef.territory,
  'NOTICE_RESPONSE'::text, ef.risk_band, ef.risk_score,
  ef.days_since_last_inspection, ef.open_violation_count,
  ef.escalated_violation_count, ef.overdue_followup_count,
  0::numeric, ef.notice_days_remaining, ef.any_breach_detected,
  ef.carry_forward_count,
  'NOTICE_RESPONSE_DUE'::text,
  CASE WHEN ef.notice_days_remaining <= 3 THEN 'CRITICAL'
       WHEN ef.notice_days_remaining <= 7 THEN 'HIGH'
       ELSE 'MEDIUM'
  END::text
FROM public.ce_v_plan_employer_facts ef
WHERE ef.pending_notice_count > 0

UNION ALL

-- Layer 5: High-risk, no recent visit
SELECT
  ef.employer_id, ef.employer_name, ef.territory,
  'RISK_NO_VISIT'::text, ef.risk_band, ef.risk_score,
  ef.days_since_last_inspection, ef.open_violation_count,
  ef.escalated_violation_count, ef.overdue_followup_count,
  0::numeric, ef.notice_days_remaining, ef.any_breach_detected,
  ef.carry_forward_count,
  'HIGH_RISK_NO_VISIT'::text,
  CASE WHEN ef.risk_band = 'CRITICAL' THEN 'CRITICAL' ELSE 'HIGH' END::text
FROM public.ce_v_plan_employer_facts ef
WHERE ef.risk_band IN ('HIGH','CRITICAL')
  AND (ef.days_since_last_inspection IS NULL
       OR ef.days_since_last_inspection > 90)

UNION ALL

-- Layer 6: Carry-forward incomplete work
SELECT
  ef.employer_id, ef.employer_name, ef.territory,
  'CARRY_FORWARD'::text, ef.risk_band, ef.risk_score,
  ef.days_since_last_inspection, ef.open_violation_count,
  ef.escalated_violation_count, ef.overdue_followup_count,
  0::numeric, ef.notice_days_remaining, ef.any_breach_detected,
  ef.carry_forward_count,
  'CARRY_FORWARD_INCOMPLETE'::text,
  'MEDIUM'::text
FROM public.ce_v_plan_employer_facts ef
WHERE ef.carry_forward_count > 0

UNION ALL

-- Layer 7: Audit recency exceeded (any employer, 180+ days)
SELECT
  ef.employer_id, ef.employer_name, ef.territory,
  'AUDIT_RECENCY'::text, ef.risk_band, ef.risk_score,
  ef.days_since_last_inspection, ef.open_violation_count,
  ef.escalated_violation_count, ef.overdue_followup_count,
  0::numeric, ef.notice_days_remaining, ef.any_breach_detected,
  ef.carry_forward_count,
  'LAST_AUDIT_EXCEEDED'::text,
  'LOW'::text
FROM public.ce_v_plan_employer_facts ef
WHERE ef.days_since_last_inspection > 180
   OR (ef.days_since_last_inspection IS NULL AND ef.open_violation_count = 0)

UNION ALL

-- Layer 8: Scouting leads
SELECT
  COALESCE(sl.linked_employer_id, sl.id::text) AS employer_id,
  COALESCE(ef.employer_name, sl.business_name) AS employer_name,
  COALESCE(ef.territory, sl.territory)         AS territory,
  'SCOUTING_LEAD'::text,
  ef.risk_band,
  ef.risk_score,
  ef.days_since_last_inspection,
  COALESCE(ef.open_violation_count, 0),
  COALESCE(ef.escalated_violation_count, 0),
  COALESCE(ef.overdue_followup_count, 0),
  0::numeric,
  ef.notice_days_remaining,
  COALESCE(ef.any_breach_detected, false),
  COALESCE(ef.carry_forward_count, 0),
  'SCOUTING_LEAD'::text,
  CASE sl.confidence_level
    WHEN 'HIGH' THEN 'HIGH'
    WHEN 'MEDIUM' THEN 'MEDIUM'
    ELSE 'LOW'
  END::text
FROM public.ce_scouting_leads sl
LEFT JOIN public.ce_v_plan_employer_facts ef
  ON ef.employer_id = sl.linked_employer_id
WHERE sl.status IN ('NEW','UNDER_INVESTIGATION');


-- ============================================================
-- STEP 3: Batch Scoring Function
-- Single RPC call returns all candidates scored server-side
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_ce_score_candidates_batch(
  p_limit INT DEFAULT 200
)
RETURNS TABLE(
  employer_id         TEXT,
  employer_name       TEXT,
  territory           TEXT,
  candidate_source    TEXT,
  candidate_reason    TEXT,
  derived_priority    TEXT,
  risk_band           TEXT,
  risk_score          NUMERIC,
  days_since_last_inspection INT,
  open_violation_count BIGINT,
  escalated_violation_count BIGINT,
  overdue_followup_count BIGINT,
  financial_exposure  NUMERIC,
  notice_days_remaining INT,
  any_breach_detected BOOLEAN,
  carry_forward_count BIGINT,
  recommendation_score NUMERIC
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.employer_id::text,
    c.employer_name::text,
    c.territory::text,
    c.candidate_source::text,
    c.candidate_reason::text,
    c.derived_priority::text,
    c.risk_band::text,
    c.risk_score,
    c.days_since_last_inspection,
    c.open_violation_count,
    c.escalated_violation_count,
    c.overdue_followup_count,
    c.financial_exposure,
    c.notice_days_remaining,
    c.any_breach_detected,
    c.carry_forward_count,
    public.fn_ce_score_plan_candidate(
      p_source_type           := c.candidate_source,
      p_priority              := c.derived_priority,
      p_risk_band             := c.risk_band,
      p_days_overdue          := GREATEST(0, COALESCE(c.days_since_last_inspection, 0)),
      p_overdue_followup_count := COALESCE(c.overdue_followup_count, 0)::int,
      p_notice_days_remaining := c.notice_days_remaining,
      p_financial_exposure    := COALESCE(c.financial_exposure, 0),
      p_prior_violation_count := COALESCE(c.open_violation_count, 0)::int,
      p_days_since_last_visit := c.days_since_last_inspection,
      p_is_same_zone          := false,
      p_is_manager_flagged    := false,
      p_scouting_confidence   := CASE
                                   WHEN c.candidate_source = 'SCOUTING_LEAD'
                                   THEN c.derived_priority
                                   ELSE NULL
                                 END
    ) AS recommendation_score
  FROM public.ce_v_plan_candidates_v2 c
  ORDER BY public.fn_ce_score_plan_candidate(
    c.candidate_source, c.derived_priority, c.risk_band,
    GREATEST(0, COALESCE(c.days_since_last_inspection, 0)),
    COALESCE(c.overdue_followup_count, 0)::int,
    c.notice_days_remaining,
    COALESCE(c.financial_exposure, 0),
    COALESCE(c.open_violation_count, 0)::int,
    c.days_since_last_inspection,
    false, false,
    CASE WHEN c.candidate_source = 'SCOUTING_LEAD' THEN c.derived_priority ELSE NULL END
  ) DESC
  LIMIT p_limit;
END;
$$;
