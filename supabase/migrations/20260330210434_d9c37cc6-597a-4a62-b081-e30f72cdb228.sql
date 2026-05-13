
CREATE OR REPLACE FUNCTION ia_launch_engagement(p_engagement_id uuid, p_launched_by text DEFAULT 'SYSTEM')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eng_name text;
  v_eng_status text;
  v_eng_exec_status text;
  v_eng_approved_by text;
  v_eng_approved_at timestamptz;
  v_eng_annual_plan_id uuid;
  v_eng_department_id uuid;
  v_eng_function_id uuid;
  v_eng_lead_auditor_id uuid;
  v_eng_start date;
  v_eng_end date;
  v_eng_actual_start date;
  v_eng_objectives text;
  v_eng_scope text;
  v_eng_auditee_contact text;
  v_eng_primary_auditee uuid;
  v_plan_status text;
  v_errors text[] := '{}';
BEGIN
  SELECT engagement_name, status, execution_status, approved_by, approved_at, annual_plan_id,
         department_id, function_id, lead_auditor_id, planned_start_date, planned_end_date,
         actual_start_date, objectives, scope, auditee_contact, primary_auditee_contact_id
  INTO v_eng_name, v_eng_status, v_eng_exec_status, v_eng_approved_by, v_eng_approved_at, v_eng_annual_plan_id,
       v_eng_department_id, v_eng_function_id, v_eng_lead_auditor_id, v_eng_start, v_eng_end,
       v_eng_actual_start, v_eng_objectives, v_eng_scope, v_eng_auditee_contact, v_eng_primary_auditee
  FROM ia_audit_engagements WHERE id = p_engagement_id AND is_active = true;

  IF v_eng_name IS NULL AND v_eng_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Engagement not found');
  END IF;

  IF v_eng_exec_status NOT IN ('Planned', 'Ready for Launch') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Engagement already launched (current: ' || COALESCE(v_eng_exec_status, 'NULL') || ')');
  END IF;

  -- Check parent plan
  IF v_eng_annual_plan_id IS NOT NULL THEN
    SELECT status INTO v_plan_status FROM ia_annual_plans WHERE id = v_eng_annual_plan_id;
    IF v_plan_status IS NULL OR v_plan_status != 'Approved' THEN
      v_errors := array_append(v_errors, 'Parent plan not approved (status: ' || COALESCE(v_plan_status, 'N/A') || ')');
    END IF;
  END IF;

  IF v_eng_name IS NULL OR v_eng_name = '' THEN v_errors := array_append(v_errors, 'Title missing'); END IF;
  IF v_eng_department_id IS NULL THEN v_errors := array_append(v_errors, 'Department not assigned'); END IF;
  IF v_eng_function_id IS NULL THEN v_errors := array_append(v_errors, 'Function not assigned'); END IF;
  IF v_eng_lead_auditor_id IS NULL THEN v_errors := array_append(v_errors, 'Lead auditor not assigned'); END IF;
  IF v_eng_start IS NULL OR v_eng_end IS NULL THEN v_errors := array_append(v_errors, 'Planned dates missing'); END IF;
  IF v_eng_objectives IS NULL OR v_eng_objectives = '' THEN v_errors := array_append(v_errors, 'Objectives missing'); END IF;
  IF v_eng_scope IS NULL OR v_eng_scope = '' THEN v_errors := array_append(v_errors, 'Scope missing'); END IF;
  IF v_eng_primary_auditee IS NULL AND (v_eng_auditee_contact IS NULL OR v_eng_auditee_contact = '') THEN
    v_errors := array_append(v_errors, 'Auditee contact missing');
  END IF;

  IF array_length(v_errors, 1) > 0 THEN
    RETURN jsonb_build_object('success', false, 'errors', to_jsonb(v_errors),
      'error', 'Launch readiness failed: ' || array_to_string(v_errors, '; '));
  END IF;

  -- Launch
  UPDATE ia_audit_engagements SET
    execution_status = 'Notification Sent',
    status = CASE WHEN status IN ('Planned', 'Approved') THEN 'In Progress' ELSE status END,
    launched_at = now(),
    launched_by = COALESCE(p_launched_by, 'SYSTEM'),
    actual_start_date = COALESCE(v_eng_actual_start, now()::date),
    updated_at = now(),
    updated_by = COALESCE(p_launched_by, 'SYSTEM')
  WHERE id = p_engagement_id;

  INSERT INTO ia_engagement_execution_log (engagement_id, event_type, event_description, old_status, new_status, performed_by)
  VALUES (p_engagement_id, 'ENGAGEMENT_LAUNCHED', 'Engagement launched for execution',
    COALESCE(v_eng_exec_status, 'Planned'), 'Notification Sent', COALESCE(p_launched_by, 'SYSTEM'));

  RETURN jsonb_build_object('success', true, 'message', 'Engagement launched successfully', 'new_execution_status', 'Notification Sent');
END;
$$;
