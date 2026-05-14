
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

    -- Fix: use created_by instead of entered_by
    INSERT INTO public.cn_batch_card_transaction (
      batch_number, machine_id, card_type, amount, created_by
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
