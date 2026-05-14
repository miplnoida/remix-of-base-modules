
-- 1. Fix head cashier unique constraint: drop global, add per-office
ALTER TABLE cn_head_cashier_assignment DROP CONSTRAINT IF EXISTS uq_head_cashier_per_date;
-- Delete deactivated rows to clean up before adding new constraint
DELETE FROM cn_head_cashier_assignment WHERE is_active = false;
-- Add composite unique on (assignment_date, office_code) for active rows only
-- Using a partial unique index instead of constraint for active-only enforcement
CREATE UNIQUE INDEX IF NOT EXISTS uq_head_cashier_active_per_date_office
  ON cn_head_cashier_assignment (assignment_date, office_code)
  WHERE is_active = true;

-- 2. Replace assign_head_cashier RPC to delete old rows instead of deactivating
CREATE OR REPLACE FUNCTION public.assign_head_cashier(
  p_user_id UUID,
  p_date TEXT,
  p_assigned_by TEXT,
  p_office_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_user_code TEXT;
  v_prev_user_id UUID;
  v_prev_user_code TEXT;
BEGIN
  v_date := p_date::DATE;

  IF v_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot assign Head Cashier for a past date.');
  END IF;

  SELECT user_code INTO v_user_code FROM profiles WHERE id = p_user_id;
  IF v_user_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found.');
  END IF;

  -- Get previous assignee for that date + office
  IF p_office_code IS NOT NULL THEN
    SELECT user_id, user_code INTO v_prev_user_id, v_prev_user_code
    FROM cn_head_cashier_assignment
    WHERE assignment_date = v_date AND office_code = p_office_code AND is_active = true;

    -- Delete old rows for this date+office to avoid unique constraint violation
    DELETE FROM cn_head_cashier_assignment
    WHERE assignment_date = v_date AND office_code = p_office_code;
  ELSE
    SELECT user_id, user_code INTO v_prev_user_id, v_prev_user_code
    FROM cn_head_cashier_assignment
    WHERE assignment_date = v_date AND is_active = true AND office_code IS NULL;

    DELETE FROM cn_head_cashier_assignment
    WHERE assignment_date = v_date AND office_code IS NULL;
  END IF;

  -- Remove Head-Cashier role from previous assignee if different
  IF v_prev_user_id IS NOT NULL AND v_prev_user_id != p_user_id THEN
    IF NOT EXISTS (
      SELECT 1 FROM cn_head_cashier_assignment
      WHERE user_id = v_prev_user_id AND is_active = true
    ) THEN
      DELETE FROM user_roles WHERE user_id = v_prev_user_id AND role = 'Head-Cashier';
    END IF;
  END IF;

  INSERT INTO cn_head_cashier_assignment (assignment_date, user_id, user_code, assigned_by, office_code, is_active)
  VALUES (v_date, p_user_id, v_user_code, p_assigned_by, p_office_code, true);

  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'Head-Cashier')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO system_audit_trail (action, entity_type, entity_id, module, user_id, user_name, after_value, payload_json)
  VALUES ('assign', 'cn_head_cashier_assignment', v_date::TEXT, 'Payment Module', p_user_id, p_assigned_by,
    jsonb_build_object('user_code', v_user_code, 'date', v_date, 'office_code', p_office_code),
    jsonb_build_object('previous_user_code', v_prev_user_code));

  RETURN jsonb_build_object('success', true, 'user_code', v_user_code, 'office_code', p_office_code);
END;
$$;

-- 3. Create resolve_batch_office RPC for server-side office enforcement
CREATE OR REPLACE FUNCTION public.resolve_batch_office(
  p_cashier_user_id UUID,
  p_ip_address TEXT DEFAULT NULL,
  p_date TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_office_code TEXT;
  v_office_desc TEXT;
  v_source TEXT;
  v_ip_result JSON;
BEGIN
  v_date := COALESCE(p_date::DATE, CURRENT_DATE);

  -- Tier 1: IP-based detection
  IF p_ip_address IS NOT NULL AND p_ip_address != '' THEN
    SELECT resolve_office_by_ip(p_ip_address) INTO v_ip_result;
    IF (v_ip_result->>'matched')::BOOLEAN = true THEN
      RETURN jsonb_build_object(
        'office_code', v_ip_result->>'office_code',
        'office_description', v_ip_result->>'office_description',
        'source', 'ip_detection'
      );
    END IF;
  END IF;

  -- Tier 2: Head Cashier office override
  SELECT office_code INTO v_office_code
  FROM cn_cashier_office_override
  WHERE cashier_user_id = p_cashier_user_id AND override_date = v_date
  LIMIT 1;

  IF v_office_code IS NOT NULL THEN
    SELECT description INTO v_office_desc FROM tb_office WHERE code = v_office_code LIMIT 1;
    RETURN jsonb_build_object(
      'office_code', v_office_code,
      'office_description', COALESCE(v_office_desc, v_office_code),
      'source', 'hc_override'
    );
  END IF;

  -- Tier 3: Profile default
  SELECT p.office_code, o.description
  INTO v_office_code, v_office_desc
  FROM profiles p
  LEFT JOIN tb_office o ON o.code = p.office_code
  WHERE p.id = p_cashier_user_id;

  RETURN jsonb_build_object(
    'office_code', COALESCE(v_office_code, 'HQ'),
    'office_description', COALESCE(v_office_desc, v_office_code, 'HQ'),
    'source', 'profile_default'
  );
END;
$$;
