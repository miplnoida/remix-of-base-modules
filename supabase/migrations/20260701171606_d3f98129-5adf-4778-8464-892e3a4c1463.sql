
-- Signatures lifecycle & scoping columns
ALTER TABLE public.comm_email_signature
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'ORGANIZATION',
  ADD COLUMN IF NOT EXISTS scope_code TEXT,
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS effective_from DATE,
  ADD COLUMN IF NOT EXISTS effective_to DATE,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';

-- scope_type domain
ALTER TABLE public.comm_email_signature
  DROP CONSTRAINT IF EXISTS comm_email_signature_scope_type_chk;
ALTER TABLE public.comm_email_signature
  ADD CONSTRAINT comm_email_signature_scope_type_chk
  CHECK (scope_type IN ('ORGANIZATION','DEPARTMENT','MODULE','OFFICER'));

-- status domain
ALTER TABLE public.comm_email_signature
  DROP CONSTRAINT IF EXISTS comm_email_signature_status_chk;
ALTER TABLE public.comm_email_signature
  ADD CONSTRAINT comm_email_signature_status_chk
  CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED'));

-- effective_from <= effective_to
ALTER TABLE public.comm_email_signature
  DROP CONSTRAINT IF EXISTS comm_email_signature_effective_chk;
ALTER TABLE public.comm_email_signature
  ADD CONSTRAINT comm_email_signature_effective_chk
  CHECK (effective_from IS NULL OR effective_to IS NULL OR effective_from <= effective_to);

-- Only one default per (scope_type, coalesce(scope_code,''))
CREATE UNIQUE INDEX IF NOT EXISTS comm_email_signature_default_per_scope_uniq
  ON public.comm_email_signature (scope_type, COALESCE(scope_code, ''))
  WHERE is_default = TRUE AND status = 'ACTIVE';

-- Code uniqueness (nullable ok, unique when present)
CREATE UNIQUE INDEX IF NOT EXISTS comm_email_signature_code_uniq
  ON public.comm_email_signature (code) WHERE code IS NOT NULL;

-- ============================================================
-- CORE_LANGUAGE master
-- ============================================================
CREATE TABLE IF NOT EXISTS public.core_language (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code TEXT NOT NULL,          -- ISO 639-1, e.g. 'en'
  culture_code  TEXT NOT NULL,          -- e.g. 'en-US'
  display_name  TEXT NOT NULL,
  native_name   TEXT,
  direction     TEXT NOT NULL DEFAULT 'LTR' CHECK (direction IN ('LTR','RTL')),
  enabled_for_org BOOLEAN NOT NULL DEFAULT TRUE,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_language_code TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    TEXT,
  updated_by    TEXT,
  UNIQUE (culture_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_language TO authenticated;
GRANT SELECT ON public.core_language TO anon;
GRANT ALL ON public.core_language TO service_role;

-- Only one default language enabled at a time
CREATE UNIQUE INDEX IF NOT EXISTS core_language_single_default_uniq
  ON public.core_language ((is_default))
  WHERE is_default = TRUE AND is_active = TRUE;

-- Updated-at trigger (uses existing tg_set_updated_at helper)
DROP TRIGGER IF EXISTS trg_core_language_updated_at ON public.core_language;
CREATE TRIGGER trg_core_language_updated_at
  BEFORE UPDATE ON public.core_language
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed baseline languages (idempotent on culture_code)
INSERT INTO public.core_language
  (language_code, culture_code, display_name, native_name, direction, is_default, fallback_language_code, display_order)
VALUES
  ('en','en',    'English',       'English',   'LTR', TRUE,  NULL, 10),
  ('en','en-US', 'English (US)',  'English',   'LTR', FALSE, 'en', 20),
  ('en','en-GB', 'English (UK)',  'English',   'LTR', FALSE, 'en', 30),
  ('es','es',    'Spanish',       'Español',   'LTR', FALSE, 'en', 40),
  ('fr','fr',    'French',        'Français',  'LTR', FALSE, 'en', 50),
  ('pt','pt',    'Portuguese',    'Português', 'LTR', FALSE, 'en', 60)
ON CONFLICT (culture_code) DO NOTHING;
