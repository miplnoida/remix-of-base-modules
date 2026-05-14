
-- ============================================================
-- RPC: ia_capacity_schedule_candidates
-- Distributes auto-plan candidates across available auditor slots
-- ============================================================
CREATE OR REPLACE FUNCTION public.ia_capacity_schedule_candidates(
  p_plan_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate RECORD;
  v_auditor RECORD;
  v_plan_start date;
  v_plan_end date;
  v_slot_start date;
  v_assigned integer := 0;
  v_conflicts integer := 0;
BEGIN
  -- Get plan date range
  SELECT planned_start_date, planned_end_date INTO v_plan_start, v_plan_end
  FROM ia_annual_plans WHERE id = p_plan_id;
  
  v_plan_start := COALESCE(v_plan_start, CURRENT_DATE);
  v_plan_end := COALESCE(v_plan_end, v_plan_start + INTERVAL '12 months');

  -- Clear previous conflicts for this plan
  DELETE FROM ia_availability_conflicts WHERE plan_id = p_plan_id;

  v_slot_start := v_plan_start;

  -- For each accepted candidate (ordered by score), try to assign an available auditor
  FOR v_candidate IN
    SELECT c.* FROM ia_auto_plan_candidates c
    WHERE c.plan_id = p_plan_id AND c.accepted = true
    ORDER BY c.composite_score DESC
  LOOP
    -- Find least-loaded active auditor not on leave during the slot
    FOR v_auditor IN
      SELECT a.id, a.name,
        COALESCE((SELECT SUM(COALESCE(e.estimated_hours,0)) FROM ia_audit_engagements e 
          WHERE e.lead_auditor_id = a.id AND e.status NOT IN ('Completed','Closed','Cancelled')
          AND (e.is_active = true OR e.is_active IS NULL)), 0) AS current_load
      FROM ia_auditors a
      WHERE a.employment_status = 'Active' AND a.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM ia_leave_requests lr
          WHERE lr.auditor_id = a.id AND lr.status = 'Approved'
            AND lr.start_date <= v_slot_start + INTERVAL '14 days'
            AND lr.end_date >= v_slot_start
        )
      ORDER BY current_load ASC
      LIMIT 1
    LOOP
      UPDATE ia_auto_plan_candidates SET
        suggested_lead_auditor_id = v_auditor.id,
        suggested_start_date = v_slot_start,
        suggested_end_date = v_slot_start + INTERVAL '14 days',
        suggested_hours = CASE 
          WHEN composite_score >= 75 THEN 80
          WHEN composite_score >= 50 THEN 60
          WHEN composite_score >= 25 THEN 40
          ELSE 30
        END
      WHERE id = v_candidate.id;
      
      v_assigned := v_assigned + 1;
    END LOOP;

    -- Check for holiday conflicts
    IF EXISTS (
      SELECT 1 FROM ia_holidays h
      WHERE h.holiday_date BETWEEN v_slot_start AND v_slot_start + INTERVAL '14 days'
    ) THEN
      INSERT INTO ia_availability_conflicts (plan_id, engagement_id, conflict_type, conflict_details, detected_at)
      VALUES (p_plan_id, NULL, 'Holiday Overlap',
        jsonb_build_object('candidate_id', v_candidate.id, 'entity', v_candidate.entity_name, 'slot_start', v_slot_start),
        now());
      v_conflicts := v_conflicts + 1;
    END IF;

    -- Stagger slots (2 weeks apart)
    v_slot_start := v_slot_start + INTERVAL '14 days';
    IF v_slot_start > v_plan_end THEN
      v_slot_start := v_plan_start; -- wrap around
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'assigned', v_assigned,
    'conflicts_detected', v_conflicts
  );
END;
$$;

-- ============================================================
-- RPC: ia_convert_candidates_to_engagements
-- Creates actual engagements from accepted candidates
-- ============================================================
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
BEGIN
  SELECT fiscal_year INTO v_fiscal_year FROM ia_annual_plans WHERE id = p_plan_id;

  FOR v_candidate IN
    SELECT c.*, df.function_name, d.name AS dept_name
    FROM ia_auto_plan_candidates c
    LEFT JOIN ia_department_functions df ON df.id = c.function_id
    LEFT JOIN ia_departments d ON d.id = c.department_id
    WHERE c.plan_id = p_plan_id AND c.accepted = true
      AND c.status = 'Accepted'
      -- Skip if already converted
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

    INSERT INTO ia_audit_engagements (
      annual_plan_id, department_id, function_id,
      engagement_name, engagement_code, engagement_type,
      engagement_risk_rating, lead_auditor_id,
      estimated_hours, planned_start_date, planned_end_date,
      status, is_active, created_by, created_at
    ) VALUES (
      p_plan_id, v_candidate.department_id, v_candidate.function_id,
      COALESCE(v_candidate.dept_name, '') || ' - ' || COALESCE(v_candidate.function_name, 'Audit'),
      v_eng_code, 'Planned Audit',
      CASE
        WHEN v_candidate.risk_score >= 75 THEN 'Critical'
        WHEN v_candidate.risk_score >= 50 THEN 'High'
        WHEN v_candidate.risk_score >= 25 THEN 'Medium'
        ELSE 'Low'
      END,
      v_candidate.suggested_lead_auditor_id,
      v_candidate.suggested_hours,
      v_candidate.suggested_start_date,
      v_candidate.suggested_end_date,
      'Planned', true, p_created_by, now()
    );

    -- Mark candidate as converted
    UPDATE ia_auto_plan_candidates SET status = 'Converted' WHERE id = v_candidate.id;
  END LOOP;

  -- Update plan engagement count
  UPDATE ia_annual_plans SET total_department_audits = (
    SELECT COUNT(*) FROM ia_audit_engagements WHERE annual_plan_id = p_plan_id AND (is_active = true OR is_active IS NULL)
  ) WHERE id = p_plan_id;

  RETURN jsonb_build_object('success', true, 'engagements_created', v_count);
END;
$$;
