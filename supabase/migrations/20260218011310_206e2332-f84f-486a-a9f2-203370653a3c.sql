
-- Drop ALL existing overloads of convert_application_to_ip by using CASCADE on each
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT oid, pg_get_function_identity_arguments(oid) as args
    FROM pg_proc
    WHERE proname = 'convert_application_to_ip'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.convert_application_to_ip(%s)', r.args);
  END LOOP;
END;
$$;
