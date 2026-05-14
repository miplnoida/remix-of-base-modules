-- Grant sequence permissions for SSN generation
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.ip_ssn_seq TO anon, authenticated;

-- Also set security definer on the function to run with owner privileges
CREATE OR REPLACE FUNCTION public.generate_ip_ssn()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_ssn TEXT;
  next_val INTEGER;
BEGIN
  -- Get next sequence value
  SELECT nextval('ip_ssn_seq') INTO next_val;
  
  -- Format as 6-digit string with leading zeros
  new_ssn := LPAD(next_val::TEXT, 6, '0');
  
  RETURN new_ssn;
END;
$$;