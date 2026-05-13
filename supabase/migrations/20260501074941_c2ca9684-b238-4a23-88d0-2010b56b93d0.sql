
-- ============================================================
-- Medical Benefit Setup — schema (no RLS, per project rule)
-- ============================================================

CREATE TABLE public.bn_medical_procedure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_code TEXT NOT NULL,
  procedure_name TEXT NOT NULL,
  category TEXT,
  specialty TEXT,
  requires_pre_authorization BOOLEAN NOT NULL DEFAULT false,
  requires_medical_board BOOLEAN NOT NULL DEFAULT false,
  country_code TEXT NOT NULL DEFAULT 'SKN',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by TEXT,
  modified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bn_medical_procedure_code_country_uniq UNIQUE (procedure_code, country_code, effective_from)
);
CREATE INDEX idx_bn_med_proc_country ON public.bn_medical_procedure (country_code, is_active);

CREATE TABLE public.bn_medical_facility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_code TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  jurisdiction_level TEXT NOT NULL CHECK (jurisdiction_level IN ('LOCAL','REGIONAL','INTERNATIONAL')),
  provider_type TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  address TEXT,
  contact_info JSONB,
  created_by TEXT,
  modified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bn_medical_facility_code_uniq UNIQUE (facility_code)
);
CREATE INDEX idx_bn_med_fac_jur ON public.bn_medical_facility (jurisdiction_level, country_code, is_active);

CREATE TABLE public.bn_medical_facility_procedure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.bn_medical_facility(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES public.bn_medical_procedure(id) ON DELETE CASCADE,
  availability_status TEXT NOT NULL CHECK (availability_status IN ('AVAILABLE','LIMITED','NOT_AVAILABLE')),
  notes TEXT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_by TEXT,
  modified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_med_fp_lookup ON public.bn_medical_facility_procedure (procedure_id, facility_id);

CREATE TABLE public.bn_medical_referral_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id UUID NOT NULL REFERENCES public.bn_medical_procedure(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  local_available_action TEXT NOT NULL DEFAULT 'PROCESS_LOCAL',
  regional_available_action TEXT NOT NULL DEFAULT 'REQUIRE_REGIONAL_REFERRAL',
  international_action TEXT NOT NULL DEFAULT 'REQUIRE_INTERNATIONAL_REFERRAL',
  requires_specialist_report BOOLEAN NOT NULL DEFAULT false,
  requires_board_approval BOOLEAN NOT NULL DEFAULT false,
  requires_pre_authorization BOOLEAN NOT NULL DEFAULT false,
  rule_definition JSONB,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  modified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_med_ref_lookup ON public.bn_medical_referral_rule (procedure_id, country_code, is_active);

CREATE TABLE public.bn_medical_expense_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_code TEXT NOT NULL,
  expense_name TEXT NOT NULL,
  category TEXT,
  reimbursable BOOLEAN NOT NULL DEFAULT true,
  requires_receipt BOOLEAN NOT NULL DEFAULT true,
  requires_invoice BOOLEAN NOT NULL DEFAULT false,
  default_cap NUMERIC(14,2),
  country_code TEXT NOT NULL DEFAULT 'SKN',
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by TEXT,
  modified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bn_medical_expense_code_uniq UNIQUE (expense_code, country_code)
);

CREATE TABLE public.bn_medical_reimbursement_limit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id UUID REFERENCES public.bn_medical_procedure(id) ON DELETE CASCADE,
  expense_type_id UUID REFERENCES public.bn_medical_expense_type(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  jurisdiction_level TEXT NOT NULL CHECK (jurisdiction_level IN ('LOCAL','REGIONAL','INTERNATIONAL','ANY')),
  cap_type TEXT NOT NULL CHECK (cap_type IN ('PER_CLAIM','PER_PROCEDURE','PER_EXPENSE','ANNUAL','LIFETIME')),
  cap_amount NUMERIC(14,2) NOT NULL,
  reimbursement_percent NUMERIC(5,2) NOT NULL DEFAULT 100,
  currency_code TEXT NOT NULL DEFAULT 'XCD',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by TEXT,
  modified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_med_limit_lookup ON public.bn_medical_reimbursement_limit
  (country_code, jurisdiction_level, cap_type, is_active);

-- Trigger: prevent overlapping active caps with same scope
CREATE OR REPLACE FUNCTION public.bn_medical_limit_no_overlap()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_active = false THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.bn_medical_reimbursement_limit l
    WHERE l.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND l.is_active = true
      AND l.country_code = NEW.country_code
      AND l.jurisdiction_level = NEW.jurisdiction_level
      AND l.cap_type = NEW.cap_type
      AND COALESCE(l.procedure_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(NEW.procedure_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND COALESCE(l.expense_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(NEW.expense_type_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND daterange(l.effective_from, COALESCE(l.effective_to, DATE '9999-12-31'), '[]')
          && daterange(NEW.effective_from, COALESCE(NEW.effective_to, DATE '9999-12-31'), '[]')
  ) THEN
    RAISE EXCEPTION 'Overlapping active reimbursement limit for the same procedure/expense/country/jurisdiction/cap_type and effective period';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_bn_medical_limit_no_overlap
BEFORE INSERT OR UPDATE ON public.bn_medical_reimbursement_limit
FOR EACH ROW EXECUTE FUNCTION public.bn_medical_limit_no_overlap();

CREATE TABLE public.bn_medical_claim_expense (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  procedure_id UUID REFERENCES public.bn_medical_procedure(id),
  expense_type_id UUID REFERENCES public.bn_medical_expense_type(id),
  jurisdiction_level TEXT CHECK (jurisdiction_level IN ('LOCAL','REGIONAL','INTERNATIONAL')),
  claimed_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  approved_amount NUMERIC(14,2),
  currency_code TEXT NOT NULL DEFAULT 'XCD',
  receipt_document_id UUID,
  provider_name TEXT,
  service_date DATE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_by TEXT,
  modified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_med_claim_exp_claim ON public.bn_medical_claim_expense (claim_id);

CREATE TABLE public.bn_medical_reimbursement_calc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  calculation_number INT NOT NULL DEFAULT 1,
  total_claimed NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_approved NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_payable NUMERIC(14,2) NOT NULL DEFAULT 0,
  cap_applied TEXT,
  calculation_trace JSONB,
  calculated_by TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_med_calc_claim ON public.bn_medical_reimbursement_calc (claim_id, calculation_number DESC);

CREATE TABLE public.bn_medical_recommendation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  procedure_id UUID REFERENCES public.bn_medical_procedure(id),
  recommendation_level TEXT NOT NULL CHECK (recommendation_level IN ('LOCAL','REGIONAL','INTERNATIONAL')),
  recommended_facility_id UUID REFERENCES public.bn_medical_facility(id),
  recommended_country_code TEXT,
  recommendation_reason TEXT,
  specialist_name TEXT,
  board_decision TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_by TEXT,
  modified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bn_med_reco_claim ON public.bn_medical_recommendation (claim_id);

-- updated_at triggers (re-uses existing helper if present)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $f$ BEGIN NEW.updated_at = now(); RETURN NEW; END $f$
    LANGUAGE plpgsql SET search_path = public;
  END IF;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bn_medical_procedure','bn_medical_facility','bn_medical_facility_procedure',
    'bn_medical_referral_rule','bn_medical_expense_type','bn_medical_reimbursement_limit',
    'bn_medical_claim_expense','bn_medical_recommendation'
  ] LOOP
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t, t);
  END LOOP;
END $$;
