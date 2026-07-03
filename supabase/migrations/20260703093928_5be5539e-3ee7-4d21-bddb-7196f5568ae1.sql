
CREATE OR REPLACE FUNCTION public.lg_validate_reference(
  p_group_code text,
  p_value_code text
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_exists boolean;
BEGIN
  IF p_value_code IS NULL OR btrim(p_value_code) = '' THEN
    RETURN TRUE;
  END IF;

  SELECT id INTO v_group_id
  FROM core_reference_group
  WHERE group_code = p_group_code
    AND (module_code = 'LEGAL' OR module_code = 'COMMON')
  ORDER BY CASE WHEN module_code = 'LEGAL' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_group_id IS NULL THEN
    RETURN TRUE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM core_reference_value
    WHERE group_id = v_group_id
      AND value_code = p_value_code
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

COMMENT ON FUNCTION public.lg_validate_reference(text, text) IS
  'Phase D master-data consumption: soft validator for Legal reference codes. Never raises.';

CREATE OR REPLACE FUNCTION public.lg_list_unmapped_reference_values(
  p_table_name text,
  p_column_name text,
  p_group_code text,
  p_limit int DEFAULT 200
) RETURNS TABLE (stored_value text, occurrences bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sql text;
BEGIN
  IF p_table_name  !~ '^[a-z_][a-z0-9_]*$' THEN RAISE EXCEPTION 'invalid table name'; END IF;
  IF p_column_name !~ '^[a-z_][a-z0-9_]*$' THEN RAISE EXCEPTION 'invalid column name'; END IF;

  v_sql := format($f$
    WITH src AS (
      SELECT %I::text AS v FROM %I WHERE %I IS NOT NULL AND btrim(%I::text) <> ''
    )
    SELECT v AS stored_value, count(*) AS occurrences
    FROM src
    WHERE NOT public.lg_validate_reference(%L, v)
    GROUP BY v
    ORDER BY count(*) DESC, v ASC
    LIMIT %s
  $f$, p_column_name, p_table_name, p_column_name, p_column_name, p_group_code, p_limit);

  RETURN QUERY EXECUTE v_sql;
END;
$$;

COMMENT ON FUNCTION public.lg_list_unmapped_reference_values(text, text, text, int) IS
  'Phase D: returns distinct stored values in <table>.<column> not present in the target reference group.';

GRANT EXECUTE ON FUNCTION public.lg_validate_reference(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lg_list_unmapped_reference_values(text, text, text, int) TO authenticated;
