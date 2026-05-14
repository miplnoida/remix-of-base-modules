
CREATE OR REPLACE FUNCTION ia_check_launch_readiness(p_engagement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eng record;
  v_plan record;
  v_checks jsonb := '[]'::jsonb;
  v_all_passed boolean := true;
BEGIN
  SELECT * INTO v_eng FROM ia_audit_engagements WHERE id = p_engagement_id AND is_active = true;
  IF v_eng IS NULL THEN
    RETURN jsonb_build_object('ready', false, 'checks', '[]'::jsonb, 'error', 'Engagement not found');
  END IF;

  -- 1. Engagement approved
  IF (v_eng.approved_by IS NOT NULL AND v_eng.approved_at IS NOT NULL) OR v_eng.status = 'Approved' THEN
    v_checks := v_checks || jsonb_build_object('item', 'Engagement approved', 'passed', true, 
      'detail', 'Approved by ' || COALESCE(v_eng.approved_by, '-'));
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Engagement approved', 'passed', false, 'detail', 'Status: ' || COALESCE(v_eng.status, 'Draft'));
    v_all_passed := false;
  END IF;

  -- 2. Parent plan approved
  IF v_eng.annual_plan_id IS NOT NULL THEN
    SELECT * INTO v_plan FROM ia_annual_plans WHERE id = v_eng.annual_plan_id;
    IF v_plan IS NOT NULL AND v_plan.status = 'Approved' THEN
      v_checks := v_checks || jsonb_build_object('item', 'Parent plan approved', 'passed', true);
    ELSE
      v_checks := v_checks || jsonb_build_object('item', 'Parent plan approved', 'passed', false, 'detail', 'Plan status: ' || COALESCE(v_plan.status, 'N/A'));
      v_all_passed := false;
    END IF;
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Parent plan approved', 'passed', true, 'detail', 'Ad-hoc engagement');
  END IF;

  -- 3. Engagement title
  IF v_eng.engagement_name IS NOT NULL AND v_eng.engagement_name != '' THEN
    v_checks := v_checks || jsonb_build_object('item', 'Engagement title defined', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Engagement title defined', 'passed', false);
    v_all_passed := false;
  END IF;

  -- 4. Department assigned
  IF v_eng.department_id IS NOT NULL THEN
    v_checks := v_checks || jsonb_build_object('item', 'Department assigned', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Department assigned', 'passed', false);
    v_all_passed := false;
  END IF;

  -- 5. Business function assigned
  IF v_eng.function_id IS NOT NULL THEN
    v_checks := v_checks || jsonb_build_object('item', 'Business function assigned', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Business function assigned', 'passed', false);
    v_all_passed := false;
  END IF;

  -- 6. Lead auditor assigned
  IF v_eng.lead_auditor_id IS NOT NULL THEN
    v_checks := v_checks || jsonb_build_object('item', 'Lead auditor assigned', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Lead auditor assigned', 'passed', false);
    v_all_passed := false;
  END IF;

  -- 7. Planned dates
  IF v_eng.planned_start_date IS NOT NULL AND v_eng.planned_end_date IS NOT NULL THEN
    v_checks := v_checks || jsonb_build_object('item', 'Planned dates entered', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Planned dates entered', 'passed', false, 
      'detail', CASE 
        WHEN v_eng.planned_start_date IS NULL AND v_eng.planned_end_date IS NULL THEN 'Start and end dates missing'
        WHEN v_eng.planned_end_date IS NULL THEN 'End date missing'
        ELSE 'Start date missing'
      END);
    v_all_passed := false;
  END IF;

  -- 8. Objectives
  IF v_eng.objectives IS NOT NULL AND v_eng.objectives != '' THEN
    v_checks := v_checks || jsonb_build_object('item', 'Objectives defined', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Objectives defined', 'passed', false);
    v_all_passed := false;
  END IF;

  -- 9. Scope
  IF v_eng.scope IS NOT NULL AND v_eng.scope != '' THEN
    v_checks := v_checks || jsonb_build_object('item', 'Scope defined', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Scope defined', 'passed', false);
    v_all_passed := false;
  END IF;

  -- 10. Auditee contact
  IF v_eng.primary_auditee_contact_id IS NOT NULL OR (v_eng.auditee_contact IS NOT NULL AND v_eng.auditee_contact != '') THEN
    v_checks := v_checks || jsonb_build_object('item', 'Auditee contact defined', 'passed', true);
  ELSE
    v_checks := v_checks || jsonb_build_object('item', 'Auditee contact defined', 'passed', false);
    v_all_passed := false;
  END IF;

  RETURN jsonb_build_object('ready', v_all_passed, 'checks', v_checks);
END;
$$;
