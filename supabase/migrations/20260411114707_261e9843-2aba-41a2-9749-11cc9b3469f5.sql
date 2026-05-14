
-- =====================================================
-- PHASE 2: COMPLIANCE FINANCIAL OPERATION RPCs
-- =====================================================

-- 2A. ce_post_ledger_entry — Idempotent ledger posting
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.ce_post_ledger_entry(
  p_employer_id VARCHAR,
  p_employer_name VARCHAR DEFAULT NULL,
  p_territory VARCHAR DEFAULT NULL,
  p_entry_type ce_ledger_entry_type DEFAULT 'C3_DUES_POSTED',
  p_fund_type ce_fund_type DEFAULT 'SS',
  p_period VARCHAR DEFAULT NULL,
  p_amount NUMERIC DEFAULT 0,
  p_description TEXT DEFAULT '',
  p_reference_type VARCHAR DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_idempotency_key VARCHAR DEFAULT NULL,
  p_posted_by VARCHAR DEFAULT 'SYSTEM'
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_new_id UUID;
  v_debit NUMERIC := 0;
  v_credit NUMERIC := 0;
  v_running_balance NUMERIC := 0;
  v_idem_key VARCHAR;
BEGIN
  -- Generate idempotency key if not provided
  v_idem_key := COALESCE(p_idempotency_key, gen_random_uuid()::VARCHAR);

  -- Check idempotency: return existing if duplicate
  SELECT id INTO v_existing_id
  FROM ce_employer_financial_ledger
  WHERE idempotency_key = v_idem_key;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  -- Determine debit/credit based on entry type
  -- Debits increase balance owed (dues, penalties, interest)
  -- Credits decrease balance owed (payments, waivers, write-offs)
  IF p_entry_type IN ('C3_DUES_POSTED', 'PENALTY_ASSESSED', 'INTEREST_ACCRUED', 'OPENING_BALANCE', 'TRANSFER_IN') THEN
    v_debit := ABS(p_amount);
    v_credit := 0;
  ELSIF p_entry_type IN ('PAYMENT_RECEIVED', 'WAIVER_APPLIED', 'WRITE_OFF', 'ARRANGEMENT_CREDIT', 'REFUND') THEN
    v_debit := 0;
    v_credit := ABS(p_amount);
  ELSIF p_entry_type = 'ADJUSTMENT' THEN
    IF p_amount >= 0 THEN
      v_debit := ABS(p_amount);
    ELSE
      v_credit := ABS(p_amount);
    END IF;
  ELSIF p_entry_type = 'REVERSAL' THEN
    -- Reversals handled by ce_reverse_ledger_entry
    IF p_amount >= 0 THEN
      v_credit := ABS(p_amount);
    ELSE
      v_debit := ABS(p_amount);
    END IF;
  END IF;

  -- Calculate running balance (latest balance for this employer + fund)
  SELECT COALESCE(SUM(debit_amount) - SUM(credit_amount), 0) INTO v_running_balance
  FROM ce_employer_financial_ledger
  WHERE employer_id = p_employer_id
    AND fund_type = p_fund_type
    AND status = 'POSTED';

  v_running_balance := v_running_balance + v_debit - v_credit;

  -- Insert ledger entry
  INSERT INTO ce_employer_financial_ledger (
    employer_id, employer_name, territory, entry_type, fund_type, period,
    debit_amount, credit_amount, running_balance, status,
    idempotency_key, reference_type, reference_id, description, posted_by
  ) VALUES (
    p_employer_id, p_employer_name, p_territory, p_entry_type, p_fund_type, COALESCE(p_period, to_char(now(), 'YYYYMM')),
    v_debit, v_credit, v_running_balance, 'POSTED',
    v_idem_key, p_reference_type, p_reference_id, p_description, p_posted_by
  )
  RETURNING id INTO v_new_id;

  -- Upsert period summary
  INSERT INTO ce_ledger_periods (employer_id, period, fund_type)
  VALUES (p_employer_id, COALESCE(p_period, to_char(now(), 'YYYYMM')), p_fund_type)
  ON CONFLICT (employer_id, period, fund_type) DO NOTHING;

  -- Update period summary buckets
  UPDATE ce_ledger_periods
  SET
    principal_due = principal_due + CASE WHEN p_entry_type IN ('C3_DUES_POSTED', 'OPENING_BALANCE', 'TRANSFER_IN') THEN v_debit ELSE 0 END,
    penalties = penalties + CASE WHEN p_entry_type = 'PENALTY_ASSESSED' THEN v_debit ELSE 0 END,
    interest = interest + CASE WHEN p_entry_type = 'INTEREST_ACCRUED' THEN v_debit ELSE 0 END,
    payments = payments + CASE WHEN p_entry_type IN ('PAYMENT_RECEIVED', 'ARRANGEMENT_CREDIT') THEN v_credit ELSE 0 END,
    waivers = waivers + CASE WHEN p_entry_type = 'WAIVER_APPLIED' THEN v_credit ELSE 0 END,
    adjustments = adjustments + CASE WHEN p_entry_type = 'ADJUSTMENT' THEN (v_debit - v_credit) ELSE 0 END,
    write_offs = write_offs + CASE WHEN p_entry_type = 'WRITE_OFF' THEN v_credit ELSE 0 END,
    balance = principal_due + penalties + interest - payments - waivers + adjustments - write_offs
      + CASE WHEN p_entry_type IN ('C3_DUES_POSTED', 'OPENING_BALANCE', 'TRANSFER_IN') THEN v_debit ELSE 0 END
      + CASE WHEN p_entry_type = 'PENALTY_ASSESSED' THEN v_debit ELSE 0 END
      + CASE WHEN p_entry_type = 'INTEREST_ACCRUED' THEN v_debit ELSE 0 END
      - CASE WHEN p_entry_type IN ('PAYMENT_RECEIVED', 'ARRANGEMENT_CREDIT') THEN v_credit ELSE 0 END
      - CASE WHEN p_entry_type = 'WAIVER_APPLIED' THEN v_credit ELSE 0 END
      + CASE WHEN p_entry_type = 'ADJUSTMENT' THEN (v_debit - v_credit) ELSE 0 END
      - CASE WHEN p_entry_type = 'WRITE_OFF' THEN v_credit ELSE 0 END
      - (principal_due + penalties + interest - payments - waivers + adjustments - write_offs),
    entry_count = entry_count + 1,
    last_recalculated_at = now(),
    last_recalculated_by = p_posted_by
  WHERE employer_id = p_employer_id
    AND period = COALESCE(p_period, to_char(now(), 'YYYYMM'))
    AND fund_type = p_fund_type;

  RETURN v_new_id;
END;
$$;


-- 2B. ce_reverse_ledger_entry — Reversal with audit trail
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.ce_reverse_ledger_entry(
  p_original_entry_id UUID,
  p_reversal_reason TEXT,
  p_reversed_by VARCHAR DEFAULT 'SYSTEM'
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_original RECORD;
  v_reversal_id UUID;
  v_new_running_balance NUMERIC;
BEGIN
  -- Get and validate original entry
  SELECT * INTO v_original
  FROM ce_employer_financial_ledger
  WHERE id = p_original_entry_id AND status = 'POSTED';

  IF v_original IS NULL THEN
    RAISE EXCEPTION 'Entry % not found or already reversed', p_original_entry_id;
  END IF;

  -- Calculate new running balance
  SELECT COALESCE(SUM(debit_amount) - SUM(credit_amount), 0) INTO v_new_running_balance
  FROM ce_employer_financial_ledger
  WHERE employer_id = v_original.employer_id
    AND fund_type = v_original.fund_type
    AND status = 'POSTED';

  v_new_running_balance := v_new_running_balance - v_original.debit_amount + v_original.credit_amount;

  -- Create reversal entry (mirror amounts)
  INSERT INTO ce_employer_financial_ledger (
    employer_id, employer_name, territory, entry_type, fund_type, period,
    debit_amount, credit_amount, running_balance, status,
    idempotency_key, reference_type, reference_id, 
    reversal_of_id, reversal_reason, description, posted_by
  ) VALUES (
    v_original.employer_id, v_original.employer_name, v_original.territory,
    'REVERSAL', v_original.fund_type, v_original.period,
    v_original.credit_amount, v_original.debit_amount, -- MIRROR
    v_new_running_balance, 'POSTED',
    'REV-' || p_original_entry_id::VARCHAR, v_original.reference_type, v_original.reference_id,
    p_original_entry_id, p_reversal_reason,
    'Reversal of: ' || v_original.description, p_reversed_by
  )
  RETURNING id INTO v_reversal_id;

  -- Mark original as REVERSED
  UPDATE ce_employer_financial_ledger
  SET status = 'REVERSED'
  WHERE id = p_original_entry_id;

  -- Update period summary: subtract the original amounts
  UPDATE ce_ledger_periods
  SET
    principal_due = principal_due - CASE WHEN v_original.entry_type::TEXT IN ('C3_DUES_POSTED', 'OPENING_BALANCE', 'TRANSFER_IN') THEN v_original.debit_amount ELSE 0 END,
    penalties = penalties - CASE WHEN v_original.entry_type::TEXT = 'PENALTY_ASSESSED' THEN v_original.debit_amount ELSE 0 END,
    interest = interest - CASE WHEN v_original.entry_type::TEXT = 'INTEREST_ACCRUED' THEN v_original.debit_amount ELSE 0 END,
    payments = payments - CASE WHEN v_original.entry_type::TEXT IN ('PAYMENT_RECEIVED', 'ARRANGEMENT_CREDIT') THEN v_original.credit_amount ELSE 0 END,
    waivers = waivers - CASE WHEN v_original.entry_type::TEXT = 'WAIVER_APPLIED' THEN v_original.credit_amount ELSE 0 END,
    adjustments = adjustments - CASE WHEN v_original.entry_type::TEXT = 'ADJUSTMENT' THEN (v_original.debit_amount - v_original.credit_amount) ELSE 0 END,
    write_offs = write_offs - CASE WHEN v_original.entry_type::TEXT = 'WRITE_OFF' THEN v_original.credit_amount ELSE 0 END,
    entry_count = entry_count + 1,
    last_recalculated_at = now(),
    last_recalculated_by = p_reversed_by
  WHERE employer_id = v_original.employer_id
    AND period = v_original.period
    AND fund_type = v_original.fund_type;

  -- Recalculate balance on period
  UPDATE ce_ledger_periods
  SET balance = principal_due + penalties + interest - payments - waivers + adjustments - write_offs
  WHERE employer_id = v_original.employer_id
    AND period = v_original.period
    AND fund_type = v_original.fund_type;

  -- Log to audit
  INSERT INTO ce_audit_log (entity_type, entity_id, action, description, old_values, new_values, performed_by)
  VALUES (
    'ledger_entry', p_original_entry_id, 'REVERSAL',
    'Reversed ledger entry: ' || v_original.description,
    jsonb_build_object('status', 'POSTED', 'debit', v_original.debit_amount, 'credit', v_original.credit_amount),
    jsonb_build_object('status', 'REVERSED', 'reversal_id', v_reversal_id, 'reason', p_reversal_reason),
    p_reversed_by
  );

  RETURN v_reversal_id;
END;
$$;


-- 2C. ce_calculate_employer_arrears — On-demand arrears calculation
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.ce_calculate_employer_arrears(
  p_employer_id VARCHAR
)
RETURNS TABLE(
  fund_type ce_fund_type,
  principal_due NUMERIC,
  penalties NUMERIC,
  interest NUMERIC,
  payments NUMERIC,
  waivers NUMERIC,
  adjustments NUMERIC,
  write_offs NUMERIC,
  net_balance NUMERIC,
  period_count BIGINT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lp.fund_type,
    COALESCE(SUM(lp.principal_due), 0) AS principal_due,
    COALESCE(SUM(lp.penalties), 0) AS penalties,
    COALESCE(SUM(lp.interest), 0) AS interest,
    COALESCE(SUM(lp.payments), 0) AS payments,
    COALESCE(SUM(lp.waivers), 0) AS waivers,
    COALESCE(SUM(lp.adjustments), 0) AS adjustments,
    COALESCE(SUM(lp.write_offs), 0) AS write_offs,
    COALESCE(SUM(lp.balance), 0) AS net_balance,
    COUNT(*) AS period_count
  FROM ce_ledger_periods lp
  WHERE lp.employer_id = p_employer_id
  GROUP BY lp.fund_type;
END;
$$;


-- 2D. ce_generate_employer_statement — Statement generation
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.ce_generate_employer_statement(
  p_employer_id VARCHAR,
  p_from_period VARCHAR DEFAULT NULL,
  p_to_period VARCHAR DEFAULT NULL,
  p_fund_type ce_fund_type DEFAULT NULL
)
RETURNS TABLE(
  entry_id UUID,
  posted_at TIMESTAMPTZ,
  period VARCHAR,
  fund_type ce_fund_type,
  entry_type ce_ledger_entry_type,
  description TEXT,
  debit_amount NUMERIC,
  credit_amount NUMERIC,
  running_balance NUMERIC,
  status ce_ledger_status,
  reference_type VARCHAR,
  reference_id UUID,
  reversal_of_id UUID,
  reversal_reason TEXT,
  posted_by VARCHAR
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id AS entry_id,
    l.posted_at,
    l.period,
    l.fund_type,
    l.entry_type,
    l.description,
    l.debit_amount,
    l.credit_amount,
    l.running_balance,
    l.status,
    l.reference_type,
    l.reference_id,
    l.reversal_of_id,
    l.reversal_reason,
    l.posted_by
  FROM ce_employer_financial_ledger l
  WHERE l.employer_id = p_employer_id
    AND (p_from_period IS NULL OR l.period >= p_from_period)
    AND (p_to_period IS NULL OR l.period <= p_to_period)
    AND (p_fund_type IS NULL OR l.fund_type = p_fund_type)
  ORDER BY l.posted_at ASC;
END;
$$;


-- 2E. ce_breach_check_arrangements — Arrangement breach detection
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.ce_breach_check_arrangements(
  p_as_of_date DATE DEFAULT CURRENT_DATE,
  p_checked_by VARCHAR DEFAULT 'SYSTEM'
)
RETURNS TABLE(
  arrangement_id UUID,
  arrangement_number VARCHAR,
  employer_id VARCHAR,
  missed_count BIGINT,
  total_overdue NUMERIC
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH overdue_installments AS (
    SELECT 
      i.arrangement_id,
      COUNT(*) AS missed_count,
      SUM(i.amount_due - COALESCE(i.amount_paid, 0)) AS total_overdue
    FROM ce_installments i
    JOIN ce_payment_arrangements pa ON i.arrangement_id = pa.id
    WHERE pa.status = 'Active'
      AND i.status IN ('Pending', 'Overdue')
      AND i.due_date < p_as_of_date
    GROUP BY i.arrangement_id
    HAVING COUNT(*) >= 1
  )
  SELECT 
    oi.arrangement_id,
    pa.arrangement_number,
    pa.employer_id,
    oi.missed_count,
    oi.total_overdue
  FROM overdue_installments oi
  JOIN ce_payment_arrangements pa ON oi.arrangement_id = pa.id
  -- Only flag if not already breached
  WHERE NOT EXISTS (
    SELECT 1 FROM ce_arrangement_breaches ab
    WHERE ab.arrangement_id = oi.arrangement_id
      AND ab.resolution IS NULL
  );

  -- Insert breach records for newly detected breaches
  INSERT INTO ce_arrangement_breaches (arrangement_id, breach_type, description, detected_at, detected_by, created_by)
  SELECT 
    oi.arrangement_id,
    CASE WHEN oi.missed_count >= 3 THEN 'Critical' WHEN oi.missed_count >= 2 THEN 'Major' ELSE 'Minor' END,
    oi.missed_count || ' overdue installment(s) totaling ' || oi.total_overdue,
    now(),
    p_checked_by,
    p_checked_by
  FROM (
    SELECT 
      i.arrangement_id,
      COUNT(*) AS missed_count,
      SUM(i.amount_due - COALESCE(i.amount_paid, 0)) AS total_overdue
    FROM ce_installments i
    JOIN ce_payment_arrangements pa ON i.arrangement_id = pa.id
    WHERE pa.status = 'Active'
      AND i.status IN ('Pending', 'Overdue')
      AND i.due_date < p_as_of_date
    GROUP BY i.arrangement_id
    HAVING COUNT(*) >= 1
  ) oi
  WHERE NOT EXISTS (
    SELECT 1 FROM ce_arrangement_breaches ab
    WHERE ab.arrangement_id = oi.arrangement_id
      AND ab.resolution IS NULL
  );
END;
$$;
