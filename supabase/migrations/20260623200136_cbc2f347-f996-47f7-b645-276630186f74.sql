
-- ============================================================
-- Central Employer Ledger — Phase 1 Schema
-- ============================================================

-- 1. Ledger Account
CREATE TABLE public.core_employer_ledger_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL,
  employer_no varchar(50) NOT NULL,
  employer_name text,
  country_code varchar(8) NOT NULL DEFAULT 'SKN',
  status varchar(20) NOT NULL DEFAULT 'ACTIVE',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employer_id, country_code)
);
CREATE INDEX idx_celedger_account_employer_no ON public.core_employer_ledger_account(employer_no);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_employer_ledger_account TO authenticated;
GRANT ALL ON public.core_employer_ledger_account TO service_role;

-- 2. Ledger Head
CREATE TABLE public.core_ledger_head (
  head_code varchar(40) PRIMARY KEY,
  head_name text NOT NULL,
  fund_code varchar(16) NOT NULL,
  head_type varchar(24) NOT NULL,
  is_principal boolean NOT NULL DEFAULT false,
  is_waivable boolean NOT NULL DEFAULT false,
  allocation_priority int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_ledger_head TO authenticated;
GRANT ALL ON public.core_ledger_head TO service_role;

INSERT INTO public.core_ledger_head (head_code, head_name, fund_code, head_type, is_principal, is_waivable, allocation_priority) VALUES
  ('SS_CONTRIBUTION', 'SEED- Social Security Contribution', 'SS', 'CONTRIBUTION', true,  false, 10),
  ('SS_FINE',         'SEED- Social Security Fine',         'SS', 'FINE',         false, true,  60),
  ('SS_INTEREST',     'SEED- Social Security Interest',     'SS', 'INTEREST',     false, true,  90),
  ('LV_CONTRIBUTION', 'SEED- Levy Contribution',            'LV', 'CONTRIBUTION', true,  false, 20),
  ('LV_PENALTY',      'SEED- Levy Penalty',                 'LV', 'PENALTY',      false, true,  70),
  ('LV_INTEREST',     'SEED- Levy Interest',                'LV', 'INTEREST',     false, true,  91),
  ('PE_CONTRIBUTION', 'SEED- Severance (PE) Contribution',  'PE', 'CONTRIBUTION', true,  false, 30),
  ('PE_PENALTY',      'SEED- Severance (PE) Penalty',       'PE', 'PENALTY',      false, true,  80),
  ('PE_INTEREST',     'SEED- Severance (PE) Interest',      'PE', 'INTEREST',     false, true,  92),
  ('LEGAL_FEE',       'SEED- Legal Fee',                    'LEGAL', 'LEGAL_FEE', false, true,  40),
  ('COURT_COST',      'SEED- Court Cost',                   'COURT', 'COURT_COST',false, true,  50),
  ('PAYMENT',         'SEED- Payment',                      'OTHER', 'PAYMENT',   false, false, 1),
  ('ADJUSTMENT',      'SEED- Adjustment',                   'OTHER', 'ADJUSTMENT',false, false, 999);

-- 3. Recalculation Run
CREATE TABLE public.core_ledger_recalculation_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid,
  period_from date,
  period_to date,
  reason text,
  recalculation_mode varchar(32) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  diff_summary jsonb,
  run_by varchar(50),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_ledger_recalculation_run TO authenticated;
GRANT ALL ON public.core_ledger_recalculation_run TO service_role;

-- 4. Ledger Transaction (append-only)
CREATE SEQUENCE public.core_ledger_transaction_no_seq START 1000001;

CREATE TABLE public.core_employer_ledger_transaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_no bigint NOT NULL DEFAULT nextval('public.core_ledger_transaction_no_seq') UNIQUE,
  employer_ledger_account_id uuid NOT NULL REFERENCES public.core_employer_ledger_account(id),
  employer_id uuid NOT NULL,
  employer_no varchar(50) NOT NULL,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  posting_period date NOT NULL,
  head_code varchar(40) NOT NULL REFERENCES public.core_ledger_head(head_code),
  debit_amount numeric(18,2) NOT NULL DEFAULT 0,
  credit_amount numeric(18,2) NOT NULL DEFAULT 0,
  running_balance numeric(18,2),
  source_module varchar(20) NOT NULL,
  source_record_type varchar(50),
  source_record_id varchar(100),
  source_reference_no varchar(100),
  payment_code varchar(40),
  mop_code varchar(40),
  receipt_id varchar(100),
  payment_id varchar(100),
  legal_case_id uuid,
  legal_action_id uuid,
  compliance_case_id uuid,
  payment_arrangement_id uuid,
  description text,
  posting_status varchar(16) NOT NULL DEFAULT 'POSTED',
  reversed_transaction_id uuid REFERENCES public.core_employer_ledger_transaction(id),
  recalculation_run_id uuid REFERENCES public.core_ledger_recalculation_run(id),
  created_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_celt_emp_period_head ON public.core_employer_ledger_transaction(employer_id, posting_period, head_code);
CREATE INDEX idx_celt_source ON public.core_employer_ledger_transaction(source_module, source_record_type, source_record_id);
CREATE INDEX idx_celt_recalc ON public.core_employer_ledger_transaction(recalculation_run_id);
CREATE INDEX idx_celt_legal_case ON public.core_employer_ledger_transaction(legal_case_id);
CREATE INDEX idx_celt_compliance_case ON public.core_employer_ledger_transaction(compliance_case_id);
CREATE UNIQUE INDEX uq_celt_idempotency ON public.core_employer_ledger_transaction(
  source_module, source_record_type, source_record_id, head_code, posting_period
) WHERE source_record_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_employer_ledger_transaction TO authenticated;
GRANT ALL ON public.core_employer_ledger_transaction TO service_role;

-- Immutability trigger for POSTED rows
CREATE OR REPLACE FUNCTION public.core_ledger_txn_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.posting_status = 'POSTED' THEN
      RAISE EXCEPTION 'Cannot delete POSTED ledger transaction %; create a reversal instead.', OLD.transaction_no;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.posting_status = 'POSTED' THEN
      IF NEW.posting_status NOT IN ('REVERSED','ADJUSTED') THEN
        RAISE EXCEPTION 'POSTED ledger transaction % is immutable; only status change to REVERSED/ADJUSTED allowed.', OLD.transaction_no;
      END IF;
      IF NEW.debit_amount <> OLD.debit_amount
         OR NEW.credit_amount <> OLD.credit_amount
         OR NEW.head_code <> OLD.head_code
         OR NEW.posting_period <> OLD.posting_period
         OR NEW.employer_id <> OLD.employer_id THEN
        RAISE EXCEPTION 'Amount/head/period/employer of POSTED transaction % cannot change.', OLD.transaction_no;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_celt_immutable
BEFORE UPDATE OR DELETE ON public.core_employer_ledger_transaction
FOR EACH ROW EXECUTE FUNCTION public.core_ledger_txn_immutable();

-- 5. Ledger Balance
CREATE TABLE public.core_employer_ledger_balance (
  employer_id uuid NOT NULL,
  posting_period date NOT NULL,
  head_code varchar(40) NOT NULL REFERENCES public.core_ledger_head(head_code),
  opening_balance numeric(18,2) NOT NULL DEFAULT 0,
  debit_total numeric(18,2) NOT NULL DEFAULT 0,
  credit_total numeric(18,2) NOT NULL DEFAULT 0,
  closing_balance numeric(18,2) NOT NULL DEFAULT 0,
  last_calculated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employer_id, posting_period, head_code)
);
CREATE INDEX idx_celb_emp ON public.core_employer_ledger_balance(employer_id);
CREATE INDEX idx_celb_head ON public.core_employer_ledger_balance(head_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_employer_ledger_balance TO authenticated;
GRANT ALL ON public.core_employer_ledger_balance TO service_role;

-- 6. BEMA Staging
CREATE TABLE public.stg_bema_employer_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_type varchar(8),
  payer_id varchar(50),
  payment_id varchar(100),
  receipt_no varchar(100),
  payment_amount numeric(18,2),
  payment_code varchar(40),
  mop_code varchar(40),
  period date,
  payment_date date,
  receipt_status varchar(20),
  batch_number varchar(50),
  source_hash varchar(128) NOT NULL UNIQUE,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stg_bema_pay_payer ON public.stg_bema_employer_payment(payer_type, payer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stg_bema_employer_payment TO authenticated;
GRANT ALL ON public.stg_bema_employer_payment TO service_role;

CREATE TABLE public.stg_bema_employer_liability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_no varchar(50),
  period date,
  fund_code varchar(16),
  contribution_due numeric(18,2),
  contribution_paid numeric(18,2),
  contribution_outstanding numeric(18,2),
  penalty_fine_outstanding numeric(18,2),
  total_outstanding numeric(18,2),
  source_statement_date date,
  source_hash varchar(128) NOT NULL UNIQUE,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_stg_bema_liab_emp ON public.stg_bema_employer_liability(employer_no, period, fund_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stg_bema_employer_liability TO authenticated;
GRANT ALL ON public.stg_bema_employer_liability TO service_role;

-- 7. Payment Allocation Rule
CREATE TABLE public.core_payment_allocation_rule (
  rule_code varchar(60) PRIMARY KEY,
  country_code varchar(8) NOT NULL DEFAULT 'SKN',
  debtor_type varchar(16) NOT NULL DEFAULT 'EMPLOYER',
  allocation_order int NOT NULL,
  head_code varchar(40) NOT NULL REFERENCES public.core_ledger_head(head_code),
  oldest_period_first boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cpar_ctry_debt_active ON public.core_payment_allocation_rule(country_code, debtor_type, is_active, allocation_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_payment_allocation_rule TO authenticated;
GRANT ALL ON public.core_payment_allocation_rule TO service_role;

INSERT INTO public.core_payment_allocation_rule (rule_code, country_code, debtor_type, allocation_order, head_code) VALUES
  ('SEED-SKN-ER-01', 'SKN', 'EMPLOYER', 10, 'SS_CONTRIBUTION'),
  ('SEED-SKN-ER-02', 'SKN', 'EMPLOYER', 20, 'LV_CONTRIBUTION'),
  ('SEED-SKN-ER-03', 'SKN', 'EMPLOYER', 30, 'PE_CONTRIBUTION'),
  ('SEED-SKN-ER-04', 'SKN', 'EMPLOYER', 40, 'LEGAL_FEE'),
  ('SEED-SKN-ER-05', 'SKN', 'EMPLOYER', 50, 'COURT_COST'),
  ('SEED-SKN-ER-06', 'SKN', 'EMPLOYER', 60, 'SS_FINE'),
  ('SEED-SKN-ER-07', 'SKN', 'EMPLOYER', 70, 'LV_PENALTY'),
  ('SEED-SKN-ER-08', 'SKN', 'EMPLOYER', 80, 'PE_PENALTY'),
  ('SEED-SKN-ER-09', 'SKN', 'EMPLOYER', 90, 'SS_INTEREST'),
  ('SEED-SKN-ER-10', 'SKN', 'EMPLOYER', 91, 'LV_INTEREST'),
  ('SEED-SKN-ER-11', 'SKN', 'EMPLOYER', 92, 'PE_INTEREST');

-- 8. Ledger-side Payment Allocation
-- (Named core_ledger_payment_allocation to avoid conflict with existing
--  core_payment_allocation table that belongs to payment arrangements.)
CREATE TABLE public.core_ledger_payment_allocation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_transaction_id uuid NOT NULL REFERENCES public.core_employer_ledger_transaction(id),
  receipt_id varchar(100),
  employer_id uuid NOT NULL,
  allocated_head_code varchar(40) NOT NULL REFERENCES public.core_ledger_head(head_code),
  allocated_period date NOT NULL,
  allocated_amount numeric(18,2) NOT NULL,
  legal_case_id uuid,
  legal_action_id uuid,
  compliance_case_id uuid,
  payment_arrangement_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clpa_emp ON public.core_ledger_payment_allocation(employer_id);
CREATE INDEX idx_clpa_txn ON public.core_ledger_payment_allocation(ledger_transaction_id);
CREATE INDEX idx_clpa_head_period ON public.core_ledger_payment_allocation(allocated_head_code, allocated_period);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_ledger_payment_allocation TO authenticated;
GRANT ALL ON public.core_ledger_payment_allocation TO service_role;

-- 9. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_cela_updated_at BEFORE UPDATE ON public.core_employer_ledger_account
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_clh_updated_at BEFORE UPDATE ON public.core_ledger_head
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_cpar_updated_at BEFORE UPDATE ON public.core_payment_allocation_rule
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
