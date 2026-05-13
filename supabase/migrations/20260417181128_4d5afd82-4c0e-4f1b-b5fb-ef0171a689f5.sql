-- Validation trigger: date_married must be >= dob
CREATE OR REPLACE FUNCTION public.validate_date_married_ge_dob()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.date_married IS NOT NULL AND NEW.dob IS NOT NULL THEN
    IF NEW.date_married < NEW.dob THEN
      RAISE EXCEPTION 'Date Married (%) cannot be earlier than Date of Birth (%)', NEW.date_married, NEW.dob
        USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_date_married_ip_master ON public.ip_master;
CREATE TRIGGER trg_validate_date_married_ip_master
BEFORE INSERT OR UPDATE OF date_married, dob
ON public.ip_master
FOR EACH ROW
EXECUTE FUNCTION public.validate_date_married_ge_dob();

-- Online application staging table — uses date_of_birth + date_married
CREATE OR REPLACE FUNCTION public.validate_app_date_married_ge_dob()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_dob DATE;
  v_dm DATE;
BEGIN
  -- Try common column names defensively
  BEGIN v_dob := (to_jsonb(NEW) ->> 'date_of_birth')::date; EXCEPTION WHEN OTHERS THEN v_dob := NULL; END;
  IF v_dob IS NULL THEN
    BEGIN v_dob := (to_jsonb(NEW) ->> 'dob')::date; EXCEPTION WHEN OTHERS THEN v_dob := NULL; END;
  END IF;
  BEGIN v_dm := (to_jsonb(NEW) ->> 'date_married')::date; EXCEPTION WHEN OTHERS THEN v_dm := NULL; END;

  IF v_dm IS NOT NULL AND v_dob IS NOT NULL AND v_dm < v_dob THEN
    RAISE EXCEPTION 'Date Married (%) cannot be earlier than Date of Birth (%)', v_dm, v_dob
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ip_applications') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_validate_date_married_ip_applications ON public.ip_applications';
    EXECUTE 'CREATE TRIGGER trg_validate_date_married_ip_applications
             BEFORE INSERT OR UPDATE ON public.ip_applications
             FOR EACH ROW EXECUTE FUNCTION public.validate_app_date_married_ge_dob()';
  END IF;
END $$;