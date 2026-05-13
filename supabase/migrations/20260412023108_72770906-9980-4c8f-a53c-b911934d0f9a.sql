-- Trigger function: generate permanent regno when er_master status changes to 'V'
CREATE OR REPLACE FUNCTION public.handle_er_status_to_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_regno TEXT;
  v_old_regno TEXT;
  v_attempts INT := 0;
  v_max_attempts INT := 10;
BEGIN
  -- Only act when status just changed to 'V'
  IF NEW.status = 'V' AND (OLD.status IS DISTINCT FROM 'V') THEN

    v_old_regno := NEW.regno;

    -- Only convert if current regno is temporary (starts with 'T')
    IF v_old_regno IS NOT NULL AND LEFT(v_old_regno, 1) = 'T' THEN

      -- Generate permanent regno with retry logic
      LOOP
        v_attempts := v_attempts + 1;
        IF v_attempts > v_max_attempts THEN
          RAISE WARNING 'handle_er_status_to_verified: failed to generate unique regno after % attempts for old_regno=%', v_max_attempts, v_old_regno;
          RETURN NEW; -- Don't block the status update
        END IF;

        v_new_regno := generate_er_regno();

        -- Check uniqueness
        IF NOT EXISTS (SELECT 1 FROM er_master WHERE regno = v_new_regno AND regno <> v_old_regno) THEN
          EXIT; -- unique, proceed
        END IF;
      END LOOP;

      -- Update related tables first (they reference the old regno)
      UPDATE er_owner SET regno = v_new_regno WHERE regno = v_old_regno;
      UPDATE er_locations SET regno = v_new_regno WHERE regno = v_old_regno;
      UPDATE er_notes SET regno = v_new_regno WHERE regno = v_old_regno;
      UPDATE er_commence SET regno = v_new_regno WHERE regno = v_old_regno;
      UPDATE er_visit SET regno = v_new_regno WHERE regno = v_old_regno;
      UPDATE er_suit SET regno = v_new_regno WHERE regno = v_old_regno;

      -- Update the master record's regno
      NEW.regno := v_new_regno;

      RAISE NOTICE 'handle_er_status_to_verified: converted % -> %', v_old_regno, v_new_regno;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create BEFORE UPDATE trigger (BEFORE so we can modify NEW.regno)
DROP TRIGGER IF EXISTS trg_er_master_status_verified ON er_master;
CREATE TRIGGER trg_er_master_status_verified
  BEFORE UPDATE ON er_master
  FOR EACH ROW
  WHEN (NEW.status = 'V' AND OLD.status IS DISTINCT FROM 'V')
  EXECUTE FUNCTION public.handle_er_status_to_verified();