-- Step 1: Add security binding fields to workflow_definitions (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_definitions' AND column_name = 'secured_module_id') THEN
    ALTER TABLE public.workflow_definitions ADD COLUMN secured_module_id uuid REFERENCES app_modules(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_definitions' AND column_name = 'secured_table') THEN
    ALTER TABLE public.workflow_definitions ADD COLUMN secured_table text;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_security ON workflow_definitions(secured_module_id, secured_table);

-- Drop and recreate the audit log to ensure correct structure
DROP TABLE IF EXISTS public.workflow_security_audit_log CASCADE;

-- Step 6: Create workflow_security_audit_log table for logging access
CREATE TABLE public.workflow_security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id uuid REFERENCES workflow_instances(id),
  workflow_definition_id uuid REFERENCES workflow_definitions(id),
  user_id uuid,
  user_name text,
  action text NOT NULL,
  record_id uuid,
  record_table text,
  fields_viewed text[],
  fields_edited text[],
  rules_applied jsonb,
  access_granted boolean NOT NULL DEFAULT false,
  denial_reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on the audit log
ALTER TABLE public.workflow_security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the audit log
CREATE POLICY "Admins can view workflow security audit logs"
  ON public.workflow_security_audit_log FOR SELECT
  USING (is_admin(auth.uid()));

-- System can insert audit logs
CREATE POLICY "System can insert workflow security audit logs"
  ON public.workflow_security_audit_log FOR INSERT
  WITH CHECK (true);

-- Step 2 & 3: Create function to check workflow task access
CREATE OR REPLACE FUNCTION check_workflow_task_access(
  _user_id uuid,
  _workflow_instance_id uuid,
  _action text DEFAULT 'view'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workflow workflow_instances;
  v_definition workflow_definitions;
  v_user_profile profiles;
  v_is_admin boolean := false;
  v_row_access jsonb;
  v_field_rules jsonb;
  v_result jsonb;
  v_has_task_assignment boolean := false;
  v_secured_table text;
  v_secured_module_id uuid;
BEGIN
  -- Get user profile
  SELECT * INTO v_user_profile FROM profiles WHERE id = _user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'User not found');
  END IF;
  
  -- Check if user is admin using the existing function
  v_is_admin := is_admin(_user_id);
  
  -- Admin bypasses all checks
  IF v_is_admin THEN
    RETURN jsonb_build_object(
      'allowed', true, 
      'reason', 'Admin access',
      'is_admin', true,
      'visible_fields', '[]'::jsonb,
      'editable_fields', '[]'::jsonb,
      'available_actions', '["approve","reject","query","send_back"]'::jsonb
    );
  END IF;
  
  -- Get workflow instance
  SELECT * INTO v_workflow FROM workflow_instances WHERE id = _workflow_instance_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Workflow instance not found');
  END IF;
  
  -- Get workflow definition
  SELECT * INTO v_definition FROM workflow_definitions WHERE id = v_workflow.workflow_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Workflow definition not found');
  END IF;
  
  v_secured_table := v_definition.secured_table;
  v_secured_module_id := v_definition.secured_module_id;
  
  -- Check if user has task assignment (by role, designation, or direct assignment)
  SELECT EXISTS (
    SELECT 1 FROM workflow_tasks wt
    WHERE wt.instance_id = _workflow_instance_id
    AND wt.status IN ('Pending', 'InProgress')
    AND (
      wt.assigned_user_id = _user_id
      OR wt.assigned_role_id IN (SELECT role_id FROM user_roles WHERE user_id = _user_id)
      OR wt.assigned_designation_id = v_user_profile.designation_id
    )
  ) INTO v_has_task_assignment;
  
  IF NOT v_has_task_assignment THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'No task assignment for this user');
  END IF;
  
  -- If no secured table is defined, allow access with no field restrictions
  IF v_secured_table IS NULL OR v_secured_table = '' THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'No security binding defined',
      'visible_fields', '[]'::jsonb,
      'editable_fields', '[]'::jsonb,
      'available_actions', '["approve","reject","query","send_back"]'::jsonb
    );
  END IF;
  
  -- Check row-level access via data_scope_rules
  v_row_access := check_row_access(_user_id, '', v_secured_table, _action);
  
  IF NOT COALESCE((v_row_access->>'allowed')::boolean, false) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', COALESCE(v_row_access->>'reason', 'Row access denied'),
      'scope_rules_applied', v_row_access->'rules_applied'
    );
  END IF;
  
  -- Get field visibility rules
  v_field_rules := get_visible_fields(_user_id, '', v_secured_table);
  
  -- Build available actions based on action permissions
  v_result := jsonb_build_object(
    'allowed', true,
    'reason', 'Access granted via data policies',
    'workflow_instance_id', _workflow_instance_id,
    'secured_table', v_secured_table,
    'visible_fields', v_field_rules,
    'editable_fields', (
      SELECT COALESCE(jsonb_agg(f), '[]'::jsonb)
      FROM jsonb_array_elements(v_field_rules) f
      WHERE (f->>'can_edit')::boolean = true
    ),
    'scope_rules_applied', v_row_access->'rules_applied',
    'available_actions', CASE 
      WHEN COALESCE((v_row_access->>'can_edit')::boolean, false) THEN '["approve","reject","query","send_back"]'::jsonb
      ELSE '["view"]'::jsonb
    END
  );
  
  RETURN v_result;
