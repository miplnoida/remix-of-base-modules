DROP FUNCTION IF EXISTS public.is_self_employed(text);

CREATE OR REPLACE FUNCTION public.is_self_employed(p_ssn text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ip_self_employ 
    WHERE ssn = p_ssn 
      AND p_ssn IS NOT NULL 
      AND TRIM(p_ssn) <> ''
  );
$$;