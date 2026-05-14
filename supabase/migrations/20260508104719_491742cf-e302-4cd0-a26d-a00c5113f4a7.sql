ALTER TABLE public.c3_config_sync_log
  ADD COLUMN IF NOT EXISTS filing_config_periods_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.c3_filing_config_periods
  ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMPTZ;