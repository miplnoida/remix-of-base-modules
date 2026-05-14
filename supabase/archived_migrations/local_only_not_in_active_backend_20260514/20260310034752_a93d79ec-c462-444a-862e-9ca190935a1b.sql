
-- Create RPC to get foreign key information
CREATE OR REPLACE FUNCTION get_table_foreign_keys()
RETURNS TABLE(
  source_table text,
  source_column text,
  target_table text,
  target_column text,
  constraint_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tc.table_name::text AS source_table,
    kcu.column_name::text AS source_column,
    ccu.table_name::text AS target_table,
    ccu.column_name::text AS target_column,
    tc.constraint_name::text
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public';
$$;
