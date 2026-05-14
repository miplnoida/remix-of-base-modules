-- Create a function to clone a workflow with all its configuration
CREATE OR REPLACE FUNCTION public.clone_workflow(
  p_source_workflow_id UUID,
  p_new_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_new_workflow_id UUID;
  v_source_workflow RECORD;
  v_step RECORD;
  v_action RECORD;
  v_new_step_id UUID;
  v_new_action_id UUID;
  v_step_id_map JSONB := '{}'::JSONB;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Fetch source workflow
  SELECT * INTO v_source_workflow
  FROM public.workflow_definitions
  WHERE id = p_source_workflow_id;
  
  IF v_source_workflow IS NULL THEN
    RAISE EXCEPTION 'Source workflow not found';
  END IF;
  
  -- Create new workflow definition
  INSERT INTO public.workflow_definitions (
    name,
    description,
    process_type,
    default_sla_hours,
    is_active,
    version,
    created_by,
    secured_module_id,
    secured_table
  ) VALUES (
    COALESCE(p_new_name, v_source_workflow.name || ' (Copy)'),
    v_source_workflow.description,
    v_source_workflow.process_type,
    v_source_workflow.default_sla_hours,
    false, -- Always create as inactive
    1,
    v_user_id,
    v_source_workflow.secured_module_id,
    v_source_workflow.secured_table
  )
  RETURNING id INTO v_new_workflow_id;
  
  -- Clone workflow steps and build ID mapping
  FOR v_step IN 
    SELECT * FROM public.workflow_steps 
    WHERE workflow_id = p_source_workflow_id
    ORDER BY step_number
  LOOP
    INSERT INTO public.workflow_steps (
      workflow_id,
      step_number,
      step_name,
      description,
      assigned_role,
      assigned_designation,
      action_type,
      sla_hours,
      is_final_step,
      approver_type,
      approver_role_ids,
      approver_designation_ids,
      approver_user_ids,
      parallel_approval,
      required_approvals,
      auto_approve_on_timeout,
      has_condition,
      condition_expression,
      escalation_enabled,
      escalation_notification_type,
      escalation_module_id,
      escalation_template_id
    ) VALUES (
      v_new_workflow_id,
      v_step.step_number,
      v_step.step_name,
      v_step.description,
      v_step.assigned_role,
      v_step.assigned_designation,
      v_step.action_type,
      v_step.sla_hours,
      v_step.is_final_step,
      v_step.approver_type,
      v_step.approver_role_ids,
      v_step.approver_designation_ids,
      v_step.approver_user_ids,
      v_step.parallel_approval,
      v_step.required_approvals,
      v_step.auto_approve_on_timeout,
      v_step.has_condition,
      v_step.condition_expression,
      v_step.escalation_enabled,
      v_step.escalation_notification_type,
      v_step.escalation_module_id,
      v_step.escalation_template_id
    )
    RETURNING id INTO v_new_step_id;
    
    -- Store mapping of old step ID to new step ID
    v_step_id_map := v_step_id_map || jsonb_build_object(v_step.id::text, v_new_step_id::text);
  END LOOP;
  
  -- Clone step actions with updated step references
  FOR v_step IN 
    SELECT * FROM public.workflow_steps 
    WHERE workflow_id = p_source_workflow_id
  LOOP
    FOR v_action IN 
      SELECT * FROM public.workflow_step_actions 
      WHERE step_id = v_step.id
      ORDER BY display_order
    LOOP
      INSERT INTO public.workflow_step_actions (
        step_id,
        action_name,
        action_type,
        next_step_type,
        next_step_id,
        end_state,
        is_final_action,
        display_order,
        notification_type,
        notification_module_id,
        notification_template_id
      ) VALUES (
        (v_step_id_map->>(v_step.id::text))::UUID,
        v_action.action_name,
        v_action.action_type,
        v_action.next_step_type,
        -- Map next_step_id to new step if it exists in the map
        CASE 
          WHEN v_action.next_step_id IS NOT NULL AND v_step_id_map ? (v_action.next_step_id::text)
          THEN (v_step_id_map->>(v_action.next_step_id::text))::UUID
          ELSE NULL
        END,
        v_action.end_state,
        v_action.is_final_action,
        v_action.display_order,
        v_action.notification_type,
        v_action.notification_module_id,
        v_action.notification_template_id
      )
      RETURNING id INTO v_new_action_id;
      
      -- Clone action notifications
      INSERT INTO public.workflow_action_notifications (
        action_id,
        notification_type,
        template_id
      )
      SELECT 
        v_new_action_id,
        notification_type,
        template_id
      FROM public.workflow_action_notifications
      WHERE action_id = v_action.id;
      
      -- Clone action field updates
      INSERT INTO public.workflow_action_field_updates (
        action_id,
        field_name,
        field_value,
        display_order,
        created_by
      )
      SELECT 
        v_new_action_id,
        field_name,
        field_value,
        display_order,
        v_user_id
      FROM public.workflow_action_field_updates
      WHERE action_id = v_action.id;
    END LOOP;
  END LOOP;
  
  RETURN v_new_workflow_id;
END;
$$;