
CREATE TABLE IF NOT EXISTS public.cl_payout_method_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ssn varchar(20) NOT NULL,
  claim_number varchar(11),
  method varchar(10) NOT NULL CHECK (method IN ('EFT','WIRE','CHECK')),
  status varchar(20) NOT NULL DEFAULT 'PENDING',

  -- EFT (local bank)
  bank_code varchar(3) REFERENCES public.tb_bank_code(bank_code),
  branch_code varchar(10),
  acct_num varchar(40),
  acct_name varchar(75),
  acct_type varchar(10), -- SAVINGS | CHEQUING

  -- WIRE
  swift_bic varchar(15),
  iban varchar(40),
  routing_number varchar(20),
  wire_bank_name varchar(120),
  wire_bank_address text,
  wire_bank_country varchar(3),
  intermediary_bank text,

  -- CHECK
  check_payee_name varchar(120),
  check_mailing_address text,
  check_city varchar(60),
  check_state varchar(60),
  check_postal varchar(20),
  check_country varchar(3),

  notes text,
  requested_by varchar(50),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by varchar(50),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cl_payout_method_request TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cl_payout_method_request TO anon;
GRANT ALL ON public.cl_payout_method_request TO service_role;

CREATE INDEX IF NOT EXISTS idx_cl_payout_req_ssn ON public.cl_payout_method_request(ssn);
CREATE INDEX IF NOT EXISTS idx_cl_payout_req_status ON public.cl_payout_method_request(status);
CREATE INDEX IF NOT EXISTS idx_cl_payout_req_claim ON public.cl_payout_method_request(claim_number);

CREATE OR REPLACE FUNCTION public.cl_payout_req_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_cl_payout_req_updated_at ON public.cl_payout_method_request;
CREATE TRIGGER trg_cl_payout_req_updated_at
BEFORE UPDATE ON public.cl_payout_method_request
FOR EACH ROW EXECUTE FUNCTION public.cl_payout_req_touch_updated_at();
