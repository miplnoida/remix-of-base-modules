
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
  v_sys_csh NUMERIC := 0;
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

  -- Physical CHQ from verified cheques only (cn_payment is single source of truth)
  SELECT COALESCE(SUM(
    COALESCE(v.override_amount, sub.amount) *
    CASE WHEN cur.is_main_currency THEN 1 ELSE COALESCE(cur.exchange_rate, 1) END
  ), 0) INTO v_physical_chq
  FROM (
    SELECT
      p.payment_sequence_no::TEXT AS source_record_id,
      'cn_payment' AS source_table,
      COALESCE(p.payment_amount, 0) AS amount,
      p.currency_code
    FROM cn_payment p
    JOIN cn_payment_header h ON h.payment_id = p.payment_id
    JOIN cn_receipt r ON r.payment_id = h.payment_id AND r.status != 'C'
    WHERE h.batch_number = p_batch_number
      AND p.mop_code = 'CHQ'
      AND COALESCE(h.status, 'active') != 'cancelled'
  ) sub
  JOIN cn_batch_cheque_verification v
    ON v.batch_number = p_batch_number
    AND v.source_table = sub.source_table
    AND v.source_record_id = sub.source_record_id
    AND v.is_verified = true
  JOIN tb_currencies cur ON cur.currency_code = COALESCE(sub.currency_code, 'XCD') AND cur.is_active = true;

  -- Count unverified cheques (cn_payment is single source of truth)
  SELECT COUNT(*) INTO v_unverified_count
  FROM (
    SELECT
      p.payment_sequence_no::TEXT AS source_record_id,
      'cn_payment' AS source_table
    FROM cn_payment p
    JOIN cn_payment_header h ON h.payment_id = p.payment_id
    JOIN cn_receipt r ON r.payment_id = h.payment_id AND r.status != 'C'
    WHERE h.batch_number = p_batch_number
      AND p.mop_code = 'CHQ'
      AND COALESCE(h.status, 'active') != 'cancelled'
  ) all_chq
  WHERE NOT EXISTS (
    SELECT 1 FROM cn_batch_cheque_verification v
    WHERE v.batch_number = p_batch_number
      AND v.source_table = all_chq.source_table
      AND v.source_record_id = all_chq.source_record_id
      AND v.is_verified = true
  );

  -- Physical CRD / DRD — now derived from cn_payment (auto-reconciled)
  SELECT
    COALESCE(SUM(CASE WHEN p.mop_code = 'CRD' THEN p.payment_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN p.mop_code = 'DRD' THEN p.payment_amount ELSE 0 END), 0)
  INTO v_physical_crd, v_physical_drd
  FROM cn_payment p
  JOIN cn_payment_header h ON h.payment_id = p.payment_id
  JOIN cn_receipt r ON r.payment_id = h.payment_id AND r.status != 'C'
  WHERE h.batch_number = p_batch_number
    AND p.mop_code IN ('CRD', 'DRD')
    AND COALESCE(h.status, 'active') != 'cancelled';

  -- System totals verification (only active-receipt-backed transactions from cn_payment)
  FOR v_system IN
    SELECT p.mop_code, COALESCE(SUM(p.payment_amount), 0) AS total
    FROM cn_payment p
    JOIN cn_payment_header h ON h.payment_id = p.payment_id
    JOIN cn_receipt r ON r.payment_id = h.payment_id AND r.status != 'C'
    WHERE h.batch_number = p_batch_number
      AND COALESCE(h.status, 'active') != 'cancelled'
    GROUP BY p.mop_code
  LOOP
    IF v_system.mop_code = 'CSH' THEN
      v_sys_csh := v_system.total + COALESCE(v_batch.offset_amount, 0);
      IF ROUND(v_physical_csh * 100) != ROUND(v_sys_csh * 100) THEN
        RAISE EXCEPTION 'CSH mismatch: Physical % vs System %', v_physical_csh, v_sys_csh;
      END IF;
    END IF;
    IF v_system.mop_code = 'CHQ' AND ROUND(v_physical_chq * 100) != ROUND(v_system.total * 100) THEN
      RAISE EXCEPTION 'CHQ mismatch: Physical % vs System %. Unverified cheques: %', v_physical_chq, v_system.total, v_unverified_count;
    END IF;
    -- CRD and DRD are auto-reconciled (physical = system), no mismatch possible
  END LOOP;

  -- Handle case where no CSH payments exist but there is an opening balance
  IF v_sys_csh = 0 AND COALESCE(v_batch.offset_amount, 0) != 0 THEN
    v_sys_csh := COALESCE(v_batch.offset_amount, 0);
    IF ROUND(v_physical_csh * 100) != ROUND(v_sys_csh * 100) THEN
      RAISE EXCEPTION 'CSH mismatch: Physical % vs System %', v_physical_csh, v_sys_csh;
    END IF;
  END IF;

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
