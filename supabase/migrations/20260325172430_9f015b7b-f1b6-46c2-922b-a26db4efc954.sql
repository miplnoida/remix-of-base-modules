
-- ============================================================
-- Phase 2: Function 4 — ia_start_plan_approval_workflow
-- ============================================================
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
  v_conflict_result jsonb;
BEGIN
  -- Load plan
  SELECT * INTO v_plan FROM ia_annual_plans WHERE id = p_plan_id;
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  -- Determine event type
  v_event_type := CASE WHEN p_is_revision THEN 'plan_revision' ELSE 'plan_approval' END;

  -- Validate current status
  IF NOT p_is_revision AND v_plan.status NOT IN ('Draft', 'Rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan must be in Draft or Rejected status to submit');
  END IF;
  IF p_is_revision AND v_plan.status NOT IN ('Approved', 'In Progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan must be Approved or In Progress to submit a revision');
  END IF;

  -- Run conflict check
  v_conflict_result := ia_validate_team_availability(p_plan_id := p_plan_id);
  IF (v_conflict_result->>'has_blocking')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', 'Blocking team availability conflicts detected', 'conflicts', v_conflict_result->'conflicts');
  END IF;

  -- Get workflow binding
  SELECT * INTO v_binding FROM ia_plan_workflow_bindings WHERE event_type = v_event_type AND is_active = true;
  IF v_binding IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active workflow binding found for ' || v_event_type);
  END IF;

  -- Get workflow definition
  SELECT * INTO v_workflow_def FROM workflow_definitions WHERE id = v_binding.workflow_definition_id AND is_active = true;
  IF v_workflow_def IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workflow definition is inactive or missing');
  END IF;

  -- Get first step
  SELECT * INTO v_first_step FROM workflow_steps WHERE workflow_id = v_workflow_def.id ORDER BY step_number LIMIT 1;
  IF v_first_step IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Workflow has no steps configured');
  END IF;

  -- Increment version
  v_version_number := COALESCE(v_plan.current_version_number, 0) + 1;

  -- Create version snapshot
  INSERT INTO ia_plan_versions (plan_id, version_number, snapshot_data, status_at_snapshot, change_summary, created_by)
  VALUES (
    p_plan_id, v_version_number,
    to_jsonb(v_plan),
    v_plan.status,
    CASE WHEN p_is_revision THEN 'Revision submitted' ELSE 'Initial submission' END,
    p_submitted_by
  );

  -- Create workflow instance
  v_instance_id := gen_random_uuid();
  INSERT INTO workflow_instances (id, workflow_id, workflow_name, source_module, source_record_id, source_record_name,
    current_step_id, status, started_by_name, started_at, primary_table, primary_key_column, primary_key_value,
    business_key_column, business_key_value)
  VALUES (
    v_instance_id, v_workflow_def.id, v_workflow_def.name,
    'internal_audit', p_plan_id::text, COALESCE(v_plan.title, v_plan.fiscal_year),
    v_first_step.id, 'Pending', p_submitted_by, now(),
    'ia_annual_plans', 'id', p_plan_id::text,
    'title', v_plan.title
  );

  -- Create first workflow task
  v_task_id := gen_random_uuid();
  INSERT INTO workflow_tasks (id, instance_id, step_id, step_name, assigned_role, status, created_at,
    due_at)
  VALUES (
    v_task_id, v_instance_id, v_first_step.id, v_first_step.step_name,
    v_first_step.assigned_role, 'Pending', now(),
    CASE WHEN v_first_step.sla_hours IS NOT NULL THEN now() + (v_first_step.sla_hours || ' hours')::interval ELSE NULL END
  );

  -- Update plan
  UPDATE ia_annual_plans SET
    status = CASE WHEN p_is_revision THEN 'Revision Pending' ELSE 'Submitted' END,
    current_version_number = v_version_number,
    workflow_instance_id = v_instance_id,
    revision_count = CASE WHEN p_is_revision THEN COALESCE(revision_count, 0) + 1 ELSE COALESCE(revision_count, 0) END,
    submitted_date = now(),
    updated_at = now(),
    updated_by = p_submitted_by
  WHERE id = p_plan_id;

  -- Log the change
  INSERT INTO ia_plan_change_log (plan_id, change_type, description, changed_by, change_date, version_number, entity_type, requires_reapproval)
  VALUES (p_plan_id, CASE WHEN p_is_revision THEN 'revision_submitted' ELSE 'submitted' END,
    CASE WHEN p_is_revision THEN 'Plan revision submitted for re-approval (v' || v_version_number || ')' ELSE 'Plan submitted for approval (v' || v_version_number || ')' END,
    p_submitted_by, now(), v_version_number, 'plan', p_is_revision);

  RETURN jsonb_build_object(
    'success', true,
    'workflow_instance_id', v_instance_id,
    'task_id', v_task_id,
    'version_number', v_version_number,
    'new_status', CASE WHEN p_is_revision THEN 'Revision Pending' ELSE 'Submitted' END,
    'conflicts', v_conflict_result
  );
END;
$$;

-- ============================================================
-- Phase 2: Function 5 — ia_apply_plan_revision
-- ============================================================
CREATE OR REPLACE FUNCTION public.ia_apply_plan_revision(
  p_plan_id uuid,
  p_changes jsonb,
  p_requested_by text DEFAULT 'SYSTEM',
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_key text;
  v_old_value text;
  v_new_value text;
  v_has_material_change boolean := false;
  v_material_fields text[] := ARRAY['planned_start_date','planned_end_date','assigned_auditor','department_id','function_id','scope','objective'];
BEGIN
  SELECT * INTO v_plan FROM ia_annual_plans WHERE id = p_plan_id;
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
  END IF;

  IF v_plan.status NOT IN ('Approved', 'In Progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Can only revise an Approved or In Progress plan');
  END IF;

  -- Log each change
  FOR v_key IN SELECT jsonb_object_keys(p_changes) LOOP
    v_new_value := p_changes->>v_key;
    v_old_value := to_jsonb(v_plan)->>v_key;

    IF v_old_value IS DISTINCT FROM v_new_value THEN
      -- Check if material
      IF v_key = ANY(v_material_fields) THEN
        v_has_material_change := true;
      END IF;

      INSERT INTO ia_plan_change_log (plan_id, change_type, description, changed_by, change_date,
        version_number, entity_type, entity_id, requires_reapproval)
      VALUES (p_plan_id, 'field_change',
        v_key || ': "' || COALESCE(v_old_value, 'NULL') || '" → "' || COALESCE(v_new_value, 'NULL') || '"',
        p_requested_by, now(), v_plan.current_version_number, 'plan', p_plan_id, v_key = ANY(v_material_fields));

      -- Record amendment
      INSERT INTO ia_plan_amendments (plan_id, field_name, old_value, new_value, amendment_reason, amended_by, amended_at)
      VALUES (p_plan_id, v_key, v_old_value, v_new_value, p_reason, p_requested_by, now());
    END IF;
  END LOOP;

  -- If material change detected, trigger revision workflow
  IF v_has_material_change THEN
    RETURN ia_start_plan_approval_workflow(p_plan_id, p_requested_by, true);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'requires_reapproval', false,
    'message', 'Minor changes logged; no re-approval required'
  );
END;
$$;
