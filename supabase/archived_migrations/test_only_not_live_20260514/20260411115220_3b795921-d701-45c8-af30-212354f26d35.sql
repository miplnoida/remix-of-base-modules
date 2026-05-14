
-- =====================================================
-- PHASE 5: CROSS-MODULE INTEGRATION TRIGGERS
-- =====================================================

-- 5A. C3 Submission → Ledger Auto-Posting
-- When C3 submission status changes to 'Posted', post dues to ledger
CREATE OR REPLACE FUNCTION public.ce_trigger_c3_to_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_employer_name VARCHAR;
BEGIN
  -- Only fire when posting_status changes to 'Posted'
  IF NEW.posting_status = 'Posted' AND (OLD.posting_status IS NULL OR OLD.posting_status != 'Posted') THEN
    -- Get employer name
    SELECT name INTO v_employer_name FROM er_master WHERE regno = NEW.payer_id LIMIT 1;

    -- Post SS contribution dues
    IF COALESCE(NEW.emp_ss_amt_calc, 0) > 0 THEN
      PERFORM ce_post_ledger_entry(
        p_employer_id := NEW.payer_id,
        p_employer_name := v_employer_name,
        p_entry_type := 'C3_DUES_POSTED'::ce_ledger_entry_type,
        p_fund_type := 'SS'::ce_fund_type,
        p_period := NEW.period,
        p_amount := NEW.emp_ss_amt_calc,
        p_description := 'C3 Social Security dues for period ' || NEW.period,
        p_reference_type := 'c3_submission',
        p_idempotency_key := 'c3-ss-' || NEW.payer_id || '-' || NEW.period || '-' || NEW.sequence_no::TEXT,
        p_posted_by := COALESCE(NEW.entered_by, 'SYSTEM')
      );
    END IF;

    -- Post Levy dues
    IF COALESCE(NEW.emp_levy_amt_calc, 0) > 0 THEN
      PERFORM ce_post_ledger_entry(
        p_employer_id := NEW.payer_id,
        p_employer_name := v_employer_name,
        p_entry_type := 'C3_DUES_POSTED'::ce_ledger_entry_type,
        p_fund_type := 'LEVY'::ce_fund_type,
        p_period := NEW.period,
        p_amount := NEW.emp_levy_amt_calc,
        p_description := 'C3 Levy dues for period ' || NEW.period,
        p_reference_type := 'c3_submission',
        p_idempotency_key := 'c3-levy-' || NEW.payer_id || '-' || NEW.period || '-' || NEW.sequence_no::TEXT,
        p_posted_by := COALESCE(NEW.entered_by, 'SYSTEM')
      );
    END IF;

    -- Post EI/PE dues
    IF COALESCE(NEW.emp_pe_amt_calc, 0) > 0 THEN
      PERFORM ce_post_ledger_entry(
        p_employer_id := NEW.payer_id,
        p_employer_name := v_employer_name,
        p_entry_type := 'C3_DUES_POSTED'::ce_ledger_entry_type,
        p_fund_type := 'EI'::ce_fund_type,
        p_period := NEW.period,
        p_amount := NEW.emp_pe_amt_calc,
        p_description := 'C3 Employment Injury dues for period ' || NEW.period,
        p_reference_type := 'c3_submission',
        p_idempotency_key := 'c3-ei-' || NEW.payer_id || '-' || NEW.period || '-' || NEW.sequence_no::TEXT,
        p_posted_by := COALESCE(NEW.entered_by, 'SYSTEM')
      );
    END IF;

    -- Post SS fines if any
    IF COALESCE(NEW.emp_ss_fines_due, 0) > 0 THEN
      PERFORM ce_post_ledger_entry(
        p_employer_id := NEW.payer_id,
        p_employer_name := v_employer_name,
        p_entry_type := 'PENALTY_ASSESSED'::ce_ledger_entry_type,
        p_fund_type := 'SS'::ce_fund_type,
        p_period := NEW.period,
        p_amount := NEW.emp_ss_fines_due,
        p_description := 'C3 Late filing fine for period ' || NEW.period,
        p_reference_type := 'c3_submission',
        p_idempotency_key := 'c3-fine-ss-' || NEW.payer_id || '-' || NEW.period || '-' || NEW.sequence_no::TEXT,
        p_posted_by := COALESCE(NEW.entered_by, 'SYSTEM')
      );
    END IF;

    -- Post Levy penalty if any
    IF COALESCE(NEW.emp_levy_penalty_amt, 0) > 0 THEN
      PERFORM ce_post_ledger_entry(
        p_employer_id := NEW.payer_id,
        p_employer_name := v_employer_name,
        p_entry_type := 'PENALTY_ASSESSED'::ce_ledger_entry_type,
        p_fund_type := 'LEVY'::ce_fund_type,
        p_period := NEW.period,
        p_amount := NEW.emp_levy_penalty_amt,
        p_description := 'C3 Levy penalty for period ' || NEW.period,
        p_reference_type := 'c3_submission',
        p_idempotency_key := 'c3-fine-levy-' || NEW.payer_id || '-' || NEW.period || '-' || NEW.sequence_no::TEXT,
        p_posted_by := COALESCE(NEW.entered_by, 'SYSTEM')
      );
    END IF;

    -- Post PE penalty if any
    IF COALESCE(NEW.emp_pe_penalty_amt, 0) > 0 THEN
      PERFORM ce_post_ledger_entry(
        p_employer_id := NEW.payer_id,
        p_employer_name := v_employer_name,
        p_entry_type := 'PENALTY_ASSESSED'::ce_ledger_entry_type,
        p_fund_type := 'EI'::ce_fund_type,
        p_period := NEW.period,
        p_amount := NEW.emp_pe_penalty_amt,
        p_description := 'C3 PE penalty for period ' || NEW.period,
        p_reference_type := 'c3_submission',
        p_idempotency_key := 'c3-fine-pe-' || NEW.payer_id || '-' || NEW.period || '-' || NEW.sequence_no::TEXT,
        p_posted_by := COALESCE(NEW.entered_by, 'SYSTEM')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to cn_c3_reported (the C3 submissions table)
DROP TRIGGER IF EXISTS trg_ce_c3_to_ledger ON public.cn_c3_reported;
CREATE TRIGGER trg_ce_c3_to_ledger
  AFTER INSERT OR UPDATE OF posting_status ON public.cn_c3_reported
  FOR EACH ROW
  EXECUTE FUNCTION public.ce_trigger_c3_to_ledger();


-- 5B. Violation → Auto-Case Linking
-- When a new violation is created, link to existing open case or create one
CREATE OR REPLACE FUNCTION public.ce_trigger_violation_to_case()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_case_id UUID;
  v_case_number VARCHAR;
  v_next_seq INT;
BEGIN
  -- Only on INSERT
  IF TG_OP = 'INSERT' THEN
    -- Find existing open case for this employer
    SELECT id INTO v_case_id
    FROM ce_cases
    WHERE employer_id = NEW.employer_id
      AND status IN ('OPEN', 'UNDER_REVIEW', 'NOTICE_ISSUED', 'AWAITING_RESPONSE')
      AND (is_deleted = false OR is_deleted IS NULL)
    ORDER BY opened_date DESC
    LIMIT 1;

    -- Link violation to case
    IF v_case_id IS NOT NULL THEN
      INSERT INTO ce_case_violations (case_id, violation_id, linked_by)
      VALUES (v_case_id, NEW.id, COALESCE(NEW.created_by, 'SYSTEM'))
      ON CONFLICT (case_id, violation_id) DO NOTHING;

      -- Update case totals
      UPDATE ce_cases
      SET updated_at = now(),
          updated_by = COALESCE(NEW.created_by, 'SYSTEM')
      WHERE id = v_case_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ce_violation_to_case ON public.ce_violations;
CREATE TRIGGER trg_ce_violation_to_case
  AFTER INSERT ON public.ce_violations
  FOR EACH ROW
  EXECUTE FUNCTION public.ce_trigger_violation_to_case();
