
CREATE OR REPLACE FUNCTION public.ia_compute_engagement_priority_score(
  p_function_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_plan_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_risk_score numeric := 0;
  v_recency_score numeric := 0;
  v_findings_score numeric := 0;
  v_followup_score numeric := 0;
  v_compliance_score numeric := 0;
  v_change_score numeric := 0;
  v_total numeric := 0;
  v_weights jsonb;
  v_last_audit jsonb;
  v_months_since numeric;
  v_freq_months numeric := 24;
  v_reasons jsonb := '[]'::jsonb;
  w_risk numeric := 0.35;
  w_recency numeric := 0.20;
  w_findings numeric := 0.15;
  w_followup numeric := 0.10;
  w_compliance numeric := 0.10;
  w_change numeric := 0.10;
BEGIN
  -- Load configurable weights
  SELECT jsonb_object_agg(factor_key, weight) INTO v_weights
  FROM ia_planning_scoring_weights WHERE is_active = true;
  
  IF v_weights IS NOT NULL THEN
    w_risk := COALESCE((v_weights->>'risk')::numeric, 0.35);
    w_recency := COALESCE((v_weights->>'recency')::numeric, 0.20);
    w_findings := COALESCE((v_weights->>'findings')::numeric, 0.15);
    w_followup := COALESCE((v_weights->>'followup')::numeric, 0.10);
    w_compliance := COALESCE((v_weights->>'compliance')::numeric, 0.10);
    w_change := COALESCE((v_weights->>'change')::numeric, 0.10);
  END IF;

  -- 1. Risk score from assessments
  SELECT COALESCE(AVG(
    CASE ra.overall_risk_level
      WHEN 'Critical' THEN 100
      WHEN 'High' THEN 80
      WHEN 'Medium' THEN 50
      WHEN 'Low' THEN 20
      ELSE 30
    END
  ), 30) INTO v_risk_score
  FROM ia_risk_assessments ra
  WHERE ra.is_active = true
    AND (
      (p_department_id IS NOT NULL AND ra.department_id = p_department_id) OR
      (p_function_id IS NOT NULL AND ra.function_id = p_function_id)
    );

  -- 2. Recency score
  v_last_audit := ia_resolve_last_audit_date(p_function_id, p_department_id);
  v_months_since := (v_last_audit->>'months_since')::numeric;
  
  IF v_months_since IS NULL THEN
    v_recency_score := 100;
    v_reasons := v_reasons || '"NEVER_AUDITED"'::jsonb;
  ELSIF v_months_since >= 36 THEN
    v_recency_score := 100;
  ELSIF v_months_since >= 24 THEN
    v_recency_score := 80;
  ELSIF v_months_since >= 12 THEN
    v_recency_score := 50;
  ELSE
    v_recency_score := 20;
  END IF;

  -- 3. Outstanding findings score
  SELECT LEAST(100, COUNT(*) * 20) INTO v_findings_score
  FROM ia_findings f
  JOIN ia_audit_engagements e ON e.id = f.engagement_id
  WHERE f.status NOT IN ('Closed', 'Resolved', 'Accepted')
    AND f.risk_rating IN ('High', 'Critical')
    AND (
      (p_department_id IS NOT NULL AND e.department_id = p_department_id) OR
      (p_function_id IS NOT NULL AND e.function_id = p_function_id)
    );
  IF v_findings_score > 0 THEN v_reasons := v_reasons || '"OPEN_FINDINGS"'::jsonb; END IF;

  -- 4. Overdue follow-up/action score (FIXED: use target_date instead of due_date)
  SELECT LEAST(100, COUNT(*) * 25) INTO v_followup_score
  FROM ia_action_tracking a
  WHERE a.status NOT IN ('Completed', 'Closed', 'Verified')
    AND a.target_date < CURRENT_DATE
    AND (
      (p_department_id IS NOT NULL AND a.department_id = p_department_id) OR
      (p_function_id IS NOT NULL AND a.engagement_id IN (
        SELECT id FROM ia_audit_engagements WHERE function_id = p_function_id
      ))
    );
  IF v_followup_score > 0 THEN v_reasons := v_reasons || '"OVERDUE_ACTIONS"'::jsonb; END IF;

  -- 5. Compliance frequency score
  IF v_months_since IS NOT NULL AND v_months_since >= v_freq_months THEN
    v_compliance_score := 100;
  ELSIF v_months_since IS NOT NULL THEN
    v_compliance_score := (v_months_since / v_freq_months) * 100;
  ELSE
    v_compliance_score := 100;
  END IF;

  -- 6. Change events score
  SELECT LEAST(100, COUNT(*) * 33) INTO v_change_score
  FROM ia_change_events ce
  WHERE ce.is_active = true
    AND ce.event_date >= (CURRENT_DATE - interval '12 months')
    AND (
      (p_department_id IS NOT NULL AND ce.department_id = p_department_id) OR
      (p_function_id IS NOT NULL AND ce.function_id = p_function_id)
    );
  IF v_change_score > 0 THEN v_reasons := v_reasons || '"RECENT_CHANGES"'::jsonb; END IF;

  -- Weighted total
  v_total := (w_risk * v_risk_score) + (w_recency * v_recency_score) +
             (w_findings * v_findings_score) + (w_followup * v_followup_score) +
             (w_compliance * v_compliance_score) + (w_change * v_change_score);

  RETURN jsonb_build_object(
    'total_score', ROUND(v_total, 2),
    'risk_score', ROUND(v_risk_score, 2),
    'recency_score', ROUND(v_recency_score, 2),
    'findings_score', ROUND(v_findings_score, 2),
    'followup_score', ROUND(v_followup_score, 2),
    'compliance_score', ROUND(v_compliance_score, 2),
    'change_score', ROUND(v_change_score, 2),
    'weights', jsonb_build_object('risk', w_risk, 'recency', w_recency, 'findings', w_findings, 'followup', w_followup, 'compliance', w_compliance, 'change', w_change),
    'last_audit', v_last_audit,
    'reasons', v_reasons
  );
END;
$$;
