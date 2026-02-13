
-- ============================================================
-- Global server-side validation triggers for phone/email fields
-- Covers: er_master, er_owner, ip_self_employ, au_ip_self_employ
-- (ip_master trigger already exists from prior migration)
-- ============================================================

-- er_master validation
CREATE OR REPLACE FUNCTION public.validate_er_master_contact_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Phone: digits and optional leading +
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF NEW.phone !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Phone number must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.phone) > 10 THEN
      RAISE EXCEPTION 'Phone number exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- Mobile
  IF NEW.mobile IS NOT NULL AND NEW.mobile <> '' THEN
    IF NEW.mobile !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Mobile number must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.mobile) > 10 THEN
      RAISE EXCEPTION 'Mobile number exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- Fax
  IF NEW.fax IS NOT NULL AND NEW.fax <> '' THEN
    IF NEW.fax !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Fax number must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.fax) > 10 THEN
      RAISE EXCEPTION 'Fax number exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- Email
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    NEW.email := trim(NEW.email);
    IF length(NEW.email) > 40 THEN
      RAISE EXCEPTION 'Email exceeds maximum length of 40 characters';
    END IF;
    IF NEW.email !~ '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email address format';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_er_master_contact ON public.er_master;
CREATE TRIGGER trg_validate_er_master_contact
  BEFORE INSERT OR UPDATE ON public.er_master
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_er_master_contact_fields();

-- er_owner validation
CREATE OR REPLACE FUNCTION public.validate_er_owner_contact_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF NEW.phone !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Owner phone must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.phone) > 10 THEN
      RAISE EXCEPTION 'Owner phone exceeds maximum length of 10 characters';
    END IF;
  END IF;

  IF NEW.mobile IS NOT NULL AND NEW.mobile <> '' THEN
    IF NEW.mobile !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Owner mobile must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.mobile) > 10 THEN
      RAISE EXCEPTION 'Owner mobile exceeds maximum length of 10 characters';
    END IF;
  END IF;

  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    NEW.email := trim(NEW.email);
    IF length(NEW.email) > 30 THEN
      RAISE EXCEPTION 'Owner email exceeds maximum length of 30 characters';
    END IF;
    IF NEW.email !~ '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid owner email format';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_er_owner_contact ON public.er_owner;
CREATE TRIGGER trg_validate_er_owner_contact
  BEFORE INSERT OR UPDATE ON public.er_owner
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_er_owner_contact_fields();

-- ip_self_employ validation
CREATE OR REPLACE FUNCTION public.validate_ip_self_employ_contact_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF NEW.phone !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Phone must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.phone) > 10 THEN
      RAISE EXCEPTION 'Phone exceeds maximum length of 10 characters';
    END IF;
  END IF;

  IF NEW.fax IS NOT NULL AND NEW.fax <> '' THEN
    IF NEW.fax !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Fax must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.fax) > 10 THEN
      RAISE EXCEPTION 'Fax exceeds maximum length of 10 characters';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_ip_self_employ_contact ON public.ip_self_employ;
CREATE TRIGGER trg_validate_ip_self_employ_contact
  BEFORE INSERT OR UPDATE ON public.ip_self_employ
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ip_self_employ_contact_fields();

-- meetings table validation
CREATE OR REPLACE FUNCTION public.validate_meetings_contact_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_phone IS NOT NULL AND NEW.contact_phone <> '' THEN
    IF NEW.contact_phone !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Contact phone must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.contact_phone) > 20 THEN
      RAISE EXCEPTION 'Contact phone exceeds maximum length of 20 characters';
    END IF;
  END IF;

  IF NEW.contact_email IS NOT NULL AND NEW.contact_email <> '' THEN
    NEW.contact_email := trim(NEW.contact_email);
    IF length(NEW.contact_email) > 100 THEN
      RAISE EXCEPTION 'Contact email exceeds maximum length of 100 characters';
    END IF;
    IF NEW.contact_email !~ '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid contact email format';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_meetings_contact ON public.meetings;
CREATE TRIGGER trg_validate_meetings_contact
  BEFORE INSERT OR UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_meetings_contact_fields();

-- Update existing ip_master trigger to also handle contact_phone, contact_mobile, contact_email
CREATE OR REPLACE FUNCTION public.validate_ip_master_contact_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- phone (varchar 10)
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    IF NEW.phone !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Phone must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.phone) > 10 THEN
      RAISE EXCEPTION 'Phone exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- phone_mobile (varchar 10)
  IF NEW.phone_mobile IS NOT NULL AND NEW.phone_mobile <> '' THEN
    IF NEW.phone_mobile !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Mobile must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.phone_mobile) > 10 THEN
      RAISE EXCEPTION 'Mobile exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- telephone (text)
  IF NEW.telephone IS NOT NULL AND NEW.telephone <> '' THEN
    IF NEW.telephone !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Telephone must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.telephone) > 15 THEN
      RAISE EXCEPTION 'Telephone exceeds maximum length of 15 characters';
    END IF;
  END IF;

  -- mobile (text)
  IF NEW.mobile IS NOT NULL AND NEW.mobile <> '' THEN
    IF NEW.mobile !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Mobile must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.mobile) > 15 THEN
      RAISE EXCEPTION 'Mobile exceeds maximum length of 15 characters';
    END IF;
  END IF;

  -- contact_phone (varchar 10)
  IF NEW.contact_phone IS NOT NULL AND NEW.contact_phone <> '' THEN
    IF NEW.contact_phone !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Contact phone must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.contact_phone) > 10 THEN
      RAISE EXCEPTION 'Contact phone exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- contact_mobile (varchar 10)
  IF NEW.contact_mobile IS NOT NULL AND NEW.contact_mobile <> '' THEN
    IF NEW.contact_mobile !~ '^\+?[0-9]+$' THEN
      RAISE EXCEPTION 'Contact mobile must contain only digits (and optional leading +)';
    END IF;
    IF length(NEW.contact_mobile) > 10 THEN
      RAISE EXCEPTION 'Contact mobile exceeds maximum length of 10 characters';
    END IF;
  END IF;

  -- email (text)
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    NEW.email := trim(NEW.email);
    IF length(NEW.email) > 40 THEN
      RAISE EXCEPTION 'Email exceeds maximum length of 40 characters';
    END IF;
    IF NEW.email !~ '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
  END IF;

  -- email_addr (varchar 40)
  IF NEW.email_addr IS NOT NULL AND NEW.email_addr <> '' THEN
    NEW.email_addr := trim(NEW.email_addr);
    IF length(NEW.email_addr) > 40 THEN
      RAISE EXCEPTION 'Email address exceeds maximum length of 40 characters';
    END IF;
    IF NEW.email_addr !~ '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email address format';
    END IF;
  END IF;

  -- contact_email (varchar 40)
  IF NEW.contact_email IS NOT NULL AND NEW.contact_email <> '' THEN
    NEW.contact_email := trim(NEW.contact_email);
    IF length(NEW.contact_email) > 40 THEN
      RAISE EXCEPTION 'Contact email exceeds maximum length of 40 characters';
    END IF;
    IF NEW.contact_email !~ '^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid contact email format';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
