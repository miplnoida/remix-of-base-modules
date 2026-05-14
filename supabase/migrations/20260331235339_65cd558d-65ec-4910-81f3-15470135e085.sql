
-- Step 1: Add card_machine_id column to cn_payment
ALTER TABLE public.cn_payment
  ADD COLUMN card_machine_id UUID REFERENCES public.cn_card_machine(id);

-- Step 2: Update create_payment_with_receipt to handle card_machine_id
CREATE OR REPLACE FUNCTION public.create_payment_with_receipt(
  p_batch_number TEXT,
  p_payer_type TEXT,
  p_payer_id TEXT,
  p_date_received TEXT,
  p_remarks TEXT DEFAULT NULL,
  p_detail_lines JSONB DEFAULT '[]'::jsonb,
  p_receipt_total NUMERIC DEFAULT 0,
  p_total_payments INTEGER DEFAULT 0,
  p_user_code TEXT DEFAULT 'SYSTEM'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id integer;
  v_receipt_id integer;
  v_detail jsonb;
  v_exp_date text;
  v_exp_normalized text;
  v_parts text[];
  v_period_text text;
  v_period_ts timestamp;
  v_date_received_ts timestamp;
  v_card_machine_id uuid;
  v_mop_code text;
BEGIN
  IF p_batch_number IS NULL OR p_batch_number = '' THEN
    RAISE EXCEPTION 'batch_number is required';
  END IF;
  IF p_payer_id IS NULL OR p_payer_id = '' THEN
    RAISE EXCEPTION 'payer_id is required';
  END IF;
  IF jsonb_array_length(p_detail_lines) = 0 THEN
    RAISE EXCEPTION 'At least one detail line is required';
  END IF;
  IF p_receipt_total <= 0 THEN
    RAISE EXCEPTION 'receipt_total must be greater than zero';
  END IF;

  BEGIN
    v_date_received_ts := p_date_received::timestamp;
  EXCEPTION WHEN OTHERS THEN
    v_date_received_ts := now();
  END;

  PERFORM pg_advisory_xact_lock(7839201);

  SELECT COALESCE(MAX(payment_id), 0) + 1
  INTO v_payment_id
  FROM public.cn_payment_header;

  INSERT INTO public.cn_payment_header (
    payment_id, batch_number, payer_type, payer_id, date_received, remarks
  ) VALUES (
    v_payment_id, p_batch_number, p_payer_type, p_payer_id, v_date_received_ts, p_remarks
  );

  FOR v_detail IN SELECT * FROM jsonb_array_elements(p_detail_lines)
  LOOP
    v_exp_normalized := NULL;
    v_exp_date := v_detail->>'expiration_date';
    IF v_exp_date IS NOT NULL AND v_exp_date != '' THEN
      v_parts := string_to_array(v_exp_date, '/');
      IF array_length(v_parts, 1) = 2 THEN
        v_exp_normalized := '20' || lpad(v_parts[2], 2, '0') || '-' || lpad(v_parts[1], 2, '0') || '-01';
      ELSE
        v_exp_normalized := v_exp_date;
      END IF;
    END IF;

    v_period_ts := NULL;
    v_period_text := v_detail->>'period';
    IF v_period_text IS NOT NULL AND v_period_text != '' THEN
      BEGIN
        v_period_ts := v_period_text::timestamp;
      EXCEPTION WHEN OTHERS THEN
        v_period_ts := NULL;
      END;
    END IF;

    -- Resolve card_machine_id
    v_card_machine_id := NULL;
    v_mop_code := v_detail->>'mop_code';
    IF v_detail->>'card_machine_id' IS NOT NULL AND v_detail->>'card_machine_id' != '' THEN
      v_card_machine_id := (v_detail->>'card_machine_id')::uuid;
    END IF;

    -- Server-side validation: CRD/DRD requires card_machine_id
    IF v_mop_code IN ('CRD', 'DRD') AND v_card_machine_id IS NULL THEN
      RAISE EXCEPTION 'card_machine_id is required for payment method %', v_mop_code;
    END IF;

    INSERT INTO public.cn_payment (
      payment_id, payment_code, fund_code, payment_amount,
      mop_code, period, payment_date, bank_code,
      mop_number, cheque_date, mop_account_number, mop_notes1,
      credit_card_code, expiration_date, card_machine_id
    ) VALUES (
      v_payment_id,
      v_detail->>'payment_code',
      v_detail->>'fund_code',
      (v_detail->>'payment_amount')::numeric,
      v_mop_code,
      v_period_ts,
      CASE WHEN v_detail->>'payment_date' IS NOT NULL AND v_detail->>'payment_date' != ''
           THEN (v_detail->>'payment_date')::date ELSE NULL END,
      NULLIF(v_detail->>'bank_code', ''),
      NULLIF(v_detail->>'mop_number', ''),
      CASE WHEN v_detail->>'cheque_date' IS NOT NULL AND v_detail->>'cheque_date' != ''
           THEN (v_detail->>'cheque_date')::date ELSE NULL END,
      NULLIF(v_detail->>'mop_account_number', ''),
      NULLIF(v_detail->>'mop_notes1', ''),
      NULLIF(v_detail->>'credit_card_code', ''),
      CASE WHEN v_exp_normalized IS NOT NULL THEN v_exp_normalized::date ELSE NULL END,
      v_card_machine_id
    );
  END LOOP;

  INSERT INTO public.cn_receipt (
    payment_id, status, receipt_total, total_number_of_payments,
    reprint_times, created_by, updated_by
  ) VALUES (
    v_payment_id, 'O', p_receipt_total, p_total_payments,
    0, p_user_code, p_user_code
  )
  RETURNING receipt_id INTO v_receipt_id;

  INSERT INTO public.cn_receipt_prints (
    receipt_id, printed_by, print_type
  ) VALUES (
    v_receipt_id, p_user_code, 'ORIGINAL'
  );

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'receipt_id', v_receipt_id,
    'status', 'success'
  );
