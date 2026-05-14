
-- Job run history table
CREATE TABLE public.ce_automation_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.ce_automation_jobs(id) ON DELETE CASCADE,
  run_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_dry_run BOOLEAN NOT NULL DEFAULT false,
  triggered_by VARCHAR(100),
  records_processed INT DEFAULT 0,
  records_affected INT DEFAULT 0,
  errors_count INT DEFAULT 0,
  error_details JSONB,
  summary JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ce_job_runs_job_id ON public.ce_automation_job_runs(job_id);
CREATE INDEX idx_ce_job_runs_status ON public.ce_automation_job_runs(run_status);
CREATE INDEX idx_ce_job_runs_started ON public.ce_automation_job_runs(started_at DESC);

-- Seed 8 employer compliance jobs
INSERT INTO public.ce_automation_jobs (job_code, name, description, job_type, schedule_cron, frequency, is_enabled, parameters)
VALUES
  ('EMP-COMPLIANCE-REFRESH', 'Employer Compliance Status Refresh',
   'Reads employer master and contribution data to recompute overall compliance status, filing status, payment status, and arrears amounts. Writes only to ce_employer_compliance_status.',
   'employer_compliance', '0 2 * * *', 'Daily', true, '{"batch_size": 500}'::jsonb),
  ('EMP-RISK-REFRESH', 'Employer Risk Score Refresh',
   'Recomputes employer risk scores based on arrears, violations, filing gaps, behavior trends, and legal history. Writes only to ce_employer_risk_profile.',
   'employer_compliance', '0 3 * * *', 'Daily', true, '{"batch_size": 500}'::jsonb),
  ('EMP-FLAG-GEN', 'Employer Compliance Flag Generation',
   'Evaluates employer profiles against flag rules and generates active compliance flags. Writes only to ce_employer_compliance_flags.',
   'employer_compliance', '0 4 * * *', 'Daily', true, '{}'::jsonb),
  ('EMP-SNAPSHOT-GEN', 'Employer Snapshot Generation',
   'Creates point-in-time snapshots of employer profiles for cases/violations opened in the last cycle. Writes only to ce_employer_snapshots.',
   'employer_compliance', '30 4 * * *', 'Daily', true, '{"lookback_hours": 24}'::jsonb),
  ('EMP-STALE-REVIEW', 'Stale Employer Review Queue',
   'Identifies employers with no filing activity beyond expected thresholds and queues them for compliance review.',
   'employer_compliance', '0 5 * * 1', 'Weekly', true, '{"stale_months": 6}'::jsonb),
  ('EMP-GROUP-ROLLUP', 'Group/Hierarchy Rollup Refresh',
   'Aggregates compliance metrics (arrears, risk, violations) at the employer group level for consolidated reporting.',
   'employer_compliance', '0 6 * * *', 'Daily', true, '{}'::jsonb),
  ('EMP-NOTICE-VALIDATE', 'Notice Recipient Validation',
   'Validates that all active employer notice recipients have valid contact details and flags invalid entries.',
   'employer_compliance', '0 7 * * 1', 'Weekly', true, '{}'::jsonb),
  ('EMP-RECON-EXCEPTION', 'Employer Reconciliation Exception Detection',
   'Detects discrepancies between source contribution data and compliance ledger postings, flagging reconciliation exceptions.',
   'employer_compliance', '0 8 * * *', 'Daily', true, '{"tolerance_amount": 0.01}'::jsonb)
ON CONFLICT (job_code) DO NOTHING;

