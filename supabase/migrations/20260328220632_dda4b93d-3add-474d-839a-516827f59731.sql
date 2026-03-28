
-- 1. Master table for card payment machines
CREATE TABLE public.cn_card_machine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_code VARCHAR(20) NOT NULL UNIQUE,
  machine_name VARCHAR(100) NOT NULL,
  card_type_support VARCHAR(10) NOT NULL DEFAULT 'BOTH',
  is_active BOOLEAN NOT NULL DEFAULT true,
  bank_code VARCHAR(3),
  settlement_account_no VARCHAR(50),
  settlement_account_name VARCHAR(100),
  notes TEXT,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_by VARCHAR(50),
  modified_at TIMESTAMPTZ,
  CONSTRAINT cn_card_machine_card_type_chk CHECK (card_type_support IN ('CRD', 'DRD', 'BOTH'))
);

-- 2. Individual card transaction rows per batch
CREATE TABLE public.cn_batch_card_transaction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR NOT NULL,
  machine_id UUID NOT NULL REFERENCES public.cn_card_machine(id),
  card_type VARCHAR(3) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cn_batch_card_txn_card_type_chk CHECK (card_type IN ('CRD', 'DRD'))
);

-- Indexes
CREATE INDEX idx_cn_card_machine_active ON public.cn_card_machine(is_active);
CREATE INDEX idx_cn_batch_card_txn_batch ON public.cn_batch_card_transaction(batch_number);

-- 3. Validation trigger for amount > 0
CREATE OR REPLACE FUNCTION public.validate_card_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Card transaction amount must be greater than zero';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_card_transaction
  BEFORE INSERT OR UPDATE ON public.cn_batch_card_transaction
  FOR EACH ROW EXECUTE FUNCTION public.validate_card_transaction();

-- 4. Audit triggers (using existing audit_table_changes function)
CREATE TRIGGER audit_cn_card_machine
  AFTER INSERT OR UPDATE OR DELETE ON public.cn_card_machine
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

CREATE TRIGGER audit_cn_batch_card_transaction
  AFTER INSERT OR UPDATE OR DELETE ON public.cn_batch_card_transaction
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_changes();

-- 5. RPC: save_batch_card_transactions
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
  -- Validate batch exists and is Open
  SELECT status INTO v_batch_status
  FROM public.cn_batch
  WHERE batch_number = p_batch_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch % not found', p_batch_number;
  END IF;
  IF v_batch_status <> 'O' THEN
    RAISE EXCEPTION 'Batch % is not open (status: %)', p_batch_number, v_batch_status;
  END IF;

  -- Delete existing transaction rows for this batch
  DELETE FROM public.cn_batch_card_transaction WHERE batch_number = p_batch_number;

  -- Process each transaction
  FOR v_txn IN SELECT * FROM jsonb_array_elements(p_transactions)
  LOOP
    v_machine_id := (v_txn->>'machine_id')::UUID;
    v_card_type := v_txn->>'card_type';
    v_amount := (v_txn->>'amount')::NUMERIC(12,2);

    -- Validate amount
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Transaction amount must be greater than zero';
    END IF;

    -- Validate card_type
    IF v_card_type NOT IN ('CRD', 'DRD') THEN
      RAISE EXCEPTION 'Invalid card type: %. Must be CRD or DRD', v_card_type;
    END IF;

    -- Validate machine
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

    -- Validate card_type compatibility
    IF v_machine.card_type_support = 'CRD' AND v_card_type = 'DRD' THEN
      RAISE EXCEPTION 'Machine % does not support Debit Card', v_machine.machine_code;
    END IF;
    IF v_machine.card_type_support = 'DRD' AND v_card_type = 'CRD' THEN
      RAISE EXCEPTION 'Machine % does not support Credit Card', v_machine.machine_code;
    END IF;

    -- Insert transaction row
    INSERT INTO public.cn_batch_card_transaction (batch_number, machine_id, card_type, amount, created_by)
    VALUES (p_batch_number, v_machine_id, v_card_type, v_amount, p_user_code);

    -- Accumulate totals
    IF v_card_type = 'CRD' THEN
      v_crd_total := v_crd_total + v_amount;
    ELSE
      v_drd_total := v_drd_total + v_amount;
    END IF;
  END LOOP;

  -- Upsert into cn_batch_card_total for backward compatibility
  INSERT INTO public.cn_batch_card_total (batch_number, mop_code, amount, updated_by, updated_at)
  VALUES (p_batch_number, 'CRD', v_crd_total, p_user_code, now())
  ON CONFLICT (batch_number, mop_code)
  DO UPDATE SET amount = EXCLUDED.amount, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at;

  INSERT INTO public.cn_batch_card_total (batch_number, mop_code, amount, updated_by, updated_at)
  VALUES (p_batch_number, 'DRD', v_drd_total, p_user_code, now())
  ON CONFLICT (batch_number, mop_code)
  DO UPDATE SET amount = EXCLUDED.amount, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object('crd_total', v_crd_total, 'drd_total', v_drd_total);
END;
$$;
