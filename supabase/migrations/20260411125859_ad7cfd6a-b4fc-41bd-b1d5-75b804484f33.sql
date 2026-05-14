
-- 1. SYNC LOG TABLE
CREATE TABLE IF NOT EXISTS public.ce_payment_ledger_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL DEFAULT 'cn_payment',
  source_payment_id BIGINT NOT NULL,
  employer_id VARCHAR NOT NULL,
  receipt_no TEXT,
  transaction_no TEXT,
  payment_date TIMESTAMP,
  amount_snapshot NUMERIC NOT NULL DEFAULT 0,
  fund_code VARCHAR,
  payment_code VARCHAR,
  status_snapshot TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','posted','skipped','failed','dry_run')),
  ledger_entry_ids JSONB DEFAULT '[]'::jsonb,
  allocation_status TEXT DEFAULT 'unallocated' CHECK (allocation_status IN ('unallocated','partial','fully_allocated','not_applicable')),
  sync_run_id UUID,
  synced_at TIMESTAMPTZ,
  synced_by VARCHAR DEFAULT 'SYSTEM',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ce_pmt_sync_source UNIQUE (source_table, source_payment_id, fund_code)
);

CREATE INDEX IF NOT EXISTS idx_ce_pmt_sync_employer ON public.ce_payment_ledger_sync_log(employer_id);
CREATE INDEX IF NOT EXISTS idx_ce_pmt_sync_status ON public.ce_payment_ledger_sync_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_ce_pmt_sync_run ON public.ce_payment_ledger_sync_log(sync_run_id);

-- 2. PAYMENT ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.ce_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_payment_id BIGINT NOT NULL,
  source_table TEXT NOT NULL DEFAULT 'cn_payment',
  employer_id VARCHAR NOT NULL,
  ledger_credit_entry_id UUID REFERENCES public.ce_employer_financial_ledger(id),
  target_ledger_debit_entry_id UUID REFERENCES public.ce_employer_financial_ledger(id),
  target_type TEXT NOT NULL DEFAULT 'dues' CHECK (target_type IN ('dues','penalty','interest','arrangement','other')),
  target_period VARCHAR,
  fund_type TEXT,
  allocated_amount NUMERIC NOT NULL DEFAULT 0 CHECK (allocated_amount > 0),
  allocation_sequence INT NOT NULL DEFAULT 1,
  allocation_mode TEXT NOT NULL DEFAULT 'oldest_due_first' CHECK (allocation_mode IN ('oldest_due_first','exact_period_match','dues_then_penalty','manual','arrangement_priority')),
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  allocated_by VARCHAR NOT NULL DEFAULT 'SYSTEM',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_alloc_employer ON public.ce_payment_allocations(employer_id);
CREATE INDEX IF NOT EXISTS idx_ce_alloc_credit ON public.ce_payment_allocations(ledger_credit_entry_id);
CREATE INDEX IF NOT EXISTS idx_ce_alloc_debit ON public.ce_payment_allocations(target_ledger_debit_entry_id);
CREATE INDEX IF NOT EXISTS idx_ce_alloc_source ON public.ce_payment_allocations(source_payment_id, source_table);

-- 3. VIEW: UNPOSTED PAYMENTS
CREATE OR REPLACE VIEW public.ce_v_payments_unposted_to_ledger AS
SELECT
  'cn_payment'::text AS payment_source_table,
  cp.payment_sequence_no AS source_payment_id,
  cr.receipt_id,
  cr.receipt_number,
  cph.payer_id AS employer_id,
  cp.payment_date,
  cp.payment_amount AS amount,
  cp.fund_code,
  cp.payment_code,
  cp.mop_code AS payment_method,
  cp.period,
  cph.batch_number,
  cb.entered_by AS cashier,
  cr.status AS receipt_status,
  COALESCE(cph.status, 'active') AS header_status,
  ('pay-cnpmt-' || cp.payment_sequence_no::text) AS sync_key
FROM public.cn_payment cp
JOIN public.cn_payment_header cph ON cp.payment_id = cph.payment_id
LEFT JOIN public.cn_receipt cr ON cp.payment_id = cr.payment_id
LEFT JOIN public.cn_batch cb ON cph.batch_number = cb.batch_number
WHERE
  cph.payer_id IS NOT NULL
  AND (cr.status IS NULL OR cr.status NOT IN ('C','V','X'))
  AND (cph.status IS NULL OR cph.status != 'deleted')
  AND NOT EXISTS (
    SELECT 1 FROM public.ce_payment_ledger_sync_log sl
    WHERE sl.source_table = 'cn_payment'
    AND sl.source_payment_id = cp.payment_sequence_no
    AND sl.fund_code IS NOT DISTINCT FROM cp.fund_code
    AND sl.sync_status = 'posted'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.ce_employer_financial_ledger efl
    WHERE efl.idempotency_key = 'pay-cnpmt-' || cp.payment_sequence_no::text
  );

