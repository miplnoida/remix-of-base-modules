
-- Server-side validation trigger for ip_master contact fields
CREATE OR REPLACE FUNCTION public.validate_ip_master_contact_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate phone (max 10 chars, digits only after stripping dial code prefix)
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    -- Strip leading + and digits for dial code, remaining must be digits
    IF NEW.phone !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Phone number must contain only digits and an optional leading + sign';
    END IF;
    IF length(NEW.phone) > 10 THEN
      RAISE EXCEPTION 'Phone number exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- Validate phone_mobile (max 10 chars, digits only)
  IF NEW.phone_mobile IS NOT NULL AND NEW.phone_mobile <> '' THEN
    IF NEW.phone_mobile !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Mobile number must contain only digits and an optional leading + sign';
    END IF;
    IF length(NEW.phone_mobile) > 10 THEN
      RAISE EXCEPTION 'Mobile number exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- Validate telephone column (max 15 chars, digits/+ only)
  IF NEW.telephone IS NOT NULL AND NEW.telephone <> '' THEN
    IF NEW.telephone !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Telephone must contain only digits and an optional leading + sign';
    END IF;
    IF length(NEW.telephone) > 15 THEN
      RAISE EXCEPTION 'Telephone exceeds maximum length of 15 characters';
    END IF;
  END IF;

  -- Validate mobile column (max 15 chars, digits/+ only)
  IF NEW.mobile IS NOT NULL AND NEW.mobile <> '' THEN
    IF NEW.mobile !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Mobile must contain only digits and an optional leading + sign';
    END IF;
    IF length(NEW.mobile) > 15 THEN
      RAISE EXCEPTION 'Mobile exceeds maximum length of 15 characters';
    END IF;
  END IF;

  -- Validate email (max 40 chars, RFC-like pattern)
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    NEW.email := trim(NEW.email);
    IF length(NEW.email) > 40 THEN
      RAISE EXCEPTION 'Email address exceeds maximum length of 40 characters';
    END IF;
    IF NEW.email !~ '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email address format';
    END IF;
  END IF;

  -- Validate email_addr (max 40 chars, RFC-like pattern)
  IF NEW.email_addr IS NOT NULL AND NEW.email_addr <> '' THEN
    NEW.email_addr := trim(NEW.email_addr);
    IF length(NEW.email_addr) > 40 THEN
      RAISE EXCEPTION 'Email address exceeds maximum length of 40 characters';
    END IF;
    IF NEW.email_addr !~ '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email address format';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_validate_ip_master_contact ON public.ip_master;

-- Create trigger
CREATE TRIGGER trg_validate_ip_master_contact
  BEFORE INSERT OR UPDATE ON public.ip_master
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ip_master_contact_fields();
