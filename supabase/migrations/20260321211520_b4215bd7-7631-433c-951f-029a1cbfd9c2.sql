-- Add contact fields to cn_payer
ALTER TABLE public.cn_payer
  ADD COLUMN IF NOT EXISTS email VARCHAR(75),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(15),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add payer contact fields to cn_invoices for historical snapshot
ALTER TABLE public.cn_invoices
  ADD COLUMN IF NOT EXISTS payer_email TEXT,
  ADD COLUMN IF NOT EXISTS payer_phone TEXT,
  ADD COLUMN IF NOT EXISTS payer_address TEXT;

-- Recreate the RPC to support AP payer creation and contact fields
CREATE OR REPLACE FUNCTION public.create_invoice_with_lines(
  p_invoice_type text,
  p_payment_source text,
  p_payer_type text,
  p_payer_id text,
  p_payer_name text,
  p_currency_code text,
  p_exchange_rate numeric,
  p_total_amount numeric,
  p_total_amount_base numeric,
  p_due_date date,
  p_public_notes text,
  p_internal_notes text,
  p_is_recurring boolean,
  p_created_by text,
  p_lines jsonb,
  p_recurring jsonb DEFAULT NULL,
  p_payer_email text DEFAULT NULL,
  p_payer_phone text DEFAULT NULL,
  p_payer_address text DEFAULT NULL,
  p_create_new_payer boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id INTEGER;
  v_invoice_number TEXT;
  v_max_seq INTEGER;
  v_line JSONB;
  v_month_prefix TEXT;
  v_base_currency TEXT;
  v_header_rate NUMERIC;
  v_line_currency TEXT;
  v_line_rate NUMERIC;
  v_new_payer_id INTEGER;
  v_actual_payer_id TEXT;
BEGIN
  -- Resolve base (main) currency
  SELECT currency_code INTO v_base_currency
  FROM public.tb_currencies
  WHERE is_main_currency = true AND is_active = true
  LIMIT 1;

  IF v_base_currency IS NULL THEN
    RAISE EXCEPTION 'No active main currency configured in the system';
  END IF;

  -- Resolve header currency exchange rate
  SELECT exchange_rate INTO v_header_rate
  FROM public.tb_currencies
  WHERE currency_code = p_currency_code AND is_active = true
  LIMIT 1;

  IF v_header_rate IS NULL THEN
    RAISE EXCEPTION 'Currency % is not active or does not exist', p_currency_code;
  END IF;

  -- Handle AP new payer creation
  IF p_create_new_payer AND p_payer_type = 'AP' THEN
    IF TRIM(COALESCE(p_payer_name, '')) = '' THEN
      RAISE EXCEPTION 'Payer name is required for new AP payer';
    END IF;

    -- Generate next payer_id for AP type using advisory lock
    PERFORM pg_advisory_xact_lock(8675311);

    SELECT COALESCE(MAX(payer_id::INTEGER), 0) + 1 INTO v_new_payer_id
    FROM public.cn_payer
    WHERE payer_type = 'AP'
      AND payer_id ~ '^\d+$';

    IF v_new_payer_id IS NULL THEN
      v_new_payer_id := 1;
    END IF;

    v_actual_payer_id := v_new_payer_id::TEXT;

    INSERT INTO public.cn_payer (payer_id, payer_type, payer_name, email, phone, address, created_by)
    VALUES (v_actual_payer_id, 'AP', TRIM(p_payer_name), NULLIF(TRIM(p_payer_email), ''), NULLIF(TRIM(p_payer_phone), ''), NULLIF(TRIM(p_payer_address), ''), p_created_by);
  ELSE
    v_actual_payer_id := p_payer_id;

    -- For existing AP payers, update contact info if provided
    IF p_payer_type = 'AP' THEN
      UPDATE public.cn_payer
      SET email = COALESCE(NULLIF(TRIM(p_payer_email), ''), email),
          phone = COALESCE(NULLIF(TRIM(p_payer_phone), ''), phone),
          address = COALESCE(NULLIF(TRIM(p_payer_address), ''), address)
      WHERE payer_id = v_actual_payer_id AND payer_type = 'AP';
    END IF;
  END IF;

  -- Validate AP payer exists
  IF p_payer_type = 'AP' THEN
    IF NOT EXISTS (SELECT 1 FROM public.cn_payer WHERE payer_id = v_actual_payer_id AND payer_type = 'AP') THEN
      RAISE EXCEPTION 'AP Payer with ID % not found', v_actual_payer_id;
    END IF;
  END IF;

  -- Generate invoice number with advisory lock
  PERFORM pg_advisory_xact_lock(8675310);

  v_month_prefix := 'INV-' || to_char(now(), 'YYYYMM') || '-';

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_month_prefix) + 1) AS INTEGER)),
    0
  ) INTO v_max_seq
  FROM public.cn_invoices
  WHERE invoice_number LIKE v_month_prefix || '%';

  v_invoice_number := v_month_prefix || LPAD((v_max_seq + 1)::TEXT, 3, '0');

  -- Insert invoice header
  INSERT INTO public.cn_invoices (
    invoice_number, invoice_type, payment_source,
    payer_type, payer_id, payer_name,
    currency_code, exchange_rate, base_currency,
    total_amount, total_amount_base,
    due_date, public_notes, internal_notes,
    is_recurring, status, created_by,
    payer_email, payer_phone, payer_address
  ) VALUES (
    v_invoice_number, p_invoice_type, p_payment_source,
    p_payer_type, v_actual_payer_id, p_payer_name,
    p_currency_code, v_header_rate, v_base_currency,
    p_total_amount, p_total_amount_base,
    p_due_date, p_public_notes, p_internal_notes,
    p_is_recurring, 'O', p_created_by,
    NULLIF(TRIM(p_payer_email), ''), NULLIF(TRIM(p_payer_phone), ''), NULLIF(TRIM(p_payer_address), '')
  ) RETURNING id INTO v_invoice_id;

  -- Insert line items
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_currency := v_line->>'currency_code';

    SELECT exchange_rate INTO v_line_rate
    FROM public.tb_currencies
    WHERE currency_code = v_line_currency AND is_active = true
    LIMIT 1;

    IF v_line_rate IS NULL THEN
      RAISE EXCEPTION 'Currency % on line item is not active or does not exist', v_line_currency;
    END IF;

    INSERT INTO public.cn_invoice_lines (
      invoice_id, payment_code, currency_code,
      amount, exchange_rate, amount_base, base_currency, sort_order
    ) VALUES (
      v_invoice_id,
      v_line->>'payment_code',
      v_line_currency,
      (v_line->>'amount')::NUMERIC,
      v_line_rate,
      ROUND((v_line->>'amount')::NUMERIC * v_line_rate, 2),
      v_base_currency,
      COALESCE((v_line->>'sort_order')::INTEGER, 0)
    );
  END LOOP;

  -- Insert recurring config if enabled
  IF p_is_recurring AND p_recurring IS NOT NULL THEN
    INSERT INTO public.cn_invoice_recurring (
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
    'invoice_number', v_invoice_number,
    'payer_id', v_actual_payer_id
  );
END;
$function$;