-- RPC: Employer Compliance Status Refresh
CREATE OR REPLACE FUNCTION public.ce_run_employer_compliance_refresh(
  p_dry_run BOOLEAN DEFAULT false,
  p_batch_size INT DEFAULT 500
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INT := 0;
  v_affected INT := 0;
  v_errors INT := 0;
  v_employer RECORD;
  v_last_c3 RECORD;
  v_filing_status VARCHAR(30);
  v_payment_status VARCHAR(30);
  v_overall_status VARCHAR(30);
  v_arrears NUMERIC;
BEGIN
  FOR v_employer IN
    SELECT em.regno AS employer_id, em.name, em.status
    FROM er_master em
    WHERE em.status IS NOT NULL
    LIMIT p_batch_size
  LOOP
    v_processed := v_processed + 1;
    BEGIN
      -- Get latest C3 filing
      SELECT period, posting_status INTO v_last_c3
      FROM cn_c3_reported
      WHERE payer_id = v_employer.employer_id
      ORDER BY period DESC LIMIT 1;

      -- Determine filing status
      IF v_last_c3.period IS NULL THEN
        v_filing_status := 'never_filed';
      ELSE
        v_filing_status := 'filed';
      END IF;

      -- Get arrears from ledger
      SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE -amount END), 0)
      INTO v_arrears
      FROM ce_employer_financial_ledger
      WHERE employer_id = v_employer.employer_id;

      v_payment_status := CASE WHEN v_arrears > 0 THEN 'arrears' WHEN v_arrears = 0 THEN 'current' ELSE 'credit' END;
      v_overall_status := CASE
        WHEN v_filing_status = 'never_filed' THEN 'non_compliant'
        WHEN v_arrears > 0 THEN 'partially_compliant'
        ELSE 'compliant'
      END;

      IF NOT p_dry_run THEN
        INSERT INTO ce_employer_compliance_status (
          employer_id, filing_status, payment_status, overall_compliance_status,
          current_arrears_amount, last_filing_period, last_reviewed_at
        ) VALUES (
          v_employer.employer_id, v_filing_status, v_payment_status, v_overall_status,
          v_arrears, v_last_c3.period, now()
        )
        ON CONFLICT (employer_id) DO UPDATE SET
          filing_status = EXCLUDED.filing_status,
          payment_status = EXCLUDED.payment_status,
          overall_compliance_status = EXCLUDED.overall_compliance_status,
          current_arrears_amount = EXCLUDED.current_arrears_amount,
          last_filing_period = EXCLUDED.last_filing_period,
          last_reviewed_at = now(),
          updated_at = now();
        v_affected := v_affected + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed, 'affected', v_affected,
    'errors', v_errors, 'dry_run', p_dry_run
  );
END;
$$;

-- RPC: Employer Risk Score Refresh
CREATE OR REPLACE FUNCTION public.ce_run_employer_risk_refresh(
  p_dry_run BOOLEAN DEFAULT false,
  p_batch_size INT DEFAULT 500
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INT := 0;
  v_affected INT := 0;
  v_errors INT := 0;
  v_emp RECORD;
  v_arrears NUMERIC;
  v_score NUMERIC;
  v_band VARCHAR(20);
BEGIN
  FOR v_emp IN
    SELECT employer_id, current_arrears_amount, overall_compliance_status
    FROM ce_employer_compliance_status
    LIMIT p_batch_size
  LOOP
    v_processed := v_processed + 1;
    BEGIN
      v_arrears := COALESCE(v_emp.current_arrears_amount, 0);
      -- Simple scoring: arrears-driven with status modifier
      v_score := LEAST(100, GREATEST(0,
        CASE
          WHEN v_arrears > 500000 THEN 95
          WHEN v_arrears > 150000 THEN 75
          WHEN v_arrears > 50000 THEN 55
          WHEN v_arrears > 10000 THEN 35
          ELSE 15
        END +
        CASE WHEN v_emp.overall_compliance_status = 'non_compliant' THEN 5 ELSE 0 END
      ));
      v_band := CASE
        WHEN v_score >= 80 THEN 'critical'
        WHEN v_score >= 60 THEN 'high'
        WHEN v_score >= 40 THEN 'medium'
        WHEN v_score >= 20 THEN 'low'
        ELSE 'minimal'
      END;

      IF NOT p_dry_run THEN
        INSERT INTO ce_employer_risk_profile (
          employer_id, overall_risk_score, risk_band, last_assessed_at
        ) VALUES (
          v_emp.employer_id, v_score, v_band, now()
        )
        ON CONFLICT (employer_id) DO UPDATE SET
          overall_risk_score = EXCLUDED.overall_risk_score,
          risk_band = EXCLUDED.risk_band,
          last_assessed_at = now(),
          updated_at = now();
        v_affected := v_affected + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed, 'affected', v_affected,
    'errors', v_errors, 'dry_run', p_dry_run
  );
END;
$$;

-- RPC: Employer Flag Generation
CREATE OR REPLACE FUNCTION public.ce_run_employer_flag_generation(
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INT := 0;
  v_affected INT := 0;
  v_errors INT := 0;
  v_emp RECORD;
BEGIN
  FOR v_emp IN
    SELECT cs.employer_id, cs.current_arrears_amount, cs.overall_compliance_status,
           rp.risk_band, rp.overall_risk_score
    FROM ce_employer_compliance_status cs
    LEFT JOIN ce_employer_risk_profile rp ON rp.employer_id = cs.employer_id
  LOOP
    v_processed := v_processed + 1;
    BEGIN
      IF NOT p_dry_run THEN
        -- High arrears flag
        IF COALESCE(v_emp.current_arrears_amount, 0) > 50000 THEN
          INSERT INTO ce_employer_compliance_flags (employer_id, flag_type, flag_reason, is_active)
          VALUES (v_emp.employer_id, 'high_arrears', 'Arrears exceed $50,000 threshold', true)
          ON CONFLICT DO NOTHING;
          v_affected := v_affected + 1;
        END IF;
        -- Critical risk flag
        IF v_emp.risk_band = 'critical' THEN
          INSERT INTO ce_employer_compliance_flags (employer_id, flag_type, flag_reason, is_active)
          VALUES (v_emp.employer_id, 'critical_risk', 'Risk band is critical', true)
          ON CONFLICT DO NOTHING;
          v_affected := v_affected + 1;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed, 'affected', v_affected,
    'errors', v_errors, 'dry_run', p_dry_run
  );
