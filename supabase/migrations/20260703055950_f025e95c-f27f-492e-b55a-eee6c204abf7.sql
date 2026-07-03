
-- =========================================================
-- EPIC-07 Phase 1 — Post-Judgment Legal Recovery foundation
-- =========================================================

-- Shared trigger for updated_at
CREATE OR REPLACE FUNCTION public.lg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ---------- Judgment Compliance ----------
CREATE TABLE IF NOT EXISTS public.lg_judgment_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.lg_order(id) ON DELETE CASCADE,
  case_id UUID NOT NULL,
  ordered_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  interest_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  court_costs NUMERIC(18,2) NOT NULL DEFAULT 0,
  partial_compliance_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  compliance_due_date DATE,
  compliance_status TEXT NOT NULL DEFAULT 'PENDING',
  compliance_officer_id UUID,
  compliance_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  compliance_notes TEXT,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_judgment_compliance TO authenticated;
GRANT ALL ON public.lg_judgment_compliance TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_jc_order ON public.lg_judgment_compliance(order_id);
CREATE INDEX IF NOT EXISTS ix_lg_jc_case ON public.lg_judgment_compliance(case_id);
CREATE INDEX IF NOT EXISTS ix_lg_jc_status ON public.lg_judgment_compliance(compliance_status);
CREATE TRIGGER trg_lg_jc_updated BEFORE UPDATE ON public.lg_judgment_compliance
  FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();

