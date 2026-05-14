
-- Sync log table to track C3 configuration publish history
CREATE TABLE public.c3_config_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_version TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  payload JSONB NOT NULL,
  payload_hash TEXT NOT NULL,
  error_message TEXT,
  config_periods_count INTEGER NOT NULL DEFAULT 0,
  levy_slabs_count INTEGER NOT NULL DEFAULT 0,
  bonus_exemptions_count INTEGER NOT NULL DEFAULT 0,
  published_by TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add last_published_at to track when each config was last synced
ALTER TABLE public.c3_config_periods ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tb_levy_slabs ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.c3_bonus_levy_exemptions ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMP WITH TIME ZONE;
