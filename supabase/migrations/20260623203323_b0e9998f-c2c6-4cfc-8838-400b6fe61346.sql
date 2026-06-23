
DROP TABLE IF EXISTS public.core_ledger_payment_allocation CASCADE;
DROP TABLE IF EXISTS public.core_ledger_recalculation_run CASCADE;
DROP TABLE IF EXISTS public.core_employer_ledger_transaction CASCADE;
DROP TABLE IF EXISTS public.core_employer_ledger_balance CASCADE;
DROP TABLE IF EXISTS public.core_employer_ledger_account CASCADE;

CREATE TABLE public.core_employer_ledger_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id varchar(50) NOT NULL REFERENCES public.er_master(regno) ON UPDATE CASCADE,
  employer_name text,
  country_code varchar(8) NOT NULL DEFAULT 'SKN',
  status varchar(20) NOT NULL DEFAULT 'ACTIVE',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employer_id, country_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_employer_ledger_account TO authenticated;
GRANT ALL ON public.core_employer_ledger_account TO service_role;

CREATE TABLE public.core_employer_ledger_balance (
  employer_id varchar(50) NOT NULL REFERENCES public.er_master(regno) ON UPDATE CASCADE,
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

CREATE SEQUENCE IF NOT EXISTS core_ledger_transaction_no_seq;
CREATE TABLE public.core_employer_ledger_transaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_no bigint NOT NULL UNIQUE DEFAULT nextval('core_ledger_transaction_no_seq'),
  employer_ledger_account_id uuid NOT NULL REFERENCES public.core_employer_ledger_account(id),
  employer_id varchar(50) NOT NULL REFERENCES public.er_master(regno) ON UPDATE CASCADE,
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
  recalculation_run_id uuid,
  created_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_celt_emp_period_head ON public.core_employer_ledger_transaction(employer_id, posting_period, head_code);
CREATE INDEX idx_celt_source ON public.core_employer_ledger_transaction(source_module, source_record_type, source_record_id);
CREATE INDEX idx_celt_legal_case ON public.core_employer_ledger_transaction(legal_case_id);
CREATE INDEX idx_celt_compliance_case ON public.core_employer_ledger_transaction(compliance_case_id);
CREATE INDEX idx_celt_recalc ON public.core_employer_ledger_transaction(recalculation_run_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_employer_ledger_transaction TO authenticated;
GRANT ALL ON public.core_employer_ledger_transaction TO service_role;

CREATE TABLE public.core_ledger_recalculation_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id varchar(50) REFERENCES public.er_master(regno) ON UPDATE CASCADE,
  period_from date,
  period_to date,
  status varchar(20) NOT NULL DEFAULT 'PENDING',
  preview_only boolean NOT NULL DEFAULT true,
  diff_summary jsonb,
  reason text,
  triggered_by varchar(50),
  approved_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX idx_clrr_emp ON public.core_ledger_recalculation_run(employer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_ledger_recalculation_run TO authenticated;
GRANT ALL ON public.core_ledger_recalculation_run TO service_role;

CREATE TABLE public.core_ledger_payment_allocation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id varchar(50) NOT NULL REFERENCES public.er_master(regno) ON UPDATE CASCADE,
  payment_id varchar(100) NOT NULL,
  receipt_id varchar(100),
  payment_date date NOT NULL,
  total_amount numeric(18,2) NOT NULL,
  allocated_amount numeric(18,2) NOT NULL DEFAULT 0,
  unallocated_amount numeric(18,2) NOT NULL DEFAULT 0,
  allocation_breakdown jsonb,
  rule_code varchar(60) REFERENCES public.core_payment_allocation_rule(rule_code),
  created_by varchar(50),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clpa_emp ON public.core_ledger_payment_allocation(employer_id);
CREATE INDEX idx_clpa_payment ON public.core_ledger_payment_allocation(payment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_ledger_payment_allocation TO authenticated;
GRANT ALL ON public.core_ledger_payment_allocation TO service_role;
