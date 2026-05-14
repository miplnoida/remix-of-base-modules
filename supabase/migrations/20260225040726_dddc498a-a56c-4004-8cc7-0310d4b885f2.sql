-- Server-side validation trigger for verification_type on ip_application_documents
-- Allowed values: birth_status, name_status, marital_status, death_status, or NULL
CREATE OR REPLACE FUNCTION public.validate_verification_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Allow NULL verification_type (non-verification uploads like photos)
  IF NEW.verification_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate against allowed values
  IF NEW.verification_type NOT IN ('birth_status', 'name_status', 'marital_status', 'death_status') THEN
    RAISE EXCEPTION 'Invalid verification_type: %. Allowed values: birth_status, name_status, marital_status, death_status', NEW.verification_type;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_validate_verification_type ON public.ip_application_documents;
CREATE TRIGGER trg_validate_verification_type
  BEFORE INSERT OR UPDATE ON public.ip_application_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_verification_type();