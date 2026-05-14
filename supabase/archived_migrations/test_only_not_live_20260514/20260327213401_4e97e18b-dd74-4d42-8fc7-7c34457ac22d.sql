
-- =========================================================
-- Number Format Configuration: Update set_receipt_number()
-- and create_invoice_with_lines() to read format from config
-- =========================================================

-- Update set_receipt_number to read format from payment_module_config
CREATE OR REPLACE FUNCTION public.set_receipt_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_payer_id TEXT;
  v_ts TEXT;
  v_rn TEXT;
  v_format TEXT;
  v_id_min_length INT;
  v_config_row RECORD;
  v_receipt_id_padded TEXT;
BEGIN
  -- Resolve payer_id
  SELECT payer_id INTO v_payer_id
  FROM public.cn_payment_header
  WHERE payment_id = NEW.payment_id;

  -- Try to read format config
  SELECT config_value INTO v_config_row
  FROM public.payment_module_config
  WHERE config_key = 'receipt_number_format';

  IF v_config_row IS NOT NULL AND v_config_row.config_value IS NOT NULL THEN
    v_format := v_config_row.config_value->>'format';
    v_id_min_length := COALESCE((v_config_row.config_value->>'id_min_length')::INT, 1);
  END IF;

  IF v_format IS NULL OR v_format = '' THEN
    -- Fallback to legacy format
    v_ts := to_char(COALESCE(NEW.created_at, now()), 'DDMMYYYYHH24MI');
    v_rn := COALESCE(v_payer_id, 'UNKNOWN') || '/' || NEW.receipt_id || '/' || v_ts;
  ELSE
    v_receipt_id_padded := LPAD(NEW.receipt_id::TEXT, GREATEST(v_id_min_length, 1), '0');

    v_rn := v_format;
    v_rn := REPLACE(v_rn, '{PAYER_ID}', COALESCE(v_payer_id, 'UNKNOWN'));
    v_rn := REPLACE(v_rn, '{RECEIPT_ID}', v_receipt_id_padded);
    v_rn := REPLACE(v_rn, '{PAYMENT_ID}', NEW.payment_id::TEXT);
    -- Date/time placeholders
    v_rn := REPLACE(v_rn, '{YYYY}', to_char(COALESCE(NEW.created_at, now()), 'YYYY'));
    v_rn := REPLACE(v_rn, '{YY}', to_char(COALESCE(NEW.created_at, now()), 'YY'));
    v_rn := REPLACE(v_rn, '{YYYYMMDD}', to_char(COALESCE(NEW.created_at, now()), 'YYYYMMDD'));
    v_rn := REPLACE(v_rn, '{YYYYMM}', to_char(COALESCE(NEW.created_at, now()), 'YYYYMM'));
    v_rn := REPLACE(v_rn, '{DDMMYYYY}', to_char(COALESCE(NEW.created_at, now()), 'DDMMYYYY'));
    v_rn := REPLACE(v_rn, '{DDMMYYYYHHMM}', to_char(COALESCE(NEW.created_at, now()), 'DDMMYYYYHH24MI'));
    v_rn := REPLACE(v_rn, '{MM}', to_char(COALESCE(NEW.created_at, now()), 'MM'));
    v_rn := REPLACE(v_rn, '{DD}', to_char(COALESCE(NEW.created_at, now()), 'DD'));
    v_rn := REPLACE(v_rn, '{HHMMSS}', to_char(COALESCE(NEW.created_at, now()), 'HH24MISS'));
    v_rn := REPLACE(v_rn, '{HHMM}', to_char(COALESCE(NEW.created_at, now()), 'HH24MI'));
    v_rn := REPLACE(v_rn, '{HH}', to_char(COALESCE(NEW.created_at, now()), 'HH24'));
    v_rn := REPLACE(v_rn, '{MI}', to_char(COALESCE(NEW.created_at, now()), 'MI'));
    v_rn := REPLACE(v_rn, '{SS}', to_char(COALESCE(NEW.created_at, now()), 'SS'));
  END IF;

  UPDATE public.cn_receipt
  SET receipt_number = v_rn
  WHERE receipt_id = NEW.receipt_id;

  RETURN NULL;
END;
$$;

