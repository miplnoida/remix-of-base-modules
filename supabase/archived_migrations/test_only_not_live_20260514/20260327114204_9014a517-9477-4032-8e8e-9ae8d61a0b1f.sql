
CREATE TABLE public.payment_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id INTEGER NOT NULL,
  receipt_id INTEGER NOT NULL,
  receipt_number TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  request_payload JSONB,
  response_payload JSONB,
  http_status INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  external_payment_id TEXT,
  is_duplicate BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  initiated_by TEXT,
  UNIQUE(payment_id, receipt_id)
);
