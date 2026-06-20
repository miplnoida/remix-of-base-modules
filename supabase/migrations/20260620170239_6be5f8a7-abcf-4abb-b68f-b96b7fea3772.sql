
-- ============ CORE TEMPLATE FRAMEWORK ============
-- NO-RLS per project standard. Grants required for PostgREST.

CREATE TABLE IF NOT EXISTS public.core_template_layout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  has_letterhead BOOLEAN NOT NULL DEFAULT true,
  header_html TEXT,
  footer_html TEXT,
  logo_url TEXT,
  institution_address TEXT,
  contact_details TEXT,
  legal_disclaimer TEXT,
  page_size TEXT NOT NULL DEFAULT 'A4',
  orientation TEXT NOT NULL DEFAULT 'portrait',
  show_page_numbers BOOLEAN NOT NULL DEFAULT true,
  show_generated_date BOOLEAN NOT NULL DEFAULT true,
  show_doc_reference BOOLEAN NOT NULL DEFAULT true,
  is_pre_printed BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template_layout TO authenticated;
GRANT ALL ON public.core_template_layout TO service_role;

CREATE TABLE IF NOT EXISTS public.core_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  module_code TEXT NOT NULL,           -- LEGAL / BENEFITS / COMPLIANCE / EMPLOYER / COMMON
  module_name TEXT,
  country_code TEXT NOT NULL DEFAULT 'KN',
  institution_code TEXT NOT NULL DEFAULT 'SSB',
  template_type TEXT NOT NULL,         -- LETTER / NOTICE / EMAIL / SMS / PDF / FORM
  template_category TEXT,
  owning_department TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT / ACTIVE / RETIRED
  active_version_id UUID,
  default_layout_id UUID REFERENCES public.core_template_layout(id),
  source_system TEXT NOT NULL DEFAULT 'CORE', -- CORE / COMPLIANCE_LEGACY
  source_ref_id UUID,                  -- pointer to legacy id when source_system != CORE
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template TO authenticated;
GRANT ALL ON public.core_template TO service_role;
CREATE INDEX IF NOT EXISTS idx_core_template_module ON public.core_template(module_code);
CREATE INDEX IF NOT EXISTS idx_core_template_status ON public.core_template(status);

