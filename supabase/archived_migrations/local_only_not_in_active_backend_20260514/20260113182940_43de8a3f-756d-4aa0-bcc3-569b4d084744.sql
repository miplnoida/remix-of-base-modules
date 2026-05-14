-- Step 1 & 4: Add Business Object Root fields to app_modules and workflow_instances

-- Add primary_table, primary_key_column, business_key_column to app_modules
ALTER TABLE public.app_modules 
ADD COLUMN IF NOT EXISTS primary_table text,
ADD COLUMN IF NOT EXISTS primary_key_column text DEFAULT 'id',
ADD COLUMN IF NOT EXISTS business_key_column text;

COMMENT ON COLUMN public.app_modules.primary_table IS 'The primary business table for this module (Business Object Root)';
COMMENT ON COLUMN public.app_modules.primary_key_column IS 'The primary key column name in the primary table (default: id)';
COMMENT ON COLUMN public.app_modules.business_key_column IS 'The business key column (e.g., SSN, registration_number) for display/reference';

-- Add Business Object Root tracking to workflow_instances
ALTER TABLE public.workflow_instances
ADD COLUMN IF NOT EXISTS primary_table text,
ADD COLUMN IF NOT EXISTS primary_key_column text,
ADD COLUMN IF NOT EXISTS primary_key_value text,
ADD COLUMN IF NOT EXISTS business_key_column text,
ADD COLUMN IF NOT EXISTS business_key_value text;

COMMENT ON COLUMN public.workflow_instances.primary_table IS 'The root table this workflow instance operates on';
COMMENT ON COLUMN public.workflow_instances.primary_key_column IS 'The primary key column name';
COMMENT ON COLUMN public.workflow_instances.primary_key_value IS 'The primary key value of the root record';
COMMENT ON COLUMN public.workflow_instances.business_key_column IS 'The business key column name for display';
COMMENT ON COLUMN public.workflow_instances.business_key_value IS 'The business key value (e.g., SSN) for display';

-- Add validation check on workflow_triggers to ensure module has Business Object Root configured
CREATE OR REPLACE FUNCTION public.validate_workflow_trigger_module()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the module has primary_table configured
  IF NEW.module_id IS NOT NULL THEN
    DECLARE
      v_primary_table text;
    BEGIN
      SELECT primary_table INTO v_primary_table
      FROM public.app_modules
      WHERE id = NEW.module_id;
      
      IF v_primary_table IS NULL THEN
        RAISE EXCEPTION 'Cannot bind workflow to module without Business Object Root (primary_table) configured';
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for validation (drop if exists first)
DROP TRIGGER IF EXISTS validate_workflow_trigger_module_trigger ON public.workflow_triggers;
CREATE TRIGGER validate_workflow_trigger_module_trigger
  BEFORE INSERT OR UPDATE ON public.workflow_triggers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_workflow_trigger_module();