END;
$$;

-- RPC: Stale Employer Review Queue
CREATE OR REPLACE FUNCTION public.ce_run_stale_employer_review(
  p_dry_run BOOLEAN DEFAULT false,
  p_stale_months INT DEFAULT 6
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INT := 0;
  v_affected INT := 0;
  v_cutoff DATE;
BEGIN
  v_cutoff := (now() - (p_stale_months || ' months')::interval)::date;

  SELECT COUNT(*) INTO v_processed
  FROM er_master em
  LEFT JOIN ce_employer_compliance_status cs ON cs.employer_id = em.regno
  WHERE em.status = 'A'
    AND (cs.last_reviewed_at IS NULL OR cs.last_reviewed_at < v_cutoff);

  IF NOT p_dry_run THEN
    INSERT INTO ce_employer_compliance_flags (employer_id, flag_type, flag_reason, is_active)
    SELECT em.regno, 'stale_review', 'No compliance review in ' || p_stale_months || ' months', true
    FROM er_master em
    LEFT JOIN ce_employer_compliance_status cs ON cs.employer_id = em.regno
    WHERE em.status = 'A'
      AND (cs.last_reviewed_at IS NULL OR cs.last_reviewed_at < v_cutoff)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_affected = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'processed', v_processed, 'affected', v_affected,
    'errors', 0, 'dry_run', p_dry_run
  );
END;
$$;

-- RPC: Group Rollup Refresh
CREATE OR REPLACE FUNCTION public.ce_run_group_rollup_refresh(
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INT := 0;
  v_affected INT := 0;
BEGIN
  -- Count groups
  SELECT COUNT(*) INTO v_processed FROM ce_employer_groups WHERE is_active = true;

  -- The group summary view (ce_employer_group_summary_view) auto-aggregates.
  -- This job refreshes any materialized caches if needed.
  -- Currently the view is live so this is a validation pass.

  RETURN jsonb_build_object(
    'processed', v_processed, 'affected', v_affected,
    'errors', 0, 'dry_run', p_dry_run
  );
END;
$$;

-- RPC: Notice Recipient Validation
CREATE OR REPLACE FUNCTION public.ce_run_notice_recipient_validation(
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INT := 0;
  v_affected INT := 0;
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT id, employer_id, recipient_email, recipient_name
    FROM ce_employer_notice_recipients
    WHERE is_active = true
  LOOP
    v_processed := v_processed + 1;
    IF v_rec.recipient_email IS NULL OR v_rec.recipient_email = '' THEN
      IF NOT p_dry_run THEN
        INSERT INTO ce_employer_compliance_flags (employer_id, flag_type, flag_reason, is_active)
        VALUES (v_rec.employer_id, 'invalid_notice_contact', 'Notice recipient missing email: ' || COALESCE(v_rec.recipient_name, 'unknown'), true)
        ON CONFLICT DO NOTHING;
      END IF;
      v_affected := v_affected + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed, 'affected', v_affected,
    'errors', 0, 'dry_run', p_dry_run
  );
END;
$$;

-- RPC: Reconciliation Exception Detection
CREATE OR REPLACE FUNCTION public.ce_run_recon_exception_detection(
  p_dry_run BOOLEAN DEFAULT false,
  p_tolerance NUMERIC DEFAULT 0.01
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INT := 0;
  v_affected INT := 0;
  v_emp RECORD;
  v_source_total NUMERIC;
  v_ledger_total NUMERIC;
BEGIN
  FOR v_emp IN
    SELECT DISTINCT employer_id FROM ce_employer_compliance_status
  LOOP
    v_processed := v_processed + 1;

    -- Source total from C3
    SELECT COALESCE(SUM(COALESCE(emp_ss_amt_rpt,0) + COALESCE(emp_pe_amt_rpt,0) + COALESCE(emp_levy_amt_rpt,0)), 0)
    INTO v_source_total
    FROM cn_c3_reported WHERE payer_id = v_emp.employer_id;

    -- Ledger total
    SELECT COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0)
    INTO v_ledger_total
    FROM ce_employer_financial_ledger WHERE employer_id = v_emp.employer_id;

    IF ABS(v_source_total - v_ledger_total) > p_tolerance THEN
      IF NOT p_dry_run THEN
        INSERT INTO ce_employer_compliance_flags (employer_id, flag_type, flag_reason, is_active)
        VALUES (v_emp.employer_id, 'recon_exception',
          'Source/ledger mismatch: source=' || v_source_total || ' ledger=' || v_ledger_total, true)
        ON CONFLICT DO NOTHING;
      END IF;
      v_affected := v_affected + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed, 'affected', v_affected,
    'errors', 0, 'dry_run', p_dry_run
  );