CREATE TABLE IF NOT EXISTS public.core_template_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.core_template(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT / PUBLISHED / RETIRED
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  layout_id UUID REFERENCES public.core_template_layout(id),
  change_summary TEXT,
  published_at TIMESTAMPTZ,
  published_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT,
  UNIQUE (template_id, version_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template_version TO authenticated;
GRANT ALL ON public.core_template_version TO service_role;

ALTER TABLE public.core_template
  ADD CONSTRAINT core_template_active_version_fk
  FOREIGN KEY (active_version_id) REFERENCES public.core_template_version(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.core_template_section (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.core_template_version(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  content_html TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template_section TO authenticated;
GRANT ALL ON public.core_template_section TO service_role;

CREATE TABLE IF NOT EXISTS public.core_template_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_code TEXT NOT NULL UNIQUE,
  token_label TEXT NOT NULL,
  module_code TEXT NOT NULL DEFAULT 'COMMON',
  entity_type TEXT,
  resolver_service TEXT,
  sample_value TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template_token TO authenticated;
GRANT ALL ON public.core_template_token TO service_role;

CREATE TABLE IF NOT EXISTS public.core_template_schedule_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.core_template(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL,
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  channel TEXT,            -- EMAIL/SMS/PDF/PRINT
  schedule_cron TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template_schedule_policy TO authenticated;
GRANT ALL ON public.core_template_schedule_policy TO service_role;

CREATE TABLE IF NOT EXISTS public.core_document_sequence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code TEXT NOT NULL,
  doc_type_code TEXT NOT NULL,
  prefix TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_number BIGINT NOT NULL DEFAULT 0,
  padding INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_code, doc_type_code, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_document_sequence TO authenticated;
GRANT ALL ON public.core_document_sequence TO service_role;

CREATE TABLE IF NOT EXISTS public.core_generated_document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no TEXT NOT NULL UNIQUE,
  template_id UUID REFERENCES public.core_template(id) ON DELETE SET NULL,
  template_version_id UUID REFERENCES public.core_template_version(id) ON DELETE SET NULL,
  layout_id UUID REFERENCES public.core_template_layout(id) ON DELETE SET NULL,
  module_code TEXT NOT NULL,
  doc_type_code TEXT,
  entity_type TEXT,
  entity_id TEXT,
  subject TEXT,
  generated_html TEXT,
  generated_pdf_url TEXT,
  resolved_tokens JSONB,
  status TEXT NOT NULL DEFAULT 'GENERATED', -- GENERATED / SENT / FAILED / CANCELLED
  generated_by TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_generated_document TO authenticated;
GRANT ALL ON public.core_generated_document TO service_role;
CREATE INDEX IF NOT EXISTS idx_core_generated_document_entity ON public.core_generated_document(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_core_generated_document_module ON public.core_generated_document(module_code);

CREATE TABLE IF NOT EXISTS public.core_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.core_template(id) ON DELETE CASCADE,
  template_version_id UUID REFERENCES public.core_template_version(id) ON DELETE SET NULL,
  module_code TEXT NOT NULL,
  feature_area TEXT,
  screen_code TEXT,
  workflow_code TEXT,
  trigger_event TEXT,
  entity_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_template_usage TO authenticated;
GRANT ALL ON public.core_template_usage TO service_role;
CREATE INDEX IF NOT EXISTS idx_core_template_usage_module ON public.core_template_usage(module_code);
CREATE INDEX IF NOT EXISTS idx_core_template_usage_template ON public.core_template_usage(template_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.core_template_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'core_template','core_template_version','core_template_section','core_template_layout',
    'core_template_token','core_template_schedule_policy','core_document_sequence',
    'core_generated_document','core_template_usage'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.core_template_set_updated_at()', t, t);
  END LOOP;
END$$;

-- Sequence allocation RPC
CREATE OR REPLACE FUNCTION public.core_allocate_document_reference(
  p_module_code TEXT, p_doc_type_code TEXT, p_prefix TEXT
) RETURNS TEXT
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM now())::INT;
  v_next BIGINT;
  v_padding INT;
  v_prefix TEXT;
BEGIN
  INSERT INTO public.core_document_sequence(module_code, doc_type_code, prefix, year, last_number, padding)
  VALUES (p_module_code, p_doc_type_code, p_prefix, v_year, 0, 6)
  ON CONFLICT (module_code, doc_type_code, year) DO NOTHING;

  UPDATE public.core_document_sequence
     SET last_number = last_number + 1, updated_at = now()
   WHERE module_code = p_module_code AND doc_type_code = p_doc_type_code AND year = v_year
  RETURNING last_number, padding, prefix INTO v_next, v_padding, v_prefix;

  RETURN v_prefix || '-' || v_year::TEXT || '-' || lpad(v_next::TEXT, v_padding, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.core_allocate_document_reference(TEXT,TEXT,TEXT) TO authenticated, service_role;

-- ============ SEED: LAYOUTS ============
INSERT INTO public.core_template_layout (code, name, description, has_letterhead, show_page_numbers, show_generated_date, show_doc_reference, is_pre_printed)
VALUES
  ('LETTERHEAD_FULL','Institution Letterhead (Full)','Full header + footer with logo and address', true, true, true, true, false),
  ('HEADER_ONLY','Header Only','Letterhead header only', true, true, true, true, false),
  ('FOOTER_ONLY','Footer Only','Footer only with disclaimer', false, true, true, true, false),
  ('NO_LETTERHEAD','Plain (No Letterhead)','Plain layout for internal documents', false, true, true, true, false),
  ('PRE_PRINTED','Pre-Printed Stationery','For printing on pre-printed letterhead paper', false, false, true, true, true)
ON CONFLICT (code) DO NOTHING;

-- ============ SEED: TOKENS ============
INSERT INTO public.core_template_token (token_code, token_label, module_code, entity_type, resolver_service, sample_value, description) VALUES
  ('document.reference_no','Document Reference No','COMMON','document','coreDocumentResolver','LG-NOT-2026-000001','Unique document reference'),
  ('document.generated_date','Generated Date','COMMON','document','coreDocumentResolver','20/06/2026','Date of generation'),
  ('institution.name','Institution Name','COMMON','institution','institutionResolver','Social Security Board','Owning institution'),
  ('institution.address','Institution Address','COMMON','institution','institutionResolver','Bay Road, Basseterre','Institution address'),
  ('institution.contact','Institution Contact','COMMON','institution','institutionResolver','+1 869 465 2535','Institution contact'),
  ('employer.name','Employer Name','EMPLOYER','employer','employerResolver','ABC Ltd','Employer name'),
  ('employer.account_no','Employer Account No','EMPLOYER','employer','employerResolver','E0001234','Employer account number'),
  ('legal.case_no','Legal Case No','LEGAL','lg_case','legalCaseResolver','LG-2026-0001','Legal case number'),
  ('legal.stage','Legal Stage','LEGAL','lg_case','legalCaseResolver','HEARING','Current legal stage'),
  ('legal.next_hearing_date','Next Hearing Date','LEGAL','lg_hearing','legalCaseResolver','25/07/2026','Next scheduled hearing'),
  ('legal.court_case_no','Court Case No','LEGAL','lg_case','legalCaseResolver','MAG/2026/123','External court case number'),
  ('legal.amount_due','Amount Due','LEGAL','lg_case','legalCaseResolver','XCD 12,500.00','Outstanding amount in case'),
  ('compliance.case_no','Compliance Case No','COMPLIANCE','ce_case','complianceResolver','CMP-2026-0001','Compliance case number'),
  ('payment_arrangement.reference','Payment Arrangement Ref','COMPLIANCE','ce_payment_arrangement','complianceResolver','PA-2026-0001','Arrangement reference'),
  ('payment_arrangement.outstanding_amount','Outstanding Amount','COMPLIANCE','ce_payment_arrangement','complianceResolver','XCD 5,200.00','Outstanding arrangement amount'),
  ('benefit.award_no','Benefit Award No','BENEFITS','bn_award','benefitResolver','BN-AWD-2026-000001','Benefit award number'),
  ('benefit.amount','Benefit Amount','BENEFITS','bn_award','benefitResolver','XCD 950.00','Benefit payment amount')
ON CONFLICT (token_code) DO NOTHING;

-- ============ SEED: DOCUMENT SEQUENCES (current year) ============
INSERT INTO public.core_document_sequence(module_code, doc_type_code, prefix, year, last_number, padding) VALUES
  ('LEGAL','NOTICE','LG-NOT', EXTRACT(YEAR FROM now())::INT, 0, 6),
  ('LEGAL','HEARING','LG-HRN', EXTRACT(YEAR FROM now())::INT, 0, 6),
  ('LEGAL','DEMAND','LG-DMD', EXTRACT(YEAR FROM now())::INT, 0, 6),
  ('LEGAL','ORDER','LG-ORD', EXTRACT(YEAR FROM now())::INT, 0, 6),
  ('LEGAL','SETTLEMENT','LG-STL', EXTRACT(YEAR FROM now())::INT, 0, 6),
  ('LEGAL','FEE','LG-FEE', EXTRACT(YEAR FROM now())::INT, 0, 6),
  ('LEGAL','WAIVER','LG-WVR', EXTRACT(YEAR FROM now())::INT, 0, 6),
  ('BENEFITS','AWARD','BN-AWD', EXTRACT(YEAR FROM now())::INT, 0, 6),
  ('COMPLIANCE','DEMAND','CMP-DMD', EXTRACT(YEAR FROM now())::INT, 0, 6),
  ('EMPLOYER','REGISTRATION','EMP-REG', EXTRACT(YEAR FROM now())::INT, 0, 6)
ON CONFLICT (module_code, doc_type_code, year) DO NOTHING;

-- ============ SEED: LEGAL TEMPLATES (12) ============
DO $$
DECLARE
  v_layout UUID;
  v_tpl UUID;
  v_ver UUID;
  v_row RECORD;
BEGIN
  SELECT id INTO v_layout FROM public.core_template_layout WHERE code = 'LETTERHEAD_FULL';

  FOR v_row IN SELECT * FROM (VALUES
    ('LG-TPL-DEMAND-LETTER','Demand Letter','LETTER','DEMAND','DEMAND','Demand for Payment','<p>Dear {{employer.name}},</p><p>Re: Case {{legal.case_no}} — Amount Due {{legal.amount_due}}.</p><p>This is a formal demand for payment.</p>'),
    ('LG-TPL-FINAL-DEMAND','Final Demand','LETTER','DEMAND','FINAL_DEMAND','Final Demand for Payment','<p>Dear {{employer.name}},</p><p>Final demand for {{legal.amount_due}} in case {{legal.case_no}}.</p>'),
    ('LG-TPL-NBA','Notice Before Action','NOTICE','NOTICE','NBA','Notice Before Action','<p>Take notice that legal action will commence in 14 days in case {{legal.case_no}}.</p>'),
    ('LG-TPL-HEARING-NOTICE','Hearing Notice','NOTICE','HEARING','HEARING','Notice of Hearing','<p>Hearing for case {{legal.case_no}} is scheduled on {{legal.next_hearing_date}}.</p>'),
    ('LG-TPL-COURT-COVER','Court Filing Cover Letter','LETTER','COURT','COURT_COVER','Court Filing — {{legal.court_case_no}}','<p>Enclosed please find filings for {{legal.court_case_no}}.</p>'),
    ('LG-TPL-SETTLEMENT-OFFER','Settlement Offer','LETTER','SETTLEMENT','SETTLEMENT','Settlement Offer — {{legal.case_no}}','<p>We propose settlement of {{legal.amount_due}} in case {{legal.case_no}}.</p>'),
    ('LG-TPL-PAYMENT-DEFAULT','Payment Default Notice','NOTICE','ENFORCEMENT','PAYMENT_DEFAULT','Payment Default — {{legal.case_no}}','<p>Default on payment arrangement noted in case {{legal.case_no}}.</p>'),
    ('LG-TPL-JUDGMENT','Judgment Notice','NOTICE','COURT','JUDGMENT','Judgment Notice — {{legal.case_no}}','<p>Judgment has been entered in case {{legal.case_no}}.</p>'),
    ('LG-TPL-ENFORCEMENT','Enforcement Notice','NOTICE','ENFORCEMENT','ENFORCEMENT','Enforcement Notice — {{legal.case_no}}','<p>Enforcement action authorised in case {{legal.case_no}}.</p>'),
    ('LG-TPL-FEE-NOTICE','Fee Notice','NOTICE','FEE','FEE','Fee Notice — {{legal.case_no}}','<p>Fees totalling {{legal.amount_due}} are payable in case {{legal.case_no}}.</p>'),
    ('LG-TPL-WAIVER-APPROVE','Waiver Approval Letter','LETTER','WAIVER','WAIVER_APPROVE','Waiver Approved — {{legal.case_no}}','<p>Your waiver request in case {{legal.case_no}} has been approved.</p>'),
    ('LG-TPL-WAIVER-REJECT','Waiver Rejection Letter','LETTER','WAIVER','WAIVER_REJECT','Waiver Rejected — {{legal.case_no}}','<p>Your waiver request in case {{legal.case_no}} has been rejected.</p>')
  ) AS s(code,name,template_type,template_category,doc_code,subject,body)
  LOOP
    INSERT INTO public.core_template(code,name,module_code,module_name,template_type,template_category,owning_department,status,default_layout_id,source_system,is_active,created_by)
    VALUES (v_row.code, v_row.name, 'LEGAL','Legal',v_row.template_type,v_row.template_category,'LEGAL','ACTIVE',v_layout,'CORE',true,'SEED-SYS')
    ON CONFLICT (code) DO NOTHING
    RETURNING id INTO v_tpl;

    IF v_tpl IS NULL THEN
      SELECT id INTO v_tpl FROM public.core_template WHERE code = v_row.code;
    END IF;

    INSERT INTO public.core_template_version(template_id, version_no, status, subject, body_html, layout_id, published_at, published_by, created_by)
    VALUES (v_tpl, 1, 'PUBLISHED', v_row.subject, v_row.body, v_layout, now(), 'SEED-SYS', 'SEED-SYS')
    ON CONFLICT (template_id, version_no) DO NOTHING
    RETURNING id INTO v_ver;

    IF v_ver IS NULL THEN
      SELECT id INTO v_ver FROM public.core_template_version WHERE template_id = v_tpl AND version_no = 1;
    END IF;

    UPDATE public.core_template SET active_version_id = v_ver WHERE id = v_tpl AND active_version_id IS NULL;

    -- Usage record
    INSERT INTO public.core_template_usage(template_id, template_version_id, module_code, feature_area, screen_code, entity_type, trigger_event, is_active)
    VALUES (v_tpl, v_ver, 'LEGAL', v_row.template_category, 'lg_notice_generation',
      CASE WHEN v_row.template_category IN ('HEARING','COURT') THEN 'lg_hearing'
           WHEN v_row.template_category = 'SETTLEMENT' THEN 'lg_settlement'
           WHEN v_row.template_category = 'FEE' THEN 'lg_fee_charge'
           WHEN v_row.template_category = 'WAIVER' THEN 'lg_fee_waiver'
           ELSE 'lg_case' END,
      'MANUAL_GENERATE', true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END$$;