-- Create a function to apply field updates from workflow actions
CREATE OR REPLACE FUNCTION public.apply_workflow_field_updates(
  p_instance_id uuid,
  p_action_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_user_name text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_instance record;
  v_field_update record;
  v_resolved_value text;
  v_old_value text;
  v_update_sql text;
  v_column_exists boolean;
  v_updates_applied jsonb := '[]'::jsonb;
BEGIN
  -- Get the workflow instance with Business Object Root info
  SELECT * INTO v_instance 
  FROM public.workflow_instances 
  WHERE id = p_instance_id;
  
  IF v_instance IS NULL THEN
    RAISE EXCEPTION 'Workflow instance not found: %', p_instance_id;
  END IF;
  
  IF v_instance.primary_table IS NULL THEN
    -- No primary table configured, skip field updates
    RETURN v_updates_applied;
  END IF;
  
  -- Loop through configured field updates for this action
  FOR v_field_update IN 
    SELECT * FROM public.workflow_action_field_updates 
    WHERE action_id = p_action_id
  LOOP
    -- Check if the field exists in the target table
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = v_instance.primary_table 
      AND column_name = v_field_update.field_name
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
      CONTINUE; -- Skip invalid columns
    END IF;
    
    -- Resolve placeholders in field value
    v_resolved_value := v_field_update.field_value;
    v_resolved_value := REPLACE(v_resolved_value, '{{current_user}}', COALESCE(p_user_name, 'System'));
    v_resolved_value := REPLACE(v_resolved_value, '{{current_user_id}}', COALESCE(p_user_id::text, ''));
    v_resolved_value := REPLACE(v_resolved_value, '{{current_date}}', CURRENT_DATE::text);
    v_resolved_value := REPLACE(v_resolved_value, '{{current_timestamp}}', CURRENT_TIMESTAMP::text);
    v_resolved_value := REPLACE(v_resolved_value, '{{workflow_status}}', v_instance.status::text);
    v_resolved_value := REPLACE(v_resolved_value, '{{workflow_id}}', v_instance.workflow_id::text);
    v_resolved_value := REPLACE(v_resolved_value, '{{instance_id}}', v_instance.id::text);
    
    -- Get old value for audit logging
    EXECUTE format(
      'SELECT %I::text FROM public.%I WHERE %I = $1',
      v_field_update.field_name,
      v_instance.primary_table,
      v_instance.primary_key_column
    ) INTO v_old_value USING v_instance.primary_key_value;
    
    -- Apply the update
    EXECUTE format(
      'UPDATE public.%I SET %I = $1, updated_at = NOW() WHERE %I = $2',
      v_instance.primary_table,
      v_field_update.field_name,
      v_instance.primary_key_column
    ) USING v_resolved_value, v_instance.primary_key_value;
    
    -- Track the update
    v_updates_applied := v_updates_applied || jsonb_build_object(
      'field_name', v_field_update.field_name,
      'old_value', v_old_value,
      'new_value', v_resolved_value
    );
    
  END LOOP;
  
  -- Log the field updates to workflow_logs
  IF jsonb_array_length(v_updates_applied) > 0 THEN
    INSERT INTO public.workflow_logs (
      instance_id,
      task_id,
      action,
      performed_by,
      performed_by_name,
      details
    ) VALUES (
      p_instance_id,
      NULL,
      'field_updates_applied',
      p_user_id,
      p_user_name,
      jsonb_build_object(
        'table', v_instance.primary_table,
        'record_key', v_instance.primary_key_value,
        'updates', v_updates_applied
      )::text
    );
  END IF;
  
  RETURN v_updates_applied;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a function to resolve notification placeholders from Business Object Root
CREATE OR REPLACE FUNCTION public.resolve_root_placeholders(
  p_template text,
  p_instance_id uuid
)
RETURNS text AS $$
DECLARE
  v_instance record;
  v_result text := p_template;
  v_record record;
  v_column_value text;
  v_placeholder text;
  v_column_name text;
BEGIN
  -- Get the workflow instance
  SELECT * INTO v_instance 
  FROM public.workflow_instances 
  WHERE id = p_instance_id;
  
  IF v_instance IS NULL OR v_instance.primary_table IS NULL THEN
    RETURN v_result;
  END IF;
  
  -- Get the root record
  EXECUTE format(
    'SELECT * FROM public.%I WHERE %I = $1',
    v_instance.primary_table,
    v_instance.primary_key_column
  ) INTO v_record USING v_instance.primary_key_value;
  
  -- Find and replace all {{root.column_name}} placeholders
  FOR v_placeholder IN 
    SELECT DISTINCT (regexp_matches(v_result, '\{\{root\.([a-zA-Z_][a-zA-Z0-9_]*)\}\}', 'g'))[1]
  LOOP
    v_column_name := v_placeholder;
    BEGIN
      EXECUTE format(
        'SELECT ($1).%I::text',
        v_column_name
      ) INTO v_column_value USING v_record;
      
      v_result := REPLACE(v_result, '{{root.' || v_column_name || '}}', COALESCE(v_column_value, ''));
    EXCEPTION WHEN OTHERS THEN
      -- Column doesn't exist, replace with empty
      v_result := REPLACE(v_result, '{{root.' || v_column_name || '}}', '');
    END;
  END LOOP;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;