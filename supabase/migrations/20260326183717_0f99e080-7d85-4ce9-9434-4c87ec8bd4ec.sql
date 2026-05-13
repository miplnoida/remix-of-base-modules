
-- ============================================================
-- PLANNING ENGINE ENHANCEMENT: Parameter Registry, Score Explanations,
-- Resource Recommendations, Override Governance
-- ============================================================

-- 1. Planning Parameters Registry (scope-based precedence)
CREATE TABLE IF NOT EXISTS public.ia_planning_parameters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parameter_key text NOT NULL,
  parameter_group text NOT NULL DEFAULT 'scoring',
  value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  value_type text NOT NULL DEFAULT 'numeric',
  scope_type text NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global','department','function','plan','scenario')),
  scope_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  effective_from date DEFAULT CURRENT_DATE,
  effective_to date,
  version_no integer NOT NULL DEFAULT 1,
  change_reason text,
  approved_by text,
  approved_at timestamptz,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_by text,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ia_planning_params_key ON ia_planning_parameters(parameter_key, scope_type);
CREATE INDEX IF NOT EXISTS idx_ia_planning_params_scope ON ia_planning_parameters(scope_type, scope_id);

-- Seed default global parameters for scoring multipliers/constants
INSERT INTO ia_planning_parameters (parameter_key, parameter_group, value_json, value_type, scope_type, change_reason, created_by)
VALUES
  ('never_audited_recency_default', 'scoring', '{"value": 100}', 'numeric', 'global', 'Initial seed', 'system'),
  ('findings_multiplier', 'scoring', '{"value": 20}', 'numeric', 'global', 'Initial seed - each finding adds 20 points', 'system'),
  ('overdue_actions_multiplier', 'scoring', '{"value": 25}', 'numeric', 'global', 'Initial seed - each overdue action adds 25 points', 'system'),
  ('change_events_multiplier', 'scoring', '{"value": 33}', 'numeric', 'global', 'Initial seed - each change event adds 33 points', 'system'),
  ('change_lookback_months', 'scoring', '{"value": 12}', 'numeric', 'global', 'Initial seed - look back 12 months for change events', 'system'),
  ('capacity_hours_critical', 'capacity', '{"value": 120}', 'numeric', 'global', 'Initial seed - hours for critical risk', 'system'),
  ('capacity_hours_high', 'capacity', '{"value": 80}', 'numeric', 'global', 'Initial seed - hours for high risk', 'system'),
  ('capacity_hours_medium', 'capacity', '{"value": 60}', 'numeric', 'global', 'Initial seed - hours for medium risk', 'system'),
  ('capacity_hours_low', 'capacity', '{"value": 40}', 'numeric', 'global', 'Initial seed - hours for low risk', 'system')
ON CONFLICT DO NOTHING;

-- 2. Score Explanations (per generation run)
CREATE TABLE IF NOT EXISTS public.ia_planning_score_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  candidate_id uuid,
  function_id uuid,
  department_id uuid,
  generation_run_id uuid,
  -- Raw metrics
  raw_risk_score numeric DEFAULT 0,
  raw_recency_months numeric,
  raw_findings_count integer DEFAULT 0,
  raw_overdue_actions_count integer DEFAULT 0,
  raw_change_events_count integer DEFAULT 0,
  -- Normalized factor scores
  norm_risk_score numeric DEFAULT 0,
  norm_recency_score numeric DEFAULT 0,
  norm_findings_score numeric DEFAULT 0,
  norm_followup_score numeric DEFAULT 0,
  norm_compliance_score numeric DEFAULT 0,
  norm_change_score numeric DEFAULT 0,
  -- Weights used
  weight_risk numeric DEFAULT 0.35,
  weight_recency numeric DEFAULT 0.20,
  weight_findings numeric DEFAULT 0.15,
  weight_followup numeric DEFAULT 0.10,
  weight_compliance numeric DEFAULT 0.10,
  weight_change numeric DEFAULT 0.10,
  -- Weighted contributions
  contrib_risk numeric DEFAULT 0,
  contrib_recency numeric DEFAULT 0,
  contrib_findings numeric DEFAULT 0,
  contrib_followup numeric DEFAULT 0,
  contrib_compliance numeric DEFAULT 0,
  contrib_change numeric DEFAULT 0,
  -- Final
  final_composite_score numeric DEFAULT 0,
  reason_codes jsonb DEFAULT '[]'::jsonb,
  -- Source lineage
  risk_assessment_id uuid,
  risk_assessment_date date,
  last_audit_source text,
  last_audit_date date,
  frequency_policy_months integer,
  -- Parameter metadata
  parameter_versions jsonb DEFAULT '{}'::jsonb,
  resolved_scope text DEFAULT 'global',
  -- Timestamps
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ia_score_explanations_plan ON ia_planning_score_explanations(plan_id);
CREATE INDEX IF NOT EXISTS idx_ia_score_explanations_candidate ON ia_planning_score_explanations(candidate_id);