END;
$$;

-- Step 3: Update pay_invoices_with_receipt to handle card_machine_id
DROP FUNCTION IF EXISTS public.pay_invoices_with_receipt(TEXT, TEXT, TEXT, TEXT, DATE, TEXT, JSONB, INTEGER[], NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION public.pay_invoices_with_receipt(
  p_batch_number TEXT,
  p_payer_type TEXT,
  p_payer_id TEXT,
  p_payer_name TEXT,
  p_date_received DATE,
  p_remarks TEXT,
  p_methods JSONB,
  p_invoice_ids INTEGER[],
  p_receipt_total NUMERIC,
  p_user_code TEXT DEFAULT 'SYSTEM'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id INTEGER;
  v_receipt_id INTEGER;
  v_inv_id INTEGER;
  v_inv RECORD;
  v_total_outstanding NUMERIC := 0;
  v_base_currency TEXT;
  v_method_currency TEXT;
  v_method_rate NUMERIC;
  v_comp_arr JSONB[];
  v_meth_arr JSONB[];
  v_comp_idx INTEGER;
  v_meth_idx INTEGER;
  v_comp_remaining NUMERIC;
  v_meth_remaining NUMERIC;
  v_alloc NUMERIC;
  v_detail_count INTEGER := 0;
  v_meth JSONB;
  v_line RECORD;
  v_exp_date TEXT;
  v_exp_normalized TEXT;
  v_exp_parts TEXT[];
  v_fund_code TEXT;
  v_card_machine_id UUID;
  v_mop_code TEXT;
BEGIN
  IF p_batch_number IS NULL OR p_batch_number = '' THEN
    RAISE EXCEPTION 'batch_number is required';
  END IF;
  IF array_length(p_invoice_ids, 1) IS NULL OR array_length(p_invoice_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one invoice must be selected';
  END IF;
  IF jsonb_array_length(p_methods) = 0 THEN
    RAISE EXCEPTION 'At least one payment method is required';
  END IF;
  IF p_receipt_total <= 0 THEN
    RAISE EXCEPTION 'receipt_total must be greater than zero';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cn_batch WHERE batch_number = p_batch_number AND batch_status = 'O'
  ) THEN
    RAISE EXCEPTION 'Batch % is not open', p_batch_number;
  END IF;

  SELECT currency_code INTO v_base_currency
  FROM public.tb_currencies
  WHERE is_main_currency = true AND is_active = true
  LIMIT 1;

  IF v_base_currency IS NULL THEN
    RAISE EXCEPTION 'No active main currency configured in tb_currencies';
  END IF;

  FOR v_inv_id IN SELECT unnest(p_invoice_ids)
  LOOP
    SELECT id, status, total_amount, paid_amount, (total_amount - paid_amount) AS outstanding
    INTO v_inv
    FROM public.cn_invoices
    WHERE id = v_inv_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invoice ID % not found', v_inv_id;
    END IF;

    IF v_inv.status NOT IN ('O', 'pending') THEN
      RAISE EXCEPTION 'Invoice ID % has status %, which is not payable', v_inv_id, v_inv.status;
    END IF;

    IF v_inv.outstanding <= 0 THEN
      RAISE EXCEPTION 'Invoice ID % has no outstanding balance', v_inv_id;
    END IF;

    v_total_outstanding := v_total_outstanding + v_inv.outstanding;
  END LOOP;

  IF ABS(p_receipt_total - v_total_outstanding) > 0.01 THEN
    RAISE EXCEPTION 'Payment total (%) does not match invoice outstanding total (%)', p_receipt_total, v_total_outstanding;
  END IF;

  PERFORM pg_advisory_xact_lock(7839201);

  SELECT COALESCE(MAX(payment_id), 0) + 1
  INTO v_payment_id
  FROM public.cn_payment_header;

  INSERT INTO public.cn_payment_header (
    payment_id, batch_number, payer_type, payer_id, date_received, remarks
  ) VALUES (
    v_payment_id, p_batch_number, p_payer_type, p_payer_id, p_date_received, p_remarks
  );

  v_comp_arr := ARRAY[]::jsonb[];
  FOR v_line IN
    SELECT il.invoice_id, il.payment_code, il.amount_base, il.sort_order,
           COALESCE(pt.fund_code, '') AS fund_code
    FROM public.cn_invoice_lines il
    LEFT JOIN public.tb_payment_type pt ON pt.payment_code = il.payment_code
    WHERE il.invoice_id = ANY(p_invoice_ids)
    ORDER BY il.invoice_id, COALESCE(il.sort_order, 0)
  LOOP
    v_comp_arr := v_comp_arr || jsonb_build_object(
      'payment_code', v_line.payment_code,
      'fund_code', v_line.fund_code,
      'amount', v_line.amount_base
    );
  END LOOP;

  IF array_length(v_comp_arr, 1) IS NULL OR array_length(v_comp_arr, 1) = 0 THEN
    RAISE EXCEPTION 'No invoice lines found for the selected invoices';
  END IF;

  v_meth_arr := ARRAY[]::jsonb[];
  FOR v_meth IN SELECT * FROM jsonb_array_elements(p_methods)
  LOOP
    v_method_currency := COALESCE(v_meth->>'currency_code', v_base_currency);
    SELECT exchange_rate INTO v_method_rate
    FROM public.tb_currencies
    WHERE currency_code = v_method_currency AND is_active = true
    LIMIT 1;

    IF v_method_rate IS NULL THEN
      RAISE EXCEPTION 'Currency "%" not found or inactive', v_method_currency;
    END IF;

    -- Server-side validation: CRD/DRD requires card_machine_id
    v_mop_code := v_meth->>'mop_code';
    IF v_mop_code IN ('CRD', 'DRD') AND (v_meth->>'card_machine_id' IS NULL OR v_meth->>'card_machine_id' = '') THEN
      RAISE EXCEPTION 'card_machine_id is required for payment method %', v_mop_code;
    END IF;

    v_meth_arr := v_meth_arr || jsonb_build_object(
      'mop_code', v_mop_code,
      'currency_code', v_method_currency,
      'original_amount', (v_meth->>'original_amount')::numeric,
      'exchange_rate', v_method_rate,
      'base_amount', ROUND((v_meth->>'original_amount')::numeric * v_method_rate, 2),
      'bank_code', v_meth->>'bank_code',
      'mop_number', v_meth->>'mop_number',
      'cheque_date', v_meth->>'cheque_date',
      'mop_account_number', v_meth->>'mop_account_number',
      'mop_notes1', v_meth->>'mop_notes1',
      'credit_card_code', v_meth->>'credit_card_code',
      'expiration_date', v_meth->>'expiration_date',
      'card_machine_id', v_meth->>'card_machine_id'
    );
  END LOOP;

  v_comp_idx := 1;
  v_meth_idx := 1;
  v_comp_remaining := (v_comp_arr[1]->>'amount')::numeric;
  v_meth_remaining := (v_meth_arr[1]->>'base_amount')::numeric;

  WHILE v_comp_idx <= array_length(v_comp_arr, 1) AND v_meth_idx <= array_length(v_meth_arr, 1)
  LOOP
    v_alloc := LEAST(v_comp_remaining, v_meth_remaining);

    IF v_alloc > 0 THEN
      v_exp_normalized := NULL;
      v_exp_date := v_meth_arr[v_meth_idx]->>'expiration_date';
      IF v_exp_date IS NOT NULL AND v_exp_date != '' THEN
        v_exp_parts := string_to_array(v_exp_date, '/');
        IF array_length(v_exp_parts, 1) = 2 THEN
          v_exp_normalized := '20' || lpad(v_exp_parts[2], 2, '0') || '-' || lpad(v_exp_parts[1], 2, '0') || '-01';
        END IF;
      END IF;

      v_method_currency := v_meth_arr[v_meth_idx]->>'currency_code';
      v_method_rate := (v_meth_arr[v_meth_idx]->>'exchange_rate')::numeric;

      v_card_machine_id := NULL;
      IF v_meth_arr[v_meth_idx]->>'card_machine_id' IS NOT NULL AND v_meth_arr[v_meth_idx]->>'card_machine_id' != '' THEN
        v_card_machine_id := (v_meth_arr[v_meth_idx]->>'card_machine_id')::uuid;
      END IF;

      INSERT INTO public.cn_payment (
        payment_id, payment_code, fund_code, payment_amount,
        mop_code, payment_date, bank_code,
        mop_number, cheque_date, mop_account_number, mop_notes1,
        credit_card_code, expiration_date,
        base_currency, currency_conversion_rate, currency_code,
        card_machine_id
      ) VALUES (
        v_payment_id,
        v_comp_arr[v_comp_idx]->>'payment_code',
        v_comp_arr[v_comp_idx]->>'fund_code',
        v_alloc,
        v_meth_arr[v_meth_idx]->>'mop_code',
        p_date_received,
        v_meth_arr[v_meth_idx]->>'bank_code',
        v_meth_arr[v_meth_idx]->>'mop_number',
        CASE WHEN v_meth_arr[v_meth_idx]->>'cheque_date' IS NOT NULL AND v_meth_arr[v_meth_idx]->>'cheque_date' != ''
             THEN (v_meth_arr[v_meth_idx]->>'cheque_date')::date ELSE NULL END,
        v_meth_arr[v_meth_idx]->>'mop_account_number',
        v_meth_arr[v_meth_idx]->>'mop_notes1',
        v_meth_arr[v_meth_idx]->>'credit_card_code',
        CASE WHEN v_exp_normalized IS NOT NULL THEN v_exp_normalized::date ELSE NULL END,
        v_base_currency,
        v_method_rate,
        v_method_currency,
        v_card_machine_id
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
        v_meth_remaining := (v_meth_arr[v_meth_idx]->>'base_amount')::numeric;
      END IF;
    END IF;
  END LOOP;

  FOREACH v_inv_id IN ARRAY p_invoice_ids
  LOOP
    SELECT id, total_amount, paid_amount, (total_amount - paid_amount) AS outstanding
    INTO v_inv
    FROM public.cn_invoices
    WHERE id = v_inv_id;

    INSERT INTO public.cn_invoice_payment (payment_id, invoice_id, amount_applied)
    VALUES (v_payment_id, v_inv_id, v_inv.outstanding);

    UPDATE public.cn_invoices
    SET paid_amount = paid_amount + v_inv.outstanding,
        status = 'P',
        payment_reference = 'PMT-' || v_payment_id::TEXT,
        updated_by = p_user_code,
        updated_at = now()
    WHERE id = v_inv_id;
  END LOOP;

  INSERT INTO public.cn_receipt (
    payment_id, status, receipt_total, total_number_of_payments,
    reprint_times, created_by, updated_by
  ) VALUES (
    v_payment_id, 'O', p_receipt_total, v_detail_count,
    0, p_user_code, p_user_code
  )
  RETURNING receipt_id INTO v_receipt_id;

  INSERT INTO public.cn_receipt_prints (
    receipt_id, printed_by, print_type
  ) VALUES (
    v_receipt_id, p_user_code, 'ORIGINAL'
  );

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'receipt_id', v_receipt_id,
    'status', 'success',
    'detail_count', v_detail_count
  );
END;
$$;

-- Step 4: Update create_c3_payment_with_receipt to handle card_machine_id
CREATE OR REPLACE FUNCTION public.create_c3_payment_with_receipt(
  p_batch_number TEXT,
  p_payer_type TEXT,
  p_payer_id TEXT,
  p_date_received TEXT,
  p_remarks TEXT DEFAULT NULL,
  p_components JSONB DEFAULT '[]'::jsonb,
  p_methods JSONB DEFAULT '[]'::jsonb,
  p_receipt_total NUMERIC DEFAULT 0,
  p_user_code TEXT DEFAULT 'SYSTEM'
) RETURNS JSONB
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
  v_card_machine_id UUID;
  v_mop_code TEXT;
BEGIN
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

  SELECT currency_code INTO v_base_currency
  FROM public.tb_currencies
  WHERE is_main_currency = true AND is_active = true
  LIMIT 1;

  IF v_base_currency IS NULL THEN
    RAISE EXCEPTION 'No active main currency configured in tb_currencies. Cannot create receipt.';
  END IF;

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

    -- Server-side validation: CRD/DRD requires card_machine_id
    v_mop_code := v_meth->>'mop_code';
    IF v_mop_code IN ('CRD', 'DRD') AND (v_meth->>'card_machine_id' IS NULL OR v_meth->>'card_machine_id' = '') THEN
      RAISE EXCEPTION 'card_machine_id is required for payment method %', v_mop_code;
    END IF;
  END LOOP;

  PERFORM pg_advisory_xact_lock(7839201);

  SELECT COALESCE(MAX(payment_id), 0) + 1
  INTO v_payment_id
  FROM public.cn_payment_header;

  INSERT INTO public.cn_payment_header (
    payment_id, batch_number, payer_type, payer_id, date_received, remarks
  ) VALUES (
    v_payment_id, p_batch_number, p_payer_type, p_payer_id, p_date_received, p_remarks
  );

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
    v_exp_normalized := NULL;
    v_exp_date := v_meth->>'expiration_date';
    IF v_exp_date IS NOT NULL AND v_exp_date != '' THEN
      v_exp_parts := string_to_array(v_exp_date, '/');
      IF array_length(v_exp_parts, 1) = 2 THEN
        v_exp_normalized := '20' || lpad(v_exp_parts[2], 2, '0') || '-' || lpad(v_exp_parts[1], 2, '0') || '-01';
      END IF;
    END IF;

    v_method_currency := COALESCE(v_meth->>'currency_code', v_base_currency);
    SELECT exchange_rate INTO v_method_rate
    FROM public.tb_currencies
    WHERE currency_code = v_method_currency AND is_active = true
    LIMIT 1;

    v_card_machine_id := NULL;
    IF v_meth->>'card_machine_id' IS NOT NULL AND v_meth->>'card_machine_id' != '' THEN
      v_card_machine_id := (v_meth->>'card_machine_id')::uuid;
    END IF;

    INSERT INTO public.c3_payment_methods (
      payment_id, mop_code, currency_code, original_amount, exchange_rate, base_amount,
      base_currency, bank_code, mop_number, cheque_date, mop_account_number, mop_notes1,
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

  SELECT array_agg(value ORDER BY (value->>'sort_order')::int)
  INTO v_comp_arr
  FROM jsonb_array_elements(p_components) AS t(value);

  SELECT array_agg(value ORDER BY (value->>'sort_order')::int)
  INTO v_meth_arr
  FROM jsonb_array_elements(p_methods) AS t(value);

  v_comp_idx := 1;
  v_meth_idx := 1;
  v_comp_remaining := (v_comp_arr[1]->>'amount')::numeric;

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
      v_period_text := v_comp_arr[v_comp_idx]->>'period';
      v_period_ts := NULL;
      IF v_period_text IS NOT NULL AND v_period_text != '' THEN
        v_period_parts := string_to_array(v_period_text, '/');
        IF array_length(v_period_parts, 1) = 2 THEN
          v_period_ts := (v_period_parts[2] || '-' || lpad(v_period_parts[1], 2, '0') || '-01')::timestamp;
        END IF;
      END IF;

      v_card_machine_id := NULL;
      IF v_meth_arr[v_meth_idx]->>'card_machine_id' IS NOT NULL AND v_meth_arr[v_meth_idx]->>'card_machine_id' != '' THEN
        v_card_machine_id := (v_meth_arr[v_meth_idx]->>'card_machine_id')::uuid;
      END IF;

      INSERT INTO public.cn_payment (
        payment_id, payment_code, fund_code, period, payment_amount,
        mop_code, base_currency, currency_conversion_rate, currency_code,
        card_machine_id
      ) VALUES (
        v_payment_id,
        v_comp_arr[v_comp_idx]->>'payment_code',
        v_comp_arr[v_comp_idx]->>'fund_code',
        v_period_ts,
        v_alloc,
        v_meth_arr[v_meth_idx]->>'mop_code',
        v_base_currency,
        v_method_rate,
        v_method_currency,
        v_card_machine_id
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

  INSERT INTO public.cn_receipt (
    payment_id, receipt_total, status,
    created_by, created_at
  ) VALUES (
    v_payment_id, p_receipt_total, 'A',
    p_user_code, NOW()
  )
  RETURNING receipt_id INTO v_receipt_id;

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
