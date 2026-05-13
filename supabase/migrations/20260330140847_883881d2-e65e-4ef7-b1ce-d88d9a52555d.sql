DROP FUNCTION IF EXISTS public.ia_start_plan_approval_workflow(uuid, text, boolean);
DROP FUNCTION IF EXISTS public.ia_start_plan_approval_workflow(uuid, text);
DROP FUNCTION IF EXISTS public.ia_start_plan_approval_workflow(uuid);

CREATE OR REPLACE FUNCTION public.ia_start_plan_approval_workflow(
  p_plan_id uuid,
  p_submitted_by text DEFAULT 'SYSTEM',
  p_is_revision boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_event_type text;
  v_binding record;
  v_workflow_def record;
  v_first_step record;
  v_instance_id uuid;
  v_task_id uuid;
  v_version_number integer;
  v_version_id uuid;
  v_conflict_result jsonb;
  v_eng record;
  v_user_id uuid;
BEGIN
  BEGIN
    v_user_id := p_submitted_by::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    SELECT id INTO v_user_id FROM profiles WHERE user_code = p_submitted_by LIMIT 1;
  END;
  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;

  SELECT * INTO v_plan FROM ia_annual_plans WHERE id = p_plan_id;
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  v_event_type := CASE WHEN p_is_revision THEN 'plan_revision' ELSE 'plan_approval' END;

  IF NOT p_is_revision AND v_plan.status NOT IN ('Draft', 'Rejected', 'Changes Requested', 'Amendment Pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan must be in Draft, Rejected, Changes Requested, or Amendment Pending status to submit');
  END IF;
  IF p_is_revision AND v_plan.status NOT IN ('Approved', 'In Progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan must be Approved or In Progress to submit a revision');
  END IF;

  v_conflict_result := ia_validate_team_availability(p_plan_id := p_plan_id);
  IF (v_conflict_result->>'has_blocking')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Blocking team availability conflicts detected', 'conflicts', v_conflict_result->'conflicts');
  END IF;

  SELECT * INTO v_binding FROM ia_plan_workflow_bindings WHERE event_type = v_event_type AND is_active = true;
  IF v_binding IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workflow binding found for ' || v_event_type);
  END IF;

  SELECT * INTO v_workflow_def FROM workflow_definitions WHERE id = v_binding.workflow_definition_id AND is_active = true;
  IF v_workflow_def IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workflow definition is inactive or missing');
  END IF;

  SELECT * INTO v_first_step FROM workflow_steps WHERE workflow_id = v_workflow_def.id ORDER BY step_number LIMIT 1;
  IF v_first_step IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workflow has no steps configured');
  END IF;

  v_version_number := COALESCE(v_plan.current_version_number, 0) + 1;

  INSERT INTO ia_plan_versions (plan_id, version_number, snapshot_data, status_at_snapshot, change_summary, created_by)
  VALUES (
    p_plan_id, v_version_number,
    to_jsonb(v_plan),
    v_plan.status,
    CASE WHEN p_is_revision THEN 'Revision submitted' ELSE 'Initial submission' END,
    p_submitted_by
  )
  RETURNING id INTO v_version_id;

  FOR v_eng IN 
    SELECT * FROM ia_audit_engagements 
    WHERE annual_plan_id = p_plan_id AND (is_active = true OR is_active IS NULL)
  LOOP
    INSERT INTO ia_plan_version_engagements (plan_version_id, engagement_id, engagement_snapshot, change_type)
    VALUES (
      v_version_id,
      v_eng.id,
      to_jsonb(v_eng),
      CASE WHEN v_version_number = 1 THEN 'added' ELSE 'inherited' END
    );
  END LOOP;

  INSERT INTO workflow_instances (
    workflow_id, workflow_name, source_module, source_record_id, source_record_name,
    current_step_id, status, started_by, started_by_name, metadata
  )
  VALUES (
    v_workflow_def.id, v_workflow_def.name,
    'ia_annual_plan', p_plan_id::text, v_plan.title,
    v_first_step.id, 'InProgress', v_user_id, p_submitted_by,
    jsonb_build_object('version_number', v_version_number, 'is_revision', p_is_revision, 'plan_version_id', v_version_id)
  )
  RETURNING id INTO v_instance_id;

  INSERT INTO workflow_tasks (instance_id, step_id, step_name, status)
  VALUES (v_instance_id, v_first_step.id, v_first_step.step_name, 'Pending')
  RETURNING id INTO v_task_id;

  INSERT INTO workflow_logs (instance_id, step_id, step_name, action, user_id, user_name, comments)
  VALUES (v_instance_id, v_first_step.id, v_first_step.step_name, 'workflow_started', v_user_id, p_submitted_by,
    'Plan ' || CASE WHEN p_is_revision THEN 'revision' ELSE 'approval' END || ' workflow started (v' || v_version_number || ')');

  UPDATE ia_annual_plans
  SET status = CASE WHEN p_is_revision THEN 'Pending Revision Approval' ELSE 'Submitted' END,
      current_version_number = v_version_number,
      workflow_instance_id = v_instance_id,
      updated_at = now(),
      updated_by = p_submitted_by
  WHERE id = p_plan_id;

  RETURN jsonb_build_object(
    'success', true,
    'workflow_instance_id', v_instance_id,
    'task_id', v_task_id,
    'version_number', v_version_number,
    'plan_version_id', v_version_id,
    'new_status', CASE WHEN p_is_revision THEN 'Pending Revision Approval' ELSE 'Submitted' END,
    'engagements_snapshot_count', (SELECT count(*) FROM ia_plan_version_engagements WHERE plan_version_id = v_version_id)
  );
END;
$$;