-- 3. Resource Assignment Recommendations
CREATE TABLE IF NOT EXISTS public.ia_resource_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  candidate_id uuid,
  engagement_id uuid,
  auditor_id uuid NOT NULL,
  fit_score numeric DEFAULT 0,
  availability_score numeric DEFAULT 0,
  skill_match_score numeric DEFAULT 0,
  prior_involvement_score numeric DEFAULT 0,
  rotation_score numeric DEFAULT 0,
  reason_text text,
  workload_hours_current numeric DEFAULT 0,
  workload_hours_if_assigned numeric DEFAULT 0,
  conflict_indicators jsonb DEFAULT '[]'::jsonb,
  recommendation_rank integer,
  is_accepted boolean,
  accepted_by text,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ia_resource_recs_plan ON ia_resource_recommendations(plan_id);

-- 4. Override Change Log Enhancement - add before/after + classification
ALTER TABLE ia_plan_change_log
  ADD COLUMN IF NOT EXISTS before_state jsonb,
  ADD COLUMN IF NOT EXISTS after_state jsonb,
  ADD COLUMN IF NOT EXISTS change_classification text DEFAULT 'manual_override',
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid;

-- 5. Planning Wizard State
CREATE TABLE IF NOT EXISTS public.ia_planning_wizard_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  current_step integer DEFAULT 1,
  step_data jsonb DEFAULT '{}'::jsonb,
  data_readiness jsonb DEFAULT '{}'::jsonb,
  parameter_profile text DEFAULT 'global',
  is_complete boolean DEFAULT false,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_by text,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- RPC: ia_resolve_planning_parameter
