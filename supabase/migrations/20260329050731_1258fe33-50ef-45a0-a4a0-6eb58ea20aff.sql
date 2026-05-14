
-- 1. New tables
CREATE TABLE IF NOT EXISTS public.cn_head_cashier_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_date DATE NOT NULL,
  user_id UUID NOT NULL,
  user_code VARCHAR(50) NOT NULL,
  assigned_by VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT uq_head_cashier_per_date UNIQUE (assignment_date)
);

CREATE TABLE IF NOT EXISTS public.cn_cashier_office_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  override_date DATE NOT NULL,
  cashier_user_id UUID NOT NULL,
  cashier_user_code VARCHAR(50) NOT NULL,
  office_code VARCHAR(3) NOT NULL,
  assigned_by VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_cashier_office_per_date UNIQUE (override_date, cashier_user_id)
);

-- 2. RPC: assign_head_cashier
CREATE OR REPLACE FUNCTION public.assign_head_cashier(
  p_user_id UUID,
  p_date TEXT,
  p_assigned_by TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Audit log
  INSERT INTO system_audit_trail (action_type, entity_type, entity_id, module_name, user_id, user_name, new_value, metadata)
  VALUES ('assign', 'cn_head_cashier_assignment', v_date::TEXT, 'Payment Module', p_user_id, p_assigned_by,
    jsonb_build_object('user_code', v_user_code, 'date', v_date)::TEXT,
    jsonb_build_object('previous_user_code', v_prev_user_code));

  RETURN jsonb_build_object('success', true, 'user_code', v_user_code);
END;
$$;

-- 3. RPC: get_active_head_cashier
CREATE OR REPLACE FUNCTION public.get_active_head_cashier(p_date TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_rec RECORD;
BEGIN
  v_date := COALESCE(p_date::DATE, CURRENT_DATE);

  SELECT a.user_id, a.user_code, a.assigned_by, a.assigned_at,
         p.full_name, p.office_code
  INTO v_rec
  FROM cn_head_cashier_assignment a
  JOIN profiles p ON p.id = a.user_id
  WHERE a.assignment_date = v_date AND a.is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'user_id', v_rec.user_id,
    'user_code', v_rec.user_code,
    'full_name', v_rec.full_name,
    'office_code', v_rec.office_code,
    'assigned_by', v_rec.assigned_by,
    'assigned_at', v_rec.assigned_at
  );
END;
$$;

-- 4. RPC: revoke_expired_head_cashier
CREATE OR REPLACE FUNCTION public.revoke_expired_head_cashier()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Remove Head-Cashier role from users whose assignment date has passed
  DELETE FROM user_roles
  WHERE role = 'Head-Cashier'
    AND user_id NOT IN (
      SELECT user_id FROM cn_head_cashier_assignment
      WHERE assignment_date >= CURRENT_DATE AND is_active = true
    );

  -- Mark old assignments inactive
  UPDATE cn_head_cashier_assignment
  SET is_active = false
  WHERE assignment_date < CURRENT_DATE AND is_active = true;
END;
$$;

-- 5. RPC: validate_batch_creation
CREATE OR REPLACE FUNCTION public.validate_batch_creation(
  p_cashier_user_code TEXT,
  p_batch_date TEXT
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config_val JSONB;
  v_allow BOOLEAN;
  v_open_batch RECORD;
  v_batch_date DATE;
BEGIN
  v_batch_date := p_batch_date::DATE;

  -- Read config
  SELECT config_value INTO v_config_val
  FROM payment_module_config
  WHERE config_key = 'allow_new_batch_with_previous_open';

  v_allow := COALESCE((v_config_val->>'enabled')::BOOLEAN, false);

  IF v_allow THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Check for open batches with earlier dates
  SELECT batch_number, batch_date INTO v_open_batch
  FROM cn_batch
  WHERE entered_by = p_cashier_user_code
    AND batch_status = 'O'
    AND batch_date::DATE < v_batch_date
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'message', 'Cannot create batch: you have an open batch from ' || to_char(v_open_batch.batch_date, 'DD/MM/YYYY') || '. Please close it first.',
      'blocking_batch', v_open_batch.batch_number
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- 6. RPC: get_cashier_office_for_date
CREATE OR REPLACE FUNCTION public.get_cashier_office_for_date(
  p_cashier_user_id UUID,
  p_date TEXT
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_override_code VARCHAR(3);
  v_profile_code VARCHAR(3);
  v_desc TEXT;
BEGIN
  v_date := COALESCE(p_date::DATE, CURRENT_DATE);

  -- Check override
  SELECT office_code INTO v_override_code
  FROM cn_cashier_office_override
  WHERE cashier_user_id = p_cashier_user_id AND override_date = v_date
  LIMIT 1;

  IF v_override_code IS NOT NULL THEN
    SELECT description INTO v_desc FROM tb_office WHERE code = v_override_code LIMIT 1;
    RETURN jsonb_build_object('office_code', v_override_code, 'office_description', COALESCE(v_desc, v_override_code), 'is_override', true);
  END IF;

  -- Fallback to profile
  SELECT p.office_code, o.description
  INTO v_profile_code, v_desc
  FROM profiles p
  LEFT JOIN tb_office o ON o.code = p.office_code
  WHERE p.id = p_cashier_user_id;

  RETURN jsonb_build_object('office_code', COALESCE(v_profile_code, 'HQ'), 'office_description', COALESCE(v_desc, v_profile_code, 'HQ'), 'is_override', false);
END;
$$;

-- 7. RPC: assign_cashier_office_override
CREATE OR REPLACE FUNCTION public.assign_cashier_office_override(
  p_cashier_user_id UUID,
  p_date TEXT,
  p_office_code TEXT,
  p_assigned_by TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_cashier_code TEXT;
BEGIN
  v_date := p_date::DATE;

  IF v_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot override office for a past date.');
  END IF;

  -- Get cashier user_code
  SELECT user_code INTO v_cashier_code FROM profiles WHERE id = p_cashier_user_id;

  -- Upsert
  INSERT INTO cn_cashier_office_override (override_date, cashier_user_id, cashier_user_code, office_code, assigned_by)
  VALUES (v_date, p_cashier_user_id, COALESCE(v_cashier_code, ''), p_office_code, p_assigned_by)
  ON CONFLICT (override_date, cashier_user_id) DO UPDATE SET
    office_code = EXCLUDED.office_code,
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = now();

  -- Audit
  INSERT INTO system_audit_trail (action_type, entity_type, entity_id, module_name, user_name, new_value, metadata)
  VALUES ('assign_office', 'cn_cashier_office_override', p_cashier_user_id::TEXT, 'Payment Module', p_assigned_by,
    jsonb_build_object('office_code', p_office_code, 'date', v_date, 'cashier', v_cashier_code)::TEXT,
    jsonb_build_object('override_date', v_date));

  RETURN jsonb_build_object('success', true);
END;
$$;
