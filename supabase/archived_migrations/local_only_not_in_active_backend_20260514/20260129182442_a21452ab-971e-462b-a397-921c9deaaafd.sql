-- Create sequence for temporary employer registration numbers
CREATE SEQUENCE IF NOT EXISTS er_temp_regno_seq START 1;

-- Create sequence for permanent employer registration numbers
CREATE SEQUENCE IF NOT EXISTS er_perm_regno_seq START 1;

-- Initialize permanent sequence from the highest existing regno
DO $$
DECLARE
  max_regno_num INTEGER;
BEGIN
  -- Get max numeric regno from er_master (excluding temp ones starting with 'ER-T')
  SELECT COALESCE(MAX(CAST(regexp_replace(regno, '[^0-9]', '', 'g') AS INTEGER)), 0)
  INTO max_regno_num
  FROM er_master
  WHERE regno IS NOT NULL
    AND regno NOT LIKE 'ER-T%'
    AND regno ~ '^[0-9]+$';
  
  -- Also check er_last_regno table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'er_last_regno' AND table_schema = 'public') THEN
    SELECT GREATEST(max_regno_num, COALESCE(MAX(CAST(regno AS INTEGER)), 0))
    INTO max_regno_num
    FROM er_last_regno
    WHERE regno ~ '^[0-9]+$';
  END IF;
  
  -- Set the sequence to start after the max
  IF max_regno_num > 0 THEN
    PERFORM setval('er_perm_regno_seq', max_regno_num, true);
  END IF;
END $$;

-- Function to generate temporary employer registration number
CREATE OR REPLACE FUNCTION public.generate_temp_er_regno()
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN 'ER-T' || LPAD(nextval('er_temp_regno_seq')::TEXT, 5, '0');
END;
$function$;

-- Function to generate permanent employer registration number
CREATE OR REPLACE FUNCTION public.generate_er_regno()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_regno TEXT;
  next_val INTEGER;
BEGIN
  -- Get next sequence value
  SELECT nextval('er_perm_regno_seq') INTO next_val;
  
  -- Format as 6-digit string with leading zeros
  new_regno := LPAD(next_val::TEXT, 6, '0');
  
  -- Record in er_last_regno for tracking
  INSERT INTO er_last_regno (regno, date_issued)
  VALUES (new_regno, NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN new_regno;
END;
$function$;

-- Function to submit employer registration (atomic operation)
CREATE OR REPLACE FUNCTION public.submit_er_registration(p_temp_regno TEXT, p_user_id UUID DEFAULT NULL)
RETURNS JSONB
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

      -- Update related tables with new regno
      UPDATE public.er_owner SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_locations SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_notes SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_commence SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_visit SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_suit SET regno = v_new_regno WHERE regno = p_temp_regno;
      UPDATE public.er_notification SET regno = v_new_regno WHERE regno = p_temp_regno;

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