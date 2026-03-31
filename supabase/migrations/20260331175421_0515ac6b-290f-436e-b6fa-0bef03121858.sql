
-- 1. Add office_code to cn_head_cashier_assignment
ALTER TABLE public.cn_head_cashier_assignment 
  ADD COLUMN IF NOT EXISTS office_code VARCHAR REFERENCES tb_office(code);

-- 2. Add office_code to cn_card_machine
ALTER TABLE public.cn_card_machine 
  ADD COLUMN IF NOT EXISTS office_code VARCHAR REFERENCES tb_office(code);

-- 3. Create cn_office_opening_balance table
CREATE TABLE IF NOT EXISTS public.cn_office_opening_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_code VARCHAR NOT NULL REFERENCES tb_office(code),
  head_cashier_balance NUMERIC NOT NULL DEFAULT 0,
  cashier_balance NUMERIC NOT NULL DEFAULT 0,
  updated_by VARCHAR,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(office_code)
);

-- 4. Update assign_head_cashier RPC to support office_code
DROP FUNCTION IF EXISTS public.assign_head_cashier(uuid, text, text);
CREATE OR REPLACE FUNCTION public.assign_head_cashier(
  p_user_id UUID, 
  p_date TEXT, 
  p_assigned_by TEXT,
  p_office_code TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

    UPDATE cn_head_cashier_assignment SET is_active = false 
    WHERE assignment_date = v_date AND office_code = p_office_code;
  ELSE
    SELECT user_id, user_code INTO v_prev_user_id, v_prev_user_code
    FROM cn_head_cashier_assignment
    WHERE assignment_date = v_date AND is_active = true AND office_code IS NULL;

    UPDATE cn_head_cashier_assignment SET is_active = false 
    WHERE assignment_date = v_date AND office_code IS NULL;
  END IF;

  -- Remove Head-Cashier role from previous assignee if different
  IF v_prev_user_id IS NOT NULL AND v_prev_user_id != p_user_id THEN
    -- Only remove role if user has no other active assignments
    IF NOT EXISTS (
      SELECT 1 FROM cn_head_cashier_assignment 
      WHERE user_id = v_prev_user_id AND is_active = true 
      AND id IS NOT NULL
    ) THEN
      DELETE FROM user_roles WHERE user_id = v_prev_user_id AND role = 'Head-Cashier';
    END IF;
  END IF;

  INSERT INTO cn_head_cashier_assignment (assignment_date, user_id, user_code, assigned_by, office_code)
  VALUES (v_date, p_user_id, v_user_code, p_assigned_by, p_office_code);

  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'Head-Cashier')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO system_audit_trail (action, entity_type, entity_id, module, user_id, user_name, after_value, payload_json)
  VALUES ('assign', 'cn_head_cashier_assignment', v_date::TEXT, 'Payment Module', p_user_id, p_assigned_by,
    jsonb_build_object('user_code', v_user_code, 'date', v_date, 'office_code', p_office_code),
    jsonb_build_object('previous_user_code', v_prev_user_code));

  RETURN jsonb_build_object('success', true, 'user_code', v_user_code, 'office_code', p_office_code);
END;
$function$;

-- 5. Update get_active_head_cashier RPC to support office_code
DROP FUNCTION IF EXISTS public.get_active_head_cashier(text);
CREATE OR REPLACE FUNCTION public.get_active_head_cashier(
  p_date TEXT,
  p_office_code TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_date DATE;
  v_user_id UUID;
  v_user_code TEXT;
  v_assigned_by TEXT;
  v_assigned_at TIMESTAMPTZ;
  v_full_name TEXT;
  v_office_code TEXT;
BEGIN
  v_date := COALESCE(p_date::DATE, CURRENT_DATE);

  IF p_office_code IS NOT NULL THEN
    SELECT a.user_id, a.user_code, a.assigned_by, a.assigned_at,
           p.full_name, p.office_code
    INTO v_user_id, v_user_code, v_assigned_by, v_assigned_at, v_full_name, v_office_code
    FROM cn_head_cashier_assignment a
    JOIN profiles p ON p.id = a.user_id
    WHERE a.assignment_date = v_date AND a.is_active = true AND a.office_code = p_office_code
    LIMIT 1;
  ELSE
    SELECT a.user_id, a.user_code, a.assigned_by, a.assigned_at,
           p.full_name, p.office_code
    INTO v_user_id, v_user_code, v_assigned_by, v_assigned_at, v_full_name, v_office_code
    FROM cn_head_cashier_assignment a
    JOIN profiles p ON p.id = a.user_id
    WHERE a.assignment_date = v_date AND a.is_active = true
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'user_id', v_user_id,
    'user_code', v_user_code,
    'full_name', v_full_name,
    'office_code', v_office_code,
    'assigned_by', v_assigned_by,
    'assigned_at', v_assigned_at
  );
END;
$function$;
