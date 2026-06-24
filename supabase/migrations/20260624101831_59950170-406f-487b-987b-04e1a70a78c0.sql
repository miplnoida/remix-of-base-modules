
CREATE OR REPLACE FUNCTION public.bn_list_tables()
RETURNS TABLE (
  table_name text,
  row_count bigint,
  has_created_at boolean,
  last_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  r record;
  v_count bigint;
  v_last timestamptz;
  v_has_created boolean;
BEGIN
  FOR r IN
    SELECT t.table_name AS tname
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_name LIKE 'bn\_%' ESCAPE '\'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = r.tname
        AND c.column_name = 'created_at'
    ) INTO v_has_created;

    BEGIN
      IF v_has_created THEN
        EXECUTE format('SELECT count(*)::bigint, max(created_at) FROM public.%I', r.tname)
          INTO v_count, v_last;
      ELSE
        EXECUTE format('SELECT count(*)::bigint FROM public.%I', r.tname)
          INTO v_count;
        v_last := NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_count := -1;
      v_last := NULL;
    END;

    table_name := r.tname;
    row_count := v_count;
    has_created_at := v_has_created;
    last_created_at := v_last;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bn_list_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bn_list_tables() TO service_role;
