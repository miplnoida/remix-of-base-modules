CREATE OR REPLACE FUNCTION public.process_c3_employer_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wage_row RECORD;
  v_verifier_code VARCHAR(50);
BEGIN
  IF NEW.posting_status = 'VAC' AND (OLD.posting_status IS NULL OR OLD.posting_status != 'VAC') THEN
    v_verifier_code := COALESCE(NEW.verified_by, 'SYSTEM');

    FOR v_wage_row IN
      SELECT iw.id
      FROM ip_wages iw
      WHERE iw.c3_id = NEW.id
    LOOP
      UPDATE ip_wages
      SET posting_status = 'VAC',
          verified_by = v_verifier_code,
          date_verified = NOW()
      WHERE id = v_wage_row.id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;