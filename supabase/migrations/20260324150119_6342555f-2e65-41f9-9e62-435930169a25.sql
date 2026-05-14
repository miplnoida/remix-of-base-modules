
CREATE TABLE public.se_wages_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_version TEXT NOT NULL DEFAULT '1.0',
  ssn TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB,
  payload_hash TEXT,
  records_count INTEGER DEFAULT 0,
  error_message TEXT,
  response_data JSONB,
  published_by TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
