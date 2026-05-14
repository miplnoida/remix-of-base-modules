
-- 1. Create tb_currencies master table
CREATE TABLE public.tb_currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code VARCHAR(3) NOT NULL UNIQUE,
  currency_name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_main_currency BOOLEAN NOT NULL DEFAULT false,
  exchange_rate NUMERIC(12,6) NOT NULL DEFAULT 1.000000,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(10),
  updated_by VARCHAR(10)
);

-- Ensure only one main currency
CREATE UNIQUE INDEX idx_tb_currencies_main ON public.tb_currencies (is_main_currency) WHERE is_main_currency = true;

-- 2. Cashier enabled currencies config
CREATE TABLE public.cashier_currency_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_id UUID NOT NULL REFERENCES public.tb_currencies(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(10),
  UNIQUE(currency_id)
);

-- 3. Denomination config per currency
CREATE TABLE public.cashier_currency_denominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_id UUID NOT NULL REFERENCES public.tb_currencies(id) ON DELETE CASCADE,
  denomination_value NUMERIC(10,2) NOT NULL,
  denomination_type VARCHAR(10) NOT NULL DEFAULT 'note',
  label VARCHAR(20),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(10),
  UNIQUE(currency_id, denomination_value)
);

-- Seed currencies
INSERT INTO public.tb_currencies (currency_code, currency_name, symbol, is_main_currency, exchange_rate, sort_order) VALUES
  ('XCD', 'Eastern Caribbean Dollar', 'EC$', true, 1.000000, 1),
  ('USD', 'United States Dollar', 'US$', false, 2.700000, 2),
  ('EUR', 'Euro', '€', false, 3.100000, 3),
  ('GBP', 'British Pound Sterling', '£', false, 3.450000, 4),
  ('CAD', 'Canadian Dollar', 'CA$', false, 2.050000, 5),
  ('BBD', 'Barbados Dollar', 'BDS$', false, 1.350000, 6),
  ('TTD', 'Trinidad and Tobago Dollar', 'TT$', false, 0.400000, 7);

-- Enable XCD and USD for cashier by default
INSERT INTO public.cashier_currency_config (currency_id, is_enabled, sort_order)
SELECT id, true, sort_order FROM public.tb_currencies WHERE currency_code IN ('XCD', 'USD');

-- Seed XCD denominations
INSERT INTO public.cashier_currency_denominations (currency_id, denomination_value, denomination_type, label, sort_order)
SELECT id, v.val, v.dtype, v.lbl, v.srt
FROM public.tb_currencies c
CROSS JOIN (VALUES
  (100.00, 'note', '$100', 1),
  (50.00, 'note', '$50', 2),
  (20.00, 'note', '$20', 3),
  (10.00, 'note', '$10', 4),
  (5.00, 'note', '$5', 5),
  (2.00, 'coin', '$2', 6),
  (1.00, 'coin', '$1', 7),
  (0.25, 'coin', '25¢', 8),
  (0.10, 'coin', '10¢', 9),
  (0.05, 'coin', '5¢', 10),
  (0.02, 'coin', '2¢', 11),
  (0.01, 'coin', '1¢', 12)
) AS v(val, dtype, lbl, srt)
WHERE c.currency_code = 'XCD';

-- Seed USD denominations
INSERT INTO public.cashier_currency_denominations (currency_id, denomination_value, denomination_type, label, sort_order)
SELECT id, v.val, v.dtype, v.lbl, v.srt
FROM public.tb_currencies c
CROSS JOIN (VALUES
  (100.00, 'note', '$100', 1),
  (50.00, 'note', '$50', 2),
  (20.00, 'note', '$20', 3),
  (10.00, 'note', '$10', 4),
  (5.00, 'note', '$5', 5),
  (1.00, 'note', '$1', 6),
  (0.25, 'coin', '25¢', 7),
  (0.10, 'coin', '10¢', 8),
  (0.05, 'coin', '5¢', 9),
  (0.01, 'coin', '1¢', 10)
) AS v(val, dtype, lbl, srt)
WHERE c.currency_code = 'USD';
