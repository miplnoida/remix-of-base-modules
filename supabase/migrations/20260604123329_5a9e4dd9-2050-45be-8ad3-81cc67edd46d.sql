ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lockout_exempt BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET lockout_exempt = true,
    locked_until = NULL,
    failed_login_attempts = 0
WHERE email = 'admin@secureserve.gov';