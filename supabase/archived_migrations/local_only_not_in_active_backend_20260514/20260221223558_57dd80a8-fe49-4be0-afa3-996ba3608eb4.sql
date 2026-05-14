
DROP FUNCTION IF EXISTS public.initiate_ip_registration_workflow(UUID, TEXT, TEXT, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.initiate_ip_registration_workflow(
  p_unique_uuid UUID,
  p_ssn TEXT,
  p_record_name TEXT,
  p_user_id UUID DEFAULT NULL,
  p_user_code TEXT DEFAULT 'SYSTEM',
  p_source_context TEXT DEFAULT 'direct_submission'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_module_id UUID;
  v_trigger RECORD;
  v_workflow RECORD;
  v_first_step RECORD;
  v_instance_id UUID;
  v_task_id UUID;
  v_due_at TIMESTAMPTZ;
  v_task_due_at TIMESTAMPTZ;
  v_profile_name TEXT;
  v_assigned_role TEXT;
  v_existing_instance_id UUID;
BEGIN
  SELECT id INTO v_existing_instance_id
  FROM workflow_instances
  WHERE source_record_id = p_unique_uuid::TEXT
    AND source_module = 'insured_person_registration'
  LIMIT 1;

  IF v_existing_instance_id IS NOT NULL THEN
    INSERT INTO system_audit_trail (
      entity_type, entity_id, action, after_value, user_id, user_name, module
    ) VALUES (
      'workflow_instance', v_existing_instance_id::TEXT, 'workflow_initiation_skipped_duplicate',
      jsonb_build_object('reason', 'instance_already_exists', 'source_record_id', p_unique_uuid),
      p_user_id, p_user_code, p_source_context
    );
    RETURN v_existing_instance_id;
  END IF;

  SELECT id INTO v_module_id FROM app_modules WHERE name = 'insured_person_registration' LIMIT 1;
  IF v_module_id IS NULL THEN
    v_module_id := '305eaff7-8446-47e0-a7ac-186da08b91ee'::UUID;
  END IF;

  SELECT wt.id AS trigger_id, wt.workflow_id INTO v_trigger
  FROM workflow_triggers wt
  WHERE wt.module_id = v_module_id AND wt.action_name = 'submit' AND wt.is_active = TRUE
  LIMIT 1;

  IF v_trigger IS NULL THEN
    INSERT INTO system_audit_trail (
      entity_type, entity_id, action, after_value, user_id, user_name, module
    ) VALUES (
      'ip_registration', p_unique_uuid::TEXT, 'no_workflow_trigger_found',
      jsonb_build_object('module_id', v_module_id, 'action', 'submit'),
      p_user_id, p_user_code, p_source_context
    );
    RETURN NULL;
  END IF;

  SELECT id, name, default_sla_hours INTO v_workflow FROM workflow_definitions WHERE id = v_trigger.workflow_id;
  IF v_workflow IS NULL THEN RETURN NULL; END IF;

  SELECT id, step_name, step_number, sla_hours, approver_type, approver_role_ids INTO v_first_step
  FROM workflow_steps WHERE workflow_id = v_workflow.id ORDER BY step_number ASC LIMIT 1;
  IF v_first_step IS NULL THEN RETURN NULL; END IF;

  SELECT full_name INTO v_profile_name FROM profiles WHERE id = p_user_id;
  v_profile_name := COALESCE(v_profile_name, p_user_code, 'System');

  v_due_at := NOW() + MAKE_INTERVAL(hours => COALESCE(v_workflow.default_sla_hours, 24));
  v_task_due_at := NOW() + MAKE_INTERVAL(hours => COALESCE(v_first_step.sla_hours, 24));

  IF v_first_step.approver_type = 'role' AND v_first_step.approver_role_ids IS NOT NULL AND array_length(v_first_step.approver_role_ids, 1) = 1 THEN
    SELECT role_name INTO v_assigned_role FROM roles WHERE id = v_first_step.approver_role_ids[1];
  END IF;

  INSERT INTO workflow_instances (
    workflow_id, workflow_name, source_module, source_record_id, source_record_name,
    current_step_id, status, started_by, started_by_name, due_at, metadata
  ) VALUES (
    v_workflow.id, v_workflow.name, 'insured_person_registration', p_unique_uuid::TEXT, p_record_name,
    v_first_step.id, 'InProgress', p_user_id, v_profile_name, v_due_at,
    jsonb_build_object('ssn', p_ssn, 'applicant_name', p_record_name, 'source_context', p_source_context)
  ) RETURNING id INTO v_instance_id;

  INSERT INTO workflow_tasks (
    instance_id, step_id, step_name, assigned_role, status, due_at
  ) VALUES (
    v_instance_id, v_first_step.id, v_first_step.step_name, v_assigned_role, 'Pending', v_task_due_at
  ) RETURNING id INTO v_task_id;

  INSERT INTO workflow_logs (
    instance_id, step_id, step_name, action, user_id, user_name, comments
  ) VALUES (
    v_instance_id, v_first_step.id, v_first_step.step_name, 'workflow_started',
    p_user_id, v_profile_name,
    'Workflow started for IP Registration: ' || p_record_name || ' (source: ' || p_source_context || ')'
  );

  INSERT INTO system_audit_trail (
    entity_type, entity_id, action, after_value, user_id, user_name, module
  ) VALUES (
    'workflow_instance', v_instance_id::TEXT, 'workflow_initiated',
    jsonb_build_object(
      'workflow_name', v_workflow.name, 'source_record_id', p_unique_uuid,
      'ssn', p_ssn, 'first_step', v_first_step.step_name, 'task_id', v_task_id
    ),
    p_user_id, p_user_code, p_source_context
  );

  RETURN v_instance_id;
END;
$$;
