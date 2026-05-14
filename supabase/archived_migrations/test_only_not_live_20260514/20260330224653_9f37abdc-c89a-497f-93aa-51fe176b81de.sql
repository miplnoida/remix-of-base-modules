-- Repair Auto Plan generation against the live schema and ensure config access exists

CREATE OR REPLACE FUNCTION public.ia_generate_auto_plan_candidates(
  p_plan_id uuid,
  p_fiscal_year text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_func RECORD;
  v_score jsonb;
  v_count integer := 0;
  v_run_id uuid := gen_random_uuid();
  v_candidate_id uuid;
  v_raw_findings integer := 0;
  v_raw_overdue integer := 0;
  v_raw_changes integer := 0;
  v_risk_assessment_id uuid;
  v_risk_assessment_date date;
  v_findings_mult numeric := 20;
  v_overdue_mult numeric := 25;
  v_change_mult numeric := 33;
  v_change_lookback numeric := 12;
  v_never_audited_default numeric := 100;
  v_param jsonb;
  v_risk_label text;
  v_est_days numeric;
  v_suggested_quarter text;
  v_slot_start date;
  v_slot_end date;
  v_scope text;
  v_objectives text;
  v_coverage text;
BEGIN
  v_param := ia_resolve_planning_parameter('findings_multiplier', p_plan_id);
  v_findings_mult := COALESCE(NULLIF(v_param->>'value', '')::numeric, 20);

  v_param := ia_resolve_planning_parameter('overdue_actions_multiplier', p_plan_id);
  v_overdue_mult := COALESCE(NULLIF(v_param->>'value', '')::numeric, 25);

  v_param := ia_resolve_planning_parameter('change_events_multiplier', p_plan_id);
  v_change_mult := COALESCE(NULLIF(v_param->>'value', '')::numeric, 33);

  v_param := ia_resolve_planning_parameter('change_lookback_months', p_plan_id);
  v_change_lookback := COALESCE(NULLIF(v_param->>'value', '')::numeric, 12);

  v_param := ia_resolve_planning_parameter('never_audited_recency_default', p_plan_id);
  v_never_audited_default := COALESCE(NULLIF(v_param->>'value', '')::numeric, 100);

  DELETE FROM public.ia_planning_score_explanations WHERE plan_id = p_plan_id;
  DELETE FROM public.ia_auto_plan_candidates WHERE plan_id = p_plan_id;

  FOR v_func IN
    SELECT
      df.id AS function_id,
      df.department_id,
      df.function_name,
      df.description AS func_desc,
      df.risk_rating AS func_risk,
      d.name AS dept_name,
      d.head AS dept_head
    FROM public.ia_department_functions df
    JOIN public.ia_departments d ON d.id = df.department_id
    WHERE df.is_active = true
      AND d.is_active = true
    ORDER BY df.department_id, df.function_name
  LOOP
    v_score := public.ia_compute_engagement_priority_score(v_func.function_id, v_func.department_id, p_plan_id);
    v_candidate_id := gen_random_uuid();

    v_risk_label := COALESCE(v_score->>'risk_level', CASE
      WHEN COALESCE(NULLIF(v_score->>'risk_score', '')::numeric, 0) >= 80 THEN 'Critical'
      WHEN COALESCE(NULLIF(v_score->>'risk_score', '')::numeric, 0) >= 50 THEN 'High'
      WHEN COALESCE(NULLIF(v_score->>'risk_score', '')::numeric, 0) >= 25 THEN 'Medium'
      ELSE 'Low'
    END);

    v_est_days := CASE v_risk_label
      WHEN 'Critical' THEN 20
      WHEN 'High' THEN 15
      WHEN 'Medium' THEN 10
      ELSE 5
    END;

    v_suggested_quarter := CASE
      WHEN COALESCE(NULLIF(v_score->>'risk_score', '')::numeric, 0) >= 50 THEN 'Q' || (1 + (v_count % 2))
      WHEN COALESCE(NULLIF(v_score->>'risk_score', '')::numeric, 0) >= 25 THEN 'Q' || (2 + (v_count % 2))
      ELSE 'Q' || (3 + (v_count % 2))
    END;

    v_slot_start := CASE v_suggested_quarter
      WHEN 'Q1' THEN (EXTRACT(YEAR FROM CURRENT_DATE)::text || '-01-01')::date + ((v_count * 14 % 90) * INTERVAL '1 day')
      WHEN 'Q2' THEN (EXTRACT(YEAR FROM CURRENT_DATE)::text || '-04-01')::date + ((v_count * 14 % 90) * INTERVAL '1 day')
      WHEN 'Q3' THEN (EXTRACT(YEAR FROM CURRENT_DATE)::text || '-07-01')::date + ((v_count * 14 % 90) * INTERVAL '1 day')
      ELSE (EXTRACT(YEAR FROM CURRENT_DATE)::text || '-10-01')::date + ((v_count * 14 % 90) * INTERVAL '1 day')
    END;
    v_slot_end := v_slot_start + (v_est_days * INTERVAL '1 day');

    v_scope := 'Review and evaluate ' || COALESCE(v_func.function_name, 'function') ||
      ' within ' || COALESCE(v_func.dept_name, 'department') ||
      ' to assess internal controls adequacy and effectiveness.';

    v_objectives := 'Assess compliance with policies. Evaluate control effectiveness. Identify risks. Provide recommendations.';
    v_coverage := COALESCE(v_func.func_risk, 'Operational');

    INSERT INTO public.ia_auto_plan_candidates (
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
      COALESCE(NULLIF(v_score->>'risk_score', '')::numeric, 0),
      COALESCE(NULLIF(v_score->>'recency_score', '')::numeric, 0),
      COALESCE(NULLIF(v_score->>'findings_score', '')::numeric, 0),
      COALESCE(NULLIF(v_score->>'followup_score', '')::numeric, 0),
      COALESCE(NULLIF(v_score->>'compliance_score', '')::numeric, 0),
      COALESCE(NULLIF(v_score->>'change_score', '')::numeric, 0),
      COALESCE(NULLIF(v_score->>'composite_score', '')::numeric, 0),
      COALESCE(v_score->'reason_codes', '[]'::jsonb),
      NULLIF(v_score->>'last_audit_date', '')::date,
      COALESCE(NULLIF(v_score->>'frequency_months', '')::integer, 24),
      COALESCE(NULLIF(v_score->>'is_overdue', '')::boolean, false),
      v_slot_start,
      v_slot_end,
      CEIL(v_est_days / 5.0),
      v_est_days,
      v_suggested_quarter,
      TO_CHAR(v_slot_start, 'Month'),
      v_coverage,
      v_scope,
      v_objectives,
      'Suggested',
      NULL
    );

    SELECT COUNT(*) INTO v_raw_findings
    FROM public.ia_findings f
    JOIN public.ia_audit_engagements e ON e.id = f.engagement_id
    WHERE f.status NOT IN ('Closed', 'Resolved', 'Accepted')
      AND f.risk_rating IN ('High', 'Critical')
      AND (e.department_id = v_func.department_id OR e.function_id = v_func.function_id);

    SELECT COUNT(*) INTO v_raw_overdue
    FROM public.ia_action_tracking a
    JOIN public.ia_audit_engagements e ON e.id = a.engagement_id
    WHERE a.status NOT IN ('Completed', 'Closed', 'Verified')
      AND a.target_date < CURRENT_DATE
      AND (e.department_id = v_func.department_id OR e.function_id = v_func.function_id);

    SELECT COUNT(*) INTO v_raw_changes
    FROM public.ia_change_events ce
    WHERE ce.is_active = true
      AND ce.event_date >= (CURRENT_DATE - ((v_change_lookback || ' months')::interval))
      AND (ce.department_id = v_func.department_id OR ce.function_id = v_func.function_id);

    SELECT ra.id, ra.assessment_date
    INTO v_risk_assessment_id, v_risk_assessment_date
    FROM public.ia_risk_assessments ra
    WHERE ra.function_id = v_func.function_id
      AND ra.is_active = true
    ORDER BY ra.assessment_date DESC
    LIMIT 1;

    INSERT INTO public.ia_planning_score_explanations (
      plan_id, candidate_id, function_id, department_id, generation_run_id,
      raw_risk_score, raw_recency_months, raw_findings_count, raw_overdue_actions_count, raw_change_events_count,
      norm_risk_score, norm_recency_score, norm_findings_score, norm_followup_score, norm_compliance_score, norm_change_score,
      weight_risk, weight_recency, weight_findings, weight_followup, weight_compliance, weight_change,
      contrib_risk, contrib_recency, contrib_findings, contrib_followup, contrib_compliance, contrib_change,
      final_composite_score, reason_codes,
      risk_assessment_id, risk_assessment_date,
      last_audit_source, last_audit_date, frequency_policy_months,
      parameter_versions, resolved_scope, generated_at
    ) VALUES (
      p_plan_id, v_candidate_id, v_func.function_id, v_func.department_id, v_run_id,
      COALESCE(NULLIF(v_score->>'risk_score', '')::numeric, 0),
      NULLIF(v_score->'last_audit'->>'months_since', '')::numeric,
      v_raw_findings, v_raw_overdue, v_raw_changes,
      COALESCE(NULLIF(v_score->>'risk_score', '')::numeric, 0),
      COALESCE(NULLIF(v_score->>'recency_score', '')::numeric, 0),
      COALESCE(NULLIF(v_score->>'findings_score', '')::numeric, 0),
      COALESCE(NULLIF(v_score->>'followup_score', '')::numeric, 0),
      COALESCE(NULLIF(v_score->>'compliance_score', '')::numeric, 0),
      COALESCE(NULLIF(v_score->>'change_score', '')::numeric, 0),
      COALESCE(NULLIF(v_score->'weights'->>'risk', '')::numeric, 0.35),
      COALESCE(NULLIF(v_score->'weights'->>'recency', '')::numeric, 0.20),
      COALESCE(NULLIF(v_score->'weights'->>'findings', '')::numeric, 0.15),
      COALESCE(NULLIF(v_score->'weights'->>'followup', '')::numeric, 0.10),
      COALESCE(NULLIF(v_score->'weights'->>'compliance', '')::numeric, 0.10),
      COALESCE(NULLIF(v_score->'weights'->>'change', '')::numeric, 0.10),
      ROUND(COALESCE(NULLIF(v_score->'weights'->>'risk', '')::numeric, 0.35) * COALESCE(NULLIF(v_score->>'risk_score', '')::numeric, 0), 2),
      ROUND(COALESCE(NULLIF(v_score->'weights'->>'recency', '')::numeric, 0.20) * COALESCE(NULLIF(v_score->>'recency_score', '')::numeric, 0), 2),
      ROUND(COALESCE(NULLIF(v_score->'weights'->>'findings', '')::numeric, 0.15) * COALESCE(NULLIF(v_score->>'findings_score', '')::numeric, 0), 2),
      ROUND(COALESCE(NULLIF(v_score->'weights'->>'followup', '')::numeric, 0.10) * COALESCE(NULLIF(v_score->>'followup_score', '')::numeric, 0), 2),
      ROUND(COALESCE(NULLIF(v_score->'weights'->>'compliance', '')::numeric, 0.10) * COALESCE(NULLIF(v_score->>'compliance_score', '')::numeric, 0), 2),
      ROUND(COALESCE(NULLIF(v_score->'weights'->>'change', '')::numeric, 0.10) * COALESCE(NULLIF(v_score->>'change_score', '')::numeric, 0), 2),
      COALESCE(NULLIF(v_score->>'composite_score', '')::numeric, 0),
      COALESCE(v_score->'reason_codes', '[]'::jsonb),
      v_risk_assessment_id,
      v_risk_assessment_date,
      v_score->'last_audit'->>'source',
      NULLIF(v_score->>'last_audit_date', '')::date,
      COALESCE(NULLIF(v_score->>'frequency_months', '')::integer, 24),
      jsonb_build_object(
        'findings_multiplier', v_findings_mult,
        'overdue_actions_multiplier', v_overdue_mult,
        'change_events_multiplier', v_change_mult,
        'change_lookback_months', v_change_lookback,
        'never_audited_recency_default', v_never_audited_default
      ),
      v_scope,
      now()
    );

    v_count := v_count + 1;
  END LOOP;

  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY composite_score DESC, entity_name ASC) AS rn
    FROM public.ia_auto_plan_candidates
    WHERE plan_id = p_plan_id
  )
  UPDATE public.ia_auto_plan_candidates c
  SET rank_position = ranked.rn
  FROM ranked
  WHERE c.id = ranked.id;

  RETURN jsonb_build_object(
    'success', true,
    'candidates_generated', v_count,
    'run_id', v_run_id
  );
