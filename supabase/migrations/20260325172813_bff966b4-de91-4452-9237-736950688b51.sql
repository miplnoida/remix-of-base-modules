
-- ============================================================
-- Phase 3: ia_check_engagement_completeness + execution gate trigger
-- ============================================================

-- Function: Check engagement artefact completeness
CREATE OR REPLACE FUNCTION public.ia_check_engagement_completeness(p_engagement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eng record;
  v_gate record;
  v_evidence_count integer;
  v_wp_count integer;
  v_findings_count integer;
  v_responses_pending integer;
  v_actions_pending integer;
  v_reasons text[] := '{}';
  v_result jsonb;
BEGIN
  SELECT * INTO v_eng FROM ia_audit_engagements WHERE id = p_engagement_id;
  IF v_eng IS NULL THEN
    RETURN jsonb_build_object('passed', false, 'reasons', ARRAY['Engagement not found']);
  END IF;

  SELECT * INTO v_gate FROM ia_execution_gate_config
  WHERE gate_type = 'engagement_closure' AND is_active = true LIMIT 1;

  -- Count artefacts
  SELECT count(*) INTO v_evidence_count FROM ia_evidence WHERE engagement_id = p_engagement_id;
  SELECT count(*) INTO v_wp_count FROM ia_working_papers WHERE engagement_id = p_engagement_id;
  SELECT count(*) INTO v_findings_count FROM ia_findings WHERE engagement_id = p_engagement_id;

  IF v_gate IS NOT NULL THEN
    IF v_evidence_count < v_gate.min_evidence_count THEN
      v_reasons := v_reasons || ('Minimum ' || v_gate.min_evidence_count || ' evidence item(s) required, found ' || v_evidence_count);
    END IF;
    IF v_wp_count < v_gate.min_working_papers_count THEN
      v_reasons := v_reasons || ('Minimum ' || v_gate.min_working_papers_count || ' working paper(s) required, found ' || v_wp_count);
    END IF;
    IF v_gate.min_findings_documented AND v_findings_count = 0 THEN
      v_reasons := v_reasons || 'At least one finding must be documented';
    END IF;
    IF v_gate.require_management_responses THEN
      SELECT count(*) INTO v_responses_pending
      FROM ia_findings f LEFT JOIN ia_management_responses mr ON mr.finding_id = f.id
      WHERE f.engagement_id = p_engagement_id AND mr.id IS NULL;
      IF v_responses_pending > 0 THEN
        v_reasons := v_reasons || (v_responses_pending || ' finding(s) missing management response');
      END IF;
    END IF;
    IF v_gate.require_action_plans THEN
      SELECT count(*) INTO v_actions_pending
      FROM ia_findings f LEFT JOIN ia_action_tracking at ON at.finding_id = f.id
      WHERE f.engagement_id = p_engagement_id AND at.id IS NULL;
      IF v_actions_pending > 0 THEN
        v_reasons := v_reasons || (v_actions_pending || ' finding(s) missing action plan');
      END IF;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'passed', array_length(v_reasons, 1) IS NULL,
    'evidence_count', v_evidence_count,
    'working_papers_count', v_wp_count,
    'findings_count', v_findings_count,
    'reasons', v_reasons,
    'checked_at', now()
  );

  -- Store result on engagement
  UPDATE ia_audit_engagements SET execution_gate_status = v_result WHERE id = p_engagement_id;

  RETURN v_result;
END;
$$;

-- Trigger: Block engagement execution if parent plan not approved
CREATE OR REPLACE FUNCTION public.ia_enforce_engagement_execution_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_status text;
  v_gate_result jsonb;
BEGIN
  -- Only enforce when status changes TO an execution state
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Gate 1: Moving to execution states requires approved plan
  IF NEW.status IN ('In Progress', 'Execution', 'Fieldwork') THEN
    IF NEW.annual_plan_id IS NOT NULL THEN
      SELECT status INTO v_plan_status FROM ia_annual_plans WHERE id = NEW.annual_plan_id;
      IF v_plan_status IS NOT NULL AND v_plan_status NOT IN ('Approved', 'In Progress') THEN
        RAISE EXCEPTION 'Cannot start engagement: parent audit plan status is "%" — must be Approved or In Progress', v_plan_status;
      END IF;
    END IF;

    -- Check lead auditor assigned
    IF NEW.lead_auditor_id IS NULL THEN
      RAISE EXCEPTION 'Cannot start engagement: a lead auditor must be assigned';
    END IF;

    -- Check dates
    IF NEW.planned_start_date IS NULL OR NEW.planned_end_date IS NULL THEN
      RAISE EXCEPTION 'Cannot start engagement: planned start and end dates are required';
    END IF;
  END IF;

  -- Gate 2: Moving to closure requires artefact completeness
  IF NEW.status IN ('Completed', 'Closed') AND OLD.status NOT IN ('Completed', 'Closed') THEN
    v_gate_result := ia_check_engagement_completeness(NEW.id);
    IF NOT (v_gate_result->>'passed')::boolean THEN
      RAISE EXCEPTION 'Cannot close engagement: completeness check failed — %', v_gate_result->>'reasons';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_ia_engagement_execution_gate ON ia_audit_engagements;
CREATE TRIGGER trg_ia_engagement_execution_gate
  BEFORE UPDATE ON ia_audit_engagements
  FOR EACH ROW
  EXECUTE FUNCTION ia_enforce_engagement_execution_gate();
