
-- 1. Drop ALL overloads of assign_head_cashier
DROP FUNCTION IF EXISTS public.assign_head_cashier(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.assign_head_cashier(uuid, date, text, text);
DROP FUNCTION IF EXISTS public.assign_head_cashier(p_user_id uuid, p_date text, p_assigned_by text, p_office_code text);

-- 2. Drop old unique constraints/indexes
DROP INDEX IF EXISTS uq_head_cashier_per_date;
DROP INDEX IF EXISTS uq_head_cashier_per_date_office;
DROP INDEX IF EXISTS uq_head_cashier_active_per_date_office;

-- 3. Create clean unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS uq_head_cashier_active_per_date_office
  ON cn_head_cashier_assignment (assignment_date, office_code)
  WHERE is_active = true;

-- 4. Recreate a single clean assign_head_cashier function
CREATE OR REPLACE FUNCTION public.assign_head_cashier(
  p_user_id uuid,
  p_date text,
  p_assigned_by text,
  p_office_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
  v_user_code text;
  v_full_name text;
BEGIN
  -- Parse date safely
  v_date := COALESCE(p_date::date, CURRENT_DATE);

  -- Look up user info
  SELECT user_code, full_name INTO v_user_code, v_full_name
  FROM profiles WHERE id = p_user_id;

  IF v_user_code IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;

  IF p_office_code IS NULL OR p_office_code = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Office code is required');
  END IF;

  -- Delete any existing assignment for this date+office (active or not)
  DELETE FROM cn_head_cashier_assignment
  WHERE assignment_date = v_date
    AND office_code = p_office_code;

  -- Insert new assignment
  INSERT INTO cn_head_cashier_assignment (
    user_id, user_code, assignment_date, office_code, is_active, assigned_by, assigned_at
  ) VALUES (
    p_user_id, v_user_code, v_date, p_office_code, true, p_assigned_by, now()
  );

  -- Audit log
  INSERT INTO system_audit_trail (action, entity_type, entity_id, module, user_name, after_value)
  VALUES (
    'assign_head_cashier',
    'cn_head_cashier_assignment',
    p_office_code || '/' || v_date::text,
    'Head Cashier Assignment',
    p_assigned_by,
    jsonb_build_object('user_id', p_user_id, 'user_code', v_user_code, 'full_name', v_full_name, 'office_code', p_office_code, 'date', v_date)
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_code', v_user_code,
    'full_name', v_full_name,
    'office_code', p_office_code,
    'date', v_date
  );
END;
$$;
