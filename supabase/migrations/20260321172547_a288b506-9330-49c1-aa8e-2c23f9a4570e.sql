
-- tb_invoices: Invoice header
CREATE TABLE public.tb_invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_type TEXT NOT NULL,
  payment_source TEXT NOT NULL,
  payer_type TEXT NOT NULL,
  payer_id TEXT NOT NULL,
  payer_name TEXT,
  currency_code TEXT NOT NULL DEFAULT 'XCD',
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount_base NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  public_notes TEXT,
  internal_notes TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- tb_invoice_lines: Line items
CREATE TABLE public.tb_invoice_lines (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES public.tb_invoices(id) ON DELETE CASCADE,
  payment_code TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'XCD',
  amount NUMERIC NOT NULL DEFAULT 0,
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  amount_base NUMERIC NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- tb_invoice_recurring: Recurring config
CREATE TABLE public.tb_invoice_recurring (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES public.tb_invoices(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  next_run_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- RPC: Atomic invoice creation with auto-generated invoice number
CREATE OR REPLACE FUNCTION public.create_invoice_with_lines(
  p_invoice_type TEXT,
  p_payment_source TEXT,
  p_payer_type TEXT,
  p_payer_id TEXT,
  p_payer_name TEXT,
  p_currency_code TEXT,
  p_exchange_rate NUMERIC,
  p_total_amount NUMERIC,
  p_total_amount_base NUMERIC,
  p_due_date DATE,
  p_public_notes TEXT,
  p_internal_notes TEXT,
  p_is_recurring BOOLEAN,
  p_created_by TEXT,
  p_lines JSONB,
  p_recurring JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id INTEGER;
  v_invoice_number TEXT;
  v_max_seq INTEGER;
  v_line JSONB;
  v_month_prefix TEXT;
BEGIN
  -- Advisory lock for safe invoice number generation
  PERFORM pg_advisory_xact_lock(8675310);

  v_month_prefix := 'INV-' || to_char(now(), 'YYYYMM') || '-';

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_month_prefix) + 1) AS INTEGER)),
    0
  ) INTO v_max_seq
  FROM public.tb_invoices
  WHERE invoice_number LIKE v_month_prefix || '%';

  v_invoice_number := v_month_prefix || LPAD((v_max_seq + 1)::TEXT, 3, '0');

  -- Insert invoice header
  INSERT INTO public.tb_invoices (
    invoice_number, invoice_type, payment_source,
    payer_type, payer_id, payer_name,
    currency_code, exchange_rate, total_amount, total_amount_base,
    due_date, public_notes, internal_notes,
    is_recurring, created_by
  ) VALUES (
    v_invoice_number, p_invoice_type, p_payment_source,
    p_payer_type, p_payer_id, p_payer_name,
    p_currency_code, p_exchange_rate, p_total_amount, p_total_amount_base,
    p_due_date, p_public_notes, p_internal_notes,
    p_is_recurring, p_created_by
  ) RETURNING id INTO v_invoice_id;

  -- Insert line items
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO public.tb_invoice_lines (
      invoice_id, payment_code, currency_code,
      amount, exchange_rate, amount_base, sort_order
    ) VALUES (
      v_invoice_id,
      v_line->>'payment_code',
      v_line->>'currency_code',
      (v_line->>'amount')::NUMERIC,
      (v_line->>'exchange_rate')::NUMERIC,
      (v_line->>'amount_base')::NUMERIC,
      COALESCE((v_line->>'sort_order')::INTEGER, 0)
    );
  END LOOP;

  -- Insert recurring config if enabled
  IF p_is_recurring AND p_recurring IS NOT NULL THEN
    INSERT INTO public.tb_invoice_recurring (
      invoice_id, frequency, start_date, end_date, next_run_date
    ) VALUES (
      v_invoice_id,
      p_recurring->>'frequency',
      (p_recurring->>'start_date')::DATE,
      CASE WHEN p_recurring->>'end_date' IS NOT NULL AND p_recurring->>'end_date' != ''
           THEN (p_recurring->>'end_date')::DATE ELSE NULL END,
      (p_recurring->>'start_date')::DATE
    );
  END IF;

  RETURN jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number
  );
END;
$$;
