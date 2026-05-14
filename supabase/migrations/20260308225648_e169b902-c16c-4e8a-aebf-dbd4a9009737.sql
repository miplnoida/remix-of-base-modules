CREATE OR REPLACE FUNCTION public.check_vc_residency_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_residence text;
  v_new_residence text;
  v_has_active_vc boolean;
BEGIN
  v_old_residence := COALESCE(OLD.place_of_residence, '');
  v_new_residence := COALESCE(NEW.place_of_residence, '');

  IF v_old_residence IS DISTINCT FROM v_new_residence THEN
    IF v_new_residence NOT IN ('SKN') THEN
      SELECT EXISTS (
        SELECT 1 FROM ip_vol_contrib
        WHERE ssn = NEW.ssn AND date_ceased IS NULL
      ) INTO v_has_active_vc;

      IF v_has_active_vc THEN
        UPDATE ip_vol_contrib
        SET date_ceased = CURRENT_DATE
        WHERE ssn = NEW.ssn AND date_ceased IS NULL;

        UPDATE ip_master
        SET vol_contrib = 'N'
        WHERE ssn = NEW.ssn;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;