-- ============================================================
CREATE OR REPLACE FUNCTION public.ia_resolve_planning_parameter(
  p_parameter_key text,
  p_plan_id uuid DEFAULT NULL,
  p_function_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_scenario_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
  v_value jsonb;
  v_scope text;
BEGIN
  -- Precedence: scenario > plan > function > department > global
  SELECT pp.value_json, pp.scope_type, pp.version_no, pp.effective_from, pp.approved_by
  INTO v_result
  FROM ia_planning_parameters pp
  WHERE pp.parameter_key = p_parameter_key
    AND pp.is_active = true
    AND (pp.effective_from IS NULL OR pp.effective_from <= CURRENT_DATE)
    AND (pp.effective_to IS NULL OR pp.effective_to >= CURRENT_DATE)
    AND (
      (pp.scope_type = 'scenario' AND pp.scope_id = p_scenario_id AND p_scenario_id IS NOT NULL)
      OR (pp.scope_type = 'plan' AND pp.scope_id = p_plan_id AND p_plan_id IS NOT NULL)
      OR (pp.scope_type = 'function' AND pp.scope_id = p_function_id AND p_function_id IS NOT NULL)
      OR (pp.scope_type = 'department' AND pp.scope_id = p_department_id AND p_department_id IS NOT NULL)
      OR (pp.scope_type = 'global' AND pp.scope_id IS NULL)
    )
  ORDER BY
    CASE pp.scope_type
      WHEN 'scenario' THEN 1
      WHEN 'plan' THEN 2
      WHEN 'function' THEN 3
      WHEN 'department' THEN 4
      WHEN 'global' THEN 5
    END
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('value', NULL, 'resolved_scope', 'default', 'found', false);
  END IF;

  RETURN jsonb_build_object(
    'value', v_result.value_json->'value',
    'resolved_scope', v_result.scope_type,
    'version_no', v_result.version_no,
    'effective_from', v_result.effective_from,
    'approved_by', v_result.approved_by,
    'found', true
  );
END;
$$;

-- ============================================================
-- RPC: ia_check_data_readiness (for wizard step 3)
-- ============================================================
CREATE OR REPLACE FUNCTION public.ia_check_data_readiness(
  p_plan_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_count integer;
  v_func_count integer;
  v_assessed_count integer;
  v_stale_count integer;
  v_weights_total numeric;
  v_freq_policy_count integer;
  v_auditor_count integer;
  v_warnings jsonb := '[]'::jsonb;
BEGIN
  -- Count departments
  SELECT COUNT(*) INTO v_dept_count FROM ia_departments WHERE is_active = true;
  IF v_dept_count = 0 THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('type','error','area','departments','message','No active departments found'));
  END IF;

  -- Count functions
  SELECT COUNT(*) INTO v_func_count FROM ia_department_functions WHERE is_active = true;
  IF v_func_count = 0 THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('type','error','area','functions','message','No active functions defined'));
  END IF;

  -- Risk assessments coverage
  SELECT COUNT(DISTINCT ra.function_id) INTO v_assessed_count
  FROM ia_risk_assessments ra WHERE ra.is_active = true;

  IF v_assessed_count < v_func_count AND v_func_count > 0 THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'type','warning','area','risk_assessments',
      'message', (v_func_count - v_assessed_count) || ' of ' || v_func_count || ' functions have no risk assessment'
    ));
  END IF;

  -- Stale assessments (> 12 months old)
  SELECT COUNT(DISTINCT ra.function_id) INTO v_stale_count
  FROM ia_risk_assessments ra
  WHERE ra.is_active = true AND ra.assessment_date < (CURRENT_DATE - interval '12 months');
  IF v_stale_count > 0 THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'type','warning','area','stale_assessments',
      'message', v_stale_count || ' risk assessments are older than 12 months'
    ));
  END IF;

  -- Weights validation
  SELECT COALESCE(SUM(weight), 0) INTO v_weights_total
  FROM ia_planning_scoring_weights WHERE is_active = true;
  IF ABS(v_weights_total - 1.0) > 0.01 THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object(
      'type','warning','area','scoring_weights',
      'message', 'Scoring weights total ' || ROUND(v_weights_total, 2) || ' (should be 1.0)'
    ));
  END IF;

  -- Frequency policies
  SELECT COUNT(*) INTO v_freq_policy_count FROM ia_risk_band_frequency_policy WHERE is_active = true;
  IF v_freq_policy_count = 0 THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('type','error','area','frequency_policy','message','No frequency policies configured'));
  END IF;

  -- Active auditors
  SELECT COUNT(*) INTO v_auditor_count FROM ia_auditors WHERE employment_status = 'Active';
  IF v_auditor_count = 0 THEN
    v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('type','warning','area','auditors','message','No active auditors available'));
  END IF;

  RETURN jsonb_build_object(
    'ready', NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_warnings) w WHERE w->>'type' = 'error'),
    'departments', v_dept_count,
    'functions', v_func_count,
    'assessed_functions', v_assessed_count,
    'stale_assessments', v_stale_count,
    'weights_valid', ABS(v_weights_total - 1.0) < 0.01,
    'frequency_policies', v_freq_policy_count,
    'active_auditors', v_auditor_count,
    'warnings', v_warnings
  );
END;
$$;

-- ============================================================
-- Enhanced: ia_generate_auto_plan_candidates with score explanations
-- ============================================================
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
  v_score jsonb;
  v_count integer := 0;
  v_run_id uuid := gen_random_uuid();
  v_candidate_id uuid;
  v_raw_findings integer;
  v_raw_overdue integer;
  v_raw_changes integer;
  v_risk_assessment_id uuid;
  v_risk_assessment_date date;
  -- Parameter values
  v_findings_mult numeric;
  v_overdue_mult numeric;
  v_change_mult numeric;
  v_change_lookback numeric;
  v_never_audited_default numeric;
  v_param jsonb;
