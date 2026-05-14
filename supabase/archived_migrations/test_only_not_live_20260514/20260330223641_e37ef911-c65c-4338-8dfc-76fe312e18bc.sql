
-- Fix: ia_departments column is 'head', not 'head_name'

-- 1) Fix ia_convert_candidates_to_engagements
CREATE OR REPLACE FUNCTION public.ia_convert_candidates_to_engagements(
  p_plan_id uuid,
  p_created_by text DEFAULT 'system'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate RECORD;
  v_count integer := 0;
  v_eng_code text;
  v_fiscal_year text;
  v_quarter text;
  v_month text;
  v_est_days numeric;
  v_risk_label text;
  v_scope text;
  v_objectives text;
  v_rationale text;
  v_coverage text;
  v_deliverable text;
BEGIN
  SELECT fiscal_year INTO v_fiscal_year FROM ia_annual_plans WHERE id = p_plan_id;

  FOR v_candidate IN
    SELECT c.*, df.function_name, df.risk_rating AS func_risk_rating, 
           df.description AS func_description,
           d.name AS dept_name, d.head AS dept_head
    FROM ia_auto_plan_candidates c
    LEFT JOIN ia_department_functions df ON df.id = c.function_id
    LEFT JOIN ia_departments d ON d.id = c.department_id
    WHERE c.plan_id = p_plan_id AND c.accepted = true
      AND c.status = 'Accepted'
      AND NOT EXISTS (
        SELECT 1 FROM ia_audit_engagements e
        WHERE e.annual_plan_id = p_plan_id
          AND e.function_id = c.function_id
          AND (e.is_active = true OR e.is_active IS NULL)
      )
    ORDER BY c.rank_position ASC
  LOOP
    v_count := v_count + 1;
    v_eng_code := 'ENG-' || COALESCE(v_fiscal_year, EXTRACT(YEAR FROM CURRENT_DATE)::text) || '-' || LPAD(v_count::text, 3, '0');

    v_risk_label := CASE
      WHEN v_candidate.risk_score >= 75 THEN 'Critical'
      WHEN v_candidate.risk_score >= 50 THEN 'High'
      WHEN v_candidate.risk_score >= 25 THEN 'Medium'
      ELSE 'Low'
    END;

    v_quarter := COALESCE(v_candidate.suggested_quarter, 
      CASE EXTRACT(QUARTER FROM COALESCE(v_candidate.suggested_start_date, CURRENT_DATE))
        WHEN 1 THEN 'Q1' WHEN 2 THEN 'Q2' WHEN 3 THEN 'Q3' WHEN 4 THEN 'Q4'
      END);
    v_month := COALESCE(v_candidate.suggested_month,
      TO_CHAR(COALESCE(v_candidate.suggested_start_date, CURRENT_DATE), 'Month'));

    v_est_days := COALESCE(v_candidate.suggested_days,
      CASE v_risk_label
        WHEN 'Critical' THEN 20
        WHEN 'High' THEN 15
        WHEN 'Medium' THEN 10
        ELSE 5
      END);

    v_scope := COALESCE(v_candidate.suggested_scope,
      'Review and evaluate the ' || COALESCE(v_candidate.function_name, 'function') ||
      ' within the ' || COALESCE(v_candidate.dept_name, 'department') ||
      ' to assess adequacy and effectiveness of internal controls.');

    v_objectives := COALESCE(v_candidate.suggested_objectives,
      'Assess compliance with policies and procedures. Evaluate effectiveness of internal controls. ' ||
      'Identify risks and areas for improvement. Provide recommendations for management action.');

    v_rationale := '';
    IF v_candidate.reason_codes IS NOT NULL AND jsonb_array_length(v_candidate.reason_codes) > 0 THEN
      SELECT string_agg(val::text, ', ')
      INTO v_rationale
      FROM jsonb_array_elements_text(v_candidate.reason_codes) AS val;
      v_rationale := 'Included based on: ' || REPLACE(REPLACE(v_rationale, '_', ' '), '"', '');
    END IF;

    v_coverage := COALESCE(v_candidate.coverage_category, 'Operational');
    v_deliverable := 'Audit Report with findings and recommendations';

    INSERT INTO ia_audit_engagements (
      annual_plan_id, department_id, function_id,
      engagement_name, engagement_code, engagement_type,
      engagement_risk_rating, lead_auditor_id, reviewer_id,
      estimated_hours, estimated_days,
      planned_start_date, planned_end_date,
      quarter, month, sequence_no,
      scope, objectives, inclusion_rationale,
      coverage_category, expected_deliverable,
      auditable_area_summary, auditee_contact,
      status, is_active, created_by, created_at
    ) VALUES (
      p_plan_id, v_candidate.department_id, v_candidate.function_id,
      COALESCE(v_candidate.dept_name, '') || ' - ' || COALESCE(v_candidate.function_name, 'Audit'),
      v_eng_code, 'Planned Audit',
      v_risk_label, v_candidate.suggested_lead_auditor_id, v_candidate.suggested_reviewer_id,
      COALESCE(v_candidate.suggested_hours, CEIL(v_est_days / 5.0)), v_est_days,
      v_candidate.suggested_start_date, v_candidate.suggested_end_date,
      v_quarter, TRIM(v_month), v_count,
      v_scope, v_objectives, v_rationale,
      v_coverage, v_deliverable,
      COALESCE(v_candidate.func_description, v_candidate.function_name),
      COALESCE(v_candidate.dept_head, ''),
      'Planned', true, p_created_by, now()
    );

    UPDATE ia_auto_plan_candidates SET status = 'Converted' WHERE id = v_candidate.id;
  END LOOP;

  UPDATE ia_annual_plans SET total_department_audits = (
    SELECT COUNT(*) FROM ia_audit_engagements WHERE annual_plan_id = p_plan_id AND (is_active = true OR is_active IS NULL)
  ) WHERE id = p_plan_id;

  RETURN jsonb_build_object('success', true, 'engagements_created', v_count);
END;
$$;

-- 2) Fix ia_generate_auto_plan_candidates
CREATE OR REPLACE FUNCTION public.ia_generate_auto_plan_candidates(
  p_plan_id uuid,
  p_fiscal_year text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_func RECORD;
  v_score RECORD;
  v_candidate_id uuid;
  v_count integer := 0;
  v_fy text;
  v_risk_label text;
  v_est_days numeric;
  v_suggested_quarter text;
  v_slot_start date;
  v_slot_end date;
BEGIN
  SELECT COALESCE(p_fiscal_year, ap.fiscal_year) INTO v_fy FROM ia_annual_plans ap WHERE ap.id = p_plan_id;

  DELETE FROM ia_planning_score_explanations WHERE plan_id = p_plan_id;
  DELETE FROM ia_auto_plan_candidates WHERE plan_id = p_plan_id;

  FOR v_func IN
    SELECT df.id AS function_id, df.department_id, df.function_name, df.description AS func_desc,
           df.risk_rating AS func_risk, d.name AS dept_name, d.head AS dept_head
    FROM ia_department_functions df
    JOIN ia_departments d ON d.id = df.department_id
    WHERE df.is_active = true AND d.is_active = true
  LOOP
    v_score := ia_compute_engagement_priority_score(v_func.department_id, v_func.function_id);
    v_candidate_id := gen_random_uuid();

    v_risk_label := CASE
      WHEN v_score.risk_score >= 75 THEN 'Critical'
      WHEN v_score.risk_score >= 50 THEN 'High'
      WHEN v_score.risk_score >= 25 THEN 'Medium'
      ELSE 'Low'
    END;
    v_est_days := CASE v_risk_label
      WHEN 'Critical' THEN 20 WHEN 'High' THEN 15 WHEN 'Medium' THEN 10 ELSE 5
    END;

    v_suggested_quarter := CASE
      WHEN v_score.risk_score >= 50 THEN 'Q' || (1 + (v_count % 2))
      WHEN v_score.risk_score >= 25 THEN 'Q' || (2 + (v_count % 2))
      ELSE 'Q' || (3 + (v_count % 2))
    END;

    v_slot_start := CASE v_suggested_quarter
      WHEN 'Q1' THEN (EXTRACT(YEAR FROM CURRENT_DATE)::text || '-01-01')::date + (v_count * 14 % 90) * INTERVAL '1 day'
      WHEN 'Q2' THEN (EXTRACT(YEAR FROM CURRENT_DATE)::text || '-04-01')::date + (v_count * 14 % 90) * INTERVAL '1 day'
      WHEN 'Q3' THEN (EXTRACT(YEAR FROM CURRENT_DATE)::text || '-07-01')::date + (v_count * 14 % 90) * INTERVAL '1 day'
      WHEN 'Q4' THEN (EXTRACT(YEAR FROM CURRENT_DATE)::text || '-10-01')::date + (v_count * 14 % 90) * INTERVAL '1 day'
    END;
    v_slot_end := v_slot_start + (v_est_days * INTERVAL '1 day');

    v_count := v_count + 1;

    INSERT INTO ia_auto_plan_candidates (
      id, plan_id, department_id, function_id, entity_name,
      risk_score, recency_score, findings_score, followup_score,
      compliance_score, change_score, composite_score,
      reason_codes, last_audit_date, frequency_policy_months, is_overdue,
      suggested_start_date, suggested_end_date, suggested_hours, suggested_days,
      suggested_quarter, suggested_month, coverage_category,
      suggested_scope, suggested_objectives,
      status, accepted
    ) VALUES (
      v_candidate_id, p_plan_id, v_func.department_id, v_func.function_id,
      COALESCE(v_func.dept_name, '') || ' → ' || COALESCE(v_func.function_name, ''),
      v_score.risk_score, v_score.recency_score, v_score.findings_score,
      v_score.followup_score, v_score.compliance_score, v_score.change_score,
      v_score.composite_score,
      v_score.reason_codes, v_score.last_audit_date,
      v_score.frequency_policy_months, v_score.is_overdue,
      v_slot_start, v_slot_end, CEIL(v_est_days / 5.0), v_est_days,
      v_suggested_quarter, TO_CHAR(v_slot_start, 'Month'),
      COALESCE(v_func.func_risk, 'Operational'),
      'Review and evaluate ' || COALESCE(v_func.function_name, 'function') || 
        ' within ' || COALESCE(v_func.dept_name, 'department') || 
        ' to assess internal controls adequacy and effectiveness.',
      'Assess compliance with policies. Evaluate control effectiveness. Identify risks. Provide recommendations.',
      'Suggested', NULL
    );

    INSERT INTO ia_planning_score_explanations (
      plan_id, candidate_id, department_id, function_id,
      risk_raw, risk_normalized, risk_weight,
      recency_raw, recency_normalized, recency_weight,
      findings_raw, findings_normalized, findings_weight,
      followup_raw, followup_normalized, followup_weight,
      compliance_raw, compliance_normalized, compliance_weight,
      change_raw, change_normalized, change_weight,
      composite_score, reason_codes,
      created_at
    ) VALUES (
      p_plan_id, v_candidate_id, v_func.department_id, v_func.function_id,
      v_score.risk_score, v_score.risk_score, 0.35,
      v_score.recency_score, v_score.recency_score, 0.20,
      v_score.findings_score, v_score.findings_score, 0.15,
      v_score.followup_score, v_score.followup_score, 0.10,
      v_score.compliance_score, v_score.compliance_score, 0.10,
      v_score.change_score, v_score.change_score, 0.10,
      v_score.composite_score, v_score.reason_codes,
      now()
    );
  END LOOP;

  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY composite_score DESC) AS rn
    FROM ia_auto_plan_candidates WHERE plan_id = p_plan_id
  )
  UPDATE ia_auto_plan_candidates c SET rank_position = ranked.rn
  FROM ranked WHERE c.id = ranked.id;

  RETURN jsonb_build_object('success', true, 'candidates_generated', v_count);
END;
$$;