-- Update create_invoice_with_lines to read format from payment_module_config
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
  v_format TEXT;
  v_seq_min_length INT;
  v_config_val JSONB;
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

    PERFORM pg_advisory_xact_lock(8675311);

    SELECT COALESCE(MAX(payer_id::INTEGER), 0) + 1 INTO v_new_payer_id
    FROM public.cn_payer
    WHERE payer_type = 'AP'
      AND payer_id ~ '^\d+$';

    IF v_new_payer_id IS NULL THEN
      v_new_payer_id := 1;
    END IF;

    v_actual_payer_id := LPAD(v_new_payer_id::TEXT, 6, '0');

    INSERT INTO public.cn_payer (payer_id, payer_type, payer_name, email, phone, address, created_by)
    VALUES (v_actual_payer_id, 'AP', TRIM(p_payer_name), NULLIF(TRIM(p_payer_email), ''), NULLIF(TRIM(p_payer_phone), ''), NULLIF(TRIM(p_payer_address), ''), p_created_by);
  ELSE
    v_actual_payer_id := p_payer_id;

    IF p_payer_type = 'AP' THEN
      UPDATE public.cn_payer
      SET email = COALESCE(NULLIF(TRIM(p_payer_email), ''), email),
          phone = COALESCE(NULLIF(TRIM(p_payer_phone), ''), phone),
          address = COALESCE(NULLIF(TRIM(p_payer_address), ''), address)
      WHERE payer_id = v_actual_payer_id AND payer_type = 'AP';
    END IF;
  END IF;

  IF p_payer_type = 'AP' THEN
    IF NOT EXISTS (SELECT 1 FROM public.cn_payer WHERE payer_id = v_actual_payer_id AND payer_type = 'AP') THEN
      RAISE EXCEPTION 'AP Payer with ID % not found', v_actual_payer_id;
    END IF;
  END IF;

  -- Read invoice number format config
  SELECT config_value INTO v_config_val
  FROM public.payment_module_config
  WHERE config_key = 'invoice_number_format';

  v_format := v_config_val->>'format';
  v_seq_min_length := COALESCE((v_config_val->>'seq_min_length')::INT, 3);

  -- Generate invoice number with advisory lock
  PERFORM pg_advisory_xact_lock(8675310);

  IF v_format IS NOT NULL AND v_format != '' AND POSITION('{SEQ}' IN v_format) > 0 THEN
    -- Dynamic format with {SEQ}
    -- Build the prefix (everything before {SEQ})
    v_month_prefix := SPLIT_PART(v_format, '{SEQ}', 1);
    -- Replace date/time placeholders in prefix
    v_month_prefix := REPLACE(v_month_prefix, '{YYYY}', to_char(now(), 'YYYY'));
    v_month_prefix := REPLACE(v_month_prefix, '{YY}', to_char(now(), 'YY'));
    v_month_prefix := REPLACE(v_month_prefix, '{YYYYMM}', to_char(now(), 'YYYYMM'));
    v_month_prefix := REPLACE(v_month_prefix, '{YYYYMMDD}', to_char(now(), 'YYYYMMDD'));
    v_month_prefix := REPLACE(v_month_prefix, '{DDMMYYYY}', to_char(now(), 'DDMMYYYY'));
    v_month_prefix := REPLACE(v_month_prefix, '{MM}', to_char(now(), 'MM'));
    v_month_prefix := REPLACE(v_month_prefix, '{DD}', to_char(now(), 'DD'));
    v_month_prefix := REPLACE(v_month_prefix, '{OFFICE_CODE}', COALESCE(p_created_by, ''));
    v_month_prefix := REPLACE(v_month_prefix, '{USER_CODE}', COALESCE(p_created_by, ''));
    v_month_prefix := REPLACE(v_month_prefix, '{PAYER_ID}', COALESCE(v_actual_payer_id, ''));
    v_month_prefix := REPLACE(v_month_prefix, '{PAYER_TYPE}', COALESCE(p_payer_type, ''));

    SELECT COALESCE(
      MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_month_prefix) + 1) AS INTEGER)),
      0
    ) INTO v_max_seq
    FROM public.cn_invoices
    WHERE invoice_number LIKE v_month_prefix || '%';

    v_invoice_number := v_month_prefix || LPAD((v_max_seq + 1)::TEXT, v_seq_min_length, '0');
  ELSE
    -- Fallback to legacy INV-YYYYMM-NNN
    v_month_prefix := 'INV-' || to_char(now(), 'YYYYMM') || '-';

    SELECT COALESCE(
      MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_month_prefix) + 1) AS INTEGER)),
      0
    ) INTO v_max_seq
    FROM public.cn_invoices
    WHERE invoice_number LIKE v_month_prefix || '%';

    v_invoice_number := v_month_prefix || LPAD((v_max_seq + 1)::TEXT, 3, '0');
  END IF;

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
