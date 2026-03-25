
-- Create ia_create_plan_header RPC: creates plan with header-only fields
CREATE OR REPLACE FUNCTION public.ia_create_plan_header(
  p_fiscal_year text,
  p_title text,
  p_objective text DEFAULT NULL,
  p_scope text DEFAULT NULL,
  p_methodology text DEFAULT NULL,
  p_created_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_existing uuid;
BEGIN
  -- Check if a plan already exists for this fiscal year
  SELECT id INTO v_existing FROM ia_annual_plans WHERE fiscal_year = p_fiscal_year LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'An annual plan already exists for fiscal year ' || p_fiscal_year, 'existing_plan_id', v_existing);
  END IF;

  INSERT INTO ia_annual_plans (fiscal_year, title, objective, scope, methodology, status, created_by, created_date)
  VALUES (p_fiscal_year, p_title, p_objective, p_scope, p_methodology, 'Draft', p_created_by, now())
  RETURNING id INTO v_plan_id;

  RETURN jsonb_build_object('success', true, 'plan_id', v_plan_id);
END;
$$;

-- Create ia_persist_plan_engagements RPC: bulk upsert engagements under a plan
CREATE OR REPLACE FUNCTION public.ia_persist_plan_engagements(
  p_plan_id uuid,
  p_engagements jsonb,
  p_created_by text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_status text;
  v_eng jsonb;
  v_eng_id uuid;
  v_inserted int := 0;
  v_updated int := 0;
  v_code text;
BEGIN
  -- Verify plan exists and is Draft
  SELECT status INTO v_plan_status FROM ia_annual_plans WHERE id = p_plan_id;
  IF v_plan_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;
  IF v_plan_status NOT IN ('Draft', 'Revision') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Engagements can only be modified on Draft or Revision plans. Current status: ' || v_plan_status);
  END IF;

  FOR v_eng IN SELECT * FROM jsonb_array_elements(p_engagements)
  LOOP
    v_eng_id := (v_eng->>'id')::uuid;
    
    IF v_eng_id IS NOT NULL THEN
      -- Update existing engagement
      UPDATE ia_audit_engagements SET
        engagement_name = COALESCE(v_eng->>'engagement_name', engagement_name),
        department_id = (v_eng->>'department_id')::uuid,
        function_id = (v_eng->>'function_id')::uuid,
        engagement_type = COALESCE(v_eng->>'engagement_type', engagement_type),
        engagement_risk_rating = COALESCE(v_eng->>'engagement_risk_rating', engagement_risk_rating),
        planned_start_date = (v_eng->>'planned_start_date')::date,
        planned_end_date = (v_eng->>'planned_end_date')::date,
        lead_auditor_id = (v_eng->>'lead_auditor_id')::uuid,
        supportive_auditor_ids = COALESCE(v_eng->'supportive_auditor_ids', '[]'::jsonb),
        scope = v_eng->>'scope',
        updated_by = p_created_by,
        updated_at = now()
      WHERE id = v_eng_id AND annual_plan_id = p_plan_id;
      v_updated := v_updated + 1;
    ELSE
      -- Generate engagement code
      v_code := 'ENG-' || to_char(now(), 'YYYYMMDD') || '-' || lpad((floor(random() * 9000 + 1000))::text, 4, '0');
      
      INSERT INTO ia_audit_engagements (
        annual_plan_id, engagement_name, engagement_code, department_id, function_id,
        engagement_type, engagement_risk_rating, planned_start_date, planned_end_date,
        lead_auditor_id, supportive_auditor_ids, scope, status, created_by, created_at
      ) VALUES (
        p_plan_id,
        v_eng->>'engagement_name',
        COALESCE(v_eng->>'engagement_code', v_code),
        (v_eng->>'department_id')::uuid,
        (v_eng->>'function_id')::uuid,
        COALESCE(v_eng->>'engagement_type', 'Planned Audit'),
        COALESCE(v_eng->>'engagement_risk_rating', 'Medium'),
        (v_eng->>'planned_start_date')::date,
        (v_eng->>'planned_end_date')::date,
        (v_eng->>'lead_auditor_id')::uuid,
        COALESCE(v_eng->'supportive_auditor_ids', '[]'::jsonb),
        v_eng->>'scope',
        'Planned',
        p_created_by,
        now()
      );
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  -- Update plan engagement count
  UPDATE ia_annual_plans 
  SET total_department_audits = (SELECT count(*) FROM ia_audit_engagements WHERE annual_plan_id = p_plan_id AND is_active = true),
      updated_at = now(), updated_by = p_created_by
  WHERE id = p_plan_id;

  RETURN jsonb_build_object('success', true, 'inserted', v_inserted, 'updated', v_updated);
END;
$$;
