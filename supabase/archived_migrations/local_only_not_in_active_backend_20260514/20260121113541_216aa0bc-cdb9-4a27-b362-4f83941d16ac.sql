-- Add submit RPC for IP draft registrations (Z -> P) with atomic SSN generation

-- Ensure submission metadata columns exist
ALTER TABLE public.ip_master
  ADD COLUMN IF NOT EXISTS submitted_by uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

-- Atomic submit: generate permanent SSN (6 digits) + set status to Pending
CREATE OR REPLACE FUNCTION public.submit_ip_registration(
  p_unique_uuid uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record record;
  v_new_ssn text;
  v_attempt int;
  v_rowcount int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the row to prevent concurrent submissions
  SELECT *
  INTO v_record
  FROM public.ip_master
  WHERE unique_uuid = p_unique_uuid
  FOR UPDATE;

  IF v_record IS NULL THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  IF v_record.status IS DISTINCT FROM 'Z' THEN
    RAISE EXCEPTION 'Only draft registrations can be submitted';
  END IF;

  -- If SSN is already a permanent 6-digit numeric, keep it; otherwise generate a new one
  IF v_record.ssn IS NOT NULL AND v_record.ssn ~ '^[0-9]{6}$' THEN
    v_new_ssn := v_record.ssn;
  ELSE
    v_new_ssn := NULL;
  END IF;

  v_attempt := 0;
  LOOP
    v_attempt := v_attempt + 1;

    IF v_new_ssn IS NULL THEN
      v_new_ssn := public.generate_ip_ssn();
    END IF;

    BEGIN
      UPDATE public.ip_master
      SET
        ssn = v_new_ssn,
        status = 'P',
        submitted_by = auth.uid(),
        submitted_at = now(),
        updated_by = auth.uid(),
        updated_at = now()
      WHERE unique_uuid = p_unique_uuid;

      GET DIAGNOSTICS v_rowcount = ROW_COUNT;
      IF v_rowcount <> 1 THEN
        RAISE EXCEPTION 'Failed to update registration status';
      END IF;

      EXIT; -- success

    EXCEPTION
      WHEN unique_violation THEN
        -- Collision on ssn unique constraint (if present) - retry a few times
        v_new_ssn := NULL;
        IF v_attempt >= 10 THEN
          RAISE EXCEPTION 'Unable to generate a unique SSN after % attempts', v_attempt;
        END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'unique_uuid', p_unique_uuid::text,
    'ssn', v_new_ssn,
    'status', 'P'
  );
END;
$$;

-- Allow app clients to call the RPC
GRANT EXECUTE ON FUNCTION public.submit_ip_registration(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_ip_registration(uuid) TO anon;
