
-- 1. bn_country_id_rule
CREATE TABLE public.bn_country_id_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(5) NOT NULL REFERENCES public.bn_country(country_code),
  id_type VARCHAR(30) NOT NULL,
  id_label VARCHAR(100) NOT NULL,
  format_pattern VARCHAR(100) NOT NULL DEFAULT '',
  format_mask VARCHAR(50) NOT NULL DEFAULT '',
  digit_length INT NOT NULL DEFAULT 6,
  has_check_digit BOOLEAN NOT NULL DEFAULT false,
  check_digit_algorithm VARCHAR(30),
  example_value VARCHAR(50),
  is_primary BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  entered_by VARCHAR(50),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, id_type)
);

-- 2. bn_country_address_model
CREATE TABLE public.bn_country_address_model (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(5) NOT NULL REFERENCES public.bn_country(country_code),
  field_code VARCHAR(30) NOT NULL,
  field_label VARCHAR(100) NOT NULL,
  field_type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
  is_required BOOLEAN NOT NULL DEFAULT false,
  options_source VARCHAR(100),
  validation_pattern VARCHAR(100),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  entered_by VARCHAR(50),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, field_code)
);

-- 3. bn_country_participant_type
CREATE TABLE public.bn_country_participant_type (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(5) NOT NULL REFERENCES public.bn_country(country_code),
  type_code VARCHAR(30) NOT NULL,
  type_name VARCHAR(100) NOT NULL,
  participant_role VARCHAR(20) NOT NULL DEFAULT 'CLAIMANT',
  min_age INT,
  max_age INT,
  requires_id BOOLEAN NOT NULL DEFAULT true,
  requires_relationship_proof BOOLEAN NOT NULL DEFAULT false,
  allowed_products TEXT[],
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  entered_by VARCHAR(50),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, type_code)
);

-- 4. bn_country_payment_config
CREATE TABLE public.bn_country_payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(5) NOT NULL REFERENCES public.bn_country(country_code),
  payment_method VARCHAR(30) NOT NULL,
  method_label VARCHAR(100) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  requires_bank_account BOOLEAN NOT NULL DEFAULT false,
  requires_mobile_number BOOLEAN NOT NULL DEFAULT false,
  processing_days INT NOT NULL DEFAULT 3,
  cut_off_day INT,
  payment_cycle VARCHAR(20) NOT NULL DEFAULT 'WEEKLY',
  calendar_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  entered_by VARCHAR(50),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, payment_method)
);

-- 5. bn_country_legal_ref
CREATE TABLE public.bn_country_legal_ref (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(5) NOT NULL REFERENCES public.bn_country(country_code),
  ref_code VARCHAR(50) NOT NULL,
  ref_title VARCHAR(200) NOT NULL,
  ref_section VARCHAR(100),
  ref_url TEXT,
  applicable_products TEXT[],
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  version_number INT NOT NULL DEFAULT 1,
  supersedes_id UUID REFERENCES public.bn_country_legal_ref(id),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  entered_by VARCHAR(50),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, ref_code, version_number)
);

-- Schema mods
ALTER TABLE public.bn_service_doc_type ADD COLUMN IF NOT EXISTS country_code VARCHAR(5) REFERENCES public.bn_country(country_code);
ALTER TABLE public.bn_reason_code ADD COLUMN IF NOT EXISTS country_code VARCHAR(5) REFERENCES public.bn_country(country_code);
ALTER TABLE public.bn_country ADD COLUMN IF NOT EXISTS locale VARCHAR(10) NOT NULL DEFAULT 'en';
ALTER TABLE public.bn_country ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) NOT NULL DEFAULT 'America/St_Kitts';
ALTER TABLE public.bn_country ADD COLUMN IF NOT EXISTS address_model_version INT NOT NULL DEFAULT 1;

-- SKN seeds
UPDATE public.bn_country SET locale = 'en', timezone = 'America/St_Kitts', address_model_version = 1 WHERE country_code = 'SKN';