BEGIN
  -- Resolve parameters
  v_param := ia_resolve_planning_parameter('findings_multiplier', p_plan_id);
  v_findings_mult := COALESCE((v_param->'value')::numeric, 20);
  
  v_param := ia_resolve_planning_parameter('overdue_actions_multiplier', p_plan_id);
  v_overdue_mult := COALESCE((v_param->'value')::numeric, 25);
  
  v_param := ia_resolve_planning_parameter('change_events_multiplier', p_plan_id);
  v_change_mult := COALESCE((v_param->'value')::numeric, 33);
  
  v_param := ia_resolve_planning_parameter('change_lookback_months', p_plan_id);
  v_change_lookback := COALESCE((v_param->'value')::numeric, 12);
  
  v_param := ia_resolve_planning_parameter('never_audited_recency_default', p_plan_id);
  v_never_audited_default := COALESCE((v_param->'value')::numeric, 100);

  -- Clear previous candidates and explanations
  DELETE FROM ia_planning_score_explanations WHERE plan_id = p_plan_id;
  DELETE FROM ia_auto_plan_candidates WHERE plan_id = p_plan_id;

  FOR v_func IN
    SELECT df.id AS function_id, df.department_id, df.function_name,
           d.name AS dept_name
    FROM ia_department_functions df
    JOIN ia_departments d ON d.id = df.department_id
    WHERE df.is_active = true AND d.is_active = true
    ORDER BY df.department_id, df.function_name
  LOOP
    v_score := ia_compute_engagement_priority_score(v_func.function_id, v_func.department_id, p_plan_id);
    v_candidate_id := gen_random_uuid();

    INSERT INTO ia_auto_plan_candidates (
      id, plan_id, department_id, function_id, entity_name,
      risk_score, recency_score, findings_score, followup_score,
      compliance_score, change_score, composite_score,
      reason_codes, last_audit_date, frequency_policy_months,
      is_overdue, status
    ) VALUES (
      v_candidate_id, p_plan_id, v_func.department_id, v_func.function_id,
      v_func.dept_name || ' → ' || v_func.function_name,
      (v_score->>'risk_score')::numeric,
      (v_score->>'recency_score')::numeric,
      (v_score->>'findings_score')::numeric,
      (v_score->>'followup_score')::numeric,
      (v_score->>'compliance_score')::numeric,
      (v_score->>'change_score')::numeric,
      (v_score->>'composite_score')::numeric,
      v_score->'reason_codes',
      (v_score->>'last_audit_date')::date,
      (v_score->>'frequency_months')::integer,
      COALESCE((v_score->>'is_overdue')::boolean, false),
      'Suggested'
    );

    -- Get raw counts for explanation
    SELECT COUNT(*) INTO v_raw_findings
    FROM ia_findings f
    JOIN ia_audit_engagements e ON e.id = f.engagement_id
    WHERE f.status NOT IN ('Closed','Resolved','Accepted')
      AND f.risk_rating IN ('High','Critical')
      AND (e.department_id = v_func.department_id OR e.function_id = v_func.function_id);

    SELECT COUNT(*) INTO v_raw_overdue
    FROM ia_action_tracking a
    JOIN ia_audit_engagements e ON e.id = a.engagement_id
    WHERE a.status NOT IN ('Completed','Closed','Verified')
      AND a.target_date < CURRENT_DATE
      AND (e.department_id = v_func.department_id OR e.function_id = v_func.function_id);

    SELECT COUNT(*) INTO v_raw_changes
    FROM ia_change_events ce
    WHERE ce.is_active = true
      AND ce.event_date >= (CURRENT_DATE - (v_change_lookback || ' months')::interval)
      AND (ce.department_id = v_func.department_id OR ce.function_id = v_func.function_id);

    -- Get risk assessment reference
    SELECT ra.id, ra.assessment_date INTO v_risk_assessment_id, v_risk_assessment_date
    FROM ia_risk_assessments ra
    WHERE ra.function_id = v_func.function_id AND ra.is_active = true
    ORDER BY ra.assessment_date DESC LIMIT 1;

    -- Write score explanation snapshot
    INSERT INTO ia_planning_score_explanations (
      plan_id, candidate_id, function_id, department_id, generation_run_id,
      raw_risk_score, raw_recency_months, raw_findings_count, raw_overdue_actions_count, raw_change_events_count,
      norm_risk_score, norm_recency_score, norm_findings_score, norm_followup_score, norm_compliance_score, norm_change_score,
      weight_risk, weight_recency, weight_findings, weight_followup, weight_compliance, weight_change,
      contrib_risk, contrib_recency, contrib_findings, contrib_followup, contrib_compliance, contrib_change,
      final_composite_score, reason_codes,
      risk_assessment_id, risk_assessment_date,
      last_audit_source, last_audit_date, frequency_policy_months,
      parameter_versions
    ) VALUES (
      p_plan_id, v_candidate_id, v_func.function_id, v_func.department_id, v_run_id,
      (v_score->>'risk_score')::numeric,
      (v_score->'last_audit'->>'months_since')::numeric,
      v_raw_findings, v_raw_overdue, v_raw_changes,
      (v_score->>'risk_score')::numeric,
      (v_score->>'recency_score')::numeric,
      (v_score->>'findings_score')::numeric,
      (v_score->>'followup_score')::numeric,
      (v_score->>'compliance_score')::numeric,
      (v_score->>'change_score')::numeric,
      COALESCE((v_score->'weights'->>'risk')::numeric, 0.35),
      COALESCE((v_score->'weights'->>'recency')::numeric, 0.20),
      COALESCE((v_score->'weights'->>'findings')::numeric, 0.15),
      COALESCE((v_score->'weights'->>'followup')::numeric, 0.10),
      COALESCE((v_score->'weights'->>'compliance')::numeric, 0.10),
      COALESCE((v_score->'weights'->>'change')::numeric, 0.10),
      ROUND(COALESCE((v_score->'weights'->>'risk')::numeric, 0.35) * (v_score->>'risk_score')::numeric, 2),
      ROUND(COALESCE((v_score->'weights'->>'recency')::numeric, 0.20) * (v_score->>'recency_score')::numeric, 2),
      ROUND(COALESCE((v_score->'weights'->>'findings')::numeric, 0.15) * (v_score->>'findings_score')::numeric, 2),
      ROUND(COALESCE((v_score->'weights'->>'followup')::numeric, 0.10) * (v_score->>'followup_score')::numeric, 2),
      ROUND(COALESCE((v_score->'weights'->>'compliance')::numeric, 0.10) * (v_score->>'compliance_score')::numeric, 2),
      ROUND(COALESCE((v_score->'weights'->>'change')::numeric, 0.10) * (v_score->>'change_score')::numeric, 2),
      (v_score->>'composite_score')::numeric,
      v_score->'reason_codes',
      v_risk_assessment_id, v_risk_assessment_date,
      v_score->'last_audit'->>'source',
      (v_score->>'last_audit_date')::date,
      (v_score->>'frequency_months')::integer,
      jsonb_build_object(
        'findings_multiplier', v_findings_mult,
        'overdue_actions_multiplier', v_overdue_mult,
        'change_events_multiplier', v_change_mult,
        'change_lookback_months', v_change_lookback,
        'never_audited_recency_default', v_never_audited_default
      )
    );

    v_count := v_count + 1;
  END LOOP;

  -- Assign ranks
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY composite_score DESC) AS rn
    FROM ia_auto_plan_candidates WHERE plan_id = p_plan_id
  )
  UPDATE ia_auto_plan_candidates c SET rank_position = ranked.rn
  FROM ranked WHERE c.id = ranked.id;

  RETURN jsonb_build_object('success', true, 'candidates_generated', v_count, 'run_id', v_run_id);
