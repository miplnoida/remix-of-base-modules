
ALTER TABLE public.tb_income_codes ALTER COLUMN code TYPE varchar(50);

ALTER TABLE public.lg_payment_arrangement_link
  ADD COLUMN IF NOT EXISTS link_reason text,
  ADD COLUMN IF NOT EXISTS default_monitoring_required boolean NOT NULL DEFAULT true;

ALTER TABLE public.lg_fee_charge
  ADD COLUMN IF NOT EXISTS employer_account_id uuid,
  ADD COLUMN IF NOT EXISTS charge_reason text,
  ADD COLUMN IF NOT EXISTS employer_account_transaction_id integer,
  ADD COLUMN IF NOT EXISTS posting_status varchar(30) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS posted_by varchar(50),
  ADD COLUMN IF NOT EXISTS posted_at timestamptz;

ALTER TABLE public.lg_fee_charge ALTER COLUMN currency_code SET DEFAULT 'XCD';

CREATE INDEX IF NOT EXISTS idx_lg_fee_charge_status ON public.lg_fee_charge(posting_status);
CREATE INDEX IF NOT EXISTS idx_lg_fee_charge_txn ON public.lg_fee_charge(employer_account_transaction_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_payment_arrangement_link TO authenticated;
GRANT ALL ON public.lg_payment_arrangement_link TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_fee_charge TO authenticated;
GRANT ALL ON public.lg_fee_charge TO service_role;

INSERT INTO public.tb_invoice_types (code, description, is_active)
VALUES ('LEGAL', 'Legal Charge', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.tb_income_codes (code, description, is_active)
VALUES
  ('LEGAL_COURT_FILING_FEE','Legal Court Filing Fee',true),
  ('LEGAL_SERVICE_FEE','Legal Service Fee',true),
  ('LEGAL_PROCESSING_FEE','Legal Processing Fee',true),
  ('LEGAL_JUDGMENT_COST','Legal Judgment Cost',true),
  ('LEGAL_EXECUTION_COST','Legal Execution Cost',true),
  ('LEGAL_APPEAL_FEE','Legal Appeal Fee',true),
  ('LEGAL_ATTORNEY_COST','Legal Attorney Cost',true),
  ('LEGAL_RECOVERY_COST','Legal Recovery Cost',true)
ON CONFLICT (code) DO NOTHING;
