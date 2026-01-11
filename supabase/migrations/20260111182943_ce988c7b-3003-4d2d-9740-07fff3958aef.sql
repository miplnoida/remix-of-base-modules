-- ============================================
-- DATA ACCESS CONTROL - ENFORCEMENT FUNCTIONS
-- ============================================

-- Function to check row access
CREATE OR REPLACE FUNCTION public.check_row_access(
  _user_id UUID,
  _module_name TEXT,
  _table_name TEXT,
  _action TEXT,
  _record JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  user_roles TEXT[];
  rule_record RECORD;
  is_allowed BOOLEAN := false;
  rules_applied JSONB := '[]'::jsonb;
  denial_reason TEXT := NULL;
BEGIN
  IF public.is_admin(_user_id) THEN
    RETURN jsonb_build_object('allowed', true, 'rules_applied', '[{"type": "admin_bypass"}]'::jsonb, 'reason', NULL);
  END IF;

  SELECT array_agg(ur.role::TEXT) INTO user_roles FROM user_roles ur WHERE ur.user_id = _user_id;

  IF user_roles IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'rules_applied', '[]'::jsonb, 'reason', 'No roles assigned');
  END IF;

  FOR rule_record IN
    SELECT dsr.*, r.role_name
    FROM data_scope_rules dsr
    JOIN roles r ON r.id = dsr.role_id
    WHERE dsr.target_table = _table_name AND dsr.is_active = true AND r.role_name = ANY(user_roles)
    ORDER BY dsr.priority ASC
  LOOP
    IF (_action = 'view' AND rule_record.can_view) OR
       (_action = 'edit' AND rule_record.can_edit) OR
       (_action = 'delete' AND rule_record.can_delete) THEN
      rules_applied := rules_applied || jsonb_build_array(jsonb_build_object(
        'type', 'data_scope_rule', 'id', rule_record.id, 'role', rule_record.role_name
      ));
      is_allowed := true;
    END IF;
  END LOOP;

  IF NOT is_allowed THEN denial_reason := 'No matching rules'; END IF;

  RETURN jsonb_build_object('allowed', is_allowed, 'rules_applied', rules_applied, 'reason', denial_reason);
END;
$$;

-- Function to get visible fields
CREATE OR REPLACE FUNCTION public.get_visible_fields(
  _user_id UUID,
  _module_name TEXT,
  _table_name TEXT
)
RETURNS TABLE(field_name TEXT, can_view BOOLEAN, can_edit BOOLEAN, masking_type TEXT, rule_source TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_roles TEXT[];
BEGIN
  IF public.is_admin(_user_id) THEN
    RETURN QUERY SELECT fsr.field_name, true, true, 'none'::TEXT, 'admin_bypass'::TEXT
    FROM field_security_rules fsr WHERE fsr.target_table = _table_name GROUP BY fsr.field_name;
    RETURN;
  END IF;

  SELECT array_agg(ur.role::TEXT) INTO user_roles FROM user_roles ur WHERE ur.user_id = _user_id;

  RETURN QUERY
  SELECT fsr.field_name, bool_or(fsr.can_view), bool_or(fsr.can_edit), 
         (array_agg(fsr.masking_type::TEXT ORDER BY fsr.priority))[1], 'role_rule'::TEXT
  FROM field_security_rules fsr
  JOIN roles r ON r.id = fsr.role_id
  WHERE fsr.target_table = _table_name AND fsr.is_active = true AND r.role_name = ANY(user_roles)
  GROUP BY fsr.field_name;
END;
$$;

-- Function to test policy (for Policy Test Console)
CREATE OR REPLACE FUNCTION public.test_data_policy(
  _test_user_id UUID,
  _module_name TEXT,
  _action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  module_record RECORD;
  user_profile RECORD;
  user_roles_list TEXT[];
  applied_scope_rules JSONB := '[]'::jsonb;
  applied_field_rules JSONB := '[]'::jsonb;
  user_overrides_list JSONB := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'Only administrators can test policies');
  END IF;

  SELECT full_name, email INTO user_profile FROM profiles WHERE id = _test_user_id;
  SELECT array_agg(role::TEXT) INTO user_roles_list FROM user_roles WHERE user_id = _test_user_id;
  SELECT * INTO module_record FROM app_modules WHERE name = _module_name AND is_enabled = true;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', dsr.id, 'target_table', dsr.target_table, 'role', r.role_name,
    'condition_type', dsr.condition_type, 'condition_value', dsr.condition_value,
    'can_view', dsr.can_view, 'can_edit', dsr.can_edit, 'can_delete', dsr.can_delete,
    'priority', dsr.priority, 'is_active', dsr.is_active
  )), '[]'::jsonb)
  INTO applied_scope_rules
  FROM data_scope_rules dsr
  JOIN roles r ON r.id = dsr.role_id
  WHERE dsr.module_id = module_record.id AND r.role_name = ANY(user_roles_list);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', fsr.id, 'field_name', fsr.field_name, 'role', r.role_name,
    'can_view', fsr.can_view, 'can_edit', fsr.can_edit,
    'masking_type', fsr.masking_type, 'priority', fsr.priority, 'is_active', fsr.is_active
  )), '[]'::jsonb)
  INTO applied_field_rules
  FROM field_security_rules fsr
  JOIN roles r ON r.id = fsr.role_id
  WHERE fsr.module_id = module_record.id AND r.role_name = ANY(user_roles_list);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', udo.id, 'override_type', udo.override_type, 'field_name', udo.field_name,
    'reason', udo.reason, 'expires_at', udo.expires_at, 'is_active', udo.is_active
  )), '[]'::jsonb)
  INTO user_overrides_list
  FROM user_data_overrides udo
  WHERE udo.user_id = _test_user_id AND udo.module_id = module_record.id;

  RETURN jsonb_build_object(
    'user', jsonb_build_object(
      'id', _test_user_id, 'name', user_profile.full_name, 'email', user_profile.email,
      'roles', user_roles_list, 'is_admin', public.is_admin(_test_user_id)
    ),
    'module', jsonb_build_object('id', module_record.id, 'name', module_record.name, 'display_name', module_record.display_name),
    'action', _action,
    'scope_rules', applied_scope_rules,
    'field_rules', applied_field_rules,
    'user_overrides', user_overrides_list,
    'effective_access', public.check_row_access(_test_user_id, _module_name, '', _action)
  );
END;
$$;