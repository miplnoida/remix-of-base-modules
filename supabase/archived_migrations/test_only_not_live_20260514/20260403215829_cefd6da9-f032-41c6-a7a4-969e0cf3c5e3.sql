
-- Drop old 3-param signature
DROP FUNCTION IF EXISTS public.public_api_payment_save(TEXT, TEXT, JSONB);

-- Create new single-param version
CREATE OR REPLACE FUNCTION public.public_api_payment_save(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payer_id TEXT;
  v_payer_type TEXT;
  v_period_month INT;
  v_period_year INT;
  v_schedule_number INT;
  v_payment_id BIGINT;
  v_receipt_number TEXT;
  v_receipt_id INTEGER;
  v_mop_code TEXT;
  v_office_code TEXT;
  v_headers JSONB;
  v_header JSONB;
  v_total NUMERIC := 0;
  v_line_count INT := 0;
  v_period_date DATE;
  v_comp_period TEXT;
  v_sort_idx INT := 0;
BEGIN
  -- Extract and validate required fields from payload
  v_payer_id := TRIM(p_payload->>'payerId');
  v_payer_type := TRIM(p_payload->>'payerType');

  IF v_payer_id IS NULL OR v_payer_id = '' THEN
    RETURN jsonb_build_object('error', 'payerId is required in request body');
  END IF;

  IF v_payer_type IS NULL OR v_payer_type = '' THEN
    RETURN jsonb_build_object('error', 'payerType is required in request body');
  END IF;

  -- Validate periodMonth
  v_period_month := (p_payload->>'periodMonth')::INT;
  IF v_period_month IS NULL OR v_period_month < 1 OR v_period_month > 12 THEN
    RETURN jsonb_build_object('error', 'periodMonth must be an integer between 1 and 12');
  END IF;

  -- Validate periodYear
  v_period_year := (p_payload->>'periodYear')::INT;
  IF v_period_year IS NULL OR v_period_year < 1900 OR v_period_year > 9999 THEN
    RETURN jsonb_build_object('error', 'periodYear must be a valid 4-digit year');
  END IF;

  -- Optional scheduleNumber
  v_schedule_number := (p_payload->>'scheduleNumber')::INT;

  -- Compute period date for cn_payment (DATE column)
  v_period_date := make_date(v_period_year, v_period_month, 1);

  -- Compute period text for c3_payment_components (TEXT column, MM/YYYY format)
  v_comp_period := LPAD(v_period_month::TEXT, 2, '0') || '/' || v_period_year::TEXT;

  v_mop_code := COALESCE(TRIM(p_payload->>'mopCode'), 'ONL');
  v_office_code := COALESCE(TRIM(p_payload->>'officeCode'), '100');
  v_headers := p_payload->'paymentHeaders';

  IF v_headers IS NULL OR jsonb_array_length(v_headers) = 0 THEN
    RETURN jsonb_build_object('error', 'paymentHeaders array is required');
  END IF;

  -- Acquire advisory lock to safely generate next payment_id
  PERFORM pg_advisory_xact_lock(7839202);

  -- Generate numeric payment_id matching the internal pattern
  SELECT COALESCE(MAX(payment_id), 0) + 1 INTO v_payment_id FROM cn_payment_header;

  -- Insert payment header
  INSERT INTO cn_payment_header (payment_id, payer_id, payer_type, batch_number, date_received, status)
  VALUES (v_payment_id, v_payer_id, v_payer_type, v_office_code || '-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'), NOW(), 'P');

  -- Insert payment line items and c3_payment_components
  FOR v_header IN SELECT * FROM jsonb_array_elements(v_headers)
  LOOP
    IF (v_header->>'paymentAmount')::NUMERIC > 0 THEN
      INSERT INTO cn_payment (
        payment_id, fund_code, payment_code,
        mop_code, payment_amount, payment_date, period
      ) VALUES (
        v_payment_id,
        TRIM(v_header->>'fundCode'),
        TRIM(v_header->>'paymentCode'),
        v_mop_code,
        (v_header->>'paymentAmount')::NUMERIC,
        NOW(),
        v_period_date
      );

      -- Insert into c3_payment_components
      v_sort_idx := v_sort_idx + 1;
      INSERT INTO c3_payment_components (
        payment_id, payment_code, fund_code,
        component_amount, period, sequence_no, sort_order
      ) VALUES (
        v_payment_id::INTEGER,
        TRIM(v_header->>'paymentCode'),
        TRIM(v_header->>'fundCode'),
        (v_header->>'paymentAmount')::NUMERIC,
        v_comp_period,
        v_schedule_number,
        v_sort_idx
      );

      v_total := v_total + (v_header->>'paymentAmount')::NUMERIC;
      v_line_count := v_line_count + 1;
    END IF;
  END LOOP;

  -- Insert receipt with NULL receipt_number — the trg_set_receipt_number trigger will populate it
  INSERT INTO cn_receipt (payment_id, receipt_number, receipt_total, status, total_number_of_payments, created_by)
  VALUES (v_payment_id, NULL, v_total, 'A', v_line_count, 'API')
  RETURNING receipt_id INTO v_receipt_id;

  -- Fetch the trigger-generated receipt_number
  SELECT receipt_number INTO v_receipt_number FROM cn_receipt WHERE receipt_id = v_receipt_id;

  RETURN jsonb_build_object(
    'paymentId', v_payment_id,
    'receiptId', v_receipt_id,
    'receiptNumber', COALESCE(v_receipt_number, 'PENDING'),
    'receiptTotal', v_total,
    'message', 'Payment processed successfully'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;