END;
$$;

-- Ensure the Auto Plan config module exists and is visible under Internal Audit
UPDATE public.app_modules
SET route = '/audit/config',
    show_in_menu = true,
    is_enabled = true,
    sort_order = COALESCE(sort_order, 25),
    updated_at = now()
WHERE name = 'audit_system_configuration';

INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT am.id, 'view', 'View', 'View Auto Plan configuration', true
FROM public.app_modules am
WHERE am.name = 'audit_system_configuration'
  AND NOT EXISTS (
    SELECT 1
    FROM public.module_actions ma
    WHERE ma.module_id = am.id AND ma.action_name = 'view'
  );

INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
SELECT r.id, am.id, ma.id, true
FROM public.roles r
JOIN public.app_modules am ON am.name = 'audit_system_configuration'
JOIN public.module_actions ma ON ma.module_id = am.id AND ma.action_name = 'view'
WHERE r.role_name = 'Admin'
  AND NOT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.module_id = am.id
      AND rp.action_id = ma.id
  );

UPDATE public.role_permissions rp
SET is_granted = true
FROM public.roles r
JOIN public.app_modules am ON am.name = 'audit_system_configuration'
JOIN public.module_actions ma ON ma.module_id = am.id AND ma.action_name = 'view'
WHERE rp.role_id = r.id
  AND rp.module_id = am.id
  AND rp.action_id = ma.id
  AND r.role_name = 'Admin';