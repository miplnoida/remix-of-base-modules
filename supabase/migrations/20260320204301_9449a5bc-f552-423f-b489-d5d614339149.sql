
-- Tables to store C3 payment entry structure for later retrieval

CREATE TABLE public.c3_payment_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id INTEGER NOT NULL,
  payment_code TEXT NOT NULL,
  fund_code TEXT NOT NULL,
  component_amount NUMERIC NOT NULL DEFAULT 0,
  period TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.c3_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id INTEGER NOT NULL,
  mop_code TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'XCD',
  original_amount NUMERIC NOT NULL DEFAULT 0,
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  bank_code TEXT,
  mop_number TEXT,
  cheque_date DATE,
  mop_account_number TEXT,
  mop_notes1 TEXT,
  credit_card_code TEXT,
  expiration_date TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
