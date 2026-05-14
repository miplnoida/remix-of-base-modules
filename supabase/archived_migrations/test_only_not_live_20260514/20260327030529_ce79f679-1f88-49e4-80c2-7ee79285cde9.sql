
-- RPC to fetch audit trail with role-based visibility:
-- Admin users see all logs; non-Admin users see logs excluding those created by Admin users.
CREATE OR REPLACE FUNCTION public.get_filtered_audit_trail(
  p_sort_key TEXT DEFAULT 'timestamp',
  p_sort_direction TEXT DEFAULT 'desc',
  p_offset INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 20,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_user_filter TEXT DEFAULT NULL,
  p_entity_type_filter TEXT DEFAULT NULL,
  p_module_filter TEXT DEFAULT NULL,
  p_route_filter TEXT DEFAULT NULL,
  p_action_filter TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
  v_query TEXT;
  v_count_query TEXT;
  v_where TEXT := 'WHERE 1=1';
  v_order TEXT;
  v_result JSONB;
  v_rows JSONB;
  v_total BIGINT;
  v_allowed_sort_keys TEXT[] := ARRAY['timestamp','user_name','action','module','route','entity_type','entity_id'];
BEGIN
  -- Get the calling user
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Check if caller has Admin role
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_caller_id AND LOWER(role) = 'admin'
  ) INTO v_is_admin;

  -- If not admin, exclude logs created by admin users
  IF NOT v_is_admin THEN
    v_where := v_where || ' AND (sat.user_id IS NULL OR sat.user_id NOT IN (SELECT ur.user_id FROM public.user_roles ur WHERE LOWER(ur.role) = ''admin''))';
  END IF;

  -- Apply filters with parameterized-style safe concatenation
  IF p_date_from IS NOT NULL AND p_date_from != '' THEN
    v_where := v_where || ' AND sat."timestamp" >= ' || quote_literal(p_date_from::TIMESTAMPTZ);
  END IF;
  IF p_date_to IS NOT NULL AND p_date_to != '' THEN
    v_where := v_where || ' AND sat."timestamp" <= ' || quote_literal((p_date_to || 'T23:59:59')::TIMESTAMPTZ);
  END IF;
  IF p_user_filter IS NOT NULL AND p_user_filter != '' THEN
    v_where := v_where || ' AND sat.user_name ILIKE ' || quote_literal('%' || p_user_filter || '%');
  END IF;
  IF p_entity_type_filter IS NOT NULL AND p_entity_type_filter != '' THEN
    v_where := v_where || ' AND sat.entity_type ILIKE ' || quote_literal('%' || p_entity_type_filter || '%');
  END IF;
  IF p_module_filter IS NOT NULL AND p_module_filter != '' THEN
    v_where := v_where || ' AND sat.module ILIKE ' || quote_literal('%' || p_module_filter || '%');
  END IF;
  IF p_route_filter IS NOT NULL AND p_route_filter != '' THEN
    v_where := v_where || ' AND sat.route ILIKE ' || quote_literal('%' || p_route_filter || '%');
  END IF;
  IF p_action_filter IS NOT NULL AND p_action_filter != '' THEN
    v_where := v_where || ' AND sat.action ILIKE ' || quote_literal('%' || p_action_filter || '%');
  END IF;

  -- Validate sort key to prevent injection
  IF NOT (p_sort_key = ANY(v_allowed_sort_keys)) THEN
    p_sort_key := 'timestamp';
  END IF;
  IF p_sort_direction NOT IN ('asc', 'desc') THEN
    p_sort_direction := 'desc';
  END IF;
  v_order := ' ORDER BY sat.' || quote_ident(p_sort_key) || ' ' || p_sort_direction || ' NULLS LAST';

  -- Get total count
  v_count_query := 'SELECT count(*) FROM public.system_audit_trail sat ' || v_where;
  EXECUTE v_count_query INTO v_total;

  -- Get rows
  v_query := 'SELECT jsonb_agg(row_to_json(t)::jsonb) FROM (
    SELECT sat.id, sat."timestamp", sat.correlation_id, sat.user_id, sat.user_name,
           sat.action, sat.entity_type, sat.entity_id, sat.module, sat.route,
           sat.ip_address, sat.before_value, sat.after_value, sat.payload_json
    FROM public.system_audit_trail sat '
    || v_where || v_order
    || ' OFFSET ' || p_offset || ' LIMIT ' || p_limit
    || ') t';
  EXECUTE v_query INTO v_rows;

  RETURN jsonb_build_object(
    'entries', COALESCE(v_rows, '[]'::jsonb),
    'count', v_total
  );
END;
$$;
