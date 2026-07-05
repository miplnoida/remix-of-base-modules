
CREATE TABLE IF NOT EXISTS public.core_reference_category (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_code TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL,
  description TEXT,
  owner_module_code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_reference_category TO authenticated;
GRANT ALL ON public.core_reference_category TO service_role;

ALTER TABLE public.core_reference_group
  ADD COLUMN IF NOT EXISTS category_code TEXT,
  ADD COLUMN IF NOT EXISTS ownership_module_code TEXT,
  ADD COLUMN IF NOT EXISTS is_platform_owned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_org_overridable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS supports_hierarchy BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_i18n BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS supports_external_codes BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_core_reference_group_category ON public.core_reference_group(category_code);

ALTER TABLE public.core_reference_value
  ADD COLUMN IF NOT EXISTS parent_value_id UUID REFERENCES public.core_reference_value(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hierarchy_path TEXT,
  ADD COLUMN IF NOT EXISTS depth INTEGER,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES public.core_reference_value(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'PLATFORM',
  ADD COLUMN IF NOT EXISTS scope_org_id UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

ALTER TABLE public.core_reference_value DROP CONSTRAINT IF EXISTS bn_reference_value_status_check;
ALTER TABLE public.core_reference_value
  ADD CONSTRAINT core_reference_value_status_check
  CHECK (status IN ('DRAFT','ACTIVE','INACTIVE','SUPERSEDED','RETIRED'));

CREATE INDEX IF NOT EXISTS idx_core_reference_value_parent ON public.core_reference_value(parent_value_id);
CREATE INDEX IF NOT EXISTS idx_core_reference_value_scope ON public.core_reference_value(scope_type, scope_org_id);
CREATE INDEX IF NOT EXISTS idx_core_reference_value_hierarchy ON public.core_reference_value(hierarchy_path);

CREATE TABLE IF NOT EXISTS public.core_reference_value_i18n (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value_id UUID NOT NULL REFERENCES public.core_reference_value(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (value_id, locale)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_reference_value_i18n TO authenticated;
GRANT ALL ON public.core_reference_value_i18n TO service_role;
CREATE INDEX IF NOT EXISTS idx_core_reference_value_i18n_value ON public.core_reference_value_i18n(value_id);

CREATE TABLE IF NOT EXISTS public.core_reference_value_external_code (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value_id UUID NOT NULL REFERENCES public.core_reference_value(id) ON DELETE CASCADE,
  system_code TEXT NOT NULL,
  external_code TEXT NOT NULL,
  external_label TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (value_id, system_code, external_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_reference_value_external_code TO authenticated;
GRANT ALL ON public.core_reference_value_external_code TO service_role;
CREATE INDEX IF NOT EXISTS idx_core_reference_value_external_value ON public.core_reference_value_external_code(value_id);
CREATE INDEX IF NOT EXISTS idx_core_reference_value_external_system ON public.core_reference_value_external_code(system_code, external_code);

CREATE TABLE IF NOT EXISTS public.core_reference_value_alias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  value_id UUID NOT NULL REFERENCES public.core_reference_value(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  alias_type TEXT,
  locale TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_reference_value_alias TO authenticated;
GRANT ALL ON public.core_reference_value_alias TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS uq_core_reference_value_alias
  ON public.core_reference_value_alias (value_id, alias, COALESCE(locale, ''));
CREATE INDEX IF NOT EXISTS idx_core_reference_value_alias_value ON public.core_reference_value_alias(value_id);
CREATE INDEX IF NOT EXISTS idx_core_reference_value_alias_alias ON public.core_reference_value_alias(alias);

ALTER TABLE public.core_reference_group
  DROP CONSTRAINT IF EXISTS core_reference_group_category_code_fkey;
ALTER TABLE public.core_reference_group
  ADD CONSTRAINT core_reference_group_category_code_fkey
  FOREIGN KEY (category_code) REFERENCES public.core_reference_category(category_code)
  ON UPDATE CASCADE ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trg_core_reference_category_touch ON public.core_reference_category;
CREATE TRIGGER trg_core_reference_category_touch
  BEFORE UPDATE ON public.core_reference_category
  FOR EACH ROW EXECUTE FUNCTION public.bn_reference_touch_updated_at();

DROP TRIGGER IF EXISTS trg_core_reference_value_i18n_touch ON public.core_reference_value_i18n;
CREATE TRIGGER trg_core_reference_value_i18n_touch
  BEFORE UPDATE ON public.core_reference_value_i18n
  FOR EACH ROW EXECUTE FUNCTION public.bn_reference_touch_updated_at();

DROP TRIGGER IF EXISTS trg_core_reference_value_external_touch ON public.core_reference_value_external_code;
CREATE TRIGGER trg_core_reference_value_external_touch
  BEFORE UPDATE ON public.core_reference_value_external_code
  FOR EACH ROW EXECUTE FUNCTION public.bn_reference_touch_updated_at();

DROP TRIGGER IF EXISTS trg_core_reference_value_alias_touch ON public.core_reference_value_alias;
CREATE TRIGGER trg_core_reference_value_alias_touch
  BEFORE UPDATE ON public.core_reference_value_alias
  FOR EACH ROW EXECUTE FUNCTION public.bn_reference_touch_updated_at();
