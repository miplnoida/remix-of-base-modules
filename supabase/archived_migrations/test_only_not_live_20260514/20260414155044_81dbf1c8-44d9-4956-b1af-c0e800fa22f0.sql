
-- =====================================================
-- BOOTSTRAP: Missing Compliance Financial Objects
-- Must run BEFORE 20260411114541 (Phase 1 Hardening)
-- Idempotent: safe in Test (already exists) and Live (will create)
-- =====================================================

-- 1. Enum types
DO $$ BEGIN CREATE TYPE ce_ledger_status AS ENUM ('POSTED','REVERSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ce_fund_type AS ENUM ('SS','LEVY','EI'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ce_ledger_entry_type AS ENUM (
  'C3_DUES_POSTED','PAYMENT_RECEIVED','PENALTY_ASSESSED','INTEREST_ACCRUED',
  'WAIVER_APPLIED','ADJUSTMENT','REVERSAL','WRITE_OFF','ARRANGEMENT_CREDIT',
  'REFUND','OPENING_BALANCE','TRANSFER_IN'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. ce_employer_financial_ledger table
CREATE TABLE IF NOT EXISTS public.ce_employer_financial_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id VARCHAR NOT NULL,
  employer_name VARCHAR,
  territory VARCHAR,
  entry_type ce_ledger_entry_type NOT NULL,
  fund_type ce_fund_type NOT NULL,
  period VARCHAR NOT NULL,
  debit_amount NUMERIC NOT NULL DEFAULT 0,
  credit_amount NUMERIC NOT NULL DEFAULT 0,
  running_balance NUMERIC NOT NULL DEFAULT 0,
  status ce_ledger_status NOT NULL DEFAULT 'POSTED'::ce_ledger_status,
  idempotency_key VARCHAR NOT NULL UNIQUE,
  reference_type VARCHAR NOT NULL,
  reference_id UUID,
  reversal_of_id UUID,
  reversal_reason TEXT,
  description TEXT NOT NULL,
  posted_by VARCHAR NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_system VARCHAR,
  source_pk VARCHAR,
  job_run_id UUID
);

-- 3. ce_penalty_calculations table
CREATE TABLE IF NOT EXISTS public.ce_penalty_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id VARCHAR NOT NULL,
  period VARCHAR NOT NULL,
  fund_type ce_fund_type NOT NULL,
  calculation_rule_id UUID,
  rule_code VARCHAR,
  input_principal NUMERIC NOT NULL,
  input_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_amount NUMERIC NOT NULL,
  calculation_type VARCHAR NOT NULL,
  ledger_entry_id UUID,
  effective_from DATE NOT NULL,
  effective_to DATE,
  calculated_by VARCHAR NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  idempotency_key VARCHAR NOT NULL UNIQUE,
  violation_id UUID
);

-- 4. Indexes for ce_employer_financial_ledger
CREATE INDEX IF NOT EXISTS idx_ce_ledger_employer ON public.ce_employer_financial_ledger(employer_id);
CREATE INDEX IF NOT EXISTS idx_ce_ledger_period ON public.ce_employer_financial_ledger(employer_id, period);
CREATE INDEX IF NOT EXISTS idx_ce_ledger_fund ON public.ce_employer_financial_ledger(employer_id, fund_type);
CREATE INDEX IF NOT EXISTS idx_ce_ledger_entry_type ON public.ce_employer_financial_ledger(entry_type);
CREATE INDEX IF NOT EXISTS idx_ce_ledger_posted_at ON public.ce_employer_financial_ledger(posted_at);
CREATE INDEX IF NOT EXISTS idx_ce_ledger_reference ON public.ce_employer_financial_ledger(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_ce_ledger_reversal ON public.ce_employer_financial_ledger(reversal_of_id) WHERE reversal_of_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ce_ledger_status ON public.ce_employer_financial_ledger(status);
CREATE INDEX IF NOT EXISTS idx_ce_ledger_employer_period ON public.ce_employer_financial_ledger(employer_id, period);

-- 5. Indexes for ce_penalty_calculations
CREATE INDEX IF NOT EXISTS idx_ce_penalty_calc_employer ON public.ce_penalty_calculations(employer_id);
CREATE INDEX IF NOT EXISTS idx_ce_penalty_calc_period ON public.ce_penalty_calculations(employer_id, period);
CREATE INDEX IF NOT EXISTS idx_ce_penalty_calc_rule ON public.ce_penalty_calculations(calculation_rule_id);
CREATE INDEX IF NOT EXISTS idx_ce_penalty_calc_employer_period ON public.ce_penalty_calculations(employer_id, period);
CREATE INDEX IF NOT EXISTS idx_ce_penalty_calculations_violation_id ON public.ce_penalty_calculations(violation_id);
