
CREATE OR REPLACE FUNCTION public.check_duplicate_open_batch(
  p_cashier_user_code TEXT,
  p_batch_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode TEXT;
  v_config_value JSONB;
  v_existing_count INT;
  v_existing_batch TEXT;
BEGIN
  -- Read the duplicate_open_batch config from payment_module_config
  SELECT config_value INTO v_config_value
  FROM payment_module_config
  WHERE config_key = 'duplicate_open_batch';

  v_mode := COALESCE(v_config_value->>'mode', 'warning');

  -- Check for existing open batches for same cashier on same date
  SELECT COUNT(*), MAX(batch_number)
  INTO v_existing_count, v_existing_batch
  FROM cn_batch
  WHERE entered_by = p_cashier_user_code
    AND batch_status = 'O'
    AND (batch_date::date) = p_batch_date;

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'has_duplicate', true,
      'mode', v_mode,
      'existing_batch', v_existing_batch,
      'existing_count', v_existing_count,
      'message', 'An open batch already exists for cashier ' || p_cashier_user_code || ' on ' || p_batch_date::text
    );
  END IF;

  RETURN jsonb_build_object(
    'has_duplicate', false,
    'mode', v_mode,
    'existing_batch', null,
    'existing_count', 0,
    'message', null
  );
END;
$$;
