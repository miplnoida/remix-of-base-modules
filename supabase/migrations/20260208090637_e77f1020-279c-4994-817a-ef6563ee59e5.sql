-- Update schedule_meeting function to also update the current workflow task
CREATE OR REPLACE FUNCTION public.schedule_meeting(
  p_application_reference character varying,
  p_workflow_instance_id uuid,
  p_workflow_id uuid,
  p_step_id uuid,
  p_action_config_id uuid,
  p_meeting_type meeting_type,
  p_meeting_date date,
  p_meeting_time time without time zone,
  p_contact_person character varying,
  p_contact_email character varying DEFAULT NULL::character varying,
  p_contact_phone character varying DEFAULT NULL::character varying,
  p_office_address text DEFAULT NULL::text,
  p_remarks text DEFAULT NULL::text,
  p_user_id uuid DEFAULT NULL::uuid,
  p_user_name character varying DEFAULT NULL::character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_meeting_ref TEXT;
  v_meeting_id UUID;
  v_default_address TEXT;
  v_task_id UUID;
BEGIN
  -- Generate meeting reference
  v_meeting_ref := generate_meeting_reference();
  
  -- Get default office address if not provided
  IF p_office_address IS NULL THEN
    SELECT setting_value INTO v_default_address
    FROM system_settings
    WHERE setting_key = 'default_office_address';
  ELSE
    v_default_address := p_office_address;
  END IF;
  
  -- Create meeting record
  INSERT INTO meetings (
    meeting_reference,
    application_reference,
    workflow_instance_id,
    workflow_id,
    step_id,
    action_config_id,
    meeting_type,
    status,
    meeting_date,
    meeting_time,
    contact_person,
    contact_email,
    contact_phone,
    office_address,
    remarks,
    scheduled_by,
    scheduled_by_name,
    created_by
  ) VALUES (
    v_meeting_ref,
    p_application_reference,
    p_workflow_instance_id,
    p_workflow_id,
    p_step_id,
    p_action_config_id,
    p_meeting_type,
    'Scheduled',
    p_meeting_date,
    p_meeting_time,
    p_contact_person,
    p_contact_email,
    p_contact_phone,
    v_default_address,
    p_remarks,
    p_user_id,
    p_user_name,
    LEFT(p_user_name, 10)
  )
  RETURNING id INTO v_meeting_id;
  
  -- Create history record
  INSERT INTO meeting_history (
    meeting_id,
    new_status,
    action_taken,
    new_date,
    new_time,
    remarks,
    performed_by,
    performed_by_name
  ) VALUES (
    v_meeting_id,
    'Scheduled',
    'CREATED',
    p_meeting_date,
    p_meeting_time,
    'Meeting scheduled',
    p_user_id,
    p_user_name
  );
  
  -- Update workflow instance status to AwaitingMeeting and store meeting reference in metadata
  IF p_workflow_instance_id IS NOT NULL THEN
    UPDATE workflow_instances
    SET status = 'AwaitingMeeting',
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'awaiting_meeting_id', v_meeting_id,
          'meeting_reference', v_meeting_ref,
          'meeting_scheduled_at', NOW()
        ),
        updated_at = NOW()
    WHERE id = p_workflow_instance_id;
    
    -- Get and update the current pending/in-progress task to Paused status
    SELECT id INTO v_task_id
    FROM workflow_tasks
    WHERE instance_id = p_workflow_instance_id
      AND status IN ('Pending', 'InProgress')
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_task_id IS NOT NULL THEN
      UPDATE workflow_tasks
      SET status = 'Paused',
          action_taken = 'Schedule Meeting',
          comments = 'Awaiting meeting outcome. Meeting ref: ' || v_meeting_ref
      WHERE id = v_task_id;
      
      -- Log the workflow action
      INSERT INTO workflow_logs (
        instance_id,
        task_id,
        step_id,
        action,
        performed_by,
        performed_by_name,
        details
      ) VALUES (
        p_workflow_instance_id,
        v_task_id,
        p_step_id,
        'Schedule Meeting',
        p_user_id,
        p_user_name,
        'Meeting scheduled: ' || v_meeting_ref || '. Workflow paused until meeting outcome.'
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'meeting_id', v_meeting_id,
    'meeting_reference', v_meeting_ref,
    'message', 'Meeting scheduled successfully'
  );
END;
$function$;