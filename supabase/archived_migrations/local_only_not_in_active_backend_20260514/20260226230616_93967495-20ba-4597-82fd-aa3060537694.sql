
-- 1. Drop the bonus policy exceptions table
DROP TABLE IF EXISTS public.c3_bonus_policy_exceptions CASCADE;

-- 2. Drop bonus levy columns from c3_config_details
ALTER TABLE public.c3_config_details
  DROP COLUMN IF EXISTS bonus_exempt_from_levy,
  DROP COLUMN IF EXISTS bonus_levy_rate;

-- 3. Drop interest rate columns from c3_config_details
ALTER TABLE public.c3_config_details
  DROP COLUMN IF EXISTS interest_rate_ss_principal,
  DROP COLUMN IF EXISTS interest_rate_levy_principal,
  DROP COLUMN IF EXISTS interest_rate_severance_principal,
  DROP COLUMN IF EXISTS interest_rate_penalties,
  DROP COLUMN IF EXISTS interest_rate_fines;
