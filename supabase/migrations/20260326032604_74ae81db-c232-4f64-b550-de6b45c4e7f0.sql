
-- ============================================================
-- PLANNING ENGINE: Config Tables & Auto-Plan RPCs
-- ============================================================

-- 1. Scoring weights (configurable)
CREATE TABLE IF NOT EXISTS public.ia_planning_scoring_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_key text NOT NULL UNIQUE,
  factor_label text NOT NULL,
  weight numeric NOT NULL DEFAULT 0.10,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Risk band → frequency policy
CREATE TABLE IF NOT EXISTS public.ia_risk_band_frequency_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_level text NOT NULL UNIQUE,
  max_months_between_audits integer NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Auto-plan candidates cache
CREATE TABLE IF NOT EXISTS public.ia_auto_plan_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  department_id uuid,
  function_id uuid,
  entity_name text,
  risk_score numeric DEFAULT 0,
  recency_score numeric DEFAULT 0,
  findings_score numeric DEFAULT 0,
  followup_score numeric DEFAULT 0,
  compliance_score numeric DEFAULT 0,
  change_score numeric DEFAULT 0,
  composite_score numeric DEFAULT 0,
  rank_position integer,
  reason_codes jsonb DEFAULT '[]'::jsonb,
  last_audit_date date,
  frequency_policy_months integer,
  is_overdue boolean DEFAULT false,
  suggested_start_date date,
  suggested_end_date date,
  suggested_hours numeric,
  suggested_lead_auditor_id uuid,
  status text DEFAULT 'Suggested',
  accepted boolean,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ia_auto_plan_candidates_plan ON ia_auto_plan_candidates(plan_id);

-- 4. Change events table (optional signal for scoring)
CREATE TABLE IF NOT EXISTS public.ia_change_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid,
  function_id uuid,
  event_type text NOT NULL,
  event_description text,
  event_date date DEFAULT CURRENT_DATE,
  severity text DEFAULT 'Medium',
  is_active boolean DEFAULT true,
  created_by text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RPC 1: ia_resolve_last_audit_date
-- ============================================================
CREATE OR REPLACE FUNCTION public.ia_resolve_last_audit_date(
  p_function_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_date date;
  v_source text;
BEGIN
  -- Try from completed engagements first
  IF p_function_id IS NOT NULL THEN
    SELECT MAX(e.actual_end_date) INTO v_last_date
    FROM ia_audit_engagements e
    WHERE e.function_id = p_function_id
      AND e.status IN ('Completed', 'Closed')
      AND e.actual_end_date IS NOT NULL
      AND (e.is_active = true OR e.is_active IS NULL);
    IF v_last_date IS NOT NULL THEN
      v_source := 'engagement_actual';
    END IF;
  END IF;

  -- Fallback: department-level engagement
  IF v_last_date IS NULL AND p_department_id IS NOT NULL THEN
    SELECT MAX(e.actual_end_date) INTO v_last_date
    FROM ia_audit_engagements e
    WHERE e.department_id = p_department_id
      AND e.status IN ('Completed', 'Closed')
      AND e.actual_end_date IS NOT NULL
      AND (e.is_active = true OR e.is_active IS NULL);
    IF v_last_date IS NOT NULL THEN
      v_source := 'department_engagement';
    END IF;
  END IF;

  -- Fallback: stored in department_functions
  IF v_last_date IS NULL AND p_function_id IS NOT NULL THEN
    SELECT df.last_audit_date INTO v_last_date
    FROM ia_department_functions df WHERE df.id = p_function_id AND df.is_active = true;
    IF v_last_date IS NOT NULL THEN
      v_source := 'function_stored';
    END IF;
  END IF;

  -- Fallback: audit universe
  IF v_last_date IS NULL THEN
    SELECT au.last_audit_date INTO v_last_date
    FROM ia_audit_universe au
    WHERE (p_function_id IS NOT NULL AND au.function_id = p_function_id)
       OR (p_department_id IS NOT NULL AND au.department_id = p_department_id)
    LIMIT 1;
    IF v_last_date IS NOT NULL THEN
      v_source := 'audit_universe';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'last_audit_date', v_last_date,
    'source', COALESCE(v_source, 'none'),
    'months_since', CASE WHEN v_last_date IS NOT NULL
      THEN EXTRACT(EPOCH FROM (CURRENT_DATE - v_last_date)) / 2592000
      ELSE NULL END
  );
