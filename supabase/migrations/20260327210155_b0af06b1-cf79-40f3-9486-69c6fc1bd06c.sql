
-- Function to get table schema info as JSONB (columns, PK, enums)
CREATE OR REPLACE FUNCTION public.get_table_ddl_info(p_table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    RETURN jsonb_build_object('error', 'Table does not exist');
  END IF;

  SELECT jsonb_build_object(
    'table_name', p_table_name,
    'columns', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'column_name', c.column_name,
          'data_type', c.data_type,
          'udt_name', c.udt_name,
          'character_maximum_length', c.character_maximum_length,
          'numeric_precision', c.numeric_precision,
          'numeric_scale', c.numeric_scale,
          'is_nullable', c.is_nullable,
          'column_default', c.column_default
        ) ORDER BY c.ordinal_position
      )
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = p_table_name
    ),
    'primary_key_columns', (
      SELECT jsonb_agg(kcu.column_name ORDER BY kcu.ordinal_position)
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = p_table_name
        AND tc.constraint_type = 'PRIMARY KEY'
    ),
    'enums', (
      SELECT jsonb_agg(DISTINCT jsonb_build_object(
        'enum_name', t.typname,
        'enum_values', (
          SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
          FROM pg_enum e WHERE e.enumtypid = t.oid
        )
      ))
      FROM information_schema.columns c
      JOIN pg_type t ON t.typname = c.udt_name AND t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      WHERE c.table_schema = 'public'
        AND c.table_name = p_table_name
        AND c.data_type = 'USER-DEFINED'
        AND t.typtype = 'e'
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to safely execute CREATE TABLE DDL
CREATE OR REPLACE FUNCTION public.admin_execute_ddl(p_sql text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trimmed text := upper(btrim(p_sql));
BEGIN
  IF v_trimmed NOT LIKE 'CREATE TABLE%' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only CREATE TABLE statements are allowed');
  END IF;

  EXECUTE p_sql;

  -- Notify PostgREST to reload schema so new table is immediately accessible
  PERFORM pg_notify('pgrst', 'reload schema');

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to create enum type if it doesn't exist
CREATE OR REPLACE FUNCTION public.admin_create_enum_if_not_exists(p_enum_name text, p_values text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = p_enum_name AND typnamespace = 'public'::regnamespace) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Type already exists');
  END IF;

  EXECUTE format('CREATE TYPE public.%I AS ENUM (%s)',
    p_enum_name,
    (SELECT string_agg(quote_literal(v), ', ') FROM unnest(p_values) v)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Type created');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to bulk insert JSONB records into any table
CREATE OR REPLACE FUNCTION public.admin_bulk_insert_jsonb(p_table_name text, p_records jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record jsonb;
  v_inserted int := 0;
  v_failed int := 0;
  v_errors text[] := '{}';
BEGIN
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    BEGIN
      EXECUTE format(
        'INSERT INTO public.%I SELECT * FROM jsonb_populate_record(null::public.%I, $1) ON CONFLICT DO NOTHING',
        p_table_name, p_table_name
      ) USING v_record;
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      IF array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) < 5 THEN
        v_errors := array_append(v_errors, SQLERRM);
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object('inserted', v_inserted, 'failed', v_failed, 'errors', to_jsonb(v_errors));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_table_ddl_info(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_execute_ddl(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_enum_if_not_exists(text, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bulk_insert_jsonb(text, jsonb) TO anon, authenticated;
