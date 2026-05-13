
-- Fix: Add period filter to overpayment guard in create_c3_payment_with_receipt
-- and fix paid aggregation in get_c3_component_balances to use cpc.period

-- ============================================================
-- 1) Fix create_c3_payment_with_receipt — add cpc.period filter
-- ============================================================
DROP FUNCTION IF EXISTS public.create_c3_payment_with_receipt(text, text, text, text, text, jsonb, jsonb, numeric, text, boolean);
DROP FUNCTION IF EXISTS public.create_c3_payment_with_receipt(text, text, text, text, text, jsonb, jsonb, numeric, text);
DROP FUNCTION IF EXISTS public.create_c3_payment_with_receipt(text, text, text, date, text, jsonb, jsonb, numeric, text);

CREATE OR REPLACE FUNCTION public.create_c3_payment_with_receipt(
  p_batch_number text,
  p_payer_type text,
  p_payer_id text,
  p_date_received text,
  p_remarks text DEFAULT NULL::text,
  p_components jsonb DEFAULT '[]'::jsonb,
  p_methods jsonb DEFAULT '[]'::jsonb,
  p_receipt_total numeric DEFAULT 0,
  p_user_code text DEFAULT 'SYSTEM'::text,
  p_is_for_director boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  -- Overpayment guard variables
  v_guard_code TEXT;
  v_guard_original NUMERIC;
  v_guard_paid NUMERIC;
  v_guard_balance NUMERIC;
  v_guard_requested NUMERIC;
  v_guard_period TEXT;
  v_guard_period_ts TIMESTAMP;
  v_guard_seq INTEGER;
BEGIN
  -- === VALIDATION ===
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

  -- === OVERPAYMENT GUARD (sequence_no + period aware) ===
  FOR v_comp IN SELECT * FROM jsonb_array_elements(p_components)
  LOOP
    v_guard_code := v_comp->>'payment_code';
    v_guard_requested := (v_comp->>'amount')::numeric;
    v_guard_period := v_comp->>'period';
    v_guard_seq := (v_comp->>'sequence_no')::integer;

    v_guard_period_ts := NULL;
    IF v_guard_period IS NOT NULL AND v_guard_period != '' THEN
      v_period_parts := string_to_array(v_guard_period, '/');
      IF array_length(v_period_parts, 1) = 2 THEN
        v_guard_period_ts := (v_period_parts[2] || '-' || lpad(v_period_parts[1], 2, '0') || '-01')::timestamp;
      END IF;
    END IF;

    IF v_guard_period_ts IS NOT NULL AND v_guard_seq IS NOT NULL THEN
      SELECT
        CASE v_guard_code
          WHEN 'SSC' THEN COALESCE(emp_ss_amt_calc, 0)
          WHEN 'LVC' THEN COALESCE(emp_levy_amt_calc, 0)
          WHEN 'PEC' THEN COALESCE(emp_pe_amt_calc, 0)
          WHEN 'SSF' THEN COALESCE(emp_ss_fines_due, 0)
          WHEN 'LVF' THEN COALESCE(emp_levy_penalty_amt, 0)
          WHEN 'PEF' THEN COALESCE(emp_pe_penalty_amt, 0)
          WHEN 'SSE' THEN COALESCE(emp_ss_amt_calc, 0)
          WHEN 'SEF' THEN COALESCE(emp_ss_fines_due, 0)
          WHEN 'VOC' THEN COALESCE(emp_ss_amt_calc, 0)
          ELSE 0
        END
      INTO v_guard_original
      FROM cn_c3_reported
      WHERE payer_id = p_payer_id
        AND payer_type = p_payer_type
        AND period = v_guard_period_ts
        AND sequence_no = v_guard_seq
        AND COALESCE(is_for_director, FALSE) = COALESCE(p_is_for_director, FALSE)
      LIMIT 1;

      IF v_guard_original IS NULL THEN
        v_guard_original := 0;
      END IF;

      -- FIX: Added cpc.period = v_guard_period to prevent cross-period sum inflation
      SELECT COALESCE(SUM(cpc.component_amount), 0)
      INTO v_guard_paid
      FROM c3_payment_components cpc
      INNER JOIN cn_payment_header h ON h.payment_id = cpc.payment_id
      INNER JOIN cn_receipt r ON r.payment_id = cpc.payment_id
      WHERE h.payer_id = p_payer_id
        AND h.payer_type = p_payer_type
        AND h.status IS DISTINCT FROM 'deleted'
        AND r.status != 'C'
        AND COALESCE(h.is_for_director, FALSE) = COALESCE(p_is_for_director, FALSE)
        AND cpc.payment_code = v_guard_code
        AND cpc.sequence_no = v_guard_seq
        AND cpc.period = v_guard_period;

      v_guard_balance := GREATEST(v_guard_original - v_guard_paid, 0);

      IF v_guard_requested > v_guard_balance + 0.01 THEN
        RAISE EXCEPTION 'Overpayment detected for component %: requested=%, balance=% (original=%, paid=%)',
          v_guard_code, v_guard_requested, v_guard_balance, v_guard_original, v_guard_paid;
      END IF;
    END IF;
  END LOOP;
  -- === END OVERPAYMENT GUARD ===

  -- === CURRENCY VALIDATION ===
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

    v_mop_code := v_meth->>'mop_code';
    IF v_mop_code IN ('CRD', 'DRD') AND (v_meth->>'card_machine_id' IS NULL OR v_meth->>'card_machine_id' = '') THEN
      RAISE EXCEPTION 'card_machine_id is required for payment method %', v_mop_code;
    END IF;
  END LOOP;

  -- === ADVISORY LOCK & PAYMENT ID ===
  PERFORM pg_advisory_xact_lock(7839201);

  SELECT COALESCE(MAX(payment_id), 0) + 1
  INTO v_payment_id
  FROM public.cn_payment_header;

  -- === INSERT PAYMENT HEADER ===
  INSERT INTO public.cn_payment_header (
    payment_id, batch_number, payer_type, payer_id, date_received, remarks, is_for_director
  ) VALUES (
    v_payment_id, p_batch_number, p_payer_type, p_payer_id, p_date_received::timestamp, p_remarks,
    COALESCE(p_is_for_director, FALSE)
  );

  -- === INSERT C3 PAYMENT COMPONENTS ===
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

  -- === INSERT C3 PAYMENT METHODS ===
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

  -- === CROSS-PRODUCT ALLOCATION: cn_payment rows ===
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

  WHILE v_comp_idx <= array_length(v_comp_arr, 1)
    AND v_meth_idx <= array_length(v_meth_arr, 1)
  LOOP
    v_alloc := LEAST(v_comp_remaining, v_meth_remaining);
    IF v_alloc <= 0 THEN
      v_alloc := 0;
    END IF;

    v_period_text := v_comp_arr[v_comp_idx]->>'period';
    v_period_ts := NULL;
    IF v_period_text IS NOT NULL AND v_period_text != '' THEN
      v_period_parts := string_to_array(v_period_text, '/');
      IF array_length(v_period_parts, 1) = 2 THEN
        v_period_ts := (v_period_parts[2] || '-' || lpad(v_period_parts[1], 2, '0') || '-01')::timestamp;
      END IF;
    END IF;

    v_exp_normalized := NULL;
    v_exp_date := v_meth_arr[v_meth_idx]->>'expiration_date';
    IF v_exp_date IS NOT NULL AND v_exp_date != '' THEN
      v_exp_parts := string_to_array(v_exp_date, '/');
      IF array_length(v_exp_parts, 1) = 2 THEN
        v_exp_normalized := '20' || lpad(v_exp_parts[2], 2, '0') || '-' || lpad(v_exp_parts[1], 2, '0') || '-01';
      END IF;
    END IF;

    v_card_machine_id := NULL;
    IF v_meth_arr[v_meth_idx]->>'card_machine_id' IS NOT NULL AND v_meth_arr[v_meth_idx]->>'card_machine_id' != '' THEN
      v_card_machine_id := (v_meth_arr[v_meth_idx]->>'card_machine_id')::uuid;
    END IF;

    INSERT INTO public.cn_payment (
      payment_id, payment_code, fund_code, payment_amount, period,
      mop_code, bank_code, bank_lodgement_code,
      mop_number, cheque_date, mop_account_number, mop_transit_number,
      mop_notes1, credit_card_code, expiration_date
    ) VALUES (
      v_payment_id,
      v_comp_arr[v_comp_idx]->>'payment_code',
      v_comp_arr[v_comp_idx]->>'fund_code',
      v_alloc,
      v_period_ts,
      v_meth_arr[v_meth_idx]->>'mop_code',
      v_meth_arr[v_meth_idx]->>'bank_code',
      NULL,
      v_meth_arr[v_meth_idx]->>'mop_number',
      CASE WHEN v_meth_arr[v_meth_idx]->>'cheque_date' IS NOT NULL AND v_meth_arr[v_meth_idx]->>'cheque_date' != ''
           THEN (v_meth_arr[v_meth_idx]->>'cheque_date')::date ELSE NULL END,
      v_meth_arr[v_meth_idx]->>'mop_account_number',
      NULL,
      v_meth_arr[v_meth_idx]->>'mop_notes1',
      v_meth_arr[v_meth_idx]->>'credit_card_code',
      CASE WHEN v_exp_normalized IS NOT NULL THEN v_exp_normalized::date ELSE NULL END
    );
    v_detail_count := v_detail_count + 1;

    v_comp_remaining := v_comp_remaining - v_alloc;
    v_meth_remaining := v_meth_remaining - v_alloc;

    IF v_comp_remaining <= 0.001 THEN
      v_comp_idx := v_comp_idx + 1;
      IF v_comp_idx <= array_length(v_comp_arr, 1) THEN
        v_comp_remaining := (v_comp_arr[v_comp_idx]->>'amount')::numeric;
      END IF;
    END IF;

    IF v_meth_remaining <= 0.001 THEN
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

  -- === CREATE RECEIPT ===
  INSERT INTO public.cn_receipt (
    payment_id, receipt_total, status, total_number_of_payments, created_by
  ) VALUES (
    v_payment_id, p_receipt_total, 'A', v_detail_count, p_user_code
  )
  RETURNING receipt_id INTO v_receipt_id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'receipt_id', v_receipt_id,
    'detail_count', v_detail_count,
    'receipt_total', p_receipt_total
  );
