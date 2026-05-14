
CREATE TABLE IF NOT EXISTS public.bn_country (
  country_code VARCHAR(5) PRIMARY KEY, country_name VARCHAR(100) NOT NULL, currency_code VARCHAR(3) NOT NULL DEFAULT 'XCD', currency_symbol VARCHAR(5), fiscal_year_start_month INT NOT NULL DEFAULT 1, contribution_ceiling_weekly NUMERIC(12,2), contribution_ceiling_annual NUMERIC(14,2), default_retirement_age INT NOT NULL DEFAULT 62, parameters JSONB NOT NULL DEFAULT '{}', is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now(), modified_by VARCHAR(50), modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bn_scheme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), scheme_code VARCHAR(20) NOT NULL, scheme_name VARCHAR(100) NOT NULL, description TEXT, country_code VARCHAR(5) NOT NULL REFERENCES public.bn_country(country_code), governing_legislation VARCHAR(200), status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', sort_order INT NOT NULL DEFAULT 0, entered_by VARCHAR(50), modified_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now(), modified_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(country_code, scheme_code)
);
CREATE TABLE IF NOT EXISTS public.bn_branch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), scheme_id UUID NOT NULL REFERENCES public.bn_scheme(id), branch_code VARCHAR(20) NOT NULL, branch_name VARCHAR(100) NOT NULL, description TEXT, sort_order INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(scheme_id, branch_code)
);
CREATE TABLE IF NOT EXISTS public.bn_rule_group (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), group_code VARCHAR(30) NOT NULL UNIQUE, group_name VARCHAR(100) NOT NULL, description TEXT, country_code VARCHAR(5), sort_order INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bn_formula_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), template_code VARCHAR(30) NOT NULL UNIQUE, template_name VARCHAR(100) NOT NULL, description TEXT, formula_expression TEXT NOT NULL DEFAULT '', input_variables JSONB NOT NULL DEFAULT '[]', output_type VARCHAR(20) NOT NULL DEFAULT 'CURRENCY', country_code VARCHAR(5), is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bn_document_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), profile_code VARCHAR(30) NOT NULL UNIQUE, profile_name VARCHAR(100) NOT NULL, description TEXT, country_code VARCHAR(5), is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bn_workflow_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), template_code VARCHAR(30) NOT NULL UNIQUE, template_name VARCHAR(100) NOT NULL, description TEXT, workflow_definition_id UUID, steps_config JSONB NOT NULL DEFAULT '[]', sla_config JSONB NOT NULL DEFAULT '{}', escalation_config JSONB NOT NULL DEFAULT '{}', country_code VARCHAR(5), is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bn_screen_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), template_code VARCHAR(30) NOT NULL UNIQUE, template_name VARCHAR(100) NOT NULL, description TEXT, sections JSONB NOT NULL DEFAULT '[]', layout_type VARCHAR(20) NOT NULL DEFAULT 'TABBED', country_code VARCHAR(5), is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bn_product (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), scheme_id UUID REFERENCES public.bn_scheme(id), branch_id UUID REFERENCES public.bn_branch(id), benefit_code VARCHAR(20) NOT NULL, benefit_name VARCHAR(100) NOT NULL, description TEXT, category VARCHAR(30) NOT NULL, branch VARCHAR(30) NOT NULL DEFAULT '', payment_type VARCHAR(20) NOT NULL DEFAULT 'PERIODIC', country_code VARCHAR(5) NOT NULL DEFAULT 'SKN', status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', sort_order INT NOT NULL DEFAULT 0, entered_by VARCHAR(50), modified_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now(), modified_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(country_code, benefit_code)
);
CREATE TABLE IF NOT EXISTS public.bn_product_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL REFERENCES public.bn_product(id), version_number INT NOT NULL DEFAULT 1, effective_from DATE NOT NULL, effective_to DATE, description TEXT, eligibility_config JSONB NOT NULL DEFAULT '{}', calculation_config JSONB NOT NULL DEFAULT '{}', timeline_config JSONB NOT NULL DEFAULT '{}', workflow_template_id UUID REFERENCES public.bn_workflow_template(id), document_profile_id UUID REFERENCES public.bn_document_profile(id), screen_template_id UUID REFERENCES public.bn_screen_template(id), workflow_scheme VARCHAR(50), requires_employer_verification BOOLEAN NOT NULL DEFAULT false, requires_medical_board_review BOOLEAN NOT NULL DEFAULT false, requires_means_test BOOLEAN NOT NULL DEFAULT false, max_concurrent_claims INT NOT NULL DEFAULT 1, status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', entered_by VARCHAR(50), modified_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now(), modified_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(product_id, version_number)
);
CREATE TABLE IF NOT EXISTS public.bn_eligibility_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_version_id UUID NOT NULL REFERENCES public.bn_product_version(id), rule_group_id UUID REFERENCES public.bn_rule_group(id), rule_code VARCHAR(30) NOT NULL, rule_name VARCHAR(100) NOT NULL, rule_type VARCHAR(30) NOT NULL, rule_group VARCHAR(30) NOT NULL DEFAULT '', rule_definition JSONB NOT NULL DEFAULT '{}', data_source VARCHAR(50), fail_message TEXT, fail_action VARCHAR(20) NOT NULL DEFAULT 'REJECT', sort_order INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bn_calculation_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_version_id UUID NOT NULL REFERENCES public.bn_product_version(id), formula_template_id UUID REFERENCES public.bn_formula_template(id), rule_code VARCHAR(30) NOT NULL, rule_name VARCHAR(100) NOT NULL, calc_type VARCHAR(30) NOT NULL, formula_definition JSONB NOT NULL DEFAULT '{}', variables JSONB NOT NULL DEFAULT '[]', limits JSONB NOT NULL DEFAULT '{}', rounding_rule VARCHAR(20) NOT NULL DEFAULT 'ROUND_HALF_UP', sort_order INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bn_timeline_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_version_id UUID NOT NULL REFERENCES public.bn_product_version(id), rule_code VARCHAR(30) NOT NULL, rule_name VARCHAR(100) NOT NULL, timeline_type VARCHAR(30) NOT NULL, days_value INT, weeks_value INT, months_value INT, description TEXT, sort_order INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bn_interaction_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), primary_product_id UUID NOT NULL REFERENCES public.bn_product(id), related_product_id UUID NOT NULL REFERENCES public.bn_product(id), interaction_type VARCHAR(20) NOT NULL, rule_definition JSONB NOT NULL DEFAULT '{}', effective_from DATE NOT NULL DEFAULT CURRENT_DATE, effective_to DATE, description TEXT, is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bn_override_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES public.bn_product(id), override_target VARCHAR(30) NOT NULL, field_path VARCHAR(100) NOT NULL, allowed_role VARCHAR(50) NOT NULL, requires_justification BOOLEAN NOT NULL DEFAULT true, requires_maker_checker BOOLEAN NOT NULL DEFAULT true, max_override_amount NUMERIC(14,2), effective_from DATE NOT NULL DEFAULT CURRENT_DATE, effective_to DATE, is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bn_version_approval (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_version_id UUID NOT NULL REFERENCES public.bn_product_version(id), action VARCHAR(20) NOT NULL, from_status VARCHAR(20), to_status VARCHAR(20) NOT NULL, comments TEXT, performed_by VARCHAR(50) NOT NULL, performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.bn_field_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), screen_template_id UUID NOT NULL REFERENCES public.bn_screen_template(id), field_code VARCHAR(50) NOT NULL, field_label VARCHAR(100) NOT NULL, field_type VARCHAR(30) NOT NULL DEFAULT 'TEXT', section_code VARCHAR(30) NOT NULL DEFAULT 'MAIN', is_required BOOLEAN NOT NULL DEFAULT false, validation_rules JSONB NOT NULL DEFAULT '{}', options_source VARCHAR(100), default_value VARCHAR(200), help_text TEXT, sort_order INT NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true, entered_by VARCHAR(50), entered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bn_doc_requirement' AND column_name='product_id') THEN
    ALTER TABLE public.bn_doc_requirement ADD COLUMN product_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bn_claim' AND column_name='legacy_benefit_type') THEN
    ALTER TABLE public.bn_claim ADD COLUMN legacy_benefit_type VARCHAR(20);
  END IF;
END $$;
