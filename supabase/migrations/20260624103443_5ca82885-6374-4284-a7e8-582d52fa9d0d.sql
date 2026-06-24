-- 1. Preview rows from any bn_* table/view (read-only, capped at 500 rows)
CREATE OR REPLACE FUNCTION public.bn_preview_table(
  p_table text,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE(total_count bigint, rows jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_exists boolean;
  v_total bigint;
  v_rows jsonb;
  v_limit int;
  v_offset int;
BEGIN
  -- Whitelist: only bn_* objects in public schema
  IF p_table !~ '^bn_[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'Only bn_* tables/views are previewable';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_table
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Table % not found in public schema', p_table;
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);

  EXECUTE format('SELECT count(*)::bigint FROM public.%I', p_table) INTO v_total;
  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (SELECT * FROM public.%I LIMIT %s OFFSET %s) t',
    p_table, v_limit, v_offset
  ) INTO v_rows;

  total_count := v_total;
  rows := v_rows;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bn_preview_table(text, int, int) TO authenticated, service_role;

-- 2. Safe read-only SQL runner for the SQL editor screen
CREATE OR REPLACE FUNCTION public.bn_run_select(p_sql text)
RETURNS TABLE(rows jsonb, row_count int, elapsed_ms numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_clean text;
  v_lower text;
  v_rows jsonb;
  v_count int;
  v_start timestamptz;
  v_forbidden text[] := ARRAY[
    'insert ', 'update ', 'delete ', 'truncate', 'drop ', 'alter ', 'create ',
    'grant ', 'revoke ', 'comment ', 'vacuum', 'analyze ', 'reindex',
    'copy ', 'call ', 'do ', 'merge ', 'lock ', 'cluster ', 'refresh ',
    'security ', 'set ', 'reset ', 'listen ', 'notify ', 'unlisten ',
    'discard ', 'execute ', 'prepare ', 'deallocate '
  ];
  kw text;
BEGIN
  v_clean := btrim(regexp_replace(p_sql, ';\s*$', ''));
  IF v_clean IS NULL OR v_clean = '' THEN
    RAISE EXCEPTION 'Empty query';
  END IF;

  IF position(';' in v_clean) > 0 THEN
    RAISE EXCEPTION 'Multiple statements are not allowed';
  END IF;

  v_lower := lower(v_clean) || ' ';

  IF v_lower !~ '^(select |with |explain |show |table )' THEN
    RAISE EXCEPTION 'Only SELECT / WITH / EXPLAIN / SHOW / TABLE queries are allowed';
  END IF;

  FOREACH kw IN ARRAY v_forbidden LOOP
    IF v_lower ~ ('(^|\W)' || regexp_replace(kw, ' $', '\\M')) THEN
      -- check for keyword as a whole word
      IF v_lower ~ ('(^|\s)' || kw) THEN
        RAISE EXCEPTION 'Forbidden keyword detected: %', trim(kw);
      END IF;
    END IF;
  END LOOP;

  v_start := clock_timestamp();
  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (%s LIMIT 1000) t',
    v_clean
  ) INTO v_rows;

  v_count := jsonb_array_length(v_rows);
  rows := v_rows;
  row_count := v_count;
  elapsed_ms := round(extract(epoch FROM (clock_timestamp() - v_start)) * 1000, 2);
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bn_run_select(text) TO authenticated, service_role;