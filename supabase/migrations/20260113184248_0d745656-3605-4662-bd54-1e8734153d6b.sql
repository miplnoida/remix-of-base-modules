-- Drop and recreate the function with correct parameter name
DROP FUNCTION IF EXISTS public.get_table_columns(text);

CREATE FUNCTION public.get_table_columns(p_table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    (c.is_nullable = 'YES')::boolean
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;