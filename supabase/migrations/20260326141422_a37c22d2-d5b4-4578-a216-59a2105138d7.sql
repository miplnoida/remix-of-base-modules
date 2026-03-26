
-- Update create_c3_payment_with_receipt to save sequence_no from component JSON
CREATE OR REPLACE FUNCTION public.create_c3_payment_with_receipt(
  p_batch_number TEXT,
  p_payer_type TEXT,
  p_payer_id TEXT,
  p_date_received DATE,
  p_remarks TEXT DEFAULT NULL,
  p_components JSONB DEFAULT '[]'::jsonb,
  p_methods JSONB DEFAULT '[]'::jsonb,
  p_receipt_total NUMERIC DEFAULT 0,
  p_user_code TEXT DEFAULT 'SYS'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id INTEGER;
  v_receipt_id INTEGER;
  v_comp JSONB;
  v_meth JSONB;
  v_comp_arr JSONB[];
  v_meth_arr JSONB[];
  v_comp_idx INTEGER;
  v_meth_idx INTEGER;
  v_comp_remaining NUMERIC;
  v_meth_remaining NUMERIC;
  v_alloc NUMERIC;
  v_detail_count INTEGER := 0;
  v_exp_date TEXT;
  v_exp_normalized TEXT;
  v_exp_parts TEXT[];
  v_period_text TEXT;
  v_period_ts TIMESTAMP;
  v_period_parts TEXT[];
  v_base_currency TEXT;
  v_method_currency TEXT;
  v_method_rate NUMERIC;
BEGIN
  -- Validate inputs
  IF p_batch_number IS NULL OR p_batch_number = '' THEN
    RAISE EXCEPTION 'batch_number is required';
  END IF;
  IF p_payer_id IS NULL OR p_payer_id = '' THEN
    RAISE EXCEPTION 'payer_id is required';
  END IF;
  IF jsonb_array_length(p_components) = 0 THEN
    RAISE EXCEPTION 'At least one payment component is required';
  END IF;
  IF jsonb_array_length(p_methods) = 0 THEN
    RAISE EXCEPTION 'At least one payment method is required';
  END IF;
  IF p_receipt_total <= 0 THEN
    RAISE EXCEPTION 'receipt_total must be greater than zero';
  END IF;

  -- Resolve base (main) currency from tb_currencies
  SELECT currency_code INTO v_base_currency
  FROM public.tb_currencies
  WHERE is_main_currency = true AND is_active = true
  LIMIT 1;

  IF v_base_currency IS NULL THEN
    RAISE EXCEPTION 'No active main currency configured in tb_currencies. Cannot create receipt.';
  END IF;

  -- Validate each method has a valid currency and resolve rate server-side
  FOR v_meth IN SELECT * FROM jsonb_array_elements(p_methods)
  LOOP
    v_method_currency := COALESCE(v_meth->>'currency_code', v_base_currency);
    SELECT exchange_rate INTO v_method_rate
    FROM public.tb_currencies
    WHERE currency_code = v_method_currency AND is_active = true
    LIMIT 1;

    IF v_method_rate IS NULL THEN
      RAISE EXCEPTION 'Currency "%" not found or inactive in tb_currencies. Cannot create receipt.', v_method_currency;
    END IF;
  END LOOP;

  -- Advisory lock for safe payment_id generation
  PERFORM pg_advisory_xact_lock(7839201);

  SELECT COALESCE(MAX(payment_id), 0) + 1
  INTO v_payment_id
  FROM public.cn_payment_header;

  -- Step 1: Create payment header
  INSERT INTO public.cn_payment_header (
    payment_id, batch_number, payer_type, payer_id, date_received, remarks
  ) VALUES (
    v_payment_id, p_batch_number, p_payer_type, p_payer_id, p_date_received, p_remarks
  );

  -- Step 2: Save C3 entry structure for later retrieval (now includes sequence_no)
  FOR v_comp IN SELECT * FROM jsonb_array_elements(p_components)
  LOOP
    INSERT INTO public.c3_payment_components (
      payment_id, payment_code, fund_code, component_amount, period, sort_order, sequence_no
    ) VALUES (
      v_payment_id,
      v_comp->>'payment_code',
      v_comp->>'fund_code',
      (v_comp->>'amount')::numeric,
      v_comp->>'period',
      COALESCE((v_comp->>'sort_order')::integer, 0),
      (v_comp->>'sequence_no')::integer
    );
  END LOOP;

  FOR v_meth IN SELECT * FROM jsonb_array_elements(p_methods)
  LOOP
    -- Normalize expiration_date MM/YY -> YYYY-MM-01
    v_exp_normalized := NULL;
    v_exp_date := v_meth->>'expiration_date';
    IF v_exp_date IS NOT NULL AND v_exp_date != '' THEN
      v_exp_parts := string_to_array(v_exp_date, '/');
      IF array_length(v_exp_parts, 1) = 2 THEN
        v_exp_normalized := '20' || lpad(v_exp_parts[2], 2, '0') || '-' || lpad(v_exp_parts[1], 2, '0') || '-01';
      END IF;
    END IF;

    -- Resolve server-side exchange rate for this method's currency
    v_method_currency := COALESCE(v_meth->>'currency_code', v_base_currency);
    SELECT exchange_rate INTO v_method_rate
    FROM public.tb_currencies
    WHERE currency_code = v_method_currency AND is_active = true
    LIMIT 1;

    INSERT INTO public.c3_payment_methods (
      payment_id, mop_code, currency_code, original_amount, exchange_rate, base_amount,
      base_currency,
      bank_code, mop_number, cheque_date, mop_account_number, mop_notes1,
      credit_card_code, expiration_date, sort_order
    ) VALUES (
      v_payment_id,
      v_meth->>'mop_code',
      v_method_currency,
      (v_meth->>'original_amount')::numeric,
      v_method_rate,
      ROUND((v_meth->>'original_amount')::numeric / v_method_rate, 2),
      v_base_currency,
      v_meth->>'bank_code',
      v_meth->>'mop_number',
      CASE WHEN v_meth->>'cheque_date' IS NOT NULL AND v_meth->>'cheque_date' != ''
           THEN (v_meth->>'cheque_date')::date ELSE NULL END,
      v_meth->>'mop_account_number',
      v_meth->>'mop_notes1',
      v_meth->>'credit_card_code',
      CASE WHEN v_exp_normalized IS NOT NULL THEN v_exp_normalized::date ELSE NULL END,
      COALESCE((v_meth->>'sort_order')::integer, 0)
    );
  END LOOP;

  -- Step 3: Sequential allocation – distribute method amounts across components
  SELECT array_agg(value ORDER BY (value->>'sort_order')::int)
  INTO v_comp_arr
  FROM jsonb_array_elements(p_components) AS t(value);

  SELECT array_agg(value ORDER BY (value->>'sort_order')::int)
  INTO v_meth_arr
  FROM jsonb_array_elements(p_methods) AS t(value);

  v_comp_idx := 1;
  v_meth_idx := 1;
  v_comp_remaining := (v_comp_arr[1]->>'amount')::numeric;

  -- For the first method, resolve its base amount server-side
  v_method_currency := COALESCE(v_meth_arr[1]->>'currency_code', v_base_currency);
  SELECT exchange_rate INTO v_method_rate
  FROM public.tb_currencies
  WHERE currency_code = v_method_currency AND is_active = true
  LIMIT 1;
  v_meth_remaining := ROUND((v_meth_arr[1]->>'original_amount')::numeric / v_method_rate, 2);

  WHILE v_comp_idx <= array_length(v_comp_arr, 1) AND v_meth_idx <= array_length(v_meth_arr, 1)
  LOOP
    v_alloc := LEAST(v_comp_remaining, v_meth_remaining);

    IF v_alloc > 0 THEN
      -- Build period timestamp from the component's period text "MM/YYYY"
      v_period_text := v_comp_arr[v_comp_idx]->>'period';
      v_period_ts := NULL;
      IF v_period_text IS NOT NULL AND v_period_text != '' THEN
        v_period_parts := string_to_array(v_period_text, '/');
        IF array_length(v_period_parts, 1) = 2 THEN
          v_period_ts := (v_period_parts[2] || '-' || lpad(v_period_parts[1], 2, '0') || '-01')::timestamp;
        END IF;
      END IF;

      INSERT INTO public.cn_payment (
        payment_id,
        payment_code,
        fund_code,
        period,
        payer_type,
        payer_id,
        payment_amount,
        mop_code,
        base_currency,
        currency_conversion_rate,
        currency_code,
        inserted_by,
        insert_date
      ) VALUES (
        v_payment_id,
        v_comp_arr[v_comp_idx]->>'payment_code',
        v_comp_arr[v_comp_idx]->>'fund_code',
        v_period_ts,
        p_payer_type,
        p_payer_id,
        v_alloc,
        v_meth_arr[v_meth_idx]->>'mop_code',
        v_base_currency,
        v_method_rate,
        v_method_currency,
        p_user_code,
        NOW()
      );
      v_detail_count := v_detail_count + 1;
    END IF;

    v_comp_remaining := v_comp_remaining - v_alloc;
    v_meth_remaining := v_meth_remaining - v_alloc;

    IF v_comp_remaining <= 0 THEN
      v_comp_idx := v_comp_idx + 1;
      IF v_comp_idx <= array_length(v_comp_arr, 1) THEN
        v_comp_remaining := (v_comp_arr[v_comp_idx]->>'amount')::numeric;
      END IF;
    END IF;

    IF v_meth_remaining <= 0 THEN
      v_meth_idx := v_meth_idx + 1;
      IF v_meth_idx <= array_length(v_meth_arr, 1) THEN
        v_method_currency := COALESCE(v_meth_arr[v_meth_idx]->>'currency_code', v_base_currency);
        SELECT exchange_rate INTO v_method_rate
        FROM public.tb_currencies
        WHERE currency_code = v_method_currency AND is_active = true
        LIMIT 1;
        v_meth_remaining := ROUND((v_meth_arr[v_meth_idx]->>'original_amount')::numeric / v_method_rate, 2);
      END IF;
    END IF;
  END LOOP;

  -- Step 4: Generate receipt
  SELECT COALESCE(MAX(receipt_id), 0) + 1
  INTO v_receipt_id
  FROM public.cn_receipt;

  INSERT INTO public.cn_receipt (
    receipt_id, payment_id, receipt_amount, receipt_date, status,
    created_by, created_at
  ) VALUES (
    v_receipt_id, v_payment_id, p_receipt_total, NOW(), 'O',
    p_user_code, NOW()
  );

  -- Step 5: Log initial print
  INSERT INTO public.cn_receipt_prints (
    receipt_id, printed_by, print_type
  ) VALUES (
    v_receipt_id, p_user_code, 'ORIGINAL'
  );

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'receipt_id', v_receipt_id,
    'detail_count', v_detail_count,
    'base_currency', v_base_currency
  );
END;
$$;
