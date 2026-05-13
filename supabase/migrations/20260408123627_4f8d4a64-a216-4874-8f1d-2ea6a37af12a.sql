
-- Resync the identity sequence for cn_payment.payment_sequence_no
SELECT setval(
  pg_get_serial_sequence('cn_payment', 'payment_sequence_no'),
  COALESCE((SELECT MAX(payment_sequence_no) FROM cn_payment), 1)
);

-- Recreate public_api_payment_save: omit payment_sequence_no to let IDENTITY auto-generate
DROP FUNCTION IF EXISTS public.public_api_payment_save(jsonb);

CREATE OR REPLACE FUNCTION public.public_api_payment_save(p_payload jsonb)
RETURNS jsonb
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
  v_seq_no BIGINT;
  v_payment_reference_id TEXT;
BEGIN
  v_payer_id := TRIM(p_payload->>'payerId');
  v_payer_type := TRIM(p_payload->>'payerType');

  IF v_payer_id IS NULL OR v_payer_id = '' THEN
    RETURN jsonb_build_object('error', 'payerId is required in request body');
  END IF;

  IF v_payer_type IS NULL OR v_payer_type = '' THEN
    RETURN jsonb_build_object('error', 'payerType is required in request body');
  END IF;

  v_period_month := (p_payload->>'periodMonth')::INT;
  IF v_period_month IS NULL OR v_period_month < 1 OR v_period_month > 12 THEN
    RETURN jsonb_build_object('error', 'periodMonth must be an integer between 1 and 12');
  END IF;

  v_period_year := (p_payload->>'periodYear')::INT;
  IF v_period_year IS NULL OR v_period_year < 1900 OR v_period_year > 9999 THEN
    RETURN jsonb_build_object('error', 'periodYear must be a valid 4-digit year');
  END IF;

  v_schedule_number := (p_payload->>'scheduleNumber')::INT;

  v_period_date := make_date(v_period_year, v_period_month, 1);
  v_comp_period := LPAD(v_period_month::TEXT, 2, '0') || '/' || v_period_year::TEXT;

  v_mop_code := COALESCE(TRIM(p_payload->>'mopCode'), 'ONL');
  v_office_code := COALESCE(TRIM(p_payload->>'officeCode'), '100');
  v_payment_reference_id := TRIM(p_payload->>'paymentReferenceId');
  v_headers := p_payload->'paymentHeaders';

  IF v_headers IS NULL OR jsonb_array_length(v_headers) = 0 THEN
    RETURN jsonb_build_object('error', 'paymentHeaders array is required');
  END IF;

  PERFORM pg_advisory_xact_lock(7839202);

  SELECT COALESCE(MAX(payment_id), 0) + 1 INTO v_payment_id FROM cn_payment_header;

  INSERT INTO cn_payment_header (payment_id, payer_id, payer_type, batch_number, date_received, status, payment_reference_id)
  VALUES (v_payment_id, v_payer_id, v_payer_type, v_office_code || '-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'), NOW(), 'P', v_payment_reference_id);

  FOR v_header IN SELECT * FROM jsonb_array_elements(v_headers)
  LOOP
    v_sort_idx := v_sort_idx + 1;
    v_line_count := v_line_count + 1;

    INSERT INTO cn_payment (
      payment_id,
      payment_amount,
      payment_code,
      mop_code,
      period,
      fund_code,
      base_currency,
      currency_conversion_rate
    ) VALUES (
      v_payment_id,
      COALESCE((v_header->>'amount')::NUMERIC, 0),
      COALESCE(v_header->>'paymentCode', 'ONL'),
      v_mop_code,
      v_period_date,
      COALESCE(v_header->>'fundCode', 'GEN'),
      'XCD',
      1.0
    ) RETURNING payment_sequence_no INTO v_seq_no;

    v_total := v_total + COALESCE((v_header->>'amount')::NUMERIC, 0);

    INSERT INTO c3_payment_components (
      payment_id,
      component_type,
      amount,
      period,
      payer_id,
      payer_type,
      sequence_no,
      sort_order
    ) VALUES (
      v_payment_id,
      COALESCE(v_header->>'componentType', 'TOTAL'),
      COALESCE((v_header->>'amount')::NUMERIC, 0),
      v_comp_period,
      v_payer_id,
      v_payer_type,
      v_schedule_number,
      v_sort_idx
    );
  END LOOP;

  INSERT INTO cn_receipt (payment_id, receipt_total, status, total_number_of_payments)
  VALUES (v_payment_id, v_total, 'A', v_line_count)
  RETURNING receipt_id INTO v_receipt_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'receipt_id', v_receipt_id,
    'total', v_total,
    'line_count', v_line_count,
    'payment_reference_id', v_payment_reference_id
  );
END;
$function$;
