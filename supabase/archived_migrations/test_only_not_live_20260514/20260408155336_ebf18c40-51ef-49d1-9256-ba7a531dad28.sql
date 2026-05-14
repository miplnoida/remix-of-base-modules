-- Drop and recreate with new params
DROP FUNCTION IF EXISTS public.get_filtered_audit_trail(text, text, integer, integer, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.get_filtered_audit_trail(
  p_sort_key text DEFAULT 'timestamp',
  p_sort_direction text DEFAULT 'desc',
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20,
  p_date_from text DEFAULT NULL,
  p_date_to text DEFAULT NULL,
  p_user_filter text DEFAULT NULL,
  p_entity_type_filter text DEFAULT NULL,
  p_module_filter text DEFAULT NULL,
  p_route_filter text DEFAULT NULL,
  p_action_filter text DEFAULT NULL,
  p_source_filter text DEFAULT NULL,
  p_severity_filter text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
  v_query TEXT;
  v_count_query TEXT;
  v_where TEXT := 'WHERE 1=1';
  v_order TEXT;
  v_rows JSONB;
  v_total BIGINT;
  v_allowed_sort_keys TEXT[] := ARRAY['timestamp','user_name','action','module','route','entity_type','entity_id','severity'];
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_caller_id AND LOWER(role) = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    v_where := v_where || ' AND (sat.user_id IS NULL OR sat.user_id NOT IN (SELECT ur.user_id FROM public.user_roles ur WHERE LOWER(ur.role) = ''admin''))';
  END IF;

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
  IF p_source_filter IS NOT NULL AND p_source_filter != '' THEN
    v_where := v_where || ' AND sat.payload_json->>''source'' ILIKE ' || quote_literal('%' || p_source_filter || '%');
  END IF;
  IF p_severity_filter IS NOT NULL AND p_severity_filter != '' THEN
    v_where := v_where || ' AND sat.severity ILIKE ' || quote_literal('%' || p_severity_filter || '%');
  END IF;

  IF NOT (p_sort_key = ANY(v_allowed_sort_keys)) THEN
    p_sort_key := 'timestamp';
  END IF;
  IF p_sort_direction NOT IN ('asc', 'desc') THEN
    p_sort_direction := 'desc';
  END IF;
  v_order := ' ORDER BY sat.' || quote_ident(p_sort_key) || ' ' || p_sort_direction || ' NULLS LAST';

  v_count_query := 'SELECT count(*) FROM public.system_audit_trail sat ' || v_where;
  EXECUTE v_count_query INTO v_total;

  v_query := 'SELECT jsonb_agg(row_to_json(t)::jsonb) FROM (
    SELECT sat.id, sat."timestamp", sat.correlation_id, sat.user_id, sat.user_name,
           sat.action, sat.entity_type, sat.entity_id, sat.module, sat.route,
           sat.ip_address, sat.before_value, sat.after_value, sat.payload_json,
           sat.severity
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

-- Performance index for default sort (timestamp desc)
CREATE INDEX IF NOT EXISTS idx_system_audit_trail_timestamp_desc
  ON public.system_audit_trail ("timestamp" DESC NULLS LAST);

-- Composite index for common filter combos
CREATE INDEX IF NOT EXISTS idx_system_audit_trail_entity_action
  ON public.system_audit_trail (entity_type, action);

-- Helper: distinct filter options from recent entries (last 30 days)
CREATE OR REPLACE FUNCTION public.get_audit_trail_filter_options()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_id UUID;
  v_entity_types JSONB;
  v_modules JSONB;
  v_actions JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  SELECT COALESCE(jsonb_agg(DISTINCT entity_type ORDER BY entity_type), '[]'::jsonb)
  INTO v_entity_types
  FROM public.system_audit_trail
  WHERE entity_type IS NOT NULL
    AND "timestamp" >= NOW() - INTERVAL '30 days';

  SELECT COALESCE(jsonb_agg(DISTINCT module ORDER BY module), '[]'::jsonb)
  INTO v_modules
  FROM public.system_audit_trail
  WHERE module IS NOT NULL
    AND "timestamp" >= NOW() - INTERVAL '30 days';

  SELECT COALESCE(jsonb_agg(DISTINCT action ORDER BY action), '[]'::jsonb)
  INTO v_actions
  FROM public.system_audit_trail
  WHERE action IS NOT NULL
    AND "timestamp" >= NOW() - INTERVAL '30 days';

  RETURN jsonb_build_object(
    'entity_types', v_entity_types,
    'modules', v_modules,
    'actions', v_actions
  );
END;
$$;