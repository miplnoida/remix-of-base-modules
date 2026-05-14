
-- 1. Add payment tracking columns to cn_invoices
ALTER TABLE public.cn_invoices
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Add a generated column for outstanding_amount
ALTER TABLE public.cn_invoices
  ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(15,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED;

-- 2. Create cn_invoice_payment linking table
CREATE TABLE IF NOT EXISTS public.cn_invoice_payment (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL,
  invoice_id INTEGER NOT NULL,
  amount_applied NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cn_invoice_payment_payment_id ON public.cn_invoice_payment(payment_id);
CREATE INDEX IF NOT EXISTS idx_cn_invoice_payment_invoice_id ON public.cn_invoice_payment(invoice_id);

-- 3. Create pay_invoices_with_receipt RPC
CREATE OR REPLACE FUNCTION public.pay_invoices_with_receipt(
  p_batch_number TEXT,
  p_payer_type TEXT,
  p_payer_id TEXT,
  p_payer_name TEXT,
  p_date_received DATE,
  p_remarks TEXT,
  p_detail_lines JSONB,
  p_invoice_ids INTEGER[],
  p_receipt_total NUMERIC,
  p_total_payments INTEGER,
  p_user_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id INTEGER;
  v_receipt_id INTEGER;
  v_detail JSONB;
  v_inv_id INTEGER;
  v_inv RECORD;
  v_total_outstanding NUMERIC := 0;
  v_exp_date TEXT;
  v_exp_normalized TEXT;
  v_parts TEXT[];
BEGIN
  -- Validate inputs
  IF p_batch_number IS NULL OR p_batch_number = '' THEN
    RAISE EXCEPTION 'batch_number is required';
  END IF;
  IF array_length(p_invoice_ids, 1) IS NULL OR array_length(p_invoice_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one invoice must be selected';
  END IF;
  IF jsonb_array_length(p_detail_lines) = 0 THEN
    RAISE EXCEPTION 'At least one payment detail line is required';
  END IF;
  IF p_receipt_total <= 0 THEN
    RAISE EXCEPTION 'receipt_total must be greater than zero';
  END IF;

  -- Validate batch is open
  IF NOT EXISTS (
    SELECT 1 FROM public.cn_batch WHERE batch_number = p_batch_number AND batch_status = 'O'
  ) THEN
    RAISE EXCEPTION 'Batch % is not open', p_batch_number;
  END IF;

  -- Validate all invoices are payable and compute total outstanding
  FOR v_inv_id IN SELECT unnest(p_invoice_ids)
  LOOP
    SELECT id, status, total_amount, paid_amount, (total_amount - paid_amount) AS outstanding
    INTO v_inv
    FROM public.cn_invoices
    WHERE id = v_inv_id
    FOR UPDATE; -- lock row

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

  -- Validate total matches
  IF p_receipt_total != v_total_outstanding THEN
    RAISE EXCEPTION 'Payment total (%) does not match invoice outstanding total (%)', p_receipt_total, v_total_outstanding;
  END IF;

  -- Step 1: Create payment header with advisory lock
  PERFORM pg_advisory_xact_lock(7839201);

  SELECT COALESCE(MAX(payment_id), 0) + 1
  INTO v_payment_id
  FROM public.cn_payment_header;

  INSERT INTO public.cn_payment_header (
    payment_id, batch_number, payer_type, payer_id, date_received, remarks
  ) VALUES (
    v_payment_id, p_batch_number, p_payer_type, p_payer_id, p_date_received, p_remarks
  );

  -- Step 2: Insert detail lines
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

    INSERT INTO public.cn_payment (
      payment_id, payment_code, fund_code, payment_amount,
      mop_code, period, payment_date, bank_code,
      mop_number, cheque_date, mop_account_number, mop_notes1,
      credit_card_code, expiration_date
    ) VALUES (
      v_payment_id,
      v_detail->>'payment_code',
      v_detail->>'fund_code',
      (v_detail->>'payment_amount')::numeric,
      v_detail->>'mop_code',
      v_detail->>'period',
      (v_detail->>'payment_date')::date,
      v_detail->>'bank_code',
      v_detail->>'mop_number',
      CASE WHEN v_detail->>'cheque_date' IS NOT NULL AND v_detail->>'cheque_date' != '' 
           THEN (v_detail->>'cheque_date')::date ELSE NULL END,
      v_detail->>'mop_account_number',
      v_detail->>'mop_notes1',
      v_detail->>'credit_card_code',
      CASE WHEN v_exp_normalized IS NOT NULL THEN v_exp_normalized::date ELSE NULL END
    );
  END LOOP;

  -- Step 3: Insert cn_invoice_payment rows and update invoices
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

  -- Step 4: Create receipt
  INSERT INTO public.cn_receipt (
    payment_id, status, receipt_total, total_number_of_payments,
    reprint_times, created_by, updated_by
  ) VALUES (
    v_payment_id, 'O', p_receipt_total, p_total_payments,
    0, p_user_code, p_user_code
  )
  RETURNING receipt_id INTO v_receipt_id;

  -- Step 5: Log original print
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
