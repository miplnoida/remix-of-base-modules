-- Create trigger function for Voluntary Contributor C3 verification
CREATE OR REPLACE FUNCTION public.process_c3_voluntary_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_verifier_code VARCHAR(10);
BEGIN
  -- Only process when posting_status changes to 'VAC' and payer_type is 'VC'
  IF NEW.posting_status = 'VAC' AND NEW.payer_type = 'VC' AND 
     (OLD.posting_status IS NULL OR OLD.posting_status != 'VAC') THEN
    
    -- Get the verifier's user code
    v_verifier_code := COALESCE(NEW.verified_by, 'SYSTEM');
    
    -- Insert into ip_vol_contrib_wages
    -- For VC, payer_id is the SSN
    INSERT INTO public.ip_vol_contrib_wages (
      ssn,
      payment_sequence_no,
      period,
      contrib_amt,
      entered_by,
      date_entered,
      created_at,
      updated_at
    ) VALUES (
      NEW.payer_id,
      NEW.sequence_no,
      NEW.period,
      NEW.emp_ss_amt_calc,
      v_verifier_code,
      NOW() AT TIME ZONE 'UTC',
      NOW() AT TIME ZONE 'UTC',
      NOW() AT TIME ZONE 'UTC'
    )
    ON CONFLICT (ssn, payment_sequence_no, period) 
    DO UPDATE SET
      contrib_amt = EXCLUDED.contrib_amt,
      modified_by = v_verifier_code,
      date_modified = NOW() AT TIME ZONE 'UTC',
      updated_at = NOW() AT TIME ZONE 'UTC';
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create unique constraint if not exists (for upsert to work)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ip_vol_contrib_wages_ssn_seq_period_unique'
  ) THEN
    ALTER TABLE public.ip_vol_contrib_wages 
    ADD CONSTRAINT ip_vol_contrib_wages_ssn_seq_period_unique 
    UNIQUE (ssn, payment_sequence_no, period);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Create trigger for VC verification
DROP TRIGGER IF EXISTS trigger_c3_voluntary_verification ON public.cn_c3_reported;

CREATE TRIGGER trigger_c3_voluntary_verification
  AFTER UPDATE ON public.cn_c3_reported
  FOR EACH ROW
  EXECUTE FUNCTION public.process_c3_voluntary_verification();