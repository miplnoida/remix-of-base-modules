
CREATE OR REPLACE FUNCTION public.close_batch(p_batch_number VARCHAR, p_user_code VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status VARCHAR;
  v_phys_csh NUMERIC := 0;
  v_phys_chq NUMERIC := 0;
  v_phys_crd NUMERIC := 0;
  v_phys_drd NUMERIC := 0;
  v_sys_csh NUMERIC := 0;
  v_sys_chq NUMERIC := 0;
  v_sys_crd NUMERIC := 0;
  v_sys_drd NUMERIC := 0;
  v_mismatches TEXT[] := '{}';
  v_payment_ids UUID[];
BEGIN
  -- 1. Validate batch exists and is Open
  SELECT batch_status INTO v_status
  FROM public.cn_batch
  WHERE batch_number = p_batch_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_number;
  END IF;

  IF v_status <> 'O' THEN
    RAISE EXCEPTION 'Batch % is not open (status: %)', p_batch_number, v_status;
  END IF;

  -- 2. Physical CSH: cn_cash_count joined with denominations and currency config
  SELECT COALESCE(SUM(
    cc.count * ccd.denomination_value *
    CASE WHEN tc.is_main_currency THEN 1 ELSE tc.exchange_rate END
  ), 0) INTO v_phys_csh
  FROM public.cn_cash_count cc
  JOIN public.cashier_currency_denominations ccd ON ccd.id = cc.denomination_id
  JOIN public.cashier_currency_config cfg ON cfg.id = cc.currency_id
  JOIN public.tb_currencies tc ON tc.id = cfg.currency_id
  WHERE cc.batch_number = p_batch_number;

  -- 3. Physical CHQ: cn_batch_cheque with currency conversion
  SELECT COALESCE(SUM(
    chq.amount * CASE WHEN cur.is_main_currency THEN 1 ELSE COALESCE(cur.exchange_rate, 1) END
  ), 0) INTO v_phys_chq
  FROM public.cn_batch_cheque chq
  LEFT JOIN public.tb_currencies cur ON cur.currency_code = chq.currency_code AND cur.is_active = true
  WHERE chq.batch_number = p_batch_number;

  -- 4. Physical CRD / DRD
  SELECT COALESCE(SUM(CASE WHEN mop_code = 'CRD' THEN amount ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN mop_code = 'DRD' THEN amount ELSE 0 END), 0)
  INTO v_phys_crd, v_phys_drd
  FROM public.cn_batch_card_total
  WHERE batch_number = p_batch_number;

  -- 5. System totals from cn_payment via cn_payment_header
  SELECT ARRAY_AGG(payment_id) INTO v_payment_ids
  FROM public.cn_payment_header
  WHERE batch_number = p_batch_number
    AND (status IS NULL OR status = 'active');

  IF v_payment_ids IS NOT NULL THEN
    SELECT
      COALESCE(SUM(CASE WHEN mop_code = 'CSH' THEN payment_amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN mop_code = 'CHQ' THEN payment_amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN mop_code = 'CRD' THEN payment_amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN mop_code = 'DRD' THEN payment_amount ELSE 0 END), 0)
    INTO v_sys_csh, v_sys_chq, v_sys_crd, v_sys_drd
    FROM public.cn_payment
    WHERE payment_id = ANY(v_payment_ids);
  END IF;

  -- 6. Compare rounded totals
  IF ROUND(v_phys_csh, 2) <> ROUND(v_sys_csh, 2) THEN
    v_mismatches := array_append(v_mismatches, 'CSH');
  END IF;
  IF ROUND(v_phys_chq, 2) <> ROUND(v_sys_chq, 2) THEN
    v_mismatches := array_append(v_mismatches, 'CHQ');
  END IF;
  IF ROUND(v_phys_crd, 2) <> ROUND(v_sys_crd, 2) THEN
    v_mismatches := array_append(v_mismatches, 'CRD');
  END IF;
  IF ROUND(v_phys_drd, 2) <> ROUND(v_sys_drd, 2) THEN
    v_mismatches := array_append(v_mismatches, 'DRD');
  END IF;

  IF array_length(v_mismatches, 1) > 0 THEN
    RAISE EXCEPTION 'Totals do not match for: %. Physical: CSH=%, CHQ=%, CRD=%, DRD=%. System: CSH=%, CHQ=%, CRD=%, DRD=%',
      array_to_string(v_mismatches, ', '),
      ROUND(v_phys_csh, 2), ROUND(v_phys_chq, 2), ROUND(v_phys_crd, 2), ROUND(v_phys_drd, 2),
      ROUND(v_sys_csh, 2), ROUND(v_sys_chq, 2), ROUND(v_sys_crd, 2), ROUND(v_sys_drd, 2);
  END IF;

  -- 7. All match — close batch
  UPDATE public.cn_batch
  SET batch_status = 'P',
      posted_by = p_user_code,
      date_posted = now()
  WHERE batch_number = p_batch_number;

  RETURN jsonb_build_object(
    'success', true,
    'physical', jsonb_build_object('CSH', v_phys_csh, 'CHQ', v_phys_chq, 'CRD', v_phys_crd, 'DRD', v_phys_drd),
    'system', jsonb_build_object('CSH', v_sys_csh, 'CHQ', v_sys_chq, 'CRD', v_sys_crd, 'DRD', v_sys_drd)
  );
END;
$$;
