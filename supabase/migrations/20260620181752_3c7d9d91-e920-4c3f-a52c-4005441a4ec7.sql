
-- ============================================================================
-- Shared Legal Reference domain (module-agnostic)
-- Moves bn_legal_reference into a generic public.legal_reference table,
-- adds reference type lookup, and a module mapping table so any module
-- (BN, LG, CE, ...) can attach legal references to its own entities.
-- bn_legal_reference is kept as a deprecated view for backward compatibility.
-- ============================================================================

-- 1. legal_reference_type lookup -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_reference_type (
  code        varchar(32) PRIMARY KEY,
  label       varchar(120) NOT NULL,
  description text,
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_reference_type TO authenticated;
GRANT ALL ON public.legal_reference_type TO service_role;

INSERT INTO public.legal_reference_type(code, label, sort_order) VALUES
  ('ACT',       'Act',        10),
  ('REGULATION','Regulation', 20),
  ('RULE',      'Rule',       30),
  ('POLICY',    'Policy',     40),
  ('CIRCULAR',  'Circular',   50),
  ('CASE_LAW',  'Case Law',   60),
  ('GUIDELINE', 'Guideline',  70)
ON CONFLICT (code) DO NOTHING;

-- 2. legal_reference (generic master) -------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_reference (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code        varchar(8)  NOT NULL,
  ref_code            varchar(64) NOT NULL,
  ref_type            varchar(32) REFERENCES public.legal_reference_type(code),
  short_title         varchar(255) NOT NULL,
  act_name            varchar(255),
  chapter             varchar(64),
  section             varchar(64),
  subsection          varchar(64),
  regulation          varchar(255),
  full_reference_text text,
  ref_url             text,
  jurisdiction        varchar(64),
  source              varchar(120),
  effective_from      date NOT NULL,
  effective_to        date,
  status              varchar(32) NOT NULL DEFAULT 'ACTIVE',
  version_number      int NOT NULL DEFAULT 1,
  supersedes_id       uuid REFERENCES public.legal_reference(id) ON DELETE SET NULL,
  tags                text[],
  notes               text,
  is_active           boolean NOT NULL DEFAULT true,
  legacy_id           uuid,
  created_by          varchar(50),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          varchar(50),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_reference_unique UNIQUE (country_code, ref_code, version_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_reference TO authenticated;
GRANT ALL ON public.legal_reference TO service_role;

CREATE INDEX IF NOT EXISTS legal_reference_country_idx ON public.legal_reference(country_code) WHERE is_active;
CREATE INDEX IF NOT EXISTS legal_reference_status_idx  ON public.legal_reference(status);
CREATE INDEX IF NOT EXISTS legal_reference_tags_gin    ON public.legal_reference USING gin(tags);

CREATE OR REPLACE FUNCTION public.legal_reference_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS legal_reference_touch_trg ON public.legal_reference;
CREATE TRIGGER legal_reference_touch_trg BEFORE UPDATE ON public.legal_reference
  FOR EACH ROW EXECUTE FUNCTION public.legal_reference_touch();

-- 3. Data migration from bn_legal_reference (preserve IDs) ----------------------
DO $$
DECLARE
  src_cnt int;
  dst_cnt int;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='bn_legal_reference' AND table_type='BASE TABLE'
  ) THEN
    INSERT INTO public.legal_reference (
      id, country_code, ref_code, short_title, act_name, chapter, section, subsection,
      regulation, full_reference_text, ref_url, effective_from, effective_to, status,
      version_number, supersedes_id, tags, notes, is_active, legacy_id,
      created_by, created_at, updated_by, updated_at
    )
    SELECT
      id, country_code, ref_code, short_title, act_name, chapter, section, subsection,
      regulation, full_reference_text, ref_url, effective_from, effective_to, status,
      version_number, supersedes_id,
      COALESCE(tags, ARRAY[]::text[]) || COALESCE(applicable_products, ARRAY[]::text[]),
      notes, is_active, legacy_id, created_by, created_at, updated_by, updated_at
    FROM public.bn_legal_reference
    ON CONFLICT (id) DO NOTHING;

    SELECT count(*) INTO src_cnt FROM public.bn_legal_reference;
    SELECT count(*) INTO dst_cnt FROM public.legal_reference;
    IF dst_cnt < src_cnt THEN
      RAISE EXCEPTION 'legal_reference migration count mismatch: src=% dst=%', src_cnt, dst_cnt;
    END IF;

    -- Drop the base table and replace with a deprecated view for back-compat.
    DROP TABLE public.bn_legal_reference CASCADE;
    EXECUTE $v$
      CREATE OR REPLACE VIEW public.bn_legal_reference AS
      SELECT
        id, country_code, ref_code, short_title, act_name, chapter, section, subsection,
        regulation, full_reference_text, ref_url, effective_from, effective_to, status,
        version_number, supersedes_id, tags,
        NULL::text[] AS applicable_products,
        notes, is_active, legacy_id, created_by, created_at, updated_by, updated_at
      FROM public.legal_reference
    $v$;
    COMMENT ON VIEW public.bn_legal_reference IS
      'DEPRECATED — use public.legal_reference. View kept for backward compatibility.';
    GRANT SELECT ON public.bn_legal_reference TO authenticated, service_role;
  END IF;
END $$;

-- 4. module_legal_reference_mapping ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.module_legal_reference_mapping (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code         varchar(16) NOT NULL,
  entity_table        varchar(64) NOT NULL,
  entity_id           text        NOT NULL,
  legal_reference_id  uuid        NOT NULL REFERENCES public.legal_reference(id) ON DELETE RESTRICT,
  role                varchar(32) NOT NULL DEFAULT 'PRIMARY',
  notes               text,
  created_by          varchar(50),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          varchar(50),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT module_legal_ref_mapping_unique
    UNIQUE (module_code, entity_table, entity_id, legal_reference_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_legal_reference_mapping TO authenticated;
GRANT ALL ON public.module_legal_reference_mapping TO service_role;

CREATE INDEX IF NOT EXISTS mlrm_entity_idx ON public.module_legal_reference_mapping(module_code, entity_table, entity_id);
CREATE INDEX IF NOT EXISTS mlrm_ref_idx    ON public.module_legal_reference_mapping(legal_reference_id);

DROP TRIGGER IF EXISTS mlrm_touch_trg ON public.module_legal_reference_mapping;
CREATE TRIGGER mlrm_touch_trg BEFORE UPDATE ON public.module_legal_reference_mapping
  FOR EACH ROW EXECUTE FUNCTION public.legal_reference_touch();

-- ============================================================================
-- ROLLBACK (manual):
--   DROP VIEW IF EXISTS public.bn_legal_reference;
--   CREATE TABLE public.bn_legal_reference AS SELECT * FROM public.legal_reference;
--   DROP TABLE public.module_legal_reference_mapping;
--   DROP TABLE public.legal_reference;
--   DROP TABLE public.legal_reference_type;
-- ============================================================================
