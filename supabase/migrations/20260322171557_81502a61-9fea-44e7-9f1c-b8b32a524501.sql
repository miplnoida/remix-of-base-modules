
CREATE OR REPLACE FUNCTION public.close_batch(p_batch_number TEXT, p_user_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch RECORD;
  v_phys_csh NUMERIC := 0;
  v_phys_chq NUMERIC := 0;
  v_phys_crd NUMERIC := 0;
  v_phys_drd NUMERIC := 0;
  v_sys_csh NUMERIC := 0;
  v_sys_chq NUMERIC := 0;
  v_sys_crd NUMERIC := 0;
  v_sys_drd NUMERIC := 0;
  v_mismatches TEXT[] := '{}';
  v_result JSONB;
BEGIN
  SELECT * INTO v_batch FROM cn_batch WHERE batch_number = p_batch_number;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_number;
  END IF;
  IF v_batch.batch_status <> 'O' THEN
    RAISE EXCEPTION 'Batch % is not open (status: %)', p_batch_number, v_batch.batch_status;
  END IF;

  -- Physical CSH: cn_cash_count -> cashier_currency_denominations -> cashier_currency_config -> tb_currencies
  SELECT COALESCE(SUM(
    cc.count * d.denomination_value *
    CASE WHEN cur.is_main_currency THEN 1 ELSE cur.exchange_rate END
  ), 0) INTO v_phys_csh
  FROM cn_cash_count cc
  JOIN cashier_currency_denominations d ON d.id = cc.denomination_id
  JOIN cashier_currency_config cfg ON cfg.id = cc.currency_id
  JOIN tb_currencies cur ON cur.id = cfg.currency_id
  WHERE cc.batch_number = p_batch_number;

  SELECT COALESCE(SUM(amount), 0) INTO v_phys_chq
  FROM cn_batch_cheque WHERE batch_number = p_batch_number;

  SELECT COALESCE(amount, 0) INTO v_phys_crd
  FROM cn_batch_card_total WHERE batch_number = p_batch_number AND mop_code = 'CRD';
  IF NOT FOUND THEN v_phys_crd := 0; END IF;

  SELECT COALESCE(amount, 0) INTO v_phys_drd
  FROM cn_batch_card_total WHERE batch_number = p_batch_number AND mop_code = 'DRD';
  IF NOT FOUND THEN v_phys_drd := 0; END IF;

  SELECT COALESCE(SUM(p.payment_amount), 0) INTO v_sys_csh
  FROM cn_payment p JOIN cn_payment_header h ON h.payment_id = p.payment_id
  WHERE h.batch_number = p_batch_number AND p.mop_code = 'CSH'
    AND (h.status IS NULL OR h.status = 'active');

  SELECT COALESCE(SUM(p.payment_amount), 0) INTO v_sys_chq
  FROM cn_payment p JOIN cn_payment_header h ON h.payment_id = p.payment_id
  WHERE h.batch_number = p_batch_number AND p.mop_code = 'CHQ'
    AND (h.status IS NULL OR h.status = 'active');

  SELECT COALESCE(SUM(p.payment_amount), 0) INTO v_sys_crd
  FROM cn_payment p JOIN cn_payment_header h ON h.payment_id = p.payment_id
  WHERE h.batch_number = p_batch_number AND p.mop_code = 'CRD'
    AND (h.status IS NULL OR h.status = 'active');

  SELECT COALESCE(SUM(p.payment_amount), 0) INTO v_sys_drd
  FROM cn_payment p JOIN cn_payment_header h ON h.payment_id = p.payment_id
  WHERE h.batch_number = p_batch_number AND p.mop_code = 'DRD'
    AND (h.status IS NULL OR h.status = 'active');

  IF ROUND(v_phys_csh, 2) <> ROUND(v_sys_csh, 2) THEN
    v_mismatches := array_append(v_mismatches, 'CSH (Physical: ' || ROUND(v_phys_csh, 2) || ', System: ' || ROUND(v_sys_csh, 2) || ')');
  END IF;
  IF ROUND(v_phys_chq, 2) <> ROUND(v_sys_chq, 2) THEN
    v_mismatches := array_append(v_mismatches, 'CHQ (Physical: ' || ROUND(v_phys_chq, 2) || ', System: ' || ROUND(v_sys_chq, 2) || ')');
  END IF;
  IF ROUND(v_phys_crd, 2) <> ROUND(v_sys_crd, 2) THEN
    v_mismatches := array_append(v_mismatches, 'CRD (Physical: ' || ROUND(v_phys_crd, 2) || ', System: ' || ROUND(v_sys_crd, 2) || ')');
  END IF;
  IF ROUND(v_phys_drd, 2) <> ROUND(v_sys_drd, 2) THEN
    v_mismatches := array_append(v_mismatches, 'DRD (Physical: ' || ROUND(v_phys_drd, 2) || ', System: ' || ROUND(v_sys_drd, 2) || ')');
  END IF;

  IF array_length(v_mismatches, 1) > 0 THEN
    RAISE EXCEPTION 'Totals do not match for: %', array_to_string(v_mismatches, '; ');
  END IF;

  UPDATE cn_batch
  SET batch_status = 'P', posted_by = p_user_code, date_posted = now()
  WHERE batch_number = p_batch_number;

  v_result := jsonb_build_object(
    'success', true, 'batch_number', p_batch_number,
    'physical', jsonb_build_object('CSH', v_phys_csh, 'CHQ', v_phys_chq, 'CRD', v_phys_crd, 'DRD', v_phys_drd),
    'system', jsonb_build_object('CSH', v_sys_csh, 'CHQ', v_sys_chq, 'CRD', v_sys_crd, 'DRD', v_sys_drd)
  );
  RETURN v_result;
END;
$$;
