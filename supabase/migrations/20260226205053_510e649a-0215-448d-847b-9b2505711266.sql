
ALTER TABLE public.c3_bonus_policy_default ADD COLUMN IF NOT EXISTS contrib_severance boolean NOT NULL DEFAULT false;
ALTER TABLE public.c3_bonus_policy_exceptions ADD COLUMN IF NOT EXISTS contrib_severance boolean DEFAULT false;
