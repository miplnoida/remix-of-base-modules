
-- ============================================================
-- 1) New structured Legal References master
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bn_legal_reference (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code    varchar(8)  NOT NULL,
  ref_code        varchar(64) NOT NULL,
  short_title     varchar(255) NOT NULL,
  act_name        varchar(255),
  chapter         varchar(64),
  section         varchar(64),
  subsection      varchar(64),
  regulation      varchar(255),
  full_reference_text text,
  ref_url         text,
  effective_from  date NOT NULL,
  effective_to    date,
  status          varchar(32) NOT NULL DEFAULT 'ACTIVE',
  version_number  integer NOT NULL DEFAULT 1,
  supersedes_id   uuid REFERENCES public.bn_legal_reference(id) ON DELETE SET NULL,
  tags            text[],
  applicable_products text[],
  notes           text,
  is_active       boolean NOT NULL DEFAULT true,
  legacy_id       uuid,                       -- maps back to bn_country_legal_ref.id
  created_by      varchar(50),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      varchar(50),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bn_legal_reference_country_code_unique UNIQUE (country_code, ref_code, version_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_legal_reference TO authenticated;
GRANT ALL ON public.bn_legal_reference TO service_role;

CREATE INDEX IF NOT EXISTS bn_legal_reference_country_idx ON public.bn_legal_reference(country_code) WHERE is_active;
CREATE INDEX IF NOT EXISTS bn_legal_reference_status_idx  ON public.bn_legal_reference(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.bn_legal_reference_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS bn_legal_reference_touch_trg ON public.bn_legal_reference;
CREATE TRIGGER bn_legal_reference_touch_trg BEFORE UPDATE ON public.bn_legal_reference
FOR EACH ROW EXECUTE FUNCTION public.bn_legal_reference_touch();

-- ============================================================
-- 2) Backfill from legacy bn_country_legal_ref
-- ============================================================
INSERT INTO public.bn_legal_reference (
  country_code, ref_code, short_title, act_name, section, regulation,
  full_reference_text, ref_url, effective_from, effective_to,
  status, version_number, applicable_products, notes, is_active,
  legacy_id, created_by, updated_by
)
SELECT
  l.country_code,
  l.ref_code,
  l.ref_title                                       AS short_title,
  l.ref_title                                       AS act_name,
  l.ref_section                                     AS section,
  NULL                                              AS regulation,
  CONCAT_WS(' — ', l.ref_title, l.ref_section)     AS full_reference_text,
  l.ref_url,
  l.effective_from,
  l.effective_to,
  CASE
    WHEN l.is_active AND (l.effective_to IS NULL OR l.effective_to >= CURRENT_DATE)
      THEN 'ACTIVE'
    WHEN NOT l.is_active THEN 'REPEALED'
    ELSE 'SUPERSEDED'
  END                                               AS status,
  l.version_number,
  l.applicable_products,
  l.notes,
  l.is_active,
  l.id,
  l.entered_by,
  l.entered_by
FROM public.bn_country_legal_ref l
WHERE NOT EXISTS (
  SELECT 1 FROM public.bn_legal_reference x WHERE x.legacy_id = l.id
);

-- ============================================================
-- 3) Extend bn_country with letterhead / contact / format fields
-- ============================================================
ALTER TABLE public.bn_country
  ADD COLUMN IF NOT EXISTS default_language    varchar(16),
  ADD COLUMN IF NOT EXISTS date_format         varchar(32),
  ADD COLUMN IF NOT EXISTS number_format       varchar(32),
  ADD COLUMN IF NOT EXISTS phone_format        varchar(64),
  ADD COLUMN IF NOT EXISTS office_name         varchar(255),
  ADD COLUMN IF NOT EXISTS office_address      text,
  ADD COLUMN IF NOT EXISTS office_phone        varchar(64),
  ADD COLUMN IF NOT EXISTS office_email        varchar(255),
  ADD COLUMN IF NOT EXISTS office_website      varchar(255),
  ADD COLUMN IF NOT EXISTS letterhead_logo_url text;

-- Default sensible values for any existing rows
UPDATE public.bn_country
SET
  default_language = COALESCE(default_language, 'en'),
  date_format      = COALESCE(date_format, 'dd/MM/yyyy'),
  number_format    = COALESCE(number_format, '#,##0.00'),
  phone_format     = COALESCE(phone_format, '(+{dialCode}) XXX-XXXX')
WHERE default_language IS NULL OR date_format IS NULL
   OR number_format IS NULL OR phone_format IS NULL;

-- ============================================================
-- 4) Seed reference data groups & values
-- ============================================================
DO $$
DECLARE
  v_user varchar(50) := 'SYSTEM';
  v_gid  uuid;
