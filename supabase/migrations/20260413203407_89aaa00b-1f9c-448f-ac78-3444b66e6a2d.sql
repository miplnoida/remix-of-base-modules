
-- ============================================================
-- READ-ONLY COMPLIANCE SUMMARY
--
-- Display-only function consumed by Compliance screens and
-- optionally by payment screens as an informational banner.
-- Does NOT modify any data. Pure SELECT aggregation.
-- ============================================================

CREATE OR REPLACE FUNCTION public.ce_get_employer_compliance_summary(
  p_employer_id VARCHAR
)
RETURNS TABLE (
  has_active_arrangement    BOOLEAN,
  arrangement_status        VARCHAR,
  arrangement_number        VARCHAR,
  arrangement_id            UUID,
  total_debt                NUMERIC,
  total_paid                NUMERIC,
  next_due_date             DATE,
  overdue_installment_count INT,
  outstanding_installment_amount NUMERIC,
  breach_detected           BOOLEAN,
  unresolved_breach_count   INT,
  linked_open_case_count    INT,
  warning_message           TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_arr RECORD;
  v_overdue_count INT := 0;
  v_outstanding NUMERIC := 0;
  v_breach BOOLEAN := false;
  v_unresolved_breaches INT := 0;
  v_open_cases INT := 0;
  v_warning TEXT := NULL;
BEGIN
  -- Find the most relevant arrangement: ACTIVE first, then DEFAULTED
  SELECT * INTO v_arr
  FROM ce_payment_arrangements pa
  WHERE pa.employer_id = p_employer_id
    AND pa.status IN ('ACTIVE', 'DEFAULTED')
  ORDER BY
    CASE pa.status WHEN 'ACTIVE' THEN 0 WHEN 'DEFAULTED' THEN 1 ELSE 2 END,
    pa.start_date DESC
  LIMIT 1;

  -- If no active/defaulted arrangement, check for any arrangement at all
  IF v_arr IS NULL THEN
    SELECT * INTO v_arr
    FROM ce_payment_arrangements pa
    WHERE pa.employer_id = p_employer_id
    ORDER BY pa.created_at DESC
    LIMIT 1;
  END IF;

  -- Installment metrics (only if arrangement exists)
  IF v_arr IS NOT NULL THEN
    SELECT
      COUNT(*) FILTER (WHERE i.status IN ('OVERDUE') OR (i.status IN ('PENDING','PARTIAL') AND i.due_date < CURRENT_DATE)),
      COALESCE(SUM(i.amount - COALESCE(i.paid_amount, 0)) FILTER (WHERE i.status IN ('PENDING','PARTIAL','OVERDUE')), 0)
    INTO v_overdue_count, v_outstanding
    FROM ce_installments i
    WHERE i.arrangement_id = v_arr.id;

    v_breach := COALESCE(v_arr.breach_detected, false);

    -- Unresolved breaches
    SELECT COUNT(*) INTO v_unresolved_breaches
    FROM ce_arrangement_breaches ab
    WHERE ab.arrangement_id = v_arr.id
      AND (ab.resolution IS NULL OR ab.resolution = '');
  END IF;

  -- Open cases for this employer
  SELECT COUNT(*) INTO v_open_cases
  FROM ce_cases c
  WHERE c.employer_id = p_employer_id
    AND c.status IN ('OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED')
    AND COALESCE(c.is_deleted, false) = false;

  -- Derive warning message
  IF v_arr IS NOT NULL AND v_arr.status = 'DEFAULTED' THEN
    v_warning := 'Payment arrangement has been defaulted. Legal escalation may apply.';
  ELSIF v_breach THEN
    v_warning := format('Breach detected on arrangement %s. %s overdue installment(s).',
                        v_arr.arrangement_number, v_overdue_count);
  ELSIF v_overdue_count > 0 THEN
    v_warning := format('%s installment(s) overdue. Outstanding: $%s.',
                        v_overdue_count, TRIM(to_char(v_outstanding, '999,999,990.00')));
  ELSIF v_open_cases > 0 AND v_arr IS NULL THEN
    v_warning := format('%s open compliance case(s) with no active payment arrangement.', v_open_cases);
  END IF;

  RETURN QUERY SELECT
    (v_arr IS NOT NULL AND v_arr.status = 'ACTIVE')::BOOLEAN,
    v_arr.status,
    v_arr.arrangement_number,
    v_arr.id,
    v_arr.total_debt,
    COALESCE(v_arr.total_paid, 0::NUMERIC),
    v_arr.next_due_date,
    v_overdue_count,
    v_outstanding,
    v_breach,
    v_unresolved_breaches,
    v_open_cases,
    v_warning;
END;
$$;
