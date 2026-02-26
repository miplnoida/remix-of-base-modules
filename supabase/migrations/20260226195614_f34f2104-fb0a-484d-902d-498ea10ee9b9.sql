
-- Add date_from and date_to columns to c3_bonus_policy_default
ALTER TABLE public.c3_bonus_policy_default
  ADD COLUMN date_from DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN date_to DATE;

-- Add date_from and date_to columns to c3_bonus_policy_exceptions
ALTER TABLE public.c3_bonus_policy_exceptions
  ADD COLUMN date_from DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN date_to DATE;

-- Create validation trigger for c3_bonus_policy_default: date_to >= date_from
CREATE OR REPLACE FUNCTION public.validate_bonus_policy_default_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_to IS NOT NULL AND NEW.date_to < NEW.date_from THEN
    RAISE EXCEPTION 'date_to cannot be earlier than date_from';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_bonus_policy_default_dates
  BEFORE INSERT OR UPDATE ON public.c3_bonus_policy_default
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_bonus_policy_default_dates();

-- Create validation trigger for c3_bonus_policy_exceptions: date_to >= date_from
CREATE OR REPLACE FUNCTION public.validate_bonus_policy_exception_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_to IS NOT NULL AND NEW.date_to < NEW.date_from THEN
    RAISE EXCEPTION 'date_to cannot be earlier than date_from';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_bonus_policy_exception_dates
  BEFORE INSERT OR UPDATE ON public.c3_bonus_policy_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_bonus_policy_exception_dates();
