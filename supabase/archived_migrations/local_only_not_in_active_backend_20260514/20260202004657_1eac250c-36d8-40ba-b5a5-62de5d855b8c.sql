-- Step 1: Rename existing tb_vc_contrib_rate to tb_vc_eligibility_config
ALTER TABLE public.tb_vc_contrib_rate RENAME TO tb_vc_eligibility_config;

-- Step 2: Create new tb_vc_contrib_rate with specified columns
CREATE TABLE public.tb_vc_contrib_rate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  effstart TIMESTAMP(3) NOT NULL,
  effend TIMESTAMP(3) NOT NULL,
  min_contrib_weeks SMALLINT NULL,
  submission_limit_nbr SMALLINT NULL,
  vc_contrib_pct NUMERIC(5, 2) NULL,
  vc_duration SMALLINT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tb_vc_contrib_rate ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated read access
CREATE POLICY "Allow authenticated read access on tb_vc_contrib_rate"
  ON public.tb_vc_contrib_rate
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert initial record
INSERT INTO public.tb_vc_contrib_rate (effstart, effend, min_contrib_weeks, submission_limit_nbr, vc_contrib_pct, vc_duration)
VALUES ('2025-01-01 00:00:00', '2099-12-31 23:59:59', 13, 4, 10.00, 260);