END;
$$;

-- ============================================================
-- RPC 2: ia_compute_engagement_priority_score
-- ============================================================
CREATE OR REPLACE FUNCTION public.ia_compute_engagement_priority_score(
  p_department_id uuid DEFAULT NULL,
  p_function_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w_risk numeric; w_recency numeric; w_findings numeric;
  w_followup numeric; w_compliance numeric; w_change numeric;
  v_risk_score numeric := 50;
  v_recency_score numeric := 0;
  v_findings_score numeric := 0;
  v_followup_score numeric := 0;
  v_compliance_score numeric := 0;
  v_change_score numeric := 0;
  v_composite numeric;
  v_last_audit jsonb;
  v_freq_months integer;
  v_months_since numeric;
  v_reasons jsonb := '[]'::jsonb;
BEGIN
  -- Load weights
  SELECT COALESCE(MAX(CASE WHEN factor_key='risk' THEN weight END), 0.35),
         COALESCE(MAX(CASE WHEN factor_key='recency' THEN weight END), 0.20),
         COALESCE(MAX(CASE WHEN factor_key='findings' THEN weight END), 0.15),
         COALESCE(MAX(CASE WHEN factor_key='followup' THEN weight END), 0.10),
         COALESCE(MAX(CASE WHEN factor_key='compliance' THEN weight END), 0.10),
         COALESCE(MAX(CASE WHEN factor_key='change' THEN weight END), 0.10)
  INTO w_risk, w_recency, w_findings, w_followup, w_compliance, w_change
  FROM ia_planning_scoring_weights WHERE is_active = true;

  -- 1. Risk score (0-100 from assessments)
  IF p_function_id IS NOT NULL THEN
    SELECT COALESCE(ra.overall_risk_score, 50) INTO v_risk_score
    FROM ia_risk_assessments ra
    WHERE ra.function_id = p_function_id AND ra.is_active = true
    ORDER BY ra.assessment_date DESC LIMIT 1;
  ELSIF p_department_id IS NOT NULL THEN
    SELECT COALESCE(AVG(ra.overall_risk_score), 50) INTO v_risk_score
    FROM ia_risk_assessments ra
    JOIN ia_department_functions df ON df.id = ra.function_id
    WHERE df.department_id = p_department_id AND ra.is_active = true;
  END IF;
  IF v_risk_score >= 75 THEN v_reasons := v_reasons || '"HIGH_RISK"'::jsonb; END IF;

  -- 2. Recency score
  v_last_audit := ia_resolve_last_audit_date(p_function_id, p_department_id);
  v_months_since := (v_last_audit->>'months_since')::numeric;
  
  -- Get frequency policy
  SELECT rbfp.max_months_between_audits INTO v_freq_months
  FROM ia_risk_band_frequency_policy rbfp
  WHERE rbfp.risk_level = (
    CASE
      WHEN v_risk_score >= 75 THEN 'Critical'
      WHEN v_risk_score >= 50 THEN 'High'
      WHEN v_risk_score >= 25 THEN 'Medium'
      ELSE 'Low'
    END
  ) AND rbfp.is_active = true;
  v_freq_months := COALESCE(v_freq_months, 24);

  IF v_months_since IS NOT NULL THEN
    v_recency_score := LEAST(100, (v_months_since / v_freq_months) * 100);
    IF v_months_since > v_freq_months THEN
      v_reasons := v_reasons || '"OVERDUE_FREQUENCY"'::jsonb;
    END IF;
  ELSE
    v_recency_score := 80; -- Never audited = high priority
    v_reasons := v_reasons || '"NEVER_AUDITED"'::jsonb;
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

  -- 4. Overdue follow-up/action score
  SELECT LEAST(100, COUNT(*) * 25) INTO v_followup_score
  FROM ia_action_tracking a
  WHERE a.status NOT IN ('Completed', 'Closed', 'Verified')
    AND a.due_date < CURRENT_DATE
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
    AND ce.event_date >= CURRENT_DATE - INTERVAL '12 months'
    AND (
      (p_department_id IS NOT NULL AND ce.department_id = p_department_id) OR
      (p_function_id IS NOT NULL AND ce.function_id = p_function_id)
    );
  IF v_change_score > 0 THEN v_reasons := v_reasons || '"RECENT_CHANGES"'::jsonb; END IF;

  -- Composite
  v_composite := ROUND(
    (w_risk * v_risk_score) + (w_recency * v_recency_score) + (w_findings * v_findings_score) +
    (w_followup * v_followup_score) + (w_compliance * v_compliance_score) + (w_change * v_change_score), 2
  );

  RETURN jsonb_build_object(
    'composite_score', v_composite,
    'risk_score', ROUND(v_risk_score, 2),
    'recency_score', ROUND(v_recency_score, 2),
    'findings_score', ROUND(v_findings_score, 2),
    'followup_score', ROUND(v_followup_score, 2),
    'compliance_score', ROUND(v_compliance_score, 2),
    'change_score', ROUND(v_change_score, 2),
    'reason_codes', v_reasons,
    'last_audit_date', v_last_audit->>'last_audit_date',
    'frequency_months', v_freq_months,
    'is_overdue', COALESCE(v_months_since > v_freq_months, true)
  );
END;
$$;

-- ============================================================
-- RPC 3: ia_generate_auto_plan_candidates
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
BEGIN
  -- Clear previous candidates for this plan
  DELETE FROM ia_auto_plan_candidates WHERE plan_id = p_plan_id;

  -- Iterate all active functions
  FOR v_func IN
    SELECT df.id AS function_id, df.department_id, df.function_name,
           d.name AS dept_name
    FROM ia_department_functions df
    JOIN ia_departments d ON d.id = df.department_id
    WHERE df.is_active = true AND d.is_active = true
    ORDER BY df.department_id, df.function_name
  LOOP
    v_score := ia_compute_engagement_priority_score(v_func.department_id, v_func.function_id);

    INSERT INTO ia_auto_plan_candidates (
      plan_id, department_id, function_id, entity_name,
      risk_score, recency_score, findings_score, followup_score,
      compliance_score, change_score, composite_score,
      reason_codes, last_audit_date, frequency_policy_months,
      is_overdue, status
    ) VALUES (
      p_plan_id, v_func.department_id, v_func.function_id,
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
      (v_score->>'is_overdue')::boolean,
      'Suggested'
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

  RETURN jsonb_build_object('success', true, 'candidates_generated', v_count);
END;
$$;

-- ============================================================
-- RPC 4: ia_apply_manual_override
-- ============================================================
CREATE OR REPLACE FUNCTION public.ia_apply_manual_override(
  p_plan_id uuid,
  p_override_type text,  -- 'add_engagement', 'remove_engagement', 'reschedule', 'change_team', 'change_risk'
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
BEGIN
  -- Log the override in change log
  INSERT INTO ia_plan_change_log (plan_id, change_type, description, changed_by, change_date)
  VALUES (
    p_plan_id,
    'Manual Override: ' || p_override_type,
    p_reason || ' | Changes: ' || p_changes::text,
    p_changed_by,
    now()
  );

  -- Handle candidate acceptance
  IF p_override_type = 'accept_candidate' AND p_candidate_id IS NOT NULL THEN
    UPDATE ia_auto_plan_candidates SET accepted = true, status = 'Accepted' WHERE id = p_candidate_id;
  ELSIF p_override_type = 'reject_candidate' AND p_candidate_id IS NOT NULL THEN
    UPDATE ia_auto_plan_candidates SET accepted = false, status = 'Rejected', rejection_reason = p_reason WHERE id = p_candidate_id;
  ELSIF p_override_type = 'remove_engagement' AND p_engagement_id IS NOT NULL THEN
    UPDATE ia_audit_engagements SET is_active = false, updated_by = p_changed_by, updated_at = now()
    WHERE id = p_engagement_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'override_type', p_override_type);
END;
$$;
