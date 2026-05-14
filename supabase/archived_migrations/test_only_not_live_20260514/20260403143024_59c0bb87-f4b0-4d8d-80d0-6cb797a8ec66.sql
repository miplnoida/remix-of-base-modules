
CREATE OR REPLACE FUNCTION public.resolve_reporting_manager(p_user_id uuid)
RETURNS TABLE(manager_id uuid, manager_name text, error_message text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_manager_id uuid;
  v_manager_name text;
  v_is_active boolean;
BEGIN
  -- Get the reporting manager for this user
  SELECT p.reporting_to_user_id INTO v_manager_id
  FROM profiles p
  WHERE p.id = p_user_id;

  -- No reporting manager set
  IF v_manager_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'No reporting manager assigned for this user'::text;
    RETURN;
  END IF;

  -- Circular reference check (self-reference)
  IF v_manager_id = p_user_id THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'Circular reference: user is their own reporting manager'::text;
    RETURN;
  END IF;

  -- Check manager exists and is active
  SELECT p.id, p.full_name, p.is_active
  INTO v_manager_id, v_manager_name, v_is_active
  FROM profiles p
  WHERE p.id = v_manager_id;

  IF v_manager_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, 'Reporting manager profile not found'::text;
    RETURN;
  END IF;

  IF v_is_active IS DISTINCT FROM true THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, ('Reporting manager (' || COALESCE(v_manager_name, 'Unknown') || ') is inactive')::text;
    RETURN;
  END IF;

  -- Success
  RETURN QUERY SELECT v_manager_id, v_manager_name, NULL::text;
END;
$$;