-- 4. VIEW: RECONCILIATION EXCEPTIONS
CREATE OR REPLACE VIEW public.ce_v_payment_reconciliation_exceptions AS
-- A: Unposted payments
SELECT
  'unposted_payment'::text AS exception_type,
  'cn_payment'::text AS source_table,
  cp.payment_sequence_no AS source_id,
  cph.payer_id AS employer_id,
  cp.payment_amount AS source_amount,
  NULL::numeric AS ledger_amount,
  NULL::numeric AS allocated_amount,
  cp.payment_date::timestamptz AS event_date,
  'Payment exists in source but not in compliance ledger'::text AS description
FROM public.cn_payment cp
JOIN public.cn_payment_header cph ON cp.payment_id = cph.payment_id
LEFT JOIN public.cn_receipt cr ON cp.payment_id = cr.payment_id
WHERE cph.payer_id IS NOT NULL
  AND (cr.status IS NULL OR cr.status NOT IN ('C','V','X'))
  AND (cph.status IS NULL OR cph.status != 'deleted')
  AND NOT EXISTS (
    SELECT 1 FROM public.ce_payment_ledger_sync_log sl
    WHERE sl.source_table = 'cn_payment' AND sl.source_payment_id = cp.payment_sequence_no AND sl.sync_status = 'posted'
  )
UNION ALL
-- B: Unallocated credits
SELECT 'unallocated_credit', sl.source_table, sl.source_payment_id, sl.employer_id,
  sl.amount_snapshot, NULL, NULL, sl.synced_at,
  'Payment synced to ledger but not allocated to any dues'
FROM public.ce_payment_ledger_sync_log sl
WHERE sl.sync_status = 'posted' AND sl.allocation_status = 'unallocated'
UNION ALL
-- C: Over-allocated
SELECT 'over_allocated', sl.source_table, sl.source_payment_id, sl.employer_id,
  sl.amount_snapshot, NULL, alloc_total.total_allocated, sl.synced_at,
  'Sum of allocations exceeds source payment amount'
FROM public.ce_payment_ledger_sync_log sl
JOIN LATERAL (
  SELECT SUM(pa.allocated_amount) AS total_allocated
  FROM public.ce_payment_allocations pa
  WHERE pa.source_payment_id = sl.source_payment_id AND pa.source_table = sl.source_table
) alloc_total ON alloc_total.total_allocated > sl.amount_snapshot
WHERE sl.sync_status = 'posted'
UNION ALL
-- D: Cancelled source with active credit
SELECT 'cancelled_source_active_credit', 'cn_payment', sl.source_payment_id, sl.employer_id,
  sl.amount_snapshot, efl.credit_amount, NULL, cr.cancel_date::timestamptz,
  'Source receipt cancelled but ledger credit still active'
FROM public.ce_payment_ledger_sync_log sl
JOIN public.cn_payment cp2 ON cp2.payment_sequence_no = sl.source_payment_id
JOIN public.cn_receipt cr ON cr.payment_id = cp2.payment_id
JOIN public.ce_employer_financial_ledger efl ON efl.idempotency_key = 'pay-cnpmt-' || sl.source_payment_id::text
WHERE sl.sync_status = 'posted' AND cr.status IN ('C','V','X') AND efl.status = 'POSTED'::ce_ledger_status;

