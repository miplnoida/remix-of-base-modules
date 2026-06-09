ALTER TABLE public.bn_eligibility_fact DROP CONSTRAINT IF EXISTS bn_elig_fact_window_chk;
ALTER TABLE public.bn_eligibility_fact ADD CONSTRAINT bn_elig_fact_window_chk
  CHECK (window_type IS NULL OR window_type IN ('WEEKS','MONTHS','YEARS','DAYS','LIFETIME'));