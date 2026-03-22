
-- Table: cn_batch_cheque - stores individual cheque entries per batch
CREATE TABLE public.cn_batch_cheque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR NOT NULL,
  cheque_number VARCHAR(30) NOT NULL,
  bank_code VARCHAR(3),
  amount NUMERIC(10,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'XCD',
  date_of_issue DATE,
  created_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: cn_batch_card_total - stores CRD and DRD machine totals per batch
CREATE TABLE public.cn_batch_card_total (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR NOT NULL,
  mop_code VARCHAR(3) NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_by VARCHAR,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(batch_number, mop_code)
);

-- RLS for cn_batch_cheque
ALTER TABLE public.cn_batch_cheque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access on cn_batch_cheque" ON public.cn_batch_cheque FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS for cn_batch_card_total
ALTER TABLE public.cn_batch_card_total ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated full access on cn_batch_card_total" ON public.cn_batch_card_total FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RPC: close_batch - atomic batch closing with MOP-level reconciliation
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
  -- 1. Validate batch exists and is open
  SELECT * INTO v_batch FROM cn_batch WHERE batch_number = p_batch_number;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_number;
  END IF;
  IF v_batch.batch_status <> 'O' THEN
    RAISE EXCEPTION 'Batch % is not open (status: %)', p_batch_number, v_batch.batch_status;
  END IF;

  -- 2. Physical CSH total from cn_cash_count joined with cashier_currency_denominations and cashier_currency_config
  SELECT COALESCE(SUM(
    cc.count * d.denomination_value * 
    CASE WHEN cfg.is_main_currency THEN 1 ELSE cfg.exchange_rate END
  ), 0) INTO v_phys_csh
  FROM cn_cash_count cc
  JOIN cashier_currency_denominations d ON d.id = cc.denomination_id
  JOIN cashier_currency_config cfg ON cfg.id = cc.currency_id
  WHERE cc.batch_number = p_batch_number;

  -- 3. Physical CHQ total from cn_batch_cheque
  SELECT COALESCE(SUM(amount), 0) INTO v_phys_chq
  FROM cn_batch_cheque
  WHERE batch_number = p_batch_number;

  -- 4. Physical CRD and DRD from cn_batch_card_total
  SELECT COALESCE(amount, 0) INTO v_phys_crd
  FROM cn_batch_card_total
  WHERE batch_number = p_batch_number AND mop_code = 'CRD';
  IF NOT FOUND THEN v_phys_crd := 0; END IF;

  SELECT COALESCE(amount, 0) INTO v_phys_drd
  FROM cn_batch_card_total
  WHERE batch_number = p_batch_number AND mop_code = 'DRD';
  IF NOT FOUND THEN v_phys_drd := 0; END IF;

  -- 5. System totals from cn_payment joined via cn_payment_header
  SELECT COALESCE(SUM(p.payment_amount), 0) INTO v_sys_csh
  FROM cn_payment p
  JOIN cn_payment_header h ON h.payment_id = p.payment_id
  WHERE h.batch_number = p_batch_number AND p.mop_code = 'CSH'
    AND (h.status IS NULL OR h.status = 'active');

  SELECT COALESCE(SUM(p.payment_amount), 0) INTO v_sys_chq
  FROM cn_payment p
  JOIN cn_payment_header h ON h.payment_id = p.payment_id
  WHERE h.batch_number = p_batch_number AND p.mop_code = 'CHQ'
    AND (h.status IS NULL OR h.status = 'active');

  SELECT COALESCE(SUM(p.payment_amount), 0) INTO v_sys_crd
  FROM cn_payment p
  JOIN cn_payment_header h ON h.payment_id = p.payment_id
  WHERE h.batch_number = p_batch_number AND p.mop_code = 'CRD'
    AND (h.status IS NULL OR h.status = 'active');

  SELECT COALESCE(SUM(p.payment_amount), 0) INTO v_sys_drd
  FROM cn_payment p
  JOIN cn_payment_header h ON h.payment_id = p.payment_id
  WHERE h.batch_number = p_batch_number AND p.mop_code = 'DRD'
    AND (h.status IS NULL OR h.status = 'active');

  -- 6. Compare
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

  -- 7. All match - close the batch
  UPDATE cn_batch
  SET batch_status = 'P',
      posted_by = p_user_code,
      date_posted = now()
  WHERE batch_number = p_batch_number;

  v_result := jsonb_build_object(
    'success', true,
    'batch_number', p_batch_number,
    'physical', jsonb_build_object('CSH', v_phys_csh, 'CHQ', v_phys_chq, 'CRD', v_phys_crd, 'DRD', v_phys_drd),
    'system', jsonb_build_object('CSH', v_sys_csh, 'CHQ', v_sys_chq, 'CRD', v_sys_crd, 'DRD', v_sys_drd)
  );

  RETURN v_result;
END;
$$;
