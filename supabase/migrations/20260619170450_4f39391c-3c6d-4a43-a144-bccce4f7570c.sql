
-- 1. Extend bn_service_doc_type with Document Library linkage + verification metadata
ALTER TABLE public.bn_service_doc_type
  ADD COLUMN IF NOT EXISTS document_library_id uuid NULL REFERENCES public.module_doc_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requires_verification boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_level varchar(40) NULL,
  ADD COLUMN IF NOT EXISTS periodic_renewal boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bn_service_doc_type_doc_library
  ON public.bn_service_doc_type(document_library_id);

-- 2. Seed Reference Data group for Service Document Categories (Benefits)
INSERT INTO public.bn_reference_group (group_code, group_name, module_code, description, is_system, is_active)
VALUES ('BN_SERVICE_DOCUMENT_CATEGORY', 'Service Document Category', 'BN',
        'Benefits-specific document usage categories for Service Document Types', true, true)
ON CONFLICT (group_code) DO UPDATE
  SET group_name = EXCLUDED.group_name,
      module_code = EXCLUDED.module_code,
      description = EXCLUDED.description,
      is_active = true,
      updated_at = now();

WITH g AS (SELECT id FROM public.bn_reference_group WHERE group_code = 'BN_SERVICE_DOCUMENT_CATEGORY')
INSERT INTO public.bn_reference_value (group_id, value_code, value_label, sort_order, is_system, is_active)
SELECT g.id, v.value_code, v.value_label, v.sort_order, true, true
FROM g, (VALUES
  ('IDENTITY',    'Identity',     10),
  ('FINANCIAL',   'Financial',    20),
  ('MEDICAL',     'Medical',      30),
  ('RELATIONSHIP','Relationship', 40),
  ('EMPLOYMENT',  'Employment',   50),
  ('PERIODIC',    'Periodic',     60),
  ('LEGAL',       'Legal',        70),
  ('PAYMENT',     'Payment',      80),
  ('FUNERAL',     'Funeral',      90),
  ('EDUCATION',   'Education',   100)
) AS v(value_code, value_label, sort_order)
ON CONFLICT DO NOTHING;
