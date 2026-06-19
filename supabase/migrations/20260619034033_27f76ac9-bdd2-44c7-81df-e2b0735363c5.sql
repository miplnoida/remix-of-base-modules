
-- Phase 2: governance classification
DO $$ BEGIN
  CREATE TYPE public.bn_governance_class AS ENUM ('SYSTEM','CONFIGURATION','REGULATORY','FINANCIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.bn_config_entity_registry (
  entity_type                 text PRIMARY KEY,
  governance_class            public.bn_governance_class NOT NULL,
  lifecycle_required          boolean NOT NULL DEFAULT true,
  effective_dating_required   boolean NOT NULL DEFAULT false,
  approval_policy_code        text,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  created_by                  text,
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  updated_by                  text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_config_entity_registry TO authenticated;
GRANT ALL ON public.bn_config_entity_registry TO service_role;

INSERT INTO public.bn_config_entity_registry (entity_type, governance_class, lifecycle_required, effective_dating_required, approval_policy_code, notes) VALUES
  ('bn_country','SYSTEM',false,false,NULL,'Country master'),
  ('bn_country_address_model','SYSTEM',false,false,NULL,'Address model'),
  ('bn_country_id_rule','CONFIGURATION',true,false,'BN_CONFIG_MANAGER','National ID rules'),
  ('bn_country_participant_type','CONFIGURATION',true,true,'BN_CONFIG_MANAGER','Participant roles'),
  ('bn_country_legal_ref','REGULATORY',true,true,'BN_LEGAL_APPROVER','Legal references'),
  ('bn_reference_group','CONFIGURATION',true,false,'BN_CONFIG_MANAGER','Reference groups'),
  ('bn_reference_value','CONFIGURATION',true,true,'BN_CONFIG_MANAGER','Reference values'),
  ('bn_eligibility_rule','REGULATORY',true,true,'BN_LEGAL_APPROVER','Eligibility rules'),
  ('bn_rule_catalogue','REGULATORY',true,true,'BN_LEGAL_APPROVER','Rule catalogue'),
  ('bn_formula_template','FINANCIAL',true,true,'BN_FINANCE_APPROVER','Formula library'),
  ('bn_formula_version','FINANCIAL',true,true,'BN_FINANCE_APPROVER','Formula versions'),
  ('bn_rate_table','FINANCIAL',true,true,'BN_FINANCE_APPROVER','Rate tables'),
  ('bn_medical_tariff_table','FINANCIAL',true,true,'BN_FINANCE_APPROVER','Medical tariffs'),
  ('bn_medical_reimbursement_limit','FINANCIAL',true,true,'BN_FINANCE_APPROVER','Reimbursement limits'),
  ('bn_product','FINANCIAL',true,false,'BN_FINANCE_APPROVER','Product master'),
  ('bn_product_version','FINANCIAL',true,true,'BN_FINANCE_APPROVER','Product versions'),
  ('bn_product_parameter','FINANCIAL',true,true,'BN_FINANCE_APPROVER','Product parameters'),
  ('bn_product_channel_config','CONFIGURATION',true,false,'BN_CONFIG_MANAGER','Channel config'),
  ('bn_product_participant_config','CONFIGURATION',true,false,'BN_CONFIG_MANAGER','Product participant rules'),
  ('bn_approval_policy','CONFIGURATION',true,false,'BN_CONFIG_MANAGER','Approval policies'),
  ('bn_override_policy','REGULATORY',true,false,'BN_LEGAL_APPROVER','Override policies'),
  ('bn_doc_requirement','CONFIGURATION',true,false,'BN_CONFIG_MANAGER','Document requirements'),
  ('bn_service_doc_type','CONFIGURATION',true,false,'BN_CONFIG_MANAGER','Doc types'),
  ('bn_comm_mapping','CONFIGURATION',true,false,'BN_CONFIG_MANAGER','Communication mapping'),
  ('notification_templates','CONFIGURATION',true,true,'BN_CONFIG_MANAGER','Notification templates'),
  ('bn_workflow_template','CONFIGURATION',true,false,'BN_CONFIG_MANAGER','Workflow templates'),
  ('workflow_steps','CONFIGURATION',true,false,'BN_CONFIG_MANAGER','Workflow steps'),
  ('bn_calculation_rule','FINANCIAL',true,true,'BN_FINANCE_APPROVER','Calculation rules'),
  ('bn_country_payment_config','FINANCIAL',true,false,'BN_FINANCE_APPROVER','Payment config'),
  ('bn_payment_method','CONFIGURATION',true,false,'BN_CONFIG_MANAGER','Payment methods'),
  ('bn_eft_format','CONFIGURATION',true,false,'BN_CONFIG_MANAGER','EFT formats')
ON CONFLICT (entity_type) DO UPDATE
  SET governance_class = EXCLUDED.governance_class,
      effective_dating_required = EXCLUDED.effective_dating_required,
      approval_policy_code = EXCLUDED.approval_policy_code,
      updated_at = now();

-- Phase 3: lifecycle vocabulary + normalisation view
DO $$ BEGIN
  CREATE TYPE public.bn_lifecycle_state AS ENUM ('DRAFT','IN_REVIEW','APPROVED','ACTIVE','RETIRED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.bn_normalise_lifecycle(p_raw text)
RETURNS public.bn_lifecycle_state LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE upper(coalesce(p_raw,''))
    WHEN 'DRAFT' THEN 'DRAFT'::public.bn_lifecycle_state
    WHEN 'IN_REVIEW' THEN 'IN_REVIEW'
    WHEN 'PENDING' THEN 'IN_REVIEW'
    WHEN 'SUBMITTED' THEN 'IN_REVIEW'
    WHEN 'APPROVED' THEN 'APPROVED'
    WHEN 'ACTIVE' THEN 'ACTIVE'
    WHEN 'PUBLISHED' THEN 'ACTIVE'
    WHEN 'TRUE' THEN 'ACTIVE'
    WHEN 'RETIRED' THEN 'RETIRED'
    WHEN 'INACTIVE' THEN 'RETIRED'
    WHEN 'FALSE' THEN 'RETIRED'
    WHEN 'REJECTED' THEN 'REJECTED'
    ELSE 'DRAFT'
  END;
$$;

CREATE OR REPLACE VIEW public.v_bn_config_lifecycle AS
  SELECT 'bn_country_participant_type'::text AS entity_type, id::text AS entity_id,
         public.bn_normalise_lifecycle(lifecycle_status::text) AS lifecycle_state
    FROM public.bn_country_participant_type
  UNION ALL
  SELECT 'bn_reference_value', id::text,
         public.bn_normalise_lifecycle(CASE WHEN is_active THEN 'ACTIVE' ELSE 'RETIRED' END)
    FROM public.bn_reference_value
  UNION ALL
  SELECT 'bn_product_version', id::text, public.bn_normalise_lifecycle(status::text)
    FROM public.bn_product_version
  UNION ALL
  SELECT 'bn_formula_version', id::text,
         public.bn_normalise_lifecycle(coalesce(governance_status::text, CASE WHEN is_active THEN 'ACTIVE' ELSE 'DRAFT' END))
    FROM public.bn_formula_version
  UNION ALL
  SELECT 'bn_rate_table', id::text, public.bn_normalise_lifecycle(status::text)
    FROM public.bn_rate_table
  UNION ALL
  SELECT 'bn_medical_tariff_table', id::text, public.bn_normalise_lifecycle(status::text)
    FROM public.bn_medical_tariff_table
  UNION ALL
  SELECT 'bn_rule_catalogue', id::text, public.bn_normalise_lifecycle(rule_status::text)
    FROM public.bn_rule_catalogue
  UNION ALL
  SELECT 'bn_formula_template', id::text,
         public.bn_normalise_lifecycle(coalesce(governance_status::text, CASE WHEN is_active THEN 'ACTIVE' ELSE 'DRAFT' END))
    FROM public.bn_formula_template;
GRANT SELECT ON public.v_bn_config_lifecycle TO authenticated, service_role;

-- Phase 4: standard audit columns
ALTER TABLE public.bn_country_legal_ref
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.bn_country_participant_type
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.bn_workflow_template
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.workflow_steps
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.bn_calculation_rule
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.bn_override_policy
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.bn_formula_version
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by text;

ALTER TABLE public.bn_rate_table
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by text;

CREATE OR REPLACE FUNCTION public.bn_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bn_country_legal_ref','bn_country_participant_type','bn_workflow_template','bn_calculation_rule','bn_override_policy']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_touch ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bn_touch_updated_at()', t, t);
  END LOOP;
END $$;

-- Phase 5: effective dating gaps
ALTER TABLE public.bn_country_participant_type
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to   date;

ALTER TABLE public.notification_templates
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to   date;

ALTER TABLE public.ce_document_templates
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to   date;

ALTER TABLE public.ia_document_templates
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to   date;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bn_country_participant_type','notification_templates','ce_document_templates','ia_document_templates','bn_country_legal_ref','bn_rate_table','bn_medical_tariff_table','bn_formula_version','bn_reference_value']
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (effective_to IS NULL OR effective_to >= effective_from)', t, 'chk_'||t||'_eff_range');
    EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END;
  END LOOP;
END $$;

-- Phase 6: Country Configuration Package
CREATE TABLE IF NOT EXISTS public.bn_country_config_package (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code    text NOT NULL,
  package_code    text NOT NULL UNIQUE,
  label           text NOT NULL,
  status          public.bn_lifecycle_state NOT NULL DEFAULT 'DRAFT',
  activated_at    timestamptz,
  activated_by    text,
  retired_at      timestamptz,
  retired_by      text,
  immutable_hash  text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_country_config_package TO authenticated;
GRANT ALL ON public.bn_country_config_package TO service_role;

CREATE TABLE IF NOT EXISTS public.bn_country_config_package_item (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      uuid NOT NULL REFERENCES public.bn_country_config_package(id) ON DELETE CASCADE,
  entity_type     text NOT NULL,
  entity_id       text NOT NULL,
  entity_version  text,
  snapshot_json   jsonb NOT NULL,
  frozen_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(package_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS ix_bn_pkg_item_pkg ON public.bn_country_config_package_item(package_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_country_config_package_item TO authenticated;
GRANT ALL ON public.bn_country_config_package_item TO service_role;

ALTER TABLE public.bn_claim
  ADD COLUMN IF NOT EXISTS country_config_package_id uuid REFERENCES public.bn_country_config_package(id);

DROP TRIGGER IF EXISTS trg_bn_country_config_package_touch ON public.bn_country_config_package;
CREATE TRIGGER trg_bn_country_config_package_touch
  BEFORE UPDATE ON public.bn_country_config_package
  FOR EACH ROW EXECUTE FUNCTION public.bn_touch_updated_at();

CREATE OR REPLACE FUNCTION public.bn_package_immutable_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE st public.bn_lifecycle_state;
BEGIN
  SELECT status INTO st FROM public.bn_country_config_package WHERE id = COALESCE(NEW.package_id, OLD.package_id);
  IF st IN ('ACTIVE','RETIRED') AND TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'Country config package is immutable (status=%)', st;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
DROP TRIGGER IF EXISTS trg_bn_pkg_item_immutable ON public.bn_country_config_package_item;
CREATE TRIGGER trg_bn_pkg_item_immutable
  BEFORE UPDATE OR DELETE ON public.bn_country_config_package_item
  FOR EACH ROW EXECUTE FUNCTION public.bn_package_immutable_guard();

-- Phase 7: formula resolution report
CREATE TABLE IF NOT EXISTS public.bn_formula_resolution_report (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            uuid NOT NULL,
  formula_id        uuid,
  formula_code      text,
  formula_version   text,
  variable_code     text NOT NULL,
  status            text NOT NULL,
  detail            text,
  checked_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_bn_resolve_run ON public.bn_formula_resolution_report(run_id);
CREATE INDEX IF NOT EXISTS ix_bn_resolve_status ON public.bn_formula_resolution_report(status);
GRANT SELECT, INSERT, DELETE ON public.bn_formula_resolution_report TO authenticated;
GRANT ALL ON public.bn_formula_resolution_report TO service_role;

-- Phase 8: product calc validation report
CREATE TABLE IF NOT EXISTS public.bn_product_calc_validation_report (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                uuid NOT NULL,
  product_id            uuid,
  product_code          text,
  version_id            uuid,
  version_no            text,
  status                text NOT NULL,
  missing_dependencies  jsonb,
  detail                text,
  checked_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_bn_prod_val_run ON public.bn_product_calc_validation_report(run_id);
GRANT SELECT, INSERT, DELETE ON public.bn_product_calc_validation_report TO authenticated;
GRANT ALL ON public.bn_product_calc_validation_report TO service_role;