-- 5. RPC: SYNC PAYMENTS TO LEDGER
CREATE OR REPLACE FUNCTION public.ce_sync_payments_to_ledger(
  p_employer_id VARCHAR DEFAULT NULL,
  p_payment_date_from TIMESTAMP DEFAULT NULL,
  p_payment_date_to TIMESTAMP DEFAULT NULL,
  p_source_payment_id BIGINT DEFAULT NULL,
  p_limit INT DEFAULT 500,
  p_dry_run BOOLEAN DEFAULT false,
  p_triggered_by VARCHAR DEFAULT 'SYSTEM'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_run_id UUID := gen_random_uuid();
  v_processed INT := 0;
  v_posted INT := 0;
  v_skipped INT := 0;
  v_failed INT := 0;
  v_total_amount NUMERIC := 0;
  v_errors JSONB := '[]'::jsonb;
  v_ledger_id UUID;
  v_fund ce_fund_type;
BEGIN
  FOR v_rec IN
    SELECT * FROM public.ce_v_payments_unposted_to_ledger vp
    WHERE (p_employer_id IS NULL OR vp.employer_id = p_employer_id)
      AND (p_payment_date_from IS NULL OR vp.payment_date >= p_payment_date_from)
      AND (p_payment_date_to IS NULL OR vp.payment_date <= p_payment_date_to)
      AND (p_source_payment_id IS NULL OR vp.source_payment_id = p_source_payment_id)
    ORDER BY vp.payment_date ASC, vp.source_payment_id ASC
    LIMIT p_limit
  LOOP
    v_processed := v_processed + 1;

    IF p_dry_run THEN
      INSERT INTO public.ce_payment_ledger_sync_log (
        source_table, source_payment_id, employer_id, receipt_no,
        payment_date, amount_snapshot, fund_code, payment_code,
        status_snapshot, sync_status, sync_run_id, synced_at, synced_by
      ) VALUES (
        v_rec.payment_source_table, v_rec.source_payment_id, v_rec.employer_id,
        v_rec.receipt_number, v_rec.payment_date, v_rec.amount,
        v_rec.fund_code, v_rec.payment_code, v_rec.receipt_status,
        'dry_run', v_run_id, now(), p_triggered_by
      ) ON CONFLICT (source_table, source_payment_id, fund_code) DO NOTHING;
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    BEGIN
      v_fund := CASE
        WHEN UPPER(COALESCE(v_rec.fund_code,'')) LIKE '%SS%' THEN 'SS'::ce_fund_type
        WHEN UPPER(COALESCE(v_rec.fund_code,'')) LIKE '%LEV%' THEN 'LEVY'::ce_fund_type
        WHEN UPPER(COALESCE(v_rec.fund_code,'')) LIKE '%EI%' OR UPPER(COALESCE(v_rec.fund_code,'')) LIKE '%PE%' THEN 'EI'::ce_fund_type
        ELSE 'SS'::ce_fund_type
      END;

      v_ledger_id := public.ce_post_ledger_entry(
        p_employer_id := v_rec.employer_id,
        p_entry_type := 'PAYMENT_RECEIVED'::ce_ledger_entry_type,
        p_fund_type := v_fund,
        p_period := COALESCE(to_char(v_rec.period, 'YYYY-MM'), to_char(v_rec.payment_date, 'YYYY-MM')),
        p_amount := v_rec.amount,
        p_description := 'Payment sync from ' || v_rec.payment_source_table || ' #' || v_rec.source_payment_id::text,
        p_reference_type := 'payment_sync',
        p_idempotency_key := v_rec.sync_key,
        p_posted_by := p_triggered_by
      );

      INSERT INTO public.ce_payment_ledger_sync_log (
        source_table, source_payment_id, employer_id, receipt_no,
        payment_date, amount_snapshot, fund_code, payment_code,
        status_snapshot, sync_status, ledger_entry_ids,
        sync_run_id, synced_at, synced_by
      ) VALUES (
        v_rec.payment_source_table, v_rec.source_payment_id, v_rec.employer_id,
        v_rec.receipt_number, v_rec.payment_date, v_rec.amount,
        v_rec.fund_code, v_rec.payment_code, v_rec.receipt_status,
        'posted', jsonb_build_array(v_ledger_id),
        v_run_id, now(), p_triggered_by
      ) ON CONFLICT (source_table, source_payment_id, fund_code) DO UPDATE
        SET sync_status = 'posted',
            ledger_entry_ids = jsonb_build_array(v_ledger_id),
            synced_at = now(), synced_by = p_triggered_by, sync_run_id = v_run_id;

      v_posted := v_posted + 1;
      v_total_amount := v_total_amount + COALESCE(v_rec.amount, 0);

    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_object(
        'source_payment_id', v_rec.source_payment_id,
        'employer_id', v_rec.employer_id,
        'error', SQLERRM
      );
      INSERT INTO public.ce_payment_ledger_sync_log (
        source_table, source_payment_id, employer_id, receipt_no,
        payment_date, amount_snapshot, fund_code, payment_code,
        status_snapshot, sync_status, error_message,
        sync_run_id, synced_at, synced_by
      ) VALUES (
        v_rec.payment_source_table, v_rec.source_payment_id, v_rec.employer_id,
        v_rec.receipt_number, v_rec.payment_date, v_rec.amount,
        v_rec.fund_code, v_rec.payment_code, v_rec.receipt_status,
        'failed', SQLERRM, v_run_id, now(), p_triggered_by
      ) ON CONFLICT (source_table, source_payment_id, fund_code) DO UPDATE
        SET sync_status = 'failed', error_message = SQLERRM,
            synced_at = now(), sync_run_id = v_run_id;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'run_id', v_run_id, 'processed_count', v_processed,
    'posted_count', v_posted, 'skipped_count', v_skipped,
    'failed_count', v_failed, 'total_amount_processed', v_total_amount,
    'dry_run', p_dry_run, 'error_summary', v_errors
  );