END;
$$;

-- ============================================================
-- Enhanced: ia_apply_manual_override with before/after governance
-- ============================================================
CREATE OR REPLACE FUNCTION public.ia_apply_manual_override(
  p_plan_id uuid,
  p_override_type text,
  p_engagement_id uuid DEFAULT NULL,
  p_candidate_id uuid DEFAULT NULL,
  p_changes jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT '',
  p_changed_by text DEFAULT 'system'
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
BEGIN
  -- Capture before state
  IF p_candidate_id IS NOT NULL THEN
    SELECT jsonb_build_object('status', c.status, 'accepted', c.accepted, 'rejection_reason', c.rejection_reason,
      'suggested_lead_auditor_id', c.suggested_lead_auditor_id, 'suggested_start_date', c.suggested_start_date)
    INTO v_before FROM ia_auto_plan_candidates c WHERE c.id = p_candidate_id;
  ELSIF p_engagement_id IS NOT NULL THEN
    SELECT jsonb_build_object('status', e.status, 'is_active', e.is_active, 'lead_auditor_id', e.lead_auditor_id,
      'planned_start_date', e.planned_start_date, 'planned_end_date', e.planned_end_date)
    INTO v_before FROM ia_audit_engagements e WHERE e.id = p_engagement_id;
  END IF;

  -- Execute override
  IF p_override_type = 'accept_candidate' AND p_candidate_id IS NOT NULL THEN
    UPDATE ia_auto_plan_candidates SET accepted = true, status = 'Accepted' WHERE id = p_candidate_id;
  ELSIF p_override_type = 'reject_candidate' AND p_candidate_id IS NOT NULL THEN
    UPDATE ia_auto_plan_candidates SET accepted = false, status = 'Rejected', rejection_reason = p_reason WHERE id = p_candidate_id;
  ELSIF p_override_type = 'remove_engagement' AND p_engagement_id IS NOT NULL THEN
    UPDATE ia_audit_engagements SET is_active = false, updated_by = p_changed_by, updated_at = now()
    WHERE id = p_engagement_id;
  ELSIF p_override_type = 'reschedule_candidate' AND p_candidate_id IS NOT NULL THEN
    UPDATE ia_auto_plan_candidates SET
      suggested_start_date = COALESCE((p_changes->>'start_date')::date, suggested_start_date),
      suggested_end_date = COALESCE((p_changes->>'end_date')::date, suggested_end_date)
    WHERE id = p_candidate_id;
  ELSIF p_override_type = 'reassign_candidate' AND p_candidate_id IS NOT NULL THEN
    UPDATE ia_auto_plan_candidates SET
      suggested_lead_auditor_id = COALESCE((p_changes->>'auditor_id')::uuid, suggested_lead_auditor_id)
    WHERE id = p_candidate_id;
  END IF;

  -- Capture after state
  IF p_candidate_id IS NOT NULL THEN
    SELECT jsonb_build_object('status', c.status, 'accepted', c.accepted, 'rejection_reason', c.rejection_reason,
      'suggested_lead_auditor_id', c.suggested_lead_auditor_id, 'suggested_start_date', c.suggested_start_date)
    INTO v_after FROM ia_auto_plan_candidates c WHERE c.id = p_candidate_id;
  ELSIF p_engagement_id IS NOT NULL THEN
    SELECT jsonb_build_object('status', e.status, 'is_active', e.is_active, 'lead_auditor_id', e.lead_auditor_id,
      'planned_start_date', e.planned_start_date, 'planned_end_date', e.planned_end_date)
    INTO v_after FROM ia_audit_engagements e WHERE e.id = p_engagement_id;
  END IF;

  -- Log with full governance
  INSERT INTO ia_plan_change_log (plan_id, change_type, description, changed_by, change_date, before_state, after_state, change_classification, entity_type, entity_id)
  VALUES (
    p_plan_id,
    'Manual Override: ' || p_override_type,
    p_reason || CASE WHEN p_changes != '{}'::jsonb THEN ' | Changes: ' || p_changes::text ELSE '' END,
    p_changed_by,
    now(),
    v_before,
    v_after,
    'manual_override',
    CASE WHEN p_candidate_id IS NOT NULL THEN 'candidate' ELSE 'engagement' END,
    COALESCE(p_candidate_id, p_engagement_id)
  );

  RETURN jsonb_build_object('success', true, 'override_type', p_override_type, 'before', v_before, 'after', v_after);
END;
$$;

-- ============================================================
-- RPC: ia_generate_resource_recommendations
-- ============================================================
CREATE OR REPLACE FUNCTION public.ia_generate_resource_recommendations(
  p_plan_id uuid,
  p_candidate_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate RECORD;
  v_auditor RECORD;
  v_fit_score numeric;
  v_avail_score numeric;
  v_skill_score numeric;
  v_prior_score numeric;
  v_rotation_score numeric;
  v_conflicts jsonb;
  v_workload_current numeric;
  v_rank integer;
  v_count integer := 0;
BEGIN
  -- Clear previous recommendations for this scope
  IF p_candidate_id IS NOT NULL THEN
    DELETE FROM ia_resource_recommendations WHERE plan_id = p_plan_id AND candidate_id = p_candidate_id;
  ELSE
    DELETE FROM ia_resource_recommendations WHERE plan_id = p_plan_id;
  END IF;

  -- For each candidate (or specific one)
  FOR v_candidate IN
    SELECT c.* FROM ia_auto_plan_candidates c
    WHERE c.plan_id = p_plan_id
      AND c.status IN ('Suggested', 'Accepted')
      AND (p_candidate_id IS NULL OR c.id = p_candidate_id)
  LOOP
    v_rank := 0;

    FOR v_auditor IN
      SELECT a.id, a.name, a.role, a.skills, a.certifications
      FROM ia_auditors a
      WHERE a.employment_status = 'Active'
    LOOP
      v_rank := v_rank + 1;

      -- Availability: check existing assigned hours
      SELECT COALESCE(SUM(c2.suggested_hours), 0) INTO v_workload_current
      FROM ia_auto_plan_candidates c2
      WHERE c2.plan_id = p_plan_id
        AND c2.suggested_lead_auditor_id = v_auditor.id
        AND c2.status IN ('Accepted', 'Suggested');

      v_avail_score := GREATEST(0, 100 - (v_workload_current / 2));

      -- Skill match: simple heuristic
      v_skill_score := 50; -- baseline

      -- Prior involvement: bonus if audited same department before
      SELECT CASE WHEN COUNT(*) > 0 THEN 30 ELSE 0 END INTO v_prior_score
      FROM ia_audit_engagements e
      WHERE e.lead_auditor_id = v_auditor.id
        AND e.department_id = v_candidate.department_id
        AND e.status IN ('Completed', 'Closed');

      -- Rotation: penalty if just audited same function
      SELECT CASE WHEN COUNT(*) > 0 THEN -20 ELSE 10 END INTO v_rotation_score
      FROM ia_audit_engagements e
      WHERE e.lead_auditor_id = v_auditor.id
        AND e.function_id = v_candidate.function_id
        AND e.status IN ('Completed', 'Closed')
        AND e.actual_end_date >= (CURRENT_DATE - interval '12 months');

      -- Conflicts
      v_conflicts := '[]'::jsonb;
      -- Check date overlap with existing assignments
      IF v_candidate.suggested_start_date IS NOT NULL THEN
        PERFORM 1 FROM ia_auto_plan_candidates c3
        WHERE c3.plan_id = p_plan_id
          AND c3.suggested_lead_auditor_id = v_auditor.id
          AND c3.id != v_candidate.id
          AND c3.suggested_start_date IS NOT NULL
          AND c3.suggested_start_date < COALESCE(v_candidate.suggested_end_date, v_candidate.suggested_start_date + 30)
          AND COALESCE(c3.suggested_end_date, c3.suggested_start_date + 30) > v_candidate.suggested_start_date;
        IF FOUND THEN
          v_conflicts := v_conflicts || jsonb_build_array('Schedule overlap with another assignment');
        END IF;
      END IF;

      v_fit_score := ROUND((v_avail_score * 0.35 + v_skill_score * 0.25 + v_prior_score * 0.20 + v_rotation_score * 0.20), 2);

      INSERT INTO ia_resource_recommendations (
        plan_id, candidate_id, auditor_id,
        fit_score, availability_score, skill_match_score, prior_involvement_score, rotation_score,
        reason_text, workload_hours_current,
        workload_hours_if_assigned, conflict_indicators, recommendation_rank
      ) VALUES (
        p_plan_id, v_candidate.id, v_auditor.id,
        v_fit_score, v_avail_score, v_skill_score, v_prior_score, v_rotation_score,
        'Availability: ' || ROUND(v_avail_score) || '%, Skill: ' || v_skill_score || ', Prior: ' || v_prior_score || ', Rotation: ' || v_rotation_score,
        v_workload_current,
        v_workload_current + COALESCE(v_candidate.suggested_hours, 60),
        v_conflicts,
        v_rank
      );
      v_count := v_count + 1;
    END LOOP;

    -- Re-rank by fit score
    WITH reranked AS (
      SELECT rr.id, ROW_NUMBER() OVER (PARTITION BY rr.candidate_id ORDER BY rr.fit_score DESC) AS rn
      FROM ia_resource_recommendations rr
      WHERE rr.plan_id = p_plan_id AND rr.candidate_id = v_candidate.id
    )
    UPDATE ia_resource_recommendations r SET recommendation_rank = reranked.rn
    FROM reranked WHERE r.id = reranked.id;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'recommendations_generated', v_count);
END;
$$;

-- ============================================================  
-- Add updated_by/updated_at to scoring weights for edit tracking
-- ============================================================
ALTER TABLE ia_planning_scoring_weights
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS change_reason text;

ALTER TABLE ia_risk_band_frequency_policy
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS change_reason text;
