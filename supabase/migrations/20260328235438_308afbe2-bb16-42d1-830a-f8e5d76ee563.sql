
CREATE OR REPLACE FUNCTION public.get_batch_cheques_for_verification(p_batch_number TEXT)
RETURNS TABLE(
  cheque_number TEXT,
  bank_code TEXT,
  bank_name TEXT,
  amount NUMERIC,
  currency_code TEXT,
  cheque_date TEXT,
  payer_id TEXT,
  payer_type TEXT,
  source_table TEXT,
  source_record_id TEXT,
  payment_id BIGINT,
  is_verified BOOLEAN,
  override_cheque_number TEXT,
  override_bank_code TEXT,
  override_amount NUMERIC,
  override_cheque_date TEXT,
  edit_reason TEXT,
  verification_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.mop_number::TEXT AS cheque_number,
    cp.bank_code::TEXT AS bank_code,
    tb.name::TEXT AS bank_name,
    cp.payment_amount AS amount,
    COALESCE(cp.currency_code, cp.base_currency, 'XCD')::TEXT AS currency_code,
    CASE WHEN cp.cheque_date IS NOT NULL THEN to_char(cp.cheque_date, 'YYYY-MM-DD') ELSE NULL END AS cheque_date,
    ch.payer_id::TEXT AS payer_id,
    ch.payer_type::TEXT AS payer_type,
    'cn_payment'::TEXT AS source_table,
    cp.payment_sequence_no::TEXT AS source_record_id,
    cp.payment_id AS payment_id,
    COALESCE(v.is_verified, false) AS is_verified,
    v.override_cheque_number::TEXT,
    v.override_bank_code::TEXT,
    v.override_amount,
    CASE WHEN v.override_cheque_date IS NOT NULL THEN to_char(v.override_cheque_date, 'YYYY-MM-DD') ELSE NULL END AS override_cheque_date,
    v.edit_reason::TEXT,
    v.id::TEXT AS verification_id
  FROM public.cn_payment cp
  JOIN public.cn_payment_header ch ON cp.payment_id = ch.payment_id
  JOIN public.cn_receipt r ON r.payment_id = ch.payment_id AND r.status != 'C'
  LEFT JOIN public.cn_batch_cheque_verification v
    ON v.batch_number = p_batch_number
    AND v.source_table = 'cn_payment'
    AND v.source_record_id = cp.payment_sequence_no::TEXT
  LEFT JOIN public.tb_bank_code tb ON cp.bank_code = tb.bank_code
  WHERE ch.batch_number = p_batch_number
    AND cp.mop_code = 'CHQ'
    AND COALESCE(ch.status, 'active') != 'cancelled';
END;
$$;

CREATE OR REPLACE FUNCTION public.close_batch(p_batch_number TEXT, p_user_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Physical CRD / DRD
  SELECT
    COALESCE(SUM(CASE WHEN mop_code = 'CRD' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN mop_code = 'DRD' THEN amount ELSE 0 END), 0)
  INTO v_physical_crd, v_physical_drd
  FROM cn_batch_card_total
  WHERE batch_number = p_batch_number;

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
    IF v_system.mop_code = 'CRD' AND ROUND(v_physical_crd * 100) != ROUND(v_system.total * 100) THEN
      RAISE EXCEPTION 'CRD mismatch: Physical % vs System %', v_physical_crd, v_system.total;
    END IF;
    IF v_system.mop_code = 'DRD' AND ROUND(v_physical_drd * 100) != ROUND(v_system.total * 100) THEN
      RAISE EXCEPTION 'DRD mismatch: Physical % vs System %', v_physical_drd, v_system.total;
    END IF;
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
