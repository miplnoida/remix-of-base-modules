-- Fix the submit_er_registration function to not reference er_notification table (which doesn't have regno column)
CREATE OR REPLACE FUNCTION public.submit_er_registration(p_temp_regno text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_record RECORD;
  v_new_regno TEXT;
  v_attempt INT;
  v_rowcount INT;
BEGIN
  -- Lock the row to prevent concurrent submissions
  SELECT *
  INTO v_record
  FROM public.er_master
  WHERE regno = p_temp_regno
  FOR UPDATE;

  IF v_record IS NULL THEN
    RAISE EXCEPTION 'Employer registration not found';
  END IF;

  IF v_record.status IS DISTINCT FROM 'Z' THEN
    RAISE EXCEPTION 'Only draft registrations can be submitted';
  END IF;

  -- If regno is already a permanent 6-digit numeric, keep it; otherwise generate a new one
  IF v_record.regno IS NOT NULL AND v_record.regno ~ '^[0-9]{6}$' THEN
    v_new_regno := v_record.regno;
  ELSE
    v_new_regno := NULL;
  END IF;

  v_attempt := 0;
  LOOP
    v_attempt := v_attempt + 1;

    IF v_new_regno IS NULL THEN
      v_new_regno := public.generate_er_regno();
    END IF;

    BEGIN
      -- Update the record with new permanent regno and Pending status
      UPDATE public.er_master
      SET
        regno = v_new_regno,
        status = 'P',
        date_modified = NOW()
      WHERE regno = p_temp_regno;

      GET DIAGNOSTICS v_rowcount = ROW_COUNT;
      IF v_rowcount <> 1 THEN
        RAISE EXCEPTION 'Failed to update registration status';
      END IF;

      -- Update related tables with new regno (only tables that have regno column)
      UPDATE public.er_owner SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_locations SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_notes SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_commence SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_visit SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_suit SET regno = v_new_regno WHERE regno = p_temp_regno;
      -- Note: er_notification table does not have regno column, so it's excluded

      EXIT; -- success

    EXCEPTION
      WHEN unique_violation THEN
        -- Collision on regno unique constraint - retry a few times
        v_new_regno := NULL;
        IF v_attempt >= 10 THEN
          RAISE EXCEPTION 'Unable to generate a unique registration number after % attempts', v_attempt;
        END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'old_regno', p_temp_regno,
    'new_regno', v_new_regno,
    'status', 'P'
  );
END;
$function$;