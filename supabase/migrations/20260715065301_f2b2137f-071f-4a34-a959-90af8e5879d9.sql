
-- Fix G5: view + RPC use canonical C3 status 'VAC' (with 'Posted' kept for back-compat).

CREATE OR REPLACE VIEW public.ce_v_c3_unposted_to_ledger AS
SELECT
  c3.id AS c3_id,
  c3.payer_id,
  c3.payer_type,
  c3.period,
  c3.sequence_no,
  c3.posting_status,
  c3.entered_by,
  c3.date_posted,
  COALESCE(c3.payer_name, em.name) AS employer_name,
  COALESCE(c3.emp_ss_amt_calc, 0) AS ss_dues,
  COALESCE(c3.emp_levy_amt_calc, 0) AS levy_dues,
  COALESCE(c3.emp_pe_amt_calc, 0) AS ei_dues,
  COALESCE(c3.emp_ss_fines_due, 0) AS ss_penalty,
  COALESCE(c3.emp_levy_penalty_amt, 0) AS levy_penalty,
  COALESCE(c3.emp_pe_penalty_amt, 0) AS pe_penalty,
  COALESCE(c3.emp_ss_amt_calc, 0) + COALESCE(c3.emp_levy_amt_calc, 0) + COALESCE(c3.emp_pe_amt_calc, 0)
    + COALESCE(c3.emp_ss_fines_due, 0) + COALESCE(c3.emp_levy_penalty_amt, 0) + COALESCE(c3.emp_pe_penalty_amt, 0) AS total_amount
FROM public.cn_c3_reported c3
LEFT JOIN public.er_master em ON em.regno = c3.payer_id
WHERE c3.posting_status IN ('VAC', 'Posted')
  AND NOT EXISTS (
    SELECT 1 FROM public.ce_c3_ledger_sync_log sl
    WHERE sl.payer_id = c3.payer_id
      AND sl.period = c3.period
      AND sl.sequence_no = c3.sequence_no
      AND sl.posting_status_snapshot IN ('VAC', 'Posted')
      AND sl.sync_status = 'success'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.ce_employer_financial_ledger l
    WHERE l.idempotency_key = 'c3-ss-' || c3.payer_id || '-' || c3.period::text || '-' || c3.sequence_no::text
  );

ALTER VIEW public.ce_v_c3_unposted_to_ledger SET (security_invoker = true);

