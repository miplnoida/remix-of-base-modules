
-- Fix close_batch: use correct columns posted_by/date_posted instead of modified_by/modified_at
-- Also return unverified_cheque_count in result JSON

DROP FUNCTION IF EXISTS public.close_batch(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.close_batch(p_batch_number TEXT, p_user_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_physical_csh NUMERIC := 0;
  v_physical_chq NUMERIC := 0;
  v_physical_crd NUMERIC := 0;
  v_physical_drd NUMERIC := 0;
  v_unverified_count INTEGER := 0;
  v_system RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_batch FROM cn_batch WHERE batch_number = p_batch_number;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_number;
  END IF;
  IF v_batch.batch_status != 'O' THEN
    RAISE EXCEPTION 'Batch % is not open (status: %)', p_batch_number, v_batch.batch_status;
  END IF;

  -- Physical CSH
  SELECT COALESCE(SUM(
    cc.count * cd.denomination_value *
    CASE WHEN cur.is_main_currency THEN 1 ELSE COALESCE(cur.exchange_rate, 1) END
  ), 0) INTO v_physical_csh
  FROM cn_cash_count cc
  JOIN cashier_currency_denominations cd ON cd.id = cc.denomination_id
  JOIN tb_currencies cur ON cur.id = cc.currency_id
  WHERE cc.batch_number = p_batch_number;

  -- Physical CHQ from verified cheques only
  SELECT COALESCE(SUM(
    COALESCE(v.override_amount, sub.amount) *
    CASE WHEN cur.is_main_currency THEN 1 ELSE COALESCE(cur.exchange_rate, 1) END
  ), 0) INTO v_physical_chq
  FROM (
    SELECT
      p.payment_id::TEXT || '-' || p.payment_sequence_no::TEXT AS source_record_id,
      'cn_payment' AS source_table,
      COALESCE(p.payment_amount, 0) AS amount,
      p.currency_code
    FROM cn_payment p
    JOIN cn_payment_header h ON h.payment_id = p.payment_id
    WHERE h.batch_number = p_batch_number
      AND p.mop_code = 'CHQ'
      AND COALESCE(h.status, 'active') != 'cancelled'
    UNION ALL
    SELECT
      cm.id::TEXT AS source_record_id,
      'c3_payment_methods' AS source_table,
      COALESCE(cm.original_amount, 0) AS amount,
      cm.currency_code
    FROM c3_payment_methods cm
    JOIN cn_payment_header h ON h.payment_id = cm.payment_id
    WHERE h.batch_number = p_batch_number
      AND cm.mop_code = 'CHQ'
      AND COALESCE(h.status, 'active') != 'cancelled'
  ) sub
  JOIN cn_batch_cheque_verification v
    ON v.batch_number = p_batch_number
    AND v.source_table = sub.source_table
    AND v.source_record_id = sub.source_record_id
    AND v.is_verified = true
  JOIN tb_currencies cur ON cur.currency_code = COALESCE(sub.currency_code, 'XCD') AND cur.is_active = true;

  -- Count unverified cheques
  SELECT COUNT(*) INTO v_unverified_count
  FROM (
    SELECT
      p.payment_id::TEXT || '-' || p.payment_sequence_no::TEXT AS source_record_id,
      'cn_payment' AS source_table
    FROM cn_payment p
    JOIN cn_payment_header h ON h.payment_id = p.payment_id
    WHERE h.batch_number = p_batch_number
      AND p.mop_code = 'CHQ'
      AND COALESCE(h.status, 'active') != 'cancelled'
    UNION ALL
    SELECT
      cm.id::TEXT AS source_record_id,
      'c3_payment_methods' AS source_table
    FROM c3_payment_methods cm
    JOIN cn_payment_header h ON h.payment_id = cm.payment_id
    WHERE h.batch_number = p_batch_number
      AND cm.mop_code = 'CHQ'
      AND COALESCE(h.status, 'active') != 'cancelled'
  ) all_chq
  WHERE NOT EXISTS (
    SELECT 1 FROM cn_batch_cheque_verification v
    WHERE v.batch_number = p_batch_number
      AND v.source_table = all_chq.source_table
      AND v.source_record_id = all_chq.source_record_id
      AND v.is_verified = true
  );

  -- Physical CRD / DRD
  SELECT
    COALESCE(SUM(CASE WHEN mop_code = 'CRD' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN mop_code = 'DRD' THEN amount ELSE 0 END), 0)
  INTO v_physical_crd, v_physical_drd
  FROM cn_batch_card_total
  WHERE batch_number = p_batch_number;

  -- System totals verification
  FOR v_system IN
    SELECT p.mop_code, COALESCE(SUM(p.payment_amount), 0) AS total
    FROM cn_payment p
    JOIN cn_payment_header h ON h.payment_id = p.payment_id
    WHERE h.batch_number = p_batch_number
      AND COALESCE(h.status, 'active') != 'cancelled'
    GROUP BY p.mop_code
  LOOP
    IF v_system.mop_code = 'CSH' AND ROUND(v_physical_csh * 100) != ROUND(v_system.total * 100) THEN
      RAISE EXCEPTION 'CSH mismatch: Physical % vs System %', v_physical_csh, v_system.total;
    END IF;
    IF v_system.mop_code = 'CHQ' AND ROUND(v_physical_chq * 100) != ROUND(v_system.total * 100) THEN
      RAISE EXCEPTION 'CHQ mismatch: Physical % vs System %. Unverified cheques: %', v_physical_chq, v_system.total, v_unverified_count;
    END IF;
    IF v_system.mop_code = 'CRD' AND ROUND(v_physical_crd * 100) != ROUND(v_system.total * 100) THEN
      RAISE EXCEPTION 'CRD mismatch: Physical % vs System %', v_physical_crd, v_system.total;
    END IF;
    IF v_system.mop_code = 'DRD' AND ROUND(v_physical_drd * 100) != ROUND(v_system.total * 100) THEN
      RAISE EXCEPTION 'DRD mismatch: Physical % vs System %', v_physical_drd, v_system.total;
    END IF;
  END LOOP;

  -- Fix: use correct column names posted_by and date_posted
  UPDATE cn_batch SET
    batch_status = 'P',
    posted_by = p_user_code,
    date_posted = now()
  WHERE batch_number = p_batch_number;

  v_result := json_build_object(
    'success', true,
    'batch_number', p_batch_number,
    'physical_csh', v_physical_csh,
    'physical_chq', v_physical_chq,
    'physical_crd', v_physical_crd,
    'physical_drd', v_physical_drd,
    'unverified_cheque_count', v_unverified_count
  );

  RETURN v_result;
END;
$$;

-- Fix save_batch_card_transactions: use batch_status instead of status
DROP FUNCTION IF EXISTS public.save_batch_card_transactions(TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.save_batch_card_transactions(
  p_batch_number TEXT,
  p_transactions JSONB,
  p_user_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_txn JSONB;
  v_machine RECORD;
  v_crd_total NUMERIC(12,2) := 0;
  v_drd_total NUMERIC(12,2) := 0;
  v_batch_status VARCHAR;
  v_amount NUMERIC(12,2);
  v_card_type VARCHAR(3);
  v_machine_id UUID;
BEGIN
  -- Fix: use batch_status instead of status
  SELECT batch_status INTO v_batch_status
  FROM public.cn_batch
  WHERE batch_number = p_batch_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_number;
  END IF;
  IF v_batch_status <> 'O' THEN
    RAISE EXCEPTION 'Batch % is not open (status: %)', p_batch_number, v_batch_status;
  END IF;

  DELETE FROM public.cn_batch_card_transaction WHERE batch_number = p_batch_number;

  FOR v_txn IN SELECT * FROM jsonb_array_elements(p_transactions)
  LOOP
    v_machine_id := (v_txn->>'machine_id')::UUID;
    v_card_type := v_txn->>'card_type';
    v_amount := (v_txn->>'amount')::NUMERIC(12,2);

    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Transaction amount must be greater than zero';
    END IF;

    IF v_card_type NOT IN ('CRD', 'DRD') THEN
      RAISE EXCEPTION 'Invalid card type: %. Must be CRD or DRD', v_card_type;
    END IF;

    SELECT * INTO v_machine FROM public.cn_card_machine WHERE id = v_machine_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Machine % not found', v_machine_id;
    END IF;
    IF NOT v_machine.is_active THEN
      RAISE EXCEPTION 'Machine % is not active', v_machine.machine_code;
    END IF;
    IF v_machine.bank_code IS NULL OR v_machine.bank_code = '' THEN
      RAISE EXCEPTION 'Machine % has no bank linkage', v_machine.machine_code;
    END IF;

    IF v_machine.card_type_support = 'CRD' AND v_card_type = 'DRD' THEN
      RAISE EXCEPTION 'Machine % does not support Debit Card', v_machine.machine_code;
    END IF;
    IF v_machine.card_type_support = 'DRD' AND v_card_type = 'CRD' THEN
      RAISE EXCEPTION 'Machine % does not support Credit Card', v_machine.machine_code;
    END IF;

    INSERT INTO public.cn_batch_card_transaction (
      batch_number, machine_id, card_type, amount, entered_by
    ) VALUES (
      p_batch_number, v_machine_id, v_card_type, v_amount, p_user_code
    );

    IF v_card_type = 'CRD' THEN
      v_crd_total := v_crd_total + v_amount;
    ELSE
      v_drd_total := v_drd_total + v_amount;
    END IF;
  END LOOP;

  DELETE FROM public.cn_batch_card_total WHERE batch_number = p_batch_number;

  IF v_crd_total > 0 THEN
    INSERT INTO public.cn_batch_card_total (batch_number, mop_code, amount)
    VALUES (p_batch_number, 'CRD', v_crd_total);
  END IF;
  IF v_drd_total > 0 THEN
    INSERT INTO public.cn_batch_card_total (batch_number, mop_code, amount)
    VALUES (p_batch_number, 'DRD', v_drd_total);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'crd_total', v_crd_total,
    'drd_total', v_drd_total,
    'transaction_count', jsonb_array_length(p_transactions)
  );
END;
$$;
