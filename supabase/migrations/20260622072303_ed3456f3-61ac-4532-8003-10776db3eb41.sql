
-- TURN A: DMS foundation (fixed)

CREATE TABLE IF NOT EXISTS public.core_dms_provider (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code text NOT NULL UNIQUE,
  provider_name text NOT NULL,
  base_url text NOT NULL,
  auth_type text NOT NULL DEFAULT 'API_KEY',
  auth_header_name text DEFAULT 'x-api-key',
  api_key_secret_ref text,
  token_url text,
  client_id_secret_ref text,
  client_secret_ref text,
  api_settings_key text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_dms_provider TO authenticated;
GRANT ALL ON public.core_dms_provider TO service_role;
ALTER TABLE public.core_dms_provider DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.core_dms_api_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.core_dms_provider(id) ON DELETE CASCADE,
  operation_code text NOT NULL,
  http_method text NOT NULL DEFAULT 'POST',
  endpoint_path text NOT NULL,
  request_template_json jsonb,
  response_path_json jsonb,
  timeout_ms integer NOT NULL DEFAULT 30000,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, operation_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_dms_api_config TO authenticated;
GRANT ALL ON public.core_dms_api_config TO service_role;
ALTER TABLE public.core_dms_api_config DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.core_dms_document_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL,
  document_type_code text NOT NULL,
  document_type_name text NOT NULL,
  dms_document_type_code text,
  description text,
  required_metadata_json jsonb DEFAULT '[]'::jsonb,
  allowed_extensions text[] DEFAULT ARRAY['pdf','doc','docx','png','jpg','jpeg','tif','tiff'],
  max_file_size_mb integer NOT NULL DEFAULT 25,
  retention_years integer,
  is_confidential_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_code, document_type_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_dms_document_type TO authenticated;
GRANT ALL ON public.core_dms_document_type TO service_role;
ALTER TABLE public.core_dms_document_type DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.core_dms_module_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL,
  entity_type text NOT NULL,
  document_category_code text NOT NULL,
  document_type_code text NOT NULL,
  dms_document_type_code text,
  provider_id uuid REFERENCES public.core_dms_provider(id) ON DELETE SET NULL,
  required_flag boolean NOT NULL DEFAULT false,
  stage_code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_core_dms_module_mapping
  ON public.core_dms_module_mapping (module_code, entity_type, document_category_code, document_type_code, COALESCE(stage_code, ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_dms_module_mapping TO authenticated;
GRANT ALL ON public.core_dms_module_mapping TO service_role;
ALTER TABLE public.core_dms_module_mapping DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.core_dms_storage_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code text NOT NULL,
  document_type_code text,
  retention_years integer,
  archive_after_years integer,
  encryption_required boolean NOT NULL DEFAULT true,
  confidential_required boolean NOT NULL DEFAULT false,
  allow_delete boolean NOT NULL DEFAULT false,
  allow_archive boolean NOT NULL DEFAULT true,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_dms_storage_policy TO authenticated;
GRANT ALL ON public.core_dms_storage_policy TO service_role;
ALTER TABLE public.core_dms_storage_policy DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.lg_document_link
  ADD COLUMN IF NOT EXISTS document_type_code text,
  ADD COLUMN IF NOT EXISTS dms_document_id text,
  ADD COLUMN IF NOT EXISTS dms_file_id text,
  ADD COLUMN IF NOT EXISTS dms_provider_id uuid REFERENCES public.core_dms_provider(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS size_bytes bigint,
  ADD COLUMN IF NOT EXISTS notice_id uuid,
  ADD COLUMN IF NOT EXISTS dms_url text,
  ADD COLUMN IF NOT EXISTS upload_status text NOT NULL DEFAULT 'COMPLETE',
  ADD COLUMN IF NOT EXISTS upload_error text;

CREATE INDEX IF NOT EXISTS ix_lg_document_link_dms_doc ON public.lg_document_link(dms_document_id);
CREATE INDEX IF NOT EXISTS ix_lg_document_link_type ON public.lg_document_link(document_type_code);

ALTER TABLE public.lg_stage_document_rule
  ADD COLUMN IF NOT EXISTS min_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS allow_generated boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_upload boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_link_existing boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS document_category_code text;

CREATE OR REPLACE FUNCTION public.tg_core_dms_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['core_dms_provider','core_dms_api_config','core_dms_document_type','core_dms_module_mapping','core_dms_storage_policy']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.tg_core_dms_set_updated_at()', t, t);
  END LOOP;
END $$;

INSERT INTO public.core_dms_provider (provider_code, provider_name, base_url, auth_type, auth_header_name, api_settings_key, is_active, is_default, notes, created_by)
VALUES ('DNB_DMS','Digital Notice Board DMS','https://dmsservice.digitalnoticeboard.biz','API_KEY','x-api-key','dms_service', true, true, 'SEED- Primary central DMS. Live config read from api_settings.dms_service.', 'SEED')
ON CONFLICT (provider_code) DO NOTHING;

WITH p AS (SELECT id FROM public.core_dms_provider WHERE provider_code='DNB_DMS')
INSERT INTO public.core_dms_api_config (provider_id, operation_code, http_method, endpoint_path, timeout_ms)
SELECT p.id, op, m, path, 30000 FROM p,
  (VALUES
    ('UPLOAD','POST','/api/Documents/Upload'),
    ('GET','GET','/api/Documents/{document_id}'),
    ('DOWNLOAD','GET','/api/Documents/{document_id}/Download'),
    ('SEARCH','POST','/api/Documents/Search'),
    ('UPDATE_META','PUT','/api/Documents/{document_id}/Metadata'),
    ('CREATE_VERSION','POST','/api/Documents/{document_id}/Versions'),
    ('DELETE','DELETE','/api/Documents/{document_id}'),
    ('LINK','POST','/api/Documents/{document_id}/Link')
  ) AS v(op,m,path)
ON CONFLICT (provider_id, operation_code) DO NOTHING;

INSERT INTO public.core_dms_document_type (module_code, document_type_code, document_type_name, dms_document_type_code, description, max_file_size_mb, is_confidential_default, retention_years, sort_order) VALUES
('LEGAL','LEGAL_REFERRAL_PACK','Compliance Referral Pack','LEGAL_REF_PACK','Initial referral package from Compliance', 50, false, 10, 10),
('LEGAL','ARREARS_STATEMENT','Arrears Statement','ARREARS_STMT','Itemised contribution arrears', 25, false, 10, 20),
('LEGAL','EVIDENCE_PACK','Evidence Pack','EVIDENCE','Supporting evidence bundle', 100, true, 10, 30),
('LEGAL','DEMAND_LETTER','Demand Letter','DEMAND_LTR','Initial demand for payment', 10, false, 10, 40),
('LEGAL','FINAL_DEMAND_LETTER','Final Demand Letter','FINAL_DEMAND_LTR','Final demand before legal action', 10, false, 10, 50),
('LEGAL','NOTICE_BEFORE_ACTION','Notice Before Action','NBA','Statutory pre-action notice', 10, false, 10, 60),
('LEGAL','HEARING_NOTICE','Hearing Notice','HEARING_NOTICE','Notice of scheduled hearing', 10, false, 10, 70),
('LEGAL','COURT_FILING','Court Filing','COURT_FILE','Document filed with court', 50, true, 15, 80),
('LEGAL','COURT_ORDER','Court Order','COURT_ORDER','Order issued by court', 25, true, 15, 90),
('LEGAL','JUDGMENT','Judgment','JUDGMENT','Court judgment', 25, true, 15, 100),
('LEGAL','SETTLEMENT_AGREEMENT','Settlement Agreement','SETTLEMENT','Signed settlement agreement', 25, true, 15, 110),
('LEGAL','PAYMENT_ARRANGEMENT','Payment Arrangement','PAY_ARR','Agreed payment plan document', 25, false, 10, 120),
('LEGAL','LEGAL_FEE_NOTICE','Legal Fee Notice','FEE_NOTICE','Notice of legal fees charged', 10, false, 10, 130),
('LEGAL','WAIVER_DOCUMENT','Waiver Document','WAIVER','Approved waiver document', 10, false, 10, 140),
('LEGAL','ENFORCEMENT_DOCUMENT','Enforcement Document','ENFORCE','Enforcement / execution paperwork', 25, true, 15, 150),
('LEGAL','CASE_CLOSURE_MEMO','Case Closure Memo','CLOSURE','Internal memo closing the case', 10, false, 10, 160)
ON CONFLICT (module_code, document_type_code) DO NOTHING;

INSERT INTO public.lg_stage_document_rule (country_code, case_type_code, stage_code, doc_type_code, doc_label, is_required, sort_order, is_active, min_count, allow_generated, allow_upload, allow_link_existing, document_category_code) VALUES
('KN','DEFAULT','REFERRAL_RECEIVED','LEGAL_REFERRAL_PACK','Compliance Referral Pack', true, 10, true, 1, false, true, true, 'INTAKE'),
('KN','DEFAULT','REFERRAL_RECEIVED','ARREARS_STATEMENT','Arrears Statement', true, 20, true, 1, true, true, true, 'INTAKE'),
('KN','DEFAULT','REFERRAL_RECEIVED','EVIDENCE_PACK','Evidence Pack', true, 30, true, 1, false, true, true, 'INTAKE'),
('KN','DEFAULT','REVIEW','EVIDENCE_PACK','Additional Evidence', false, 10, true, 0, false, true, true, 'REVIEW'),
('KN','DEFAULT','DEMAND_NOTICE','DEMAND_LETTER','Demand Letter', true, 10, true, 1, true, false, false, 'NOTICE'),
('KN','DEFAULT','FINAL_DEMAND','FINAL_DEMAND_LETTER','Final Demand Letter', true, 10, true, 1, true, false, false, 'NOTICE'),
('KN','DEFAULT','NOTICE_BEFORE_ACTION','NOTICE_BEFORE_ACTION','Notice Before Action', true, 10, true, 1, true, false, false, 'NOTICE'),
('KN','DEFAULT','COURT_FILING','COURT_FILING','Court Filing Pack', true, 10, true, 1, true, true, true, 'COURT'),
('KN','DEFAULT','COURT_FILING','EVIDENCE_PACK','Evidence Submission', true, 20, true, 1, false, true, true, 'COURT'),
('KN','DEFAULT','HEARING_SCHEDULED','HEARING_NOTICE','Hearing Notice', true, 10, true, 1, true, false, false, 'HEARING'),
('KN','DEFAULT','HEARING_HELD','COURT_ORDER','Hearing Outcome / Order', false, 10, true, 0, false, true, true, 'HEARING'),
('KN','DEFAULT','JUDGMENT_GRANTED','JUDGMENT','Judgment', true, 10, true, 1, false, true, true, 'JUDGMENT'),
('KN','DEFAULT','SETTLEMENT','SETTLEMENT_AGREEMENT','Settlement Agreement', true, 10, true, 1, true, true, true, 'SETTLEMENT'),
('KN','DEFAULT','SETTLEMENT','PAYMENT_ARRANGEMENT','Payment Arrangement', false, 20, true, 0, true, true, true, 'SETTLEMENT'),
('KN','DEFAULT','ENFORCEMENT','ENFORCEMENT_DOCUMENT','Enforcement Documents', true, 10, true, 1, false, true, true, 'ENFORCEMENT'),
('KN','DEFAULT','CLOSED','CASE_CLOSURE_MEMO','Case Closure Memo', true, 10, true, 1, true, true, false, 'CLOSURE')
ON CONFLICT DO NOTHING;

INSERT INTO public.core_dms_storage_policy (module_code, document_type_code, retention_years, archive_after_years, encryption_required, confidential_required, allow_delete, allow_archive, notes)
SELECT 'LEGAL', document_type_code, retention_years, GREATEST(COALESCE(retention_years,10) - 2, 1), true, is_confidential_default, false, true, 'SEED- default policy from document type'
FROM public.core_dms_document_type WHERE module_code='LEGAL'
ON CONFLICT DO NOTHING;
