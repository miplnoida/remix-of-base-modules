
-- Phase A: Enterprise Department Profile foundation (TEXT-safe retry)

CREATE TABLE IF NOT EXISTS public.core_organization (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_code        TEXT NOT NULL UNIQUE,
  legal_name      TEXT NOT NULL,
  short_name      TEXT,
  country_code    TEXT,
  default_currency TEXT,
  default_language TEXT,
  time_zone       TEXT,
  website         TEXT,
  primary_logo_url TEXT,
  secondary_logo_url TEXT,
  seal_url        TEXT,
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      TEXT,
  updated_by      TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_organization TO authenticated;
GRANT ALL ON public.core_organization TO service_role;

ALTER TABLE public.office_locations
  ADD COLUMN IF NOT EXISTS gps_lat            NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS gps_lng            NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS office_hours       TEXT,
  ADD COLUMN IF NOT EXISTS manager_user_code  TEXT,
  ADD COLUMN IF NOT EXISTS logo_override_url  TEXT,
  ADD COLUMN IF NOT EXISTS organization_id    UUID;

CREATE TABLE IF NOT EXISTS public.core_department_profile (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID REFERENCES public.core_organization(id) ON DELETE RESTRICT,
  module_code                 TEXT NOT NULL,
  department_code             TEXT NOT NULL,
  department_name             TEXT NOT NULL,
  department_type             TEXT,
  description                 TEXT,
  status                      TEXT NOT NULL DEFAULT 'ACTIVE',
  department_manager_user_code TEXT,
  deputy_manager_user_code     TEXT,
  escalation_contact_user_code TEXT,
  default_team_id              UUID,
  default_workbasket_id        UUID,
  primary_location_id          UUID,
  default_letter_location_id   UUID,
  default_email_location_id    UUID,
  default_dms_location_id      UUID,
  default_letterhead_id        UUID,
  default_email_signature_id   UUID,
  default_disclaimer_id        UUID,
  default_print_footer_id      UUID,
  department_size_mode         TEXT,
  auto_assign_mode             TEXT,
  approvals_mode               TEXT,
  assistant_review_required    BOOLEAN DEFAULT false,
  manager_role_required        BOOLEAN DEFAULT false,
  dms_folder_root              TEXT,
  ai_prompt_prefix             TEXT,
  show_on_pdfs                 BOOLEAN DEFAULT true,
  show_letterhead_on_reports   BOOLEAN DEFAULT true,
  legacy_lg_profile_id         UUID,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                   TEXT,
  updated_by                   TEXT,
  CONSTRAINT core_dept_profile_module_code_unique UNIQUE (module_code, department_code)
);
CREATE INDEX IF NOT EXISTS idx_core_dept_profile_module ON public.core_department_profile(module_code);
CREATE INDEX IF NOT EXISTS idx_core_dept_profile_org    ON public.core_department_profile(organization_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_department_profile TO authenticated;
GRANT ALL ON public.core_department_profile TO service_role;

CREATE TABLE IF NOT EXISTS public.core_department_location (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id       UUID NOT NULL REFERENCES public.core_department_profile(id) ON DELETE CASCADE,
  location_id         UUID NOT NULL,
  is_primary          BOOLEAN NOT NULL DEFAULT false,
  use_for_letters     BOOLEAN NOT NULL DEFAULT false,
  use_for_emails      BOOLEAN NOT NULL DEFAULT false,
  use_for_dms         BOOLEAN NOT NULL DEFAULT false,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          TEXT,
  updated_by          TEXT,
  UNIQUE (department_id, location_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_department_location TO authenticated;
GRANT ALL ON public.core_department_location TO service_role;

CREATE TABLE IF NOT EXISTS public.comm_letterhead (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, version TEXT,
  logo_url TEXT, secondary_logo_url TEXT,
  header_html TEXT, footer_html TEXT, qr_code_url TEXT,
  effective_from DATE, effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT, updated_by TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_letterhead TO authenticated;
GRANT ALL ON public.comm_letterhead TO service_role;

CREATE TABLE IF NOT EXISTS public.comm_email_signature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department_id UUID, officer_user_code TEXT,
  html_signature TEXT, plain_text_signature TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT, updated_by TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_email_signature TO authenticated;
GRANT ALL ON public.comm_email_signature TO service_role;

CREATE TABLE IF NOT EXISTS public.comm_disclaimer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, category TEXT,
  language TEXT DEFAULT 'en', body TEXT NOT NULL,
  effective_from DATE, effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT, updated_by TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_disclaimer TO authenticated;
GRANT ALL ON public.comm_disclaimer TO service_role;

CREATE TABLE IF NOT EXISTS public.comm_print_footer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, footer_html TEXT,
  watermark_url TEXT, page_footer TEXT, version TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT, updated_by TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comm_print_footer TO authenticated;
GRANT ALL ON public.comm_print_footer TO service_role;

CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'core_organization','core_department_profile','core_department_location',
    'comm_letterhead','comm_email_signature','comm_disclaimer','comm_print_footer'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at()', t);
  END LOOP;
END $$;

INSERT INTO public.core_organization (org_code, legal_name, short_name, country_code,
  default_currency, default_language, time_zone, status, description)
VALUES ('SKN-SSB', 'St. Kitts and Nevis Social Security Board', 'SSB',
        'KN', 'XCD', 'en', 'America/St_Kitts', 'ACTIVE',
        'Statutory social security authority of the Federation of St. Kitts and Nevis')
ON CONFLICT (org_code) DO NOTHING;

INSERT INTO public.core_department_profile (
  organization_id, module_code, department_code, department_name, department_type,
  description, status,
  default_team_id, default_workbasket_id,
  department_size_mode, auto_assign_mode, approvals_mode,
  assistant_review_required, manager_role_required,
  dms_folder_root, ai_prompt_prefix,
  show_on_pdfs, show_letterhead_on_reports,
  legacy_lg_profile_id
)
SELECT
  (SELECT id FROM public.core_organization WHERE org_code = 'SKN-SSB'),
  'LEGAL',
  COALESCE(NULLIF(lp.department_code::text,''), 'LEGAL-001'),
  COALESCE(NULLIF(lp.department_name::text,''), 'Legal Department'),
  'LEGAL',
  lp.description::text,
  COALESCE(NULLIF(lp.status::text,''), 'ACTIVE'),
  lp.default_team_id, lp.default_workbasket_id,
  lp.department_size_mode::text, lp.auto_assign_mode::text, lp.approvals_mode::text,
  COALESCE(lp.assistant_review_required, false),
  COALESCE(lp.manager_role_required, false),
  lp.dms_folder_root::text, lp.ai_prompt_prefix::text,
  COALESCE(lp.show_on_pdfs, true),
  COALESCE(lp.show_letterhead_on_reports, true),
  lp.id
FROM public.lg_department_profile lp
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_department_profile cdp
  WHERE cdp.module_code = 'LEGAL' AND cdp.legacy_lg_profile_id = lp.id
)
LIMIT 1;