BEGIN
  -- Helper to seed group + values
  -- BN_ID_TYPE
  INSERT INTO public.bn_reference_group (group_code, group_name, module_code, description, is_system, is_active, created_by, updated_by)
  VALUES ('BN_ID_TYPE', 'Identity Document Types', 'BN', 'ID document types used by Country Pack ID Rules', true, true, v_user, v_user)
  ON CONFLICT (group_code) DO NOTHING;
  SELECT id INTO v_gid FROM public.bn_reference_group WHERE group_code='BN_ID_TYPE';
  INSERT INTO public.bn_reference_value (group_id, value_code, value_label, sort_order, is_system, is_active, created_by, updated_by) VALUES
    (v_gid, 'SSN',                'Social Security Number', 10, true, true, v_user, v_user),
    (v_gid, 'NATIONAL_ID',        'National ID',            20, true, true, v_user, v_user),
    (v_gid, 'PASSPORT',           'Passport',               30, true, true, v_user, v_user),
    (v_gid, 'BIRTH_CERTIFICATE',  'Birth Certificate',      40, true, true, v_user, v_user),
    (v_gid, 'WORK_PERMIT',        'Work Permit',            50, true, true, v_user, v_user),
    (v_gid, 'DRIVING_LICENCE',    'Driving Licence',        60, true, true, v_user, v_user),
    (v_gid, 'OTHER',              'Other',                  90, true, true, v_user, v_user)
  ON CONFLICT DO NOTHING;

  -- BN_ID_VERIFICATION_METHOD
  INSERT INTO public.bn_reference_group (group_code, group_name, module_code, description, is_system, is_active, created_by, updated_by)
  VALUES ('BN_ID_VERIFICATION_METHOD', 'ID Verification Methods', 'BN', 'How an identity document is verified', true, true, v_user, v_user)
  ON CONFLICT (group_code) DO NOTHING;
  SELECT id INTO v_gid FROM public.bn_reference_group WHERE group_code='BN_ID_VERIFICATION_METHOD';
  INSERT INTO public.bn_reference_value (group_id, value_code, value_label, sort_order, is_system, is_active, created_by, updated_by) VALUES
    (v_gid, 'DOCUMENT_SCAN', 'Document Scan',       10, true, true, v_user, v_user),
    (v_gid, 'MANUAL',        'Manual Verification', 20, true, true, v_user, v_user),
    (v_gid, 'EXTERNAL_API',  'External API',        30, true, true, v_user, v_user),
    (v_gid, 'BIOMETRIC',     'Biometric',           40, true, true, v_user, v_user),
    (v_gid, 'NONE',          'None',                90, true, true, v_user, v_user)
  ON CONFLICT DO NOTHING;

  -- BN_PARTICIPANT_TYPE (unified)
  INSERT INTO public.bn_reference_group (group_code, group_name, module_code, description, is_system, is_active, created_by, updated_by)
  VALUES ('BN_PARTICIPANT_TYPE', 'Participant Types', 'BN', 'Roles and relationships used across claims, awards, communications', true, true, v_user, v_user)
  ON CONFLICT (group_code) DO NOTHING;
  SELECT id INTO v_gid FROM public.bn_reference_group WHERE group_code='BN_PARTICIPANT_TYPE';
  INSERT INTO public.bn_reference_value (group_id, value_code, value_label, sort_order, is_system, is_active, created_by, updated_by, metadata_json) VALUES
    (v_gid, 'CLAIMANT',         'Claimant',          10, true, true, v_user, v_user, '{"category":"CLAIM_ROLE"}'::jsonb),
    (v_gid, 'INSURED_PERSON',   'Insured Person',    20, true, true, v_user, v_user, '{"category":"CLAIM_ROLE"}'::jsonb),
    (v_gid, 'BENEFICIARY',      'Beneficiary',       30, true, true, v_user, v_user, '{"category":"CLAIM_ROLE"}'::jsonb),
    (v_gid, 'SPOUSE',           'Spouse',            40, true, true, v_user, v_user, '{"category":"RELATIONSHIP"}'::jsonb),
    (v_gid, 'CHILD',            'Child',             50, true, true, v_user, v_user, '{"category":"RELATIONSHIP"}'::jsonb),
    (v_gid, 'GUARDIAN',         'Guardian',          60, true, true, v_user, v_user, '{"category":"RELATIONSHIP"}'::jsonb),
    (v_gid, 'PAYEE',            'Payee',             70, true, true, v_user, v_user, '{"category":"CLAIM_ROLE"}'::jsonb),
    (v_gid, 'EMPLOYER',         'Employer',          80, true, true, v_user, v_user, '{"category":"EXTERNAL_PARTY"}'::jsonb),
    (v_gid, 'DOCTOR',           'Doctor',            90, true, true, v_user, v_user, '{"category":"EXTERNAL_PARTY"}'::jsonb),
    (v_gid, 'FUNERAL_PROVIDER', 'Funeral Provider', 100, true, true, v_user, v_user, '{"category":"EXTERNAL_PARTY"}'::jsonb)
  ON CONFLICT DO NOTHING;

  -- BN_ADDRESS_FIELD_TYPE
  INSERT INTO public.bn_reference_group (group_code, group_name, module_code, description, is_system, is_active, created_by, updated_by)
  VALUES ('BN_ADDRESS_FIELD_TYPE', 'Address Field Types', 'BN', 'Field types used by the Country Pack Address Model', true, true, v_user, v_user)
  ON CONFLICT (group_code) DO NOTHING;
  SELECT id INTO v_gid FROM public.bn_reference_group WHERE group_code='BN_ADDRESS_FIELD_TYPE';
  INSERT INTO public.bn_reference_value (group_id, value_code, value_label, sort_order, is_system, is_active, created_by, updated_by) VALUES
    (v_gid, 'TEXT',        'Text',         10, true, true, v_user, v_user),
    (v_gid, 'NUMBER',      'Number',       20, true, true, v_user, v_user),
    (v_gid, 'DROPDOWN',    'Dropdown',     30, true, true, v_user, v_user),
    (v_gid, 'PARISH',      'Parish',       40, true, true, v_user, v_user),
    (v_gid, 'ISLAND',      'Island',       50, true, true, v_user, v_user),
    (v_gid, 'VILLAGE',     'Village/Town', 60, true, true, v_user, v_user),
    (v_gid, 'POSTAL_CODE', 'Postal Code',  70, true, true, v_user, v_user),
    (v_gid, 'COUNTRY',     'Country',      80, true, true, v_user, v_user)
  ON CONFLICT DO NOTHING;

  -- BN_PAYMENT_METHOD_TYPE
  INSERT INTO public.bn_reference_group (group_code, group_name, module_code, description, is_system, is_active, created_by, updated_by)
  VALUES ('BN_PAYMENT_METHOD_TYPE', 'Payment Method Types', 'BN', 'Payment delivery channels supported per country', true, true, v_user, v_user)
  ON CONFLICT (group_code) DO NOTHING;
  SELECT id INTO v_gid FROM public.bn_reference_group WHERE group_code='BN_PAYMENT_METHOD_TYPE';
  INSERT INTO public.bn_reference_value (group_id, value_code, value_label, sort_order, is_system, is_active, created_by, updated_by) VALUES
    (v_gid, 'EFT',           'EFT / Bank Transfer', 10, true, true, v_user, v_user),
    (v_gid, 'CHEQUE',        'Cheque',              20, true, true, v_user, v_user),
    (v_gid, 'CASH',          'Cash',                30, true, true, v_user, v_user),
    (v_gid, 'MOBILE_MONEY',  'Mobile Money',        40, true, true, v_user, v_user),
    (v_gid, 'CARD',          'Card',                50, true, true, v_user, v_user),
    (v_gid, 'MONEY_ORDER',   'Money Order',         60, true, true, v_user, v_user),
    (v_gid, 'WIRE',          'Wire Transfer',       70, true, true, v_user, v_user)
  ON CONFLICT DO NOTHING;

  -- BN_LEGAL_REF_STATUS
  INSERT INTO public.bn_reference_group (group_code, group_name, module_code, description, is_system, is_active, created_by, updated_by)
  VALUES ('BN_LEGAL_REF_STATUS', 'Legal Reference Status', 'BN', 'Lifecycle status of a legal reference', true, true, v_user, v_user)
  ON CONFLICT (group_code) DO NOTHING;
  SELECT id INTO v_gid FROM public.bn_reference_group WHERE group_code='BN_LEGAL_REF_STATUS';
  INSERT INTO public.bn_reference_value (group_id, value_code, value_label, sort_order, is_system, is_active, created_by, updated_by) VALUES
    (v_gid, 'DRAFT',      'Draft',      10, true, true, v_user, v_user),
    (v_gid, 'ACTIVE',     'Active',     20, true, true, v_user, v_user),
    (v_gid, 'SUPERSEDED', 'Superseded', 30, true, true, v_user, v_user),
    (v_gid, 'REPEALED',   'Repealed',   40, true, true, v_user, v_user)
  ON CONFLICT DO NOTHING;
END $$;