END;
$function$;


-- ============================================================
-- 2) Fix get_c3_component_balances — use cpc.period instead of cp.period
-- ============================================================
DROP FUNCTION IF EXISTS public.get_c3_component_balances(TEXT, TEXT, TEXT, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_c3_component_balances(
  p_payer_id TEXT,
  p_payer_type TEXT,
  p_period TEXT,
  p_sequence_no INTEGER,
  p_is_for_director BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_components JSONB := '[]'::JSONB;
  v_paid_map JSONB := '{}'::JSONB;
  v_result JSONB := '[]'::JSONB;
  v_comp JSONB;
  v_code TEXT;
  v_original NUMERIC;
  v_paid NUMERIC;
  v_balance NUMERIC;
  v_codes TEXT[];
BEGIN
  SELECT
    emp_ss_amt_calc,
    emp_levy_amt_calc,
    emp_pe_amt_calc,
    emp_ss_fines_due,
    emp_levy_penalty_amt,
    emp_pe_penalty_amt
  INTO v_record
  FROM cn_c3_reported
  WHERE payer_id = p_payer_id
    AND payer_type = p_payer_type
    AND period = p_period::timestamp
    AND sequence_no = p_sequence_no
    AND is_for_director = COALESCE(p_is_for_director, FALSE)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found', 'components', '[]'::jsonb);
  END IF;

  IF COALESCE(p_is_for_director, FALSE) THEN
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'LVC', 'original_amount', COALESCE(v_record.emp_levy_amt_calc, 0)),
      jsonb_build_object('payment_code', 'LVF', 'original_amount', COALESCE(v_record.emp_levy_penalty_amt, 0))
    );
    v_codes := ARRAY['LVC','LVF'];
  ELSIF p_payer_type = 'ER' THEN
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'SSC', 'original_amount', COALESCE(v_record.emp_ss_amt_calc, 0)),
      jsonb_build_object('payment_code', 'LVC', 'original_amount', COALESCE(v_record.emp_levy_amt_calc, 0)),
      jsonb_build_object('payment_code', 'PEC', 'original_amount', COALESCE(v_record.emp_pe_amt_calc, 0)),
      jsonb_build_object('payment_code', 'SSF', 'original_amount', COALESCE(v_record.emp_ss_fines_due, 0)),
      jsonb_build_object('payment_code', 'LVF', 'original_amount', COALESCE(v_record.emp_levy_penalty_amt, 0)),
      jsonb_build_object('payment_code', 'PEF', 'original_amount', COALESCE(v_record.emp_pe_penalty_amt, 0))
    );
    v_codes := ARRAY['SSC','LVC','PEC','SSF','LVF','PEF'];
  ELSIF p_payer_type = 'SE' THEN
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'SEF', 'original_amount', COALESCE(v_record.emp_ss_fines_due, 0)),
      jsonb_build_object('payment_code', 'SSE', 'original_amount', COALESCE(v_record.emp_ss_amt_calc, 0))
    );
    v_codes := ARRAY['SEF','SSE'];
  ELSIF p_payer_type = 'VC' THEN
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'VOC', 'original_amount', COALESCE(v_record.emp_ss_amt_calc, 0))
    );
    v_codes := ARRAY['VOC'];
  ELSE
    v_components := jsonb_build_array(
      jsonb_build_object('payment_code', 'SSC', 'original_amount', COALESCE(v_record.emp_ss_amt_calc, 0)),
      jsonb_build_object('payment_code', 'LVC', 'original_amount', COALESCE(v_record.emp_levy_amt_calc, 0)),
      jsonb_build_object('payment_code', 'PEC', 'original_amount', COALESCE(v_record.emp_pe_amt_calc, 0)),
      jsonb_build_object('payment_code', 'SSF', 'original_amount', COALESCE(v_record.emp_ss_fines_due, 0)),
      jsonb_build_object('payment_code', 'LVF', 'original_amount', COALESCE(v_record.emp_levy_penalty_amt, 0)),
      jsonb_build_object('payment_code', 'PEF', 'original_amount', COALESCE(v_record.emp_pe_penalty_amt, 0))
    );
    v_codes := ARRAY['SSC','LVC','PEC','SSF','LVF','PEF'];
  END IF;

  -- FIX: Use cpc.period (MM/YYYY format) instead of cp.period (timestamp)
  -- and sum cpc.component_amount for accurate per-period balance
  SELECT COALESCE(jsonb_object_agg(sub.payment_code, sub.total_paid), '{}'::jsonb)
  INTO v_paid_map
  FROM (
    SELECT cpc.payment_code, SUM(COALESCE(cpc.component_amount, 0)) AS total_paid
    FROM c3_payment_components cpc
    INNER JOIN cn_payment_header h ON h.payment_id = cpc.payment_id
    INNER JOIN cn_receipt r ON r.payment_id = cpc.payment_id
    WHERE h.payer_id = p_payer_id
      AND h.payer_type = p_payer_type
      AND h.status IS DISTINCT FROM 'deleted'
      AND r.status != 'C'
      AND COALESCE(h.is_for_director, FALSE) = COALESCE(p_is_for_director, FALSE)
      AND cpc.period = p_period
      AND cpc.payment_code = ANY(v_codes)
      AND cpc.sequence_no = p_sequence_no
    GROUP BY cpc.payment_code
  ) sub;

  FOR v_comp IN SELECT * FROM jsonb_array_elements(v_components)
  LOOP
    v_code := v_comp->>'payment_code';
    v_original := (v_comp->>'original_amount')::numeric;
    v_paid := COALESCE((v_paid_map->>v_code)::numeric, 0);
    v_balance := GREATEST(v_original - v_paid, 0);

    v_result := v_result || jsonb_build_array(
      jsonb_build_object(
        'payment_code', v_code,
        'original_amount', v_original,
        'paid_amount', v_paid,
        'balance_amount', v_balance,
        'fully_paid', (v_balance <= 0)
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'found',
    'components', v_result,
    'sequence_no', p_sequence_no
  );
END;
$$;