INSERT INTO public.bn_country_id_rule (country_code, id_type, id_label, format_pattern, format_mask, digit_length, has_check_digit, example_value, is_primary)
VALUES ('SKN', 'SSN', 'Social Security Number', '^\d{6}$', 'XXXXXX', 6, false, '123456', true)
ON CONFLICT (country_code, id_type) DO NOTHING;

INSERT INTO public.bn_country_address_model (country_code, field_code, field_label, field_type, is_required, options_source, sort_order) VALUES
  ('SKN', 'LINE_1', 'Street Address', 'TEXT', true, NULL, 1),
  ('SKN', 'LINE_2', 'Address Line 2', 'TEXT', false, NULL, 2),
  ('SKN', 'CITY', 'City / Town', 'TEXT', false, NULL, 3),
  ('SKN', 'PARISH', 'Parish', 'SELECT', true, 'tb_parish', 4),
  ('SKN', 'ISLAND', 'Island', 'SELECT', true, NULL, 5),
  ('SKN', 'COUNTRY', 'Country', 'TEXT', false, NULL, 6)
ON CONFLICT (country_code, field_code) DO NOTHING;

INSERT INTO public.bn_country_participant_type (country_code, type_code, type_name, participant_role, requires_id, requires_relationship_proof, sort_order) VALUES
  ('SKN', 'INSURED_PERSON', 'Insured Person', 'CLAIMANT', true, false, 1),
  ('SKN', 'EMPLOYER', 'Employer', 'EMPLOYER', true, false, 2),
  ('SKN', 'SPOUSE', 'Spouse', 'BENEFICIARY', true, true, 3),
  ('SKN', 'CHILD', 'Child', 'BENEFICIARY', true, true, 4),
  ('SKN', 'DEPENDENT', 'Dependent', 'BENEFICIARY', true, true, 5),
  ('SKN', 'GUARDIAN', 'Guardian / Legal Representative', 'BENEFICIARY', true, true, 6),
  ('SKN', 'ESTATE', 'Estate / Executor', 'BENEFICIARY', false, true, 7),
  ('SKN', 'FUNERAL_ARRANGER', 'Funeral Arranger', 'CLAIMANT', true, false, 8),
  ('SKN', 'WITNESS', 'Witness', 'WITNESS', true, false, 9)
ON CONFLICT (country_code, type_code) DO NOTHING;

INSERT INTO public.bn_country_payment_config (country_code, payment_method, method_label, is_default, requires_bank_account, requires_mobile_number, processing_days, payment_cycle) VALUES
  ('SKN', 'EFT', 'Electronic Funds Transfer', true, true, false, 3, 'WEEKLY'),
  ('SKN', 'CHEQUE', 'Cheque', false, false, false, 5, 'WEEKLY')
ON CONFLICT (country_code, payment_method) DO NOTHING;

INSERT INTO public.bn_country_legal_ref (country_code, ref_code, ref_title, ref_section, effective_from) VALUES
  ('SKN', 'SSA_CAP329', 'Social Security Act, Cap 329', NULL, '1978-02-01'),
  ('SKN', 'SSA_PART3', 'Social Security Act, Cap 329', 'Part III — Short-Term Benefits', '1978-02-01'),
  ('SKN', 'SSA_PART4', 'Social Security Act, Cap 329', 'Part IV — Employment Injury Benefits', '1978-02-01'),
  ('SKN', 'SSA_PART5', 'Social Security Act, Cap 329', 'Part V — Long-Term Benefits', '1978-02-01'),
  ('SKN', 'SSA_PART6', 'Social Security Act, Cap 329', 'Part VI — Non-Contributory Pensions', '1978-02-01'),
  ('SKN', 'SSR_2012', 'Social Security (Amendment) Regulations, 2012', NULL, '2012-01-01'),
  ('SKN', 'NCP_ACT', 'Non-Contributory Pensions Act', NULL, '1978-02-01')
ON CONFLICT (country_code, ref_code, version_number) DO NOTHING;

UPDATE public.bn_service_doc_type SET country_code = 'SKN' WHERE country_code IS NULL;
UPDATE public.bn_reason_code SET country_code = 'SKN' WHERE country_code IS NULL;
