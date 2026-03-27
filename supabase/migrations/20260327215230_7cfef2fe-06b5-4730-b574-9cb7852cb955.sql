
-- ============================================================
-- Migrate number format configs from flat {format, seq_min_length}
-- to segment-based {segments: [...]} structure.
-- Update set_receipt_number() and create_invoice_with_lines()
-- to iterate over segments array with per-placeholder min_length.
-- ============================================================

-- 1. Helper: parse a legacy format string into segments JSONB array
CREATE OR REPLACE FUNCTION public._parse_format_to_segments(
  p_format TEXT,
  p_seq_min_length INT DEFAULT 3,
  p_id_min_length INT DEFAULT 1,
  p_id_placeholder TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_segments JSONB := '[]'::JSONB;
  v_remaining TEXT := p_format;
  v_pos INT;
  v_end INT;
  v_placeholder TEXT;
  v_static TEXT;
  v_seg JSONB;
BEGIN
  IF p_format IS NULL OR p_format = '' THEN
    RETURN '[]'::JSONB;
  END IF;

  WHILE LENGTH(v_remaining) > 0 LOOP
    v_pos := POSITION('{' IN v_remaining);
    IF v_pos = 0 THEN
      -- Rest is static
      v_segments := v_segments || jsonb_build_array(jsonb_build_object('type', 'static', 'value', v_remaining));
      EXIT;
    END IF;

    -- Static text before placeholder
    IF v_pos > 1 THEN
      v_static := SUBSTRING(v_remaining FROM 1 FOR v_pos - 1);
      v_segments := v_segments || jsonb_build_array(jsonb_build_object('type', 'static', 'value', v_static));
    END IF;

    v_end := POSITION('}' IN v_remaining);
    IF v_end = 0 THEN
      -- Malformed, treat rest as static
      v_segments := v_segments || jsonb_build_array(jsonb_build_object('type', 'static', 'value', SUBSTRING(v_remaining FROM v_pos)));
      EXIT;
    END IF;

    v_placeholder := SUBSTRING(v_remaining FROM v_pos + 1 FOR v_end - v_pos - 1);

    -- Build segment with min_length for specific placeholders
    v_seg := jsonb_build_object('type', 'placeholder', 'value', v_placeholder);
    IF v_placeholder = 'SEQ' AND p_seq_min_length > 1 THEN
      v_seg := v_seg || jsonb_build_object('min_length', p_seq_min_length);
    ELSIF v_placeholder = p_id_placeholder AND p_id_min_length > 1 THEN
      v_seg := v_seg || jsonb_build_object('min_length', p_id_min_length);
    END IF;

    v_segments := v_segments || jsonb_build_array(v_seg);
    v_remaining := SUBSTRING(v_remaining FROM v_end + 1);
  END LOOP;

  RETURN v_segments;
END;
$$ LANGUAGE plpgsql;

-- 2. Migrate existing config values to segments format
DO $$
DECLARE
  v_inv JSONB;
  v_rcpt JSONB;
  v_batch JSONB;
  v_segments JSONB;
BEGIN
  -- Invoice number format
  SELECT config_value INTO v_inv FROM public.payment_module_config WHERE config_key = 'invoice_number_format';
  IF v_inv IS NOT NULL AND v_inv ? 'format' AND NOT (v_inv ? 'segments') THEN
    v_segments := public._parse_format_to_segments(
      v_inv->>'format',
      COALESCE((v_inv->>'seq_min_length')::INT, 3),
      1,
      NULL
    );
    UPDATE public.payment_module_config
    SET config_value = jsonb_build_object('segments', v_segments),
        updated_at = now()
    WHERE config_key = 'invoice_number_format';
  END IF;

  -- Receipt number format
  SELECT config_value INTO v_rcpt FROM public.payment_module_config WHERE config_key = 'receipt_number_format';
  IF v_rcpt IS NOT NULL AND v_rcpt ? 'format' AND NOT (v_rcpt ? 'segments') THEN
    v_segments := public._parse_format_to_segments(
      v_rcpt->>'format',
      1,
      COALESCE((v_rcpt->>'id_min_length')::INT, 1),
      'RECEIPT_ID'
    );
    UPDATE public.payment_module_config
    SET config_value = jsonb_build_object('segments', v_segments),
        updated_at = now()
    WHERE config_key = 'receipt_number_format';
  END IF;

  -- Batch number format
  SELECT config_value INTO v_batch FROM public.payment_module_config WHERE config_key = 'batch_number_format';
  IF v_batch IS NOT NULL AND v_batch ? 'format' AND NOT (v_batch ? 'segments') THEN
    v_segments := public._parse_format_to_segments(
      v_batch->>'format',
      1, 1, NULL
    );
    UPDATE public.payment_module_config
    SET config_value = jsonb_build_object('segments', v_segments),
        updated_at = now()
    WHERE config_key = 'batch_number_format';
  END IF;

  -- Remove standalone min length rows (now inline in segments)
  DELETE FROM public.payment_module_config WHERE config_key IN ('receipt_id_min_length', 'invoice_id_min_length');
END $$;

-- Drop helper
DROP FUNCTION IF EXISTS public._parse_format_to_segments(TEXT, INT, INT, TEXT);

-- 3. Helper function: resolve segments array into a formatted string (used by triggers/RPCs)
CREATE OR REPLACE FUNCTION public.resolve_number_segments(
  p_segments JSONB,
  p_context JSONB  -- keys: PAYER_ID, RECEIPT_ID, INVOICE_ID, PAYMENT_ID, OFFICE_CODE, USER_CODE, PAYER_TYPE, BATCH_NUMBER, ts (timestamp)
) RETURNS TEXT AS $$
DECLARE
  v_result TEXT := '';
  v_seg JSONB;
  v_type TEXT;
  v_value TEXT;
  v_min_len INT;
  v_resolved TEXT;
  v_ts TIMESTAMPTZ;
BEGIN
  v_ts := COALESCE((p_context->>'ts')::TIMESTAMPTZ, now());

  FOR v_seg IN SELECT * FROM jsonb_array_elements(p_segments)
  LOOP
    v_type := v_seg->>'type';
    v_value := v_seg->>'value';
    v_min_len := COALESCE((v_seg->>'min_length')::INT, 0);

    IF v_type = 'static' THEN
      v_result := v_result || COALESCE(v_value, '');
    ELSIF v_type = 'placeholder' THEN
      CASE v_value
        WHEN 'YYYY' THEN v_resolved := to_char(v_ts, 'YYYY');
        WHEN 'YY' THEN v_resolved := to_char(v_ts, 'YY');
        WHEN 'MM' THEN v_resolved := to_char(v_ts, 'MM');
        WHEN 'DD' THEN v_resolved := to_char(v_ts, 'DD');
        WHEN 'YYYYMM' THEN v_resolved := to_char(v_ts, 'YYYYMM');
        WHEN 'YYYYMMDD' THEN v_resolved := to_char(v_ts, 'YYYYMMDD');
        WHEN 'DDMMYYYY' THEN v_resolved := to_char(v_ts, 'DDMMYYYY');
        WHEN 'DDMMYYYYHHMM' THEN v_resolved := to_char(v_ts, 'DDMMYYYYHH24MI');
        WHEN 'HH' THEN v_resolved := to_char(v_ts, 'HH24');
        WHEN 'MI' THEN v_resolved := to_char(v_ts, 'MI');
        WHEN 'SS' THEN v_resolved := to_char(v_ts, 'SS');
        WHEN 'HHMM' THEN v_resolved := to_char(v_ts, 'HH24MI');
        WHEN 'HHMMSS' THEN v_resolved := to_char(v_ts, 'HH24MISS');
        WHEN 'PAYER_ID' THEN v_resolved := COALESCE(p_context->>'PAYER_ID', 'UNKNOWN');
        WHEN 'PAYER_TYPE' THEN v_resolved := COALESCE(p_context->>'PAYER_TYPE', '');
        WHEN 'USER_CODE' THEN v_resolved := COALESCE(p_context->>'USER_CODE', '');
        WHEN 'OFFICE_CODE' THEN v_resolved := COALESCE(p_context->>'OFFICE_CODE', '');
        WHEN 'RECEIPT_ID' THEN v_resolved := COALESCE(p_context->>'RECEIPT_ID', '0');
        WHEN 'INVOICE_ID' THEN v_resolved := COALESCE(p_context->>'INVOICE_ID', '0');
        WHEN 'PAYMENT_ID' THEN v_resolved := COALESCE(p_context->>'PAYMENT_ID', '');
        WHEN 'BATCH_NUMBER' THEN v_resolved := COALESCE(p_context->>'BATCH_NUMBER', '');
        WHEN 'SEQ' THEN v_resolved := '__SEQ__'; -- handled externally
        ELSE v_resolved := v_value;
      END CASE;

      IF v_min_len > 0 AND v_value != 'SEQ' THEN
        v_resolved := LPAD(v_resolved, v_min_len, '0');
      END IF;

      v_result := v_result || v_resolved;
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;


-- 4. Update set_receipt_number() to use segments
CREATE OR REPLACE FUNCTION public.set_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
  v_payer_id TEXT;
  v_ts TEXT;
  v_rn TEXT;
  v_config_val JSONB;
  v_segments JSONB;
  v_context JSONB;
BEGIN
  -- Resolve payer_id
  SELECT payer_id INTO v_payer_id
  FROM public.cn_payment_header
  WHERE payment_id = NEW.payment_id;

  -- Read config
  SELECT config_value INTO v_config_val
  FROM public.payment_module_config
  WHERE config_key = 'receipt_number_format';

  -- Check for segments array (new format)
  IF v_config_val IS NOT NULL AND v_config_val ? 'segments' THEN
    v_segments := v_config_val->'segments';
    v_context := jsonb_build_object(
      'PAYER_ID', COALESCE(v_payer_id, 'UNKNOWN'),
      'RECEIPT_ID', NEW.receipt_id::TEXT,
      'PAYMENT_ID', NEW.payment_id::TEXT,
      'ts', COALESCE(NEW.created_at, now())::TEXT
    );
    v_rn := public.resolve_number_segments(v_segments, v_context);

  -- Legacy format string fallback
  ELSIF v_config_val IS NOT NULL AND v_config_val ? 'format' THEN
    DECLARE
      v_format TEXT := v_config_val->>'format';
      v_id_min_length INT := COALESCE((v_config_val->>'id_min_length')::INT, 1);
      v_receipt_id_padded TEXT;
    BEGIN
      IF v_format IS NOT NULL AND v_format != '' THEN
        v_receipt_id_padded := LPAD(NEW.receipt_id::TEXT, GREATEST(v_id_min_length, 1), '0');
        v_rn := v_format;
        v_rn := REPLACE(v_rn, '{PAYER_ID}', COALESCE(v_payer_id, 'UNKNOWN'));
        v_rn := REPLACE(v_rn, '{RECEIPT_ID}', v_receipt_id_padded);
        v_rn := REPLACE(v_rn, '{PAYMENT_ID}', NEW.payment_id::TEXT);
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
    END;

  ELSE
    -- Default fallback
    v_ts := to_char(COALESCE(NEW.created_at, now()), 'DDMMYYYYHH24MI');
    v_rn := COALESCE(v_payer_id, 'UNKNOWN') || '/' || NEW.receipt_id || '/' || v_ts;
  END IF;

  IF v_rn IS NOT NULL THEN
    UPDATE public.cn_receipt
    SET receipt_number = v_rn
    WHERE receipt_id = NEW.receipt_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- 5. Update create_invoice_with_lines (the overload with AP payer params) to use segments
CREATE OR REPLACE FUNCTION public.create_invoice_with_lines(
  p_invoice_type text, p_payment_source text, p_payer_type text, p_payer_id text,
  p_payer_name text, p_currency_code text, p_exchange_rate numeric,
  p_total_amount numeric, p_total_amount_base numeric, p_due_date date,
  p_public_notes text, p_internal_notes text, p_is_recurring boolean,
  p_created_by text, p_lines jsonb, p_recurring jsonb DEFAULT NULL,
  p_payer_email text DEFAULT NULL, p_payer_phone text DEFAULT NULL,
  p_payer_address text DEFAULT NULL, p_create_new_payer boolean DEFAULT false
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
  v_config_val JSONB;
  v_segments JSONB;
  v_seq_min_length INT;
  v_prefix TEXT;
  v_suffix TEXT;
  v_seg JSONB;
  v_has_seq BOOLEAN := FALSE;
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
    FROM public.cn_payer WHERE payer_type = 'AP' AND payer_id ~ '^\d+$';
    IF v_new_payer_id IS NULL THEN v_new_payer_id := 1; END IF;
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

  -- Generate invoice number with advisory lock
  PERFORM pg_advisory_xact_lock(8675310);

  -- Check for segments-based config (new format)
  IF v_config_val IS NOT NULL AND v_config_val ? 'segments' THEN
    v_segments := v_config_val->'segments';

    -- Check if SEQ placeholder exists
    FOR v_seg IN SELECT * FROM jsonb_array_elements(v_segments)
    LOOP
      IF v_seg->>'type' = 'placeholder' AND v_seg->>'value' = 'SEQ' THEN
        v_has_seq := TRUE;
        v_seq_min_length := COALESCE((v_seg->>'min_length')::INT, 3);
      END IF;
    END LOOP;

    IF v_has_seq THEN
      -- Build prefix (everything before SEQ) and suffix (everything after SEQ)
      DECLARE
        v_context JSONB;
        v_before_seq TEXT := '';
        v_after_seq TEXT := '';
        v_found_seq BOOLEAN := FALSE;
        v_s JSONB;
        v_s_type TEXT;
        v_s_value TEXT;
        v_s_min INT;
        v_resolved TEXT;
        v_ts TIMESTAMPTZ := now();
      BEGIN
        v_context := jsonb_build_object(
          'PAYER_ID', COALESCE(v_actual_payer_id, ''),
          'PAYER_TYPE', COALESCE(p_payer_type, ''),
          'USER_CODE', COALESCE(p_created_by, ''),
          'OFFICE_CODE', COALESCE(p_created_by, ''),
          'ts', v_ts::TEXT
        );

        FOR v_s IN SELECT * FROM jsonb_array_elements(v_segments)
        LOOP
          v_s_type := v_s->>'type';
          v_s_value := v_s->>'value';
          v_s_min := COALESCE((v_s->>'min_length')::INT, 0);

          IF v_s_type = 'placeholder' AND v_s_value = 'SEQ' THEN
            v_found_seq := TRUE;
            CONTINUE;
          END IF;

          -- Resolve this segment
          IF v_s_type = 'static' THEN
            v_resolved := COALESCE(v_s_value, '');
          ELSE
            CASE v_s_value
              WHEN 'YYYY' THEN v_resolved := to_char(v_ts, 'YYYY');
              WHEN 'YY' THEN v_resolved := to_char(v_ts, 'YY');
              WHEN 'MM' THEN v_resolved := to_char(v_ts, 'MM');
              WHEN 'DD' THEN v_resolved := to_char(v_ts, 'DD');
              WHEN 'YYYYMM' THEN v_resolved := to_char(v_ts, 'YYYYMM');
              WHEN 'YYYYMMDD' THEN v_resolved := to_char(v_ts, 'YYYYMMDD');
              WHEN 'DDMMYYYY' THEN v_resolved := to_char(v_ts, 'DDMMYYYY');
              WHEN 'DDMMYYYYHHMM' THEN v_resolved := to_char(v_ts, 'DDMMYYYYHH24MI');
              WHEN 'HH' THEN v_resolved := to_char(v_ts, 'HH24');
              WHEN 'MI' THEN v_resolved := to_char(v_ts, 'MI');
              WHEN 'SS' THEN v_resolved := to_char(v_ts, 'SS');
              WHEN 'HHMM' THEN v_resolved := to_char(v_ts, 'HH24MI');
              WHEN 'HHMMSS' THEN v_resolved := to_char(v_ts, 'HH24MISS');
              WHEN 'PAYER_ID' THEN v_resolved := COALESCE(v_actual_payer_id, '');
              WHEN 'PAYER_TYPE' THEN v_resolved := COALESCE(p_payer_type, '');
              WHEN 'USER_CODE' THEN v_resolved := COALESCE(p_created_by, '');
              WHEN 'OFFICE_CODE' THEN v_resolved := COALESCE(p_created_by, '');
              ELSE v_resolved := v_s_value;
            END CASE;
            IF v_s_min > 0 THEN
              v_resolved := LPAD(v_resolved, v_s_min, '0');
            END IF;
          END IF;

          IF v_found_seq THEN
            v_after_seq := v_after_seq || v_resolved;
          ELSE
            v_before_seq := v_before_seq || v_resolved;
          END IF;
        END LOOP;

        v_month_prefix := v_before_seq;

        SELECT COALESCE(
          MAX(
            CASE
              WHEN LENGTH(v_after_seq) > 0 THEN
                CAST(SUBSTRING(invoice_number FROM LENGTH(v_month_prefix) + 1 FOR LENGTH(invoice_number) - LENGTH(v_month_prefix) - LENGTH(v_after_seq)) AS INTEGER)
              ELSE
                CAST(SUBSTRING(invoice_number FROM LENGTH(v_month_prefix) + 1) AS INTEGER)
            END
          ), 0
        ) INTO v_max_seq
        FROM public.cn_invoices
        WHERE invoice_number LIKE v_month_prefix || '%';

        v_invoice_number := v_month_prefix || LPAD((v_max_seq + 1)::TEXT, v_seq_min_length, '0') || v_after_seq;
      END;
    ELSE
      -- No SEQ placeholder, just resolve all segments
      DECLARE
        v_context JSONB := jsonb_build_object(
          'PAYER_ID', COALESCE(v_actual_payer_id, ''),
          'PAYER_TYPE', COALESCE(p_payer_type, ''),
          'USER_CODE', COALESCE(p_created_by, ''),
          'OFFICE_CODE', COALESCE(p_created_by, ''),
          'ts', now()::TEXT
        );
      BEGIN
        v_invoice_number := public.resolve_number_segments(v_segments, v_context);
      END;
    END IF;

  -- Legacy format string fallback
  ELSIF v_config_val IS NOT NULL AND v_config_val ? 'format' THEN
    DECLARE
      v_format TEXT := v_config_val->>'format';
      v_legacy_seq_min INT := COALESCE((v_config_val->>'seq_min_length')::INT, 3);
    BEGIN
      IF v_format IS NOT NULL AND v_format != '' AND POSITION('{SEQ}' IN v_format) > 0 THEN
        v_month_prefix := SPLIT_PART(v_format, '{SEQ}', 1);
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

        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_month_prefix) + 1) AS INTEGER)), 0) INTO v_max_seq
        FROM public.cn_invoices WHERE invoice_number LIKE v_month_prefix || '%';

        v_invoice_number := v_month_prefix || LPAD((v_max_seq + 1)::TEXT, v_legacy_seq_min, '0');
      ELSE
        v_month_prefix := 'INV-' || to_char(now(), 'YYYYMM') || '-';
        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_month_prefix) + 1) AS INTEGER)), 0) INTO v_max_seq
        FROM public.cn_invoices WHERE invoice_number LIKE v_month_prefix || '%';
        v_invoice_number := v_month_prefix || LPAD((v_max_seq + 1)::TEXT, 3, '0');
      END IF;
    END;

  ELSE
    -- Default fallback
    v_month_prefix := 'INV-' || to_char(now(), 'YYYYMM') || '-';
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM LENGTH(v_month_prefix) + 1) AS INTEGER)), 0) INTO v_max_seq
    FROM public.cn_invoices WHERE invoice_number LIKE v_month_prefix || '%';
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
    p_payer_email, p_payer_phone, p_payer_address
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
      v_invoice_id, v_line->>'payment_code', v_line_currency,
      (v_line->>'amount')::NUMERIC, v_line_rate,
      ROUND((v_line->>'amount')::NUMERIC * v_line_rate, 2),
      v_base_currency, COALESCE((v_line->>'sort_order')::INTEGER, 0)
    );
  END LOOP;

  -- Insert recurring config if enabled
  IF p_is_recurring AND p_recurring IS NOT NULL THEN
    INSERT INTO public.cn_invoice_recurring (
      invoice_id, frequency, start_date, end_date, next_run_date
    ) VALUES (
      v_invoice_id, p_recurring->>'frequency',
      (p_recurring->>'start_date')::DATE,
      CASE WHEN p_recurring->>'end_date' IS NOT NULL AND p_recurring->>'end_date' != '' THEN (p_recurring->>'end_date')::DATE ELSE NULL END,
      (p_recurring->>'start_date')::DATE
    );
  END IF;

  RETURN jsonb_build_object('invoice_id', v_invoice_id, 'invoice_number', v_invoice_number);
END;
$function$;
