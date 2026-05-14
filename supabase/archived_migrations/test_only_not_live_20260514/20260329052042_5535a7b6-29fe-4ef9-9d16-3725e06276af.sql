
CREATE OR REPLACE FUNCTION public.assign_head_cashier(p_user_id UUID, p_date TEXT, p_assigned_by TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date DATE;
  v_user_code TEXT;
  v_prev_user_id UUID;
  v_prev_user_code TEXT;
  v_role_id UUID;
BEGIN
  v_date := p_date::DATE;

  IF v_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot assign Head Cashier for a past date.');
  END IF;

  -- Get user_code for the new assignee
  SELECT user_code INTO v_user_code FROM profiles WHERE id = p_user_id;
  IF v_user_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found.');
  END IF;

  -- Get previous assignee for that date (if any)
  SELECT user_id, user_code INTO v_prev_user_id, v_prev_user_code
  FROM cn_head_cashier_assignment
  WHERE assignment_date = v_date AND is_active = true;

  -- Deactivate previous assignment
  UPDATE cn_head_cashier_assignment SET is_active = false WHERE assignment_date = v_date;

  -- Remove Head-Cashier role from previous assignee
  IF v_prev_user_id IS NOT NULL AND v_prev_user_id != p_user_id THEN
    DELETE FROM user_roles WHERE user_id = v_prev_user_id AND role = 'Head-Cashier';
  END IF;

  -- Insert new assignment
  INSERT INTO cn_head_cashier_assignment (assignment_date, user_id, user_code, assigned_by)
  VALUES (v_date, p_user_id, v_user_code, p_assigned_by);

  -- Add Head-Cashier role if not already present
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'Head-Cashier')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Audit log (using correct column names)
  INSERT INTO system_audit_trail (action, entity_type, entity_id, module, user_id, user_name, after_value, payload_json)
  VALUES ('assign', 'cn_head_cashier_assignment', v_date::TEXT, 'Payment Module', p_user_id, p_assigned_by,
    jsonb_build_object('user_code', v_user_code, 'date', v_date),
    jsonb_build_object('previous_user_code', v_prev_user_code));

  RETURN jsonb_build_object('success', true, 'user_code', v_user_code);
END;
$$;
