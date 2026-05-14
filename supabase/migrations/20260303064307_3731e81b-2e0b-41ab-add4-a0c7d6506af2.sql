
-- Add last_published_at to bonus and holiday policy tables
ALTER TABLE public.c3_bonus_policy_default ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMPTZ;
ALTER TABLE public.c3_bonus_policy_exceptions ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMPTZ;
ALTER TABLE public.c3_holiday_pay_policy_default ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMPTZ;
ALTER TABLE public.c3_holiday_pay_policy_exceptions ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMPTZ;

-- Add new count columns to c3_config_sync_log for new policy tables
ALTER TABLE public.c3_config_sync_log ADD COLUMN IF NOT EXISTS bonus_policies_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.c3_config_sync_log ADD COLUMN IF NOT EXISTS bonus_exceptions_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.c3_config_sync_log ADD COLUMN IF NOT EXISTS holiday_policies_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.c3_config_sync_log ADD COLUMN IF NOT EXISTS holiday_exceptions_count INTEGER NOT NULL DEFAULT 0;