-- Recreate the RPC using the row's actual posting_status for the snapshot.
CREATE OR REPLACE FUNCTION public.ce_sync_c3_to_ledger(
  p_employer_id VARCHAR DEFAULT NULL,
  p_period DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 500,
  p_dry_run BOOLEAN DEFAULT FALSE,
  p_triggered_by VARCHAR DEFAULT 'SYSTEM'
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_run_id UUID := gen_random_uuid();
  v_rec RECORD;
  v_processed INTEGER := 0;
  v_posted INTEGER := 0;
  v_skipped INTEGER := 0;
  v_failed INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_entry_id UUID;
  v_entry_ids UUID[];
  v_idem_key VARCHAR;
  v_amount NUMERIC;
  v_fund ce_fund_type;
  v_entry_type ce_ledger_entry_type;
  v_desc TEXT;
  v_component RECORD;
  v_snapshot VARCHAR;
BEGIN
  FOR v_rec IN
    SELECT * FROM ce_v_c3_unposted_to_ledger v
    WHERE (p_employer_id IS NULL OR v.payer_id = p_employer_id)
      AND (p_period IS NULL OR v.period = p_period)
    ORDER BY v.period, v.payer_id
    LIMIT p_limit
  LOOP
    v_processed := v_processed + 1;
    v_entry_ids := '{}';
    v_snapshot := COALESCE(v_rec.posting_status, 'VAC');

    BEGIN
      FOR v_component IN
        SELECT * FROM (VALUES
          ('SS',   'C3_DUES_POSTED',   v_rec.ss_dues,      'c3-ss-'),
          ('LEVY', 'C3_DUES_POSTED',   v_rec.levy_dues,    'c3-levy-'),
          ('EI',   'C3_DUES_POSTED',   v_rec.ei_dues,      'c3-ei-'),
          ('SS',   'PENALTY_ASSESSED', v_rec.ss_penalty,   'c3-fine-ss-'),
          ('LEVY', 'PENALTY_ASSESSED', v_rec.levy_penalty, 'c3-fine-levy-'),
          ('EI',   'PENALTY_ASSESSED', v_rec.pe_penalty,   'c3-fine-pe-')
        ) AS t(fund, entry_type, amount, key_prefix)
      LOOP
        v_amount := v_component.amount;
        IF v_amount IS NULL OR v_amount <= 0 THEN
          CONTINUE;
        END IF;

        v_idem_key := v_component.key_prefix || v_rec.payer_id || '-' || v_rec.period::text || '-' || v_rec.sequence_no::text;
        v_fund := v_component.fund::ce_fund_type;
        v_entry_type := v_component.entry_type::ce_ledger_entry_type;
        v_desc := v_component.entry_type || ' from C3 ' || v_rec.period::text || ' seq ' || v_rec.sequence_no;

        IF p_dry_run THEN
          v_posted := v_posted + 1;
          CONTINUE;
        END IF;

        SELECT id INTO v_entry_id
        FROM ce_employer_financial_ledger
        WHERE idempotency_key = v_idem_key;

        IF v_entry_id IS NOT NULL THEN
          v_skipped := v_skipped + 1;
          v_entry_ids := array_append(v_entry_ids, v_entry_id);
          CONTINUE;
        END IF;

        v_entry_id := ce_post_ledger_entry(
          p_employer_id := v_rec.payer_id,
          p_employer_name := v_rec.employer_name,
          p_entry_type := v_entry_type,
          p_fund_type := v_fund,
          p_period := v_rec.period::text,
          p_amount := v_amount,
          p_description := v_desc,
          p_reference_type := 'C3_SUBMISSION',
          p_idempotency_key := v_idem_key,
          p_posted_by := p_triggered_by
        );

        v_entry_ids := array_append(v_entry_ids, v_entry_id);
        v_posted := v_posted + 1;
      END LOOP;

      IF NOT p_dry_run THEN
        INSERT INTO ce_c3_ledger_sync_log (
          payer_id, period, sequence_no, posting_status_snapshot,
          sync_status, ledger_entry_ids, sync_run_id, synced_by
        ) VALUES (
          v_rec.payer_id, v_rec.period, v_rec.sequence_no, v_snapshot,
          'success', v_entry_ids, v_run_id, p_triggered_by
        )
        ON CONFLICT ON CONSTRAINT uq_ce_c3_sync_source DO UPDATE
          SET sync_status = 'success',
              ledger_entry_ids = EXCLUDED.ledger_entry_ids,
              sync_run_id = EXCLUDED.sync_run_id,
              synced_at = now(),
              synced_by = EXCLUDED.synced_by,
              error_message = NULL,
              posting_status_snapshot = EXCLUDED.posting_status_snapshot;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_object(
        'payer_id', v_rec.payer_id,
        'period', v_rec.period::text,
        'sequence_no', v_rec.sequence_no,
        'error', SQLERRM
      );

      IF NOT p_dry_run THEN
        INSERT INTO ce_c3_ledger_sync_log (
          payer_id, period, sequence_no, posting_status_snapshot,
          sync_status, sync_run_id, synced_by, error_message
        ) VALUES (
          v_rec.payer_id, v_rec.period, v_rec.sequence_no, v_snapshot,
          'failed', v_run_id, p_triggered_by, SQLERRM
        )
        ON CONFLICT ON CONSTRAINT uq_ce_c3_sync_source DO UPDATE
          SET sync_status = 'failed',
              sync_run_id = EXCLUDED.sync_run_id,
              synced_at = now(),
              error_message = EXCLUDED.error_message,
              posting_status_snapshot = EXCLUDED.posting_status_snapshot;
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'dry_run', p_dry_run,
    'processed_count', v_processed,
    'posted_count', v_posted,
    'skipped_count', v_skipped,
    'failed_count', v_failed,
    'errors', v_errors
  );
END;
$$;
