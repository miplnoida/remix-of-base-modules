
-- 1. Create one Document Library category per Service Doc Type category, under the Benefits module
WITH bn_module AS (
  SELECT id FROM public.app_modules WHERE name = 'benefits_management' LIMIT 1
),
cats(category_name, sort_order) AS (
  VALUES
    ('Benefits — Identity',       10),
    ('Benefits — Financial',      20),
    ('Benefits — Medical',        30),
    ('Benefits — Relationship',   40),
    ('Benefits — Employment',     50),
    ('Benefits — Periodic',       60),
    ('Benefits — Legal',          70),
    ('Benefits — Payment',        80),
    ('Benefits — Funeral',        90),
    ('Benefits — Education',     100),
    ('Benefits — Forms',         110),
    ('Benefits — Assessment',    120),
    ('Benefits — Authorization', 130)
)
INSERT INTO public.module_doc_categories (module_id, category_name, description, sort_order, is_active, created_by, updated_by)
SELECT bn_module.id, c.category_name,
       'Benefits document library — auto-seeded for Service Document Types',
       c.sort_order, true, 'SYSTEM', 'SYSTEM'
FROM bn_module, cats c
ON CONFLICT (module_id, category_name) DO NOTHING;

-- 2. Seed one Document Library entry per Service Document Type
WITH bn_module AS (
  SELECT id FROM public.app_modules WHERE name = 'benefits_management' LIMIT 1
),
cat_map AS (
  SELECT mdc.id AS category_id, mdc.category_name
  FROM public.module_doc_categories mdc, bn_module
  WHERE mdc.module_id = bn_module.id
    AND mdc.category_name LIKE 'Benefits — %'
),
docs(sdt_category, document_name, allowed_extensions, max_mb, sort_order) AS (
  VALUES
    -- IDENTITY
    ('IDENTITY',      'Birth Certificate',                   ARRAY['pdf','jpg','jpeg','png']::text[], 10, 10),
    ('IDENTITY',      'Death Certificate',                   ARRAY['pdf','jpg','jpeg','png']::text[], 10, 20),
    ('IDENTITY',      'National ID Card',                    ARRAY['pdf','jpg','jpeg','png']::text[],  5, 30),
    ('IDENTITY',      'Social Security Card',                ARRAY['pdf','jpg','jpeg','png']::text[],  5, 40),
    ('IDENTITY',      'Proof of Residency',                  ARRAY['pdf','jpg','jpeg','png']::text[], 10, 50),
    -- FINANCIAL
    ('FINANCIAL',     'Proof of Income',                     ARRAY['pdf','jpg','jpeg','png']::text[], 10, 10),
    ('FINANCIAL',     'Medical Expense Receipt',             ARRAY['pdf','jpg','jpeg','png']::text[], 10, 20),
    -- MEDICAL
    ('MEDICAL',       'Medical Certificate',                 ARRAY['pdf','jpg','jpeg','png']::text[], 10, 10),
    ('MEDICAL',       'Medical Board Report',                ARRAY['pdf']::text[],                    15, 20),
    ('MEDICAL',       'Expected Confinement Certificate',    ARRAY['pdf','jpg','jpeg','png']::text[], 10, 30),
    ('MEDICAL',       'Actual Confinement Certificate',      ARRAY['pdf','jpg','jpeg','png']::text[], 10, 40),
    -- RELATIONSHIP
    ('RELATIONSHIP',  'Marriage Certificate',                ARRAY['pdf','jpg','jpeg','png']::text[], 10, 10),
    ('RELATIONSHIP',  'Proof of Relationship',               ARRAY['pdf','jpg','jpeg','png']::text[], 10, 20),
    ('RELATIONSHIP',  'Survivor Certificate',                ARRAY['pdf','jpg','jpeg','png']::text[], 10, 30),
    ('RELATIONSHIP',  'Dependant Proof',                     ARRAY['pdf','jpg','jpeg','png']::text[], 10, 40),
    -- EMPLOYMENT
    ('EMPLOYMENT',    'Employer Confirmation',               ARRAY['pdf','jpg','jpeg','png']::text[], 10, 10),
    ('EMPLOYMENT',    'Employer Injury Report',              ARRAY['pdf']::text[],                    10, 20),
    ('EMPLOYMENT',    'Injury / Incident Report',            ARRAY['pdf','jpg','jpeg','png']::text[], 10, 30),
    -- PERIODIC
    ('PERIODIC',      'Life Certificate',                    ARRAY['pdf','jpg','jpeg','png']::text[],  5, 10),
    -- LEGAL
    ('LEGAL',         'Police Report',                       ARRAY['pdf']::text[],                    10, 10),
    -- PAYMENT
    ('PAYMENT',       'Bank / EFT Authorization Form',       ARRAY['pdf','jpg','jpeg','png']::text[],  5, 10),
    ('PAYMENT',       'Payment Authorization',               ARRAY['pdf','jpg','jpeg','png']::text[],  5, 20),
    -- FUNERAL
    ('FUNERAL',       'Funeral Invoice / Receipt',           ARRAY['pdf','jpg','jpeg','png']::text[], 10, 10),
    ('FUNERAL',       'Funeral Grant Claim Form',            ARRAY['pdf']::text[],                    10, 20),
    -- EDUCATION
    ('EDUCATION',     'School / College Certificate',        ARRAY['pdf','jpg','jpeg','png']::text[],  5, 10),
    -- FORM
    ('FORM',          'Generic Claim Form',                  ARRAY['pdf']::text[],                    10, 10),
    ('FORM',          'Maternity Claim Form',                ARRAY['pdf']::text[],                    10, 20),
    ('FORM',          'Sickness / Injury Claim Form',        ARRAY['pdf']::text[],                    10, 30),
    ('FORM',          'Applicant Declaration',               ARRAY['pdf']::text[],                     5, 40),
    -- ASSESSMENT
    ('ASSESSMENT',    'Means Test Report',                   ARRAY['pdf']::text[],                    10, 10),
    -- AUTHORIZATION
    ('AUTHORIZATION', 'Representative Authorization',        ARRAY['pdf']::text[],                     5, 10)
),
cat_lookup AS (
  SELECT sdt_category, category_id
  FROM (VALUES
    ('IDENTITY',      'Benefits — Identity'),
    ('FINANCIAL',     'Benefits — Financial'),
    ('MEDICAL',       'Benefits — Medical'),
    ('RELATIONSHIP',  'Benefits — Relationship'),
    ('EMPLOYMENT',    'Benefits — Employment'),
    ('PERIODIC',      'Benefits — Periodic'),
    ('LEGAL',         'Benefits — Legal'),
    ('PAYMENT',       'Benefits — Payment'),
    ('FUNERAL',       'Benefits — Funeral'),
    ('EDUCATION',     'Benefits — Education'),
    ('FORM',          'Benefits — Forms'),
    ('ASSESSMENT',    'Benefits — Assessment'),
    ('AUTHORIZATION', 'Benefits — Authorization')
  ) AS m(sdt_category, cat_name)
  JOIN cat_map ON cat_map.category_name = m.cat_name
)
INSERT INTO public.module_doc_configs
  (category_id, document_name, is_required, allowed_extensions, max_file_size_mb, sort_order, is_active, created_by, updated_by)
