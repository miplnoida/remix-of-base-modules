-- Update the log_c3_config_change function to auto-detect user if changed_by is null
CREATE OR REPLACE FUNCTION public.log_c3_config_change(
  p_config_type TEXT,
  p_record_id TEXT,
  p_action TEXT,
  p_entity_name TEXT,
  p_field_name TEXT DEFAULT NULL,
  p_old_value TEXT DEFAULT NULL,
  p_new_value TEXT DEFAULT NULL,
  p_changed_by TEXT DEFAULT NULL,
  p_changed_by_name TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_changed_by TEXT;
  v_changed_by_name TEXT;
  v_auth_uid UUID;
BEGIN
  v_changed_by := p_changed_by;
  v_changed_by_name := p_changed_by_name;
  
  -- Auto-detect user from auth context if not provided
  IF v_changed_by IS NULL OR v_changed_by = '' THEN
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NOT NULL THEN
      SELECT user_code, full_name INTO v_changed_by, v_changed_by_name
      FROM public.profiles
      WHERE id = v_auth_uid;
    END IF;
  END IF;
  
  -- If changed_by_name still null but changed_by exists, try to look it up
  IF v_changed_by_name IS NULL AND v_changed_by IS NOT NULL THEN
    SELECT full_name INTO v_changed_by_name
    FROM public.profiles
    WHERE user_code = v_changed_by
    LIMIT 1;
  END IF;

  INSERT INTO public.c3_unified_audit_log (
    config_type,
    record_id,
    action,
    entity_name,
    field_name,
    old_value,
    new_value,
    changed_by,
    changed_by_name,
    reason,
    metadata
  ) VALUES (
    p_config_type,
    p_record_id,
    p_action,
    p_entity_name,
    p_field_name,
    p_old_value,
    p_new_value,
    v_changed_by,
    v_changed_by_name,
    p_reason,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;