END;
$$;

-- Step 5: Create function to find next eligible approver with data access
CREATE OR REPLACE FUNCTION find_eligible_approver(
  _workflow_instance_id uuid,
  _step_id uuid,
  _exclude_users uuid[] DEFAULT '{}'::uuid[]
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  has_data_access boolean,
  access_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step workflow_steps;
  v_workflow workflow_instances;
  v_definition workflow_definitions;
BEGIN
  -- Get the step configuration
  SELECT * INTO v_step FROM workflow_steps WHERE id = _step_id;
  SELECT * INTO v_workflow FROM workflow_instances WHERE id = _workflow_instance_id;
  SELECT * INTO v_definition FROM workflow_definitions WHERE id = v_workflow.workflow_id;
  
  -- Find users matching the step assignment criteria
  RETURN QUERY
  WITH potential_approvers AS (
    SELECT DISTINCT p.id as uid, p.full_name as uname
    FROM profiles p
    LEFT JOIN user_roles ur ON ur.user_id = p.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE p.is_active = true
    AND NOT (p.id = ANY(_exclude_users))
    AND (
      -- Match by role
      (v_step.assigned_role IS NOT NULL AND r.name = v_step.assigned_role)
      -- Match by designation
      OR (v_step.assigned_designation IS NOT NULL AND p.designation_id IN (
        SELECT d.id FROM designations d WHERE d.name = v_step.assigned_designation
      ))
    )
  )
  SELECT 
    pa.uid as user_id,
    pa.uname as user_name,
    COALESCE((check_workflow_task_access(pa.uid, _workflow_instance_id, 'edit')->>'allowed')::boolean, false) as has_data_access,
    check_workflow_task_access(pa.uid, _workflow_instance_id, 'edit') as access_details
  FROM potential_approvers pa
  WHERE COALESCE((check_workflow_task_access(pa.uid, _workflow_instance_id, 'edit')->>'allowed')::boolean, false) = true
  ORDER BY pa.uname;
END;
$$;

-- Step 6: Create function to log workflow security events
CREATE OR REPLACE FUNCTION log_workflow_security_event(
  _workflow_instance_id uuid,
  _user_id uuid,
  _action text,
  _record_id uuid DEFAULT NULL,
  _fields_viewed text[] DEFAULT NULL,
  _fields_edited text[] DEFAULT NULL,
  _rules_applied jsonb DEFAULT NULL,
  _access_granted boolean DEFAULT true,
  _denial_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_workflow workflow_instances;
  v_user profiles;
BEGIN
  SELECT * INTO v_workflow FROM workflow_instances WHERE id = _workflow_instance_id;
  SELECT * INTO v_user FROM profiles WHERE id = _user_id;
  
  INSERT INTO workflow_security_audit_log (
    workflow_instance_id,
    workflow_definition_id,
    user_id,
    user_name,
    action,
    record_id,
    record_table,
    fields_viewed,
    fields_edited,
    rules_applied,
    access_granted,
    denial_reason
  ) VALUES (
    _workflow_instance_id,
    v_workflow.workflow_id,
    _user_id,
    v_user.full_name,
    _action,
    COALESCE(_record_id, v_workflow.source_record_id::uuid),
    (SELECT secured_table FROM workflow_definitions WHERE id = v_workflow.workflow_id),
    _fields_viewed,
    _fields_edited,
    _rules_applied,
    _access_granted,
    _denial_reason
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Step 7: Extend test_data_policy for workflow simulation
CREATE OR REPLACE FUNCTION test_workflow_policy(
  _test_user_id uuid,
  _workflow_id uuid,
  _record_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user profiles;
  v_definition workflow_definitions;
  v_instance workflow_instances;
  v_module app_modules;
  v_task_access jsonb;
  v_field_rules jsonb;
  v_available_actions jsonb;
  v_result jsonb;
  v_is_admin boolean;
BEGIN
  -- Get user
  SELECT * INTO v_user FROM profiles WHERE id = _test_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  -- Check if admin
  v_is_admin := is_admin(_test_user_id);
  
  -- Get workflow definition
  SELECT * INTO v_definition FROM workflow_definitions WHERE id = _workflow_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Workflow not found');
  END IF;
  
  -- Get secured module if set
  IF v_definition.secured_module_id IS NOT NULL THEN
    SELECT * INTO v_module FROM app_modules WHERE id = v_definition.secured_module_id;
  END IF;
  
  -- If record_id provided, find matching workflow instance
  IF _record_id IS NOT NULL THEN
    SELECT * INTO v_instance FROM workflow_instances 
    WHERE workflow_id = _workflow_id AND source_record_id = _record_id::text
    LIMIT 1;
  END IF;
  
  -- Build result
  v_result := jsonb_build_object(
    'user', jsonb_build_object(
      'id', v_user.id,
      'name', v_user.full_name,
      'email', v_user.email,
      'is_admin', v_is_admin,
      'department_id', v_user.department_id
    ),
    'workflow', jsonb_build_object(
      'id', v_definition.id,
      'name', v_definition.name,
      'secured_module', v_module.display_name,
      'secured_table', v_definition.secured_table
    )
  );
  
  -- If no security binding, show full access
  IF v_definition.secured_table IS NULL OR v_definition.secured_table = '' THEN
    v_result := v_result || jsonb_build_object(
      'can_see_workflow', true,
      'reason', 'No security binding - full access',
      'visible_fields', '[]'::jsonb,
      'available_actions', '["approve","reject","query","send_back"]'::jsonb
    );
    RETURN v_result;
  END IF;
  
  -- Check if user is admin
  IF v_is_admin THEN
    v_result := v_result || jsonb_build_object(
      'can_see_workflow', true,
      'reason', 'Admin access',
      'visible_fields', '[]'::jsonb,
      'available_actions', '["approve","reject","query","send_back"]'::jsonb
    );
    RETURN v_result;
  END IF;
  
  -- Check row access
  v_task_access := check_row_access(_test_user_id, '', v_definition.secured_table, 'view');
  
  IF NOT COALESCE((v_task_access->>'allowed')::boolean, false) THEN
    v_result := v_result || jsonb_build_object(
      'can_see_workflow', false,
      'reason', COALESCE(v_task_access->>'reason', 'Access denied by scope rules'),
      'visible_fields', '[]'::jsonb,
      'available_actions', '[]'::jsonb,
      'scope_rules_applied', v_task_access->'rules_applied'
    );
    RETURN v_result;
  END IF;
  
  -- Get visible fields
  v_field_rules := get_visible_fields(_test_user_id, '', v_definition.secured_table);
  
  -- Check edit access for actions
  v_task_access := check_row_access(_test_user_id, '', v_definition.secured_table, 'edit');
  
  IF COALESCE((v_task_access->>'allowed')::boolean, false) THEN
    v_available_actions := '["approve","reject","query","send_back"]'::jsonb;
  ELSE
    v_available_actions := '["view"]'::jsonb;
  END IF;
  
  v_result := v_result || jsonb_build_object(
    'can_see_workflow', true,
    'reason', 'Access granted via data policies',
    'visible_fields', v_field_rules,
    'available_actions', v_available_actions,
    'scope_rules_applied', v_task_access->'rules_applied'
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_workflow_task_access(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION find_eligible_approver(uuid, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION log_workflow_security_event(uuid, uuid, text, uuid, text[], text[], jsonb, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION test_workflow_policy(uuid, uuid, uuid) TO authenticated;