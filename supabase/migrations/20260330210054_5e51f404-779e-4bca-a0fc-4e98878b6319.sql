
DROP FUNCTION IF EXISTS ia_check_launch_readiness(uuid);

CREATE OR REPLACE FUNCTION ia_check_launch_readiness(p_engagement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eng_name text;
  v_eng_status text;
  v_eng_approved_by text;
  v_eng_approved_at timestamptz;
  v_eng_annual_plan_id uuid;
  v_eng_department_id uuid;
  v_eng_function_id uuid;
  v_eng_lead_auditor_id uuid;
  v_eng_start date;
  v_eng_end date;
  v_eng_objectives text;
  v_eng_scope text;
  v_eng_auditee_contact text;
  v_eng_primary_auditee uuid;
  v_plan_status text;
  v_checks jsonb := '[]'::jsonb;
  v_all_passed boolean := true;
BEGIN
  SELECT engagement_name, status, approved_by, approved_at, annual_plan_id,
         department_id, function_id, lead_auditor_id, planned_start_date, planned_end_date,
         objectives, scope, auditee_contact, primary_auditee_contact_id
  INTO v_eng_name, v_eng_status, v_eng_approved_by, v_eng_approved_at, v_eng_annual_plan_id,
       v_eng_department_id, v_eng_function_id, v_eng_lead_auditor_id, v_eng_start, v_eng_end,
       v_eng_objectives, v_eng_scope, v_eng_auditee_contact, v_eng_primary_auditee
  FROM ia_audit_engagements WHERE id = p_engagement_id AND is_active = true;

  IF v_eng_name IS NULL AND v_eng_status IS NULL THEN
    RETURN jsonb_build_object('ready', false, 'checks', '[]'::jsonb, 'error', 'Engagement not found');
  END IF;

  -- 1. Engagement approved
  IF (v_eng_approved_by IS NOT NULL AND v_eng_approved_at IS NOT NULL) OR v_eng_status = 'Approved' THEN
    v_checks := v_checks || jsonb_build_object('item', 'Engagement approved', 'passed', true,
      'detail', 'Approved by ' || COALESCE(v_eng_approved_by, '-'));
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Engagement approved', 'passed', false,
      'detail', 'Status: ' || COALESCE(v_eng_status, 'Draft'));
    v_all_passed := false;
  END IF;

  -- 2. Parent plan approved
  IF v_eng_annual_plan_id IS NOT NULL THEN
    SELECT status INTO v_plan_status FROM ia_annual_plans WHERE id = v_eng_annual_plan_id;
    IF v_plan_status = 'Approved' THEN
      v_checks := v_checks || jsonb_build_object('item', 'Parent plan approved', 'passed', true);
    ELSE
      v_checks := v_checks || jsonb_build_object('item', 'Parent plan approved', 'passed', false,
        'detail', 'Plan status: ' || COALESCE(v_plan_status, 'N/A'));
      v_all_passed := false;
    END IF;
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Parent plan approved', 'passed', true, 'detail', 'Ad-hoc engagement');
  END IF;

  -- 3. Title
  IF v_eng_name IS NOT NULL AND v_eng_name != '' THEN
    v_checks := v_checks || jsonb_build_object('item', 'Engagement title defined', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Engagement title defined', 'passed', false);
    v_all_passed := false;
  END IF;

  -- 4. Department
  IF v_eng_department_id IS NOT NULL THEN
    v_checks := v_checks || jsonb_build_object('item', 'Department assigned', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Department assigned', 'passed', false);
    v_all_passed := false;
  END IF;

  -- 5. Function
  IF v_eng_function_id IS NOT NULL THEN
    v_checks := v_checks || jsonb_build_object('item', 'Business function assigned', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Business function assigned', 'passed', false);
    v_all_passed := false;
  END IF;

  -- 6. Lead auditor
  IF v_eng_lead_auditor_id IS NOT NULL THEN
    v_checks := v_checks || jsonb_build_object('item', 'Lead auditor assigned', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Lead auditor assigned', 'passed', false);
    v_all_passed := false;
  END IF;

  -- 7. Dates
  IF v_eng_start IS NOT NULL AND v_eng_end IS NOT NULL THEN
    v_checks := v_checks || jsonb_build_object('item', 'Planned dates entered', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Planned dates entered', 'passed', false,
      'detail', CASE
        WHEN v_eng_start IS NULL AND v_eng_end IS NULL THEN 'Start and end dates missing'
        WHEN v_eng_end IS NULL THEN 'End date missing'
        ELSE 'Start date missing'
      END);
    v_all_passed := false;
  END IF;

  -- 8. Objectives
  IF v_eng_objectives IS NOT NULL AND v_eng_objectives != '' THEN
    v_checks := v_checks || jsonb_build_object('item', 'Objectives defined', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Objectives defined', 'passed', false);
    v_all_passed := false;
  END IF;

  -- 9. Scope
  IF v_eng_scope IS NOT NULL AND v_eng_scope != '' THEN
    v_checks := v_checks || jsonb_build_object('item', 'Scope defined', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Scope defined', 'passed', false);
    v_all_passed := false;
  END IF;

  -- 10. Auditee contact
  IF v_eng_primary_auditee IS NOT NULL OR (v_eng_auditee_contact IS NOT NULL AND v_eng_auditee_contact != '') THEN
    v_checks := v_checks || jsonb_build_object('item', 'Auditee contact defined', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Auditee contact defined', 'passed', false);
    v_all_passed := false;
  END IF;

  RETURN jsonb_build_object('ready', v_all_passed, 'checks', v_checks);
END;
$$;