END;
$$;

-- 6. RPC: ALLOCATE EMPLOYER PAYMENT
CREATE OR REPLACE FUNCTION public.ce_allocate_employer_payment(
  p_source_payment_id BIGINT,
  p_employer_id VARCHAR,
  p_allocation_mode TEXT DEFAULT 'oldest_due_first',
  p_triggered_by VARCHAR DEFAULT 'SYSTEM',
  p_effective_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sync RECORD;
  v_debit RECORD;
  v_remaining NUMERIC;
  v_alloc_amount NUMERIC;
  v_seq INT := 0;
  v_allocated_total NUMERIC := 0;
  v_alloc_count INT := 0;
  v_credit_entry_id UUID;
BEGIN
  SELECT * INTO v_sync FROM public.ce_payment_ledger_sync_log
  WHERE source_payment_id = p_source_payment_id AND employer_id = p_employer_id AND sync_status = 'posted'
  LIMIT 1;

  IF v_sync IS NULL THEN
    RETURN jsonb_build_object('error', 'No posted sync record found for this payment');
  END IF;

  SELECT id INTO v_credit_entry_id FROM public.ce_employer_financial_ledger
  WHERE idempotency_key = 'pay-cnpmt-' || p_source_payment_id::text AND entry_type = 'PAYMENT_RECEIVED'
  LIMIT 1;

  v_remaining := v_sync.amount_snapshot - COALESCE(
    (SELECT SUM(allocated_amount) FROM public.ce_payment_allocations
     WHERE source_payment_id = p_source_payment_id AND source_table = v_sync.source_table), 0
  );

  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('error', 'Payment already fully allocated', 'remaining', v_remaining);
  END IF;

  FOR v_debit IN
    SELECT efl.id, efl.period, efl.fund_type::text, efl.entry_type::text,
           (efl.debit_amount - efl.credit_amount) AS outstanding, efl.posted_at
    FROM public.ce_employer_financial_ledger efl
    WHERE efl.employer_id = p_employer_id
      AND efl.debit_amount > efl.credit_amount
      AND efl.status = 'POSTED'::ce_ledger_status
      AND efl.entry_type IN ('C3_DUES_POSTED','PENALTY_ASSESSED','INTEREST_ACCRUED')
    ORDER BY
      CASE p_allocation_mode
        WHEN 'dues_then_penalty' THEN
          CASE efl.entry_type WHEN 'C3_DUES_POSTED' THEN 1 WHEN 'PENALTY_ASSESSED' THEN 2 WHEN 'INTEREST_ACCRUED' THEN 3 ELSE 4 END
        ELSE 0
      END,
      efl.period ASC, efl.posted_at ASC
  LOOP
    EXIT WHEN v_remaining <= 0;
    v_alloc_amount := LEAST(v_remaining, v_debit.outstanding);
    v_seq := v_seq + 1;

    INSERT INTO public.ce_payment_allocations (
      source_payment_id, source_table, employer_id, ledger_credit_entry_id,
      target_ledger_debit_entry_id, target_type, target_period, fund_type,
      allocated_amount, allocation_sequence, allocation_mode, allocated_by
    ) VALUES (
      p_source_payment_id, v_sync.source_table, p_employer_id, v_credit_entry_id,
      v_debit.id,
      CASE v_debit.entry_type WHEN 'C3_DUES_POSTED' THEN 'dues' WHEN 'PENALTY_ASSESSED' THEN 'penalty' WHEN 'INTEREST_ACCRUED' THEN 'interest' ELSE 'other' END,
      v_debit.period, v_debit.fund_type, v_alloc_amount, v_seq, p_allocation_mode, p_triggered_by
    );

    v_remaining := v_remaining - v_alloc_amount;
    v_allocated_total := v_allocated_total + v_alloc_amount;
    v_alloc_count := v_alloc_count + 1;
  END LOOP;

  UPDATE public.ce_payment_ledger_sync_log
  SET allocation_status = CASE WHEN v_remaining <= 0 THEN 'fully_allocated' ELSE 'partial' END
  WHERE source_payment_id = p_source_payment_id AND source_table = v_sync.source_table AND employer_id = p_employer_id;

  RETURN jsonb_build_object(
    'allocated_count', v_alloc_count, 'allocated_total', v_allocated_total,
    'remaining_unallocated', v_remaining, 'allocation_mode', p_allocation_mode
  );
END;
$$;
