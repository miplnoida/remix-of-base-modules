
CREATE TABLE public.cn_cash_count (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR NOT NULL,
  currency_id UUID NOT NULL,
  denomination_id UUID NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_by VARCHAR,
  updated_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(batch_number, denomination_id)
);
