
CREATE OR REPLACE FUNCTION public.ia_resolve_last_audit_date(
  p_function_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_date date;
  v_source text;
  v_months numeric;
BEGIN
  -- Try from completed engagements first
  IF p_function_id IS NOT NULL THEN
    SELECT MAX(e.actual_end_date) INTO v_last_date
    FROM ia_audit_engagements e
    WHERE e.function_id = p_function_id
      AND e.status IN ('Completed', 'Closed')
      AND e.actual_end_date IS NOT NULL
      AND (e.is_active = true OR e.is_active IS NULL);
    IF v_last_date IS NOT NULL THEN v_source := 'engagement_actual'; END IF;
  END IF;

  IF v_last_date IS NULL AND p_department_id IS NOT NULL THEN
    SELECT MAX(e.actual_end_date) INTO v_last_date
    FROM ia_audit_engagements e
    WHERE e.department_id = p_department_id
      AND e.status IN ('Completed', 'Closed')
      AND e.actual_end_date IS NOT NULL
      AND (e.is_active = true OR e.is_active IS NULL);
    IF v_last_date IS NOT NULL THEN v_source := 'department_engagement'; END IF;
  END IF;

  IF v_last_date IS NULL AND p_function_id IS NOT NULL THEN
    SELECT df.last_audit_date INTO v_last_date
    FROM ia_department_functions df WHERE df.id = p_function_id AND df.is_active = true;
    IF v_last_date IS NOT NULL THEN v_source := 'function_stored'; END IF;
  END IF;

  IF v_last_date IS NULL THEN
    SELECT au.last_audit_date INTO v_last_date
    FROM ia_audit_universe au
    WHERE (p_function_id IS NOT NULL AND au.function_id = p_function_id)
       OR (p_department_id IS NOT NULL AND au.department_id = p_department_id)
    LIMIT 1;
    IF v_last_date IS NOT NULL THEN v_source := 'audit_universe'; END IF;
  END IF;

  -- Calculate months using age() to get a proper interval
  IF v_last_date IS NOT NULL THEN
    v_months := EXTRACT(EPOCH FROM age(CURRENT_DATE, v_last_date)) / 2592000.0;
  ELSE
    v_months := NULL;
  END IF;

  RETURN jsonb_build_object(
    'last_audit_date', v_last_date,
    'source', COALESCE(v_source, 'none'),
    'months_since', v_months
  );
END;
$$;
