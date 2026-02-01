-- Create ip_employer table to track employment history
CREATE TABLE public.ip_employer (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ssn VARCHAR(20) NOT NULL,
  employer_id VARCHAR(20) NOT NULL,
  occupation VARCHAR(10),
  source VARCHAR(10) DEFAULT 'MANUAL',
  posting_status VARCHAR(5) DEFAULT 'VAC',
  date_entered TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entered_by VARCHAR(10),
  date_modified TIMESTAMP WITH TIME ZONE,
  modified_by VARCHAR(10),
  term_start_date DATE,
  term_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate records for same ssn + employer_id + occupation
CREATE UNIQUE INDEX idx_ip_employer_unique_employment 
ON public.ip_employer (ssn, employer_id, COALESCE(occupation, ''));

-- Create indexes for lookups
CREATE INDEX idx_ip_employer_ssn ON public.ip_employer (ssn);
CREATE INDEX idx_ip_employer_employer_id ON public.ip_employer (employer_id);

-- Enable RLS
ALTER TABLE public.ip_employer ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ip_employer
CREATE POLICY "Users can view ip_employer records"
ON public.ip_employer FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert ip_employer records"
ON public.ip_employer FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update ip_employer records"
ON public.ip_employer FOR UPDATE
TO authenticated
USING (true);

-- Create function to process C3 verification and create employment records
CREATE OR REPLACE FUNCTION public.process_c3_employer_verification()
RETURNS TRIGGER AS $$
DECLARE
  v_wage_record RECORD;
  v_existing_employer RECORD;
  v_current_occupation VARCHAR(10);
  v_verifier_code VARCHAR(10);
BEGIN
  -- Only process when posting_status changes to 'VAC' and payer_type is 'ER'
  IF NEW.posting_status = 'VAC' AND NEW.payer_type = 'ER' AND 
     (OLD.posting_status IS NULL OR OLD.posting_status != 'VAC') THEN
    
    -- Get the verifier's user code
    v_verifier_code := COALESCE(NEW.verified_by, 'SYSTEM');
    
    -- Loop through all wage records for this C3
    FOR v_wage_record IN
      SELECT DISTINCT ssn
      FROM public.ip_wages
      WHERE payer_id = NEW.payer_id
        AND sequence_no = NEW.sequence_no
        AND period = NEW.period
        AND ssn IS NOT NULL
    LOOP
      -- Get current occupation from ip_master
      SELECT COALESCE(occupation, primary_occup) INTO v_current_occupation
      FROM public.ip_master
      WHERE ssn = v_wage_record.ssn
      LIMIT 1;
      
      -- Check if a matching employer record already exists
      SELECT * INTO v_existing_employer
      FROM public.ip_employer
      WHERE ssn = v_wage_record.ssn
        AND employer_id = NEW.payer_id
        AND COALESCE(occupation, '') = COALESCE(v_current_occupation, '')
      ORDER BY date_entered DESC
      LIMIT 1;
      
      -- Only insert if no matching record exists
      IF v_existing_employer.id IS NULL THEN
        INSERT INTO public.ip_employer (
          ssn,
          employer_id,
          occupation,
          source,
          posting_status,
          entered_by,
          date_entered,
          term_start_date
        ) VALUES (
          v_wage_record.ssn,
          NEW.payer_id,
          v_current_occupation,
          'C3',
          'VAC',
          v_verifier_code,
          NOW() AT TIME ZONE 'UTC',
          NEW.period
        )
        ON CONFLICT (ssn, employer_id, COALESCE(occupation, '')) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on cn_c3_reported
CREATE TRIGGER trigger_c3_employer_verification
AFTER UPDATE ON public.cn_c3_reported
FOR EACH ROW
EXECUTE FUNCTION public.process_c3_employer_verification();