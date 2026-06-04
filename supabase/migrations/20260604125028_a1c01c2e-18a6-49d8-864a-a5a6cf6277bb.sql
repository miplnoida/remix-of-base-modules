
-- =========================================================
-- BN Award & Entitlement Foundation (additive)
-- =========================================================

CREATE OR REPLACE FUNCTION public.trg_bn_award_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.modified_at = now();
  RETURN NEW;
END;
$$;

-- 1. bn_award
CREATE TABLE public.bn_award (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_number varchar(50) UNIQUE,
  bn_claim_id uuid REFERENCES public.bn_claim(id) ON DELETE RESTRICT,
  bn_product_id uuid REFERENCES public.bn_product(id) ON DELETE RESTRICT,
  ssn varchar(20) NOT NULL,
  benefit_code varchar(20),
  award_type varchar(30),
  status varchar(30) NOT NULL DEFAULT 'ACTIVE',
  start_date date NOT NULL,
  end_date date,
  base_amount numeric(18,2),
  currency varchar(10) DEFAULT 'XCD',
  frequency varchar(20),
  next_review_date date,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_award_claim ON public.bn_award(bn_claim_id);
CREATE INDEX idx_bn_award_ssn ON public.bn_award(ssn);
CREATE INDEX idx_bn_award_status ON public.bn_award(status);

-- 2. bn_award_beneficiary
CREATE TABLE public.bn_award_beneficiary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bn_award_id uuid NOT NULL REFERENCES public.bn_award(id) ON DELETE CASCADE,
  beneficiary_ssn varchar(20),
  full_name varchar(200) NOT NULL,
  relationship varchar(40),
  share_percent numeric(7,4),
  share_amount numeric(18,2),
  start_date date,
  end_date date,
  status varchar(30) DEFAULT 'ACTIVE',
  bank_acct varchar(50),
  bank_code varchar(20),
  notes text,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_award_beneficiary_award ON public.bn_award_beneficiary(bn_award_id);

-- 3. bn_award_rate_history
CREATE TABLE public.bn_award_rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bn_award_id uuid NOT NULL REFERENCES public.bn_award(id) ON DELETE CASCADE,
  effective_from date NOT NULL,
  effective_to date,
  rate_amount numeric(18,2) NOT NULL,
  currency varchar(10) DEFAULT 'XCD',
  change_reason varchar(100),
  reference_doc varchar(100),
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_award_rate_history_award ON public.bn_award_rate_history(bn_award_id);

-- 4. bn_award_status_event
CREATE TABLE public.bn_award_status_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bn_award_id uuid NOT NULL REFERENCES public.bn_award(id) ON DELETE CASCADE,
  from_status varchar(30),
  to_status varchar(30) NOT NULL,
  event_date timestamptz NOT NULL DEFAULT now(),
  reason_code varchar(50),
  remarks text,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_award_status_event_award ON public.bn_award_status_event(bn_award_id);

-- 5. bn_payment_schedule
CREATE TABLE public.bn_payment_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bn_award_id uuid NOT NULL REFERENCES public.bn_award(id) ON DELETE CASCADE,
  schedule_period date NOT NULL,
  due_date date NOT NULL,
  gross_amount numeric(18,2) NOT NULL,
  net_amount numeric(18,2),
  deductions numeric(18,2) DEFAULT 0,
  status varchar(30) NOT NULL DEFAULT 'PENDING',
  payment_method varchar(30),
  payment_ref varchar(100),
  paid_at timestamptz,
  bn_payment_instruction_id uuid REFERENCES public.bn_payment_instruction(id) ON DELETE SET NULL,
  notes text,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_payment_schedule_award ON public.bn_payment_schedule(bn_award_id);
CREATE INDEX idx_bn_payment_schedule_due ON public.bn_payment_schedule(due_date);
CREATE INDEX idx_bn_payment_schedule_status ON public.bn_payment_schedule(status);

-- 6. bn_life_certificate
CREATE TABLE public.bn_life_certificate (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bn_award_id uuid NOT NULL REFERENCES public.bn_award(id) ON DELETE CASCADE,
  required_for_period varchar(20),
  due_date date NOT NULL,
  submitted_date date,
  verified_date date,
  verified_by varchar(50),
  status varchar(30) NOT NULL DEFAULT 'PENDING',
  document_ref varchar(200),
  verification_method varchar(40),
  remarks text,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_life_certificate_award ON public.bn_life_certificate(bn_award_id);
CREATE INDEX idx_bn_life_certificate_status ON public.bn_life_certificate(status);

-- 7. bn_overpayment
CREATE TABLE public.bn_overpayment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bn_award_id uuid NOT NULL REFERENCES public.bn_award(id) ON DELETE CASCADE,
  detected_date date NOT NULL DEFAULT CURRENT_DATE,
  period_from date,
  period_to date,
  original_amount numeric(18,2) NOT NULL,
  recovered_amount numeric(18,2) DEFAULT 0,
  outstanding_amount numeric(18,2),
  recovery_method varchar(40),
  recovery_status varchar(30) NOT NULL DEFAULT 'OPEN',
  reason_code varchar(50),
  remarks text,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_overpayment_award ON public.bn_overpayment(bn_award_id);
CREATE INDEX idx_bn_overpayment_status ON public.bn_overpayment(recovery_status);

-- 8. bn_medical_review_schedule
CREATE TABLE public.bn_medical_review_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bn_award_id uuid NOT NULL REFERENCES public.bn_award(id) ON DELETE CASCADE,
  review_type varchar(40),
  scheduled_date date NOT NULL,
  completed_date date,
  outcome varchar(40),
  examining_provider varchar(200),
  next_review_date date,
  status varchar(30) NOT NULL DEFAULT 'SCHEDULED',
  remarks text,
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_medical_review_award ON public.bn_medical_review_schedule(bn_award_id);
CREATE INDEX idx_bn_medical_review_status ON public.bn_medical_review_schedule(status);

-- 9. bn_award_suspension_event
CREATE TABLE public.bn_award_suspension_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bn_award_id uuid NOT NULL REFERENCES public.bn_award(id) ON DELETE CASCADE,
  suspension_type varchar(40),
  suspended_from date NOT NULL,
  suspended_to date,
  reason_code varchar(50),
  reason_text text,
  resumed_at timestamptz,
  resumed_by varchar(50),
  status varchar(30) NOT NULL DEFAULT 'ACTIVE',
  entered_by varchar(50),
  entered_at timestamptz NOT NULL DEFAULT now(),
  modified_by varchar(50),
  modified_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_award_suspension_award ON public.bn_award_suspension_event(bn_award_id);

-- Grants (project pattern: RLS off, role-based security)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bn_award','bn_award_beneficiary','bn_award_rate_history',
    'bn_award_status_event','bn_payment_schedule','bn_life_certificate',
    'bn_overpayment','bn_medical_review_schedule','bn_award_suspension_event'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);
  END LOOP;
END$$;

-- updated_at triggers
CREATE TRIGGER trg_bn_award_touch BEFORE UPDATE ON public.bn_award
  FOR EACH ROW EXECUTE FUNCTION public.trg_bn_award_set_updated_at();
CREATE TRIGGER trg_bn_award_beneficiary_touch BEFORE UPDATE ON public.bn_award_beneficiary
  FOR EACH ROW EXECUTE FUNCTION public.trg_bn_award_set_updated_at();
CREATE TRIGGER trg_bn_award_rate_history_touch BEFORE UPDATE ON public.bn_award_rate_history
  FOR EACH ROW EXECUTE FUNCTION public.trg_bn_award_set_updated_at();
CREATE TRIGGER trg_bn_payment_schedule_touch BEFORE UPDATE ON public.bn_payment_schedule
  FOR EACH ROW EXECUTE FUNCTION public.trg_bn_award_set_updated_at();
CREATE TRIGGER trg_bn_life_certificate_touch BEFORE UPDATE ON public.bn_life_certificate
  FOR EACH ROW EXECUTE FUNCTION public.trg_bn_award_set_updated_at();
CREATE TRIGGER trg_bn_overpayment_touch BEFORE UPDATE ON public.bn_overpayment
  FOR EACH ROW EXECUTE FUNCTION public.trg_bn_award_set_updated_at();
CREATE TRIGGER trg_bn_medical_review_touch BEFORE UPDATE ON public.bn_medical_review_schedule
  FOR EACH ROW EXECUTE FUNCTION public.trg_bn_award_set_updated_at();
CREATE TRIGGER trg_bn_award_suspension_touch BEFORE UPDATE ON public.bn_award_suspension_event
  FOR EACH ROW EXECUTE FUNCTION public.trg_bn_award_set_updated_at();

-- Audit triggers (reuse existing fn_audit_row_change)
CREATE TRIGGER trg_audit_bn_award
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_award
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_award_beneficiary
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_award_beneficiary
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_award_rate_history
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_award_rate_history
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_award_status_event
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_award_status_event
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_payment_schedule
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_payment_schedule
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_life_certificate
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_life_certificate
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_overpayment
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_overpayment
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_medical_review_schedule
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_medical_review_schedule
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
CREATE TRIGGER trg_audit_bn_award_suspension_event
  AFTER INSERT OR UPDATE OR DELETE ON public.bn_award_suspension_event
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_row_change();