END;
$$;

-- RPC: Master job dispatcher
CREATE OR REPLACE FUNCTION public.ce_execute_automation_job(
  p_job_code VARCHAR,
  p_dry_run BOOLEAN DEFAULT false,
  p_triggered_by VARCHAR DEFAULT 'system'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job RECORD;
  v_run_id UUID;
  v_result JSONB;
  v_start TIMESTAMPTZ;
  v_duration INT;
BEGIN
  SELECT * INTO v_job FROM ce_automation_jobs WHERE job_code = p_job_code;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job not found: ' || p_job_code);
  END IF;

  v_start := clock_timestamp();

  INSERT INTO ce_automation_job_runs (job_id, run_status, is_dry_run, triggered_by, started_at)
  VALUES (v_job.id, 'running', p_dry_run, p_triggered_by, v_start)
  RETURNING id INTO v_run_id;

  BEGIN
    CASE p_job_code
      WHEN 'EMP-COMPLIANCE-REFRESH' THEN
        v_result := ce_run_employer_compliance_refresh(p_dry_run, COALESCE((v_job.parameters->>'batch_size')::int, 500));
      WHEN 'EMP-RISK-REFRESH' THEN
        v_result := ce_run_employer_risk_refresh(p_dry_run, COALESCE((v_job.parameters->>'batch_size')::int, 500));
      WHEN 'EMP-FLAG-GEN' THEN
        v_result := ce_run_employer_flag_generation(p_dry_run);
      WHEN 'EMP-SNAPSHOT-GEN' THEN
        v_result := jsonb_build_object('processed', 0, 'affected', 0, 'errors', 0, 'dry_run', p_dry_run, 'note', 'Snapshot generation uses ce_create_employer_snapshot RPC per-employer');
      WHEN 'EMP-STALE-REVIEW' THEN
        v_result := ce_run_stale_employer_review(p_dry_run, COALESCE((v_job.parameters->>'stale_months')::int, 6));
      WHEN 'EMP-GROUP-ROLLUP' THEN
        v_result := ce_run_group_rollup_refresh(p_dry_run);
      WHEN 'EMP-NOTICE-VALIDATE' THEN
        v_result := ce_run_notice_recipient_validation(p_dry_run);
      WHEN 'EMP-RECON-EXCEPTION' THEN
        v_result := ce_run_recon_exception_detection(p_dry_run, COALESCE((v_job.parameters->>'tolerance_amount')::numeric, 0.01));
      ELSE
        v_result := jsonb_build_object('error', 'No handler for job: ' || p_job_code);
    END CASE;

    v_duration := EXTRACT(EPOCH FROM (clock_timestamp() - v_start))::int * 1000;

    UPDATE ce_automation_job_runs SET
      run_status = CASE WHEN p_dry_run THEN 'dry_run' ELSE 'success' END,
      records_processed = COALESCE((v_result->>'processed')::int, 0),
      records_affected = COALESCE((v_result->>'affected')::int, 0),
      errors_count = COALESCE((v_result->>'errors')::int, 0),
      summary = v_result,
      completed_at = clock_timestamp(),
      duration_ms = v_duration
    WHERE id = v_run_id;

    UPDATE ce_automation_jobs SET
      last_run_at = clock_timestamp(),
      last_run_status = CASE WHEN p_dry_run THEN 'dry_run' ELSE 'success' END
    WHERE id = v_job.id;

  EXCEPTION WHEN OTHERS THEN
    v_duration := EXTRACT(EPOCH FROM (clock_timestamp() - v_start))::int * 1000;
    UPDATE ce_automation_job_runs SET
      run_status = 'failed',
      error_details = jsonb_build_object('message', SQLERRM, 'state', SQLSTATE),
      completed_at = clock_timestamp(),
      duration_ms = v_duration
    WHERE id = v_run_id;

    UPDATE ce_automation_jobs SET
      last_run_at = clock_timestamp(),
      last_run_status = 'failed'
    WHERE id = v_job.id;

    v_result := jsonb_build_object('error', SQLERRM);
  END;

  RETURN jsonb_build_object('run_id', v_run_id, 'result', v_result);
END;
$$;