SELECT cl.category_id, d.document_name, false, d.allowed_extensions, d.max_mb, d.sort_order, true, 'SYSTEM', 'SYSTEM'
FROM docs d
JOIN cat_lookup cl ON cl.sdt_category = d.sdt_category
WHERE NOT EXISTS (
  SELECT 1 FROM public.module_doc_configs x
  WHERE x.category_id = cl.category_id AND x.document_name = d.document_name
);

-- 3. Link each Service Document Type to its newly-seeded Document Library entry
WITH bn_module AS (
  SELECT id FROM public.app_modules WHERE name = 'benefits_management' LIMIT 1
),
lib AS (
  SELECT mdc.id AS doc_id, mdc.document_name, mdcat.category_name
  FROM public.module_doc_configs mdc
  JOIN public.module_doc_categories mdcat ON mdcat.id = mdc.category_id
  JOIN bn_module ON mdcat.module_id = bn_module.id
  WHERE mdcat.category_name LIKE 'Benefits — %'
),
mapping(type_code, document_name) AS (
  VALUES
    ('BIRTH_CERT',                          'Birth Certificate'),
    ('DEATH_CERT',                          'Death Certificate'),
    ('ID_CARD',                             'National ID Card'),
    ('SS_CARD',                             'Social Security Card'),
    ('RESIDENCY_PROOF',                     'Proof of Residency'),
    ('INCOME_PROOF',                        'Proof of Income'),
    ('MEDICAL_EXPENSE_RECEIPT',             'Medical Expense Receipt'),
    ('MEDICAL_CERT',                        'Medical Certificate'),
    ('MEDICAL_BOARD_REPORT',                'Medical Board Report'),
    ('MATERNITY_EXPECTED_CONFINEMENT_CERT', 'Expected Confinement Certificate'),
    ('MATERNITY_ACTUAL_CONFINEMENT_CERT',   'Actual Confinement Certificate'),
    ('MARRIAGE_CERT',                       'Marriage Certificate'),
    ('PROOF_RELATION',                      'Proof of Relationship'),
    ('SURVIVOR_CERT',                       'Survivor Certificate'),
    ('DEPENDANT_PROOF',                     'Dependant Proof'),
    ('EMPLOYER_CONF',                       'Employer Confirmation'),
    ('EMPLOYER_INJURY_REPORT',              'Employer Injury Report'),
    ('INJURY_REPORT',                       'Injury / Incident Report'),
    ('LIFE_CERT',                           'Life Certificate'),
    ('POLICE_REPORT',                       'Police Report'),
    ('BANK_EFT',                            'Bank / EFT Authorization Form'),
    ('PAYMENT_AUTHORIZATION',               'Payment Authorization'),
    ('FUNERAL_INVOICE_RECEIPT',             'Funeral Invoice / Receipt'),
    ('FUNERAL_CLAIM_FORM',                  'Funeral Grant Claim Form'),
    ('SCHOOL_CERT',                         'School / College Certificate'),
    ('CLAIM_FORM',                          'Generic Claim Form'),
    ('MATERNITY_CLAIM_FORM',                'Maternity Claim Form'),
    ('SICKNESS_INJURY_CLAIM_FORM',          'Sickness / Injury Claim Form'),
    ('APPLICANT_DECLARATION',               'Applicant Declaration'),
    ('MEANS_TEST_REPORT',                   'Means Test Report'),
    ('REPRESENTATIVE_AUTHORIZATION',        'Representative Authorization')
)
UPDATE public.bn_service_doc_type sdt
SET document_library_id = lib.doc_id,
    modified_at = now(),
    modified_by = COALESCE(modified_by, 'SYSTEM')
FROM mapping m
JOIN lib ON lib.document_name = m.document_name
WHERE sdt.type_code = m.type_code
  AND sdt.document_library_id IS DISTINCT FROM lib.doc_id;