-- ---------- Consent Order ----------
CREATE TABLE IF NOT EXISTS public.lg_consent_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL,
  order_id UUID REFERENCES public.lg_order(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  installment_count INT NOT NULL DEFAULT 0,
  missed_installments INT NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  court_approval_required BOOLEAN NOT NULL DEFAULT false,
  court_approved_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  breach_recommendation TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_consent_order TO authenticated;
GRANT ALL ON public.lg_consent_order TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_consent_case ON public.lg_consent_order(case_id);
CREATE INDEX IF NOT EXISTS ix_lg_consent_status ON public.lg_consent_order(status);
CREATE TRIGGER trg_lg_consent_updated BEFORE UPDATE ON public.lg_consent_order
  FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.lg_consent_installment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_order_id UUID NOT NULL REFERENCES public.lg_consent_order(id) ON DELETE CASCADE,
  seq INT NOT NULL,
  due_date DATE NOT NULL,
  amount_due NUMERIC(18,2) NOT NULL,
  amount_paid NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_consent_installment TO authenticated;
GRANT ALL ON public.lg_consent_installment TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_ci_consent ON public.lg_consent_installment(consent_order_id);
CREATE INDEX IF NOT EXISTS ix_lg_ci_due ON public.lg_consent_installment(due_date);
CREATE TRIGGER trg_lg_ci_updated BEFORE UPDATE ON public.lg_consent_installment
  FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.lg_consent_variation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_order_id UUID NOT NULL REFERENCES public.lg_consent_order(id) ON DELETE CASCADE,
  variation_type TEXT NOT NULL,
  requested_by UUID,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  proposed_terms JSONB,
  status TEXT NOT NULL DEFAULT 'PENDING',
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_consent_variation TO authenticated;
GRANT ALL ON public.lg_consent_variation TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_cv_consent ON public.lg_consent_variation(consent_order_id);

-- ---------- External Counsel ----------
CREATE TABLE IF NOT EXISTS public.lg_external_counsel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  law_firm_name TEXT NOT NULL,
  primary_attorney TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  practice_areas TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  performance_rating NUMERIC(3,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_external_counsel TO authenticated;
GRANT ALL ON public.lg_external_counsel TO service_role;
CREATE TRIGGER trg_lg_ec_updated BEFORE UPDATE ON public.lg_external_counsel
  FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.lg_external_counsel_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL,
  counsel_id UUID NOT NULL REFERENCES public.lg_external_counsel(id),
  engaged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  disengaged_at DATE,
  instructions TEXT,
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  fee_estimate NUMERIC(18,2),
  fee_incurred NUMERIC(18,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_external_counsel_engagement TO authenticated;
GRANT ALL ON public.lg_external_counsel_engagement TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_ece_case ON public.lg_external_counsel_engagement(case_id);
CREATE INDEX IF NOT EXISTS ix_lg_ece_counsel ON public.lg_external_counsel_engagement(counsel_id);
CREATE TRIGGER trg_lg_ece_updated BEFORE UPDATE ON public.lg_external_counsel_engagement
  FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.lg_external_counsel_invoice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.lg_external_counsel_engagement(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  paid_at TIMESTAMPTZ,
  is_recoverable BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_external_counsel_invoice TO authenticated;
GRANT ALL ON public.lg_external_counsel_invoice TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_eci_eng ON public.lg_external_counsel_invoice(engagement_id);

-- ---------- Court Filing ----------
CREATE TABLE IF NOT EXISTS public.lg_court_filing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL,
  code TEXT NOT NULL UNIQUE,
  filing_type TEXT NOT NULL,
  title TEXT NOT NULL,
  court_id UUID,
  filed_at DATE,
  served_at DATE,
  deadline DATE,
  court_date DATE,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  outcome TEXT,
  filed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_court_filing TO authenticated;
GRANT ALL ON public.lg_court_filing TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_cf_case ON public.lg_court_filing(case_id);
CREATE INDEX IF NOT EXISTS ix_lg_cf_status ON public.lg_court_filing(status);
CREATE TRIGGER trg_lg_cf_updated BEFORE UPDATE ON public.lg_court_filing
  FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();

-- ---------- Legal Cost ----------
CREATE TABLE IF NOT EXISTS public.lg_legal_cost (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL,
  cost_type TEXT NOT NULL,
  description TEXT,
  incurred_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(18,2) NOT NULL,
  recovered_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  is_court_awarded BOOLEAN NOT NULL DEFAULT false,
  linked_filing_id UUID REFERENCES public.lg_court_filing(id) ON DELETE SET NULL,
  linked_engagement_id UUID REFERENCES public.lg_external_counsel_engagement(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'OUTSTANDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_legal_cost TO authenticated;
GRANT ALL ON public.lg_legal_cost TO service_role;
CREATE INDEX IF NOT EXISTS ix_lg_lc_case ON public.lg_legal_cost(case_id);
CREATE INDEX IF NOT EXISTS ix_lg_lc_type ON public.lg_legal_cost(cost_type);
CREATE TRIGGER trg_lg_lc_updated BEFORE UPDATE ON public.lg_legal_cost
  FOR EACH ROW EXECUTE FUNCTION public.lg_set_updated_at();

-- ---------- Junctions to liabilities ----------
CREATE TABLE IF NOT EXISTS public.lg_consent_liability (
  consent_order_id UUID NOT NULL REFERENCES public.lg_consent_order(id) ON DELETE CASCADE,
  liability_id UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consent_order_id, liability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_consent_liability TO authenticated;
GRANT ALL ON public.lg_consent_liability TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_filing_liability (
  filing_id UUID NOT NULL REFERENCES public.lg_court_filing(id) ON DELETE CASCADE,
  liability_id UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (filing_id, liability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_filing_liability TO authenticated;
GRANT ALL ON public.lg_filing_liability TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_cost_liability (
  cost_id UUID NOT NULL REFERENCES public.lg_legal_cost(id) ON DELETE CASCADE,
  liability_id UUID NOT NULL REFERENCES public.lg_recoverable_liability(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cost_id, liability_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_cost_liability TO authenticated;
GRANT ALL ON public.lg_cost_liability TO service_role;

-- ---------- Audit tables ----------
CREATE TABLE IF NOT EXISTS public.lg_judgment_compliance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_id UUID NOT NULL,
  action TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  before_json JSONB,
  after_json JSONB,
  notes TEXT
);
GRANT SELECT, INSERT ON public.lg_judgment_compliance_audit TO authenticated;
GRANT ALL ON public.lg_judgment_compliance_audit TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_consent_order_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_order_id UUID NOT NULL,
  action TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  before_json JSONB,
  after_json JSONB,
  notes TEXT
);
GRANT SELECT, INSERT ON public.lg_consent_order_audit TO authenticated;
GRANT ALL ON public.lg_consent_order_audit TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_court_filing_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filing_id UUID NOT NULL,
  action TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  before_json JSONB,
  after_json JSONB,
  notes TEXT
);
GRANT SELECT, INSERT ON public.lg_court_filing_audit TO authenticated;
GRANT ALL ON public.lg_court_filing_audit TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_legal_cost_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_id UUID NOT NULL,
  action TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  before_json JSONB,
  after_json JSONB,
  notes TEXT
);
GRANT SELECT, INSERT ON public.lg_legal_cost_audit TO authenticated;
GRANT ALL ON public.lg_legal_cost_audit TO service_role;
