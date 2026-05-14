-- Create Bonus Levy Exemption Configuration table
CREATE TABLE public.c3_bonus_levy_exemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  is_exempt BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modified_by VARCHAR(100),
  modified_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(period_year, period_month)
);

-- Add RLS policies
ALTER TABLE public.c3_bonus_levy_exemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on c3_bonus_levy_exemptions"
  ON public.c3_bonus_levy_exemptions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert on c3_bonus_levy_exemptions"
  ON public.c3_bonus_levy_exemptions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update on c3_bonus_levy_exemptions"
  ON public.c3_bonus_levy_exemptions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete on c3_bonus_levy_exemptions"
  ON public.c3_bonus_levy_exemptions FOR DELETE TO authenticated USING (true);

-- Create a function to check if bonus is exempt for a given period
CREATE OR REPLACE FUNCTION public.is_bonus_levy_exempt(p_year INTEGER, p_month INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.c3_bonus_levy_exemptions
    WHERE period_year = p_year 
      AND period_month = p_month 
      AND is_exempt = true 
      AND is_active = true
  );
END;
$$;