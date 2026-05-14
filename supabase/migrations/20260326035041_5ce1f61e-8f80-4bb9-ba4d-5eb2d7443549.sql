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
  v_is_overdue boolean := false;
  w_risk numeric := 0.35;
  w_recency numeric := 0.20;
  w_findings numeric := 0.15;
  w_followup numeric := 0.10;
  w_compliance numeric := 0.10;
  w_change numeric := 0.10;
  v_function_ids uuid[];
  v_risk_level text;
BEGIN
  SELECT jsonb_object_agg(factor_key, weight) INTO v_weights
  FROM ia_planning_scoring_weights
  WHERE is_active = true;

  IF v_weights IS NOT NULL THEN
    w_risk := COALESCE((v_weights->>'risk')::numeric, 0.35);
    w_recency := COALESCE((v_weights->>'recency')::numeric, 0.20);
    w_findings := COALESCE((v_weights->>'findings')::numeric, 0.15);
    w_followup := COALESCE((v_weights->>'followup')::numeric, 0.10);
    w_compliance := COALESCE((v_weights->>'compliance')::numeric, 0.10);
    w_change := COALESCE((v_weights->>'change')::numeric, 0.10);
  END IF;

  IF p_function_id IS NOT NULL THEN
    v_function_ids := ARRAY[p_function_id];
  ELSIF p_department_id IS NOT NULL THEN
    SELECT ARRAY_AGG(df.id) INTO v_function_ids
    FROM ia_department_functions df
    WHERE df.department_id = p_department_id
      AND df.is_active = true;
  END IF;

  IF v_function_ids IS NOT NULL AND array_length(v_function_ids, 1) > 0 THEN
    SELECT COALESCE(AVG(
      CASE ra.risk_level
        WHEN 'Critical' THEN 100
        WHEN 'High' THEN 80
        WHEN 'Medium' THEN 50
        WHEN 'Low' THEN 20
        ELSE 30
      END
    ), 30)
    INTO v_risk_score
    FROM ia_risk_assessments ra
    WHERE ra.is_active = true
      AND ra.function_id = ANY(v_function_ids);
  ELSE
    v_risk_score := 30;
  END IF;

  v_risk_level := CASE
    WHEN v_risk_score >= 80 THEN 'Critical'
    WHEN v_risk_score >= 50 THEN 'High'
    WHEN v_risk_score >= 25 THEN 'Medium'
    ELSE 'Low'
  END;

  v_last_audit := ia_resolve_last_audit_date(p_function_id, p_department_id);
  v_months_since := NULLIF(v_last_audit->>'months_since', '')::numeric;

  SELECT COALESCE(MIN(fp.max_months_between_audits), 24)
  INTO v_freq_months
  FROM ia_risk_band_frequency_policy fp
  WHERE fp.is_active = true
    AND fp.risk_level = v_risk_level;

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

  SELECT LEAST(100, COUNT(*) * 20)
  INTO v_findings_score
  FROM ia_findings f
  JOIN ia_audit_engagements e ON e.id = f.engagement_id
  WHERE f.status NOT IN ('Closed', 'Resolved', 'Accepted')
    AND f.risk_rating IN ('High', 'Critical')
    AND (
      (p_department_id IS NOT NULL AND e.department_id = p_department_id)
      OR (p_function_id IS NOT NULL AND e.function_id = p_function_id)
    );

  IF v_findings_score > 0 THEN
    v_reasons := v_reasons || '"OPEN_FINDINGS"'::jsonb;
  END IF;

  SELECT LEAST(100, COUNT(*) * 25)
  INTO v_followup_score
  FROM ia_action_tracking a
  JOIN ia_audit_engagements e ON e.id = a.engagement_id
  WHERE a.status NOT IN ('Completed', 'Closed', 'Verified')
    AND a.target_date < CURRENT_DATE
    AND (
      (p_department_id IS NOT NULL AND e.department_id = p_department_id)
      OR (p_function_id IS NOT NULL AND e.function_id = p_function_id)
    );

  IF v_followup_score > 0 THEN
    v_reasons := v_reasons || '"OVERDUE_ACTIONS"'::jsonb;
  END IF;

  IF v_months_since IS NOT NULL AND v_months_since >= v_freq_months THEN
    v_compliance_score := 100;
    v_is_overdue := true;
  ELSIF v_months_since IS NOT NULL AND v_freq_months > 0 THEN
    v_compliance_score := ROUND((v_months_since / v_freq_months) * 100, 2);
  ELSE
    v_compliance_score := 100;
    v_is_overdue := true;
  END IF;

  SELECT LEAST(100, COUNT(*) * 33)
  INTO v_change_score
  FROM ia_change_events ce
  WHERE ce.is_active = true
    AND ce.event_date >= (CURRENT_DATE - interval '12 months')
    AND (
      (p_department_id IS NOT NULL AND ce.department_id = p_department_id)
      OR (p_function_id IS NOT NULL AND ce.function_id = p_function_id)
    );

  IF v_change_score > 0 THEN
    v_reasons := v_reasons || '"RECENT_CHANGES"'::jsonb;
  END IF;

  v_total := (w_risk * v_risk_score)
           + (w_recency * v_recency_score)
           + (w_findings * v_findings_score)
           + (w_followup * v_followup_score)
           + (w_compliance * v_compliance_score)
           + (w_change * v_change_score);

  RETURN jsonb_build_object(
    'total_score', ROUND(v_total, 2),
    'composite_score', ROUND(v_total, 2),
    'risk_score', ROUND(v_risk_score, 2),
    'risk_level', v_risk_level,
    'recency_score', ROUND(v_recency_score, 2),
    'findings_score', ROUND(v_findings_score, 2),
    'followup_score', ROUND(v_followup_score, 2),
    'compliance_score', ROUND(v_compliance_score, 2),
    'change_score', ROUND(v_change_score, 2),
    'weights', jsonb_build_object(
      'risk', w_risk,
      'recency', w_recency,
      'findings', w_findings,
      'followup', w_followup,
      'compliance', w_compliance,
      'change', w_change
    ),
    'last_audit', v_last_audit,
    'last_audit_date', v_last_audit->>'last_audit_date',
    'frequency_months', v_freq_months,
    'is_overdue', v_is_overdue,
    'reasons', v_reasons,
    'reason_codes', v_reasons
  );
END;
$$;