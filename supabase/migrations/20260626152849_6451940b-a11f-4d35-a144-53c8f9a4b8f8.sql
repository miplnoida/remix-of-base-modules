
-- 1. Office location contact columns
ALTER TABLE public.office_locations
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS fax TEXT;

-- Backfill from office_hours field for the two real KN offices (best-effort, keeps office_hours intact)
UPDATE public.office_locations
SET phone = '(869) 465-2535', fax = '(869) 465-5051', email = 'pubinfo@socialsecurity.kn'
WHERE id = '33168f45-7400-40cb-9750-1713a3e15c90' AND phone IS NULL;

UPDATE public.office_locations
SET phone = '(869) 469-5245', fax = '(869) 469-1046', email = 'nevis@socialsecurity.kn'
WHERE id = '7333999c-f1ef-4373-87ca-cec18ed9015d' AND phone IS NULL;

-- 2. Reference groups for currency / timezone / language (CORE module)
INSERT INTO public.core_reference_group (group_code, group_name, module_code, description, is_system, is_system_group, sort_order)
VALUES
  ('CORE_CURRENCY', 'Currencies', 'CORE', 'ISO 4217 currency codes used across the platform', true, true, 10),
  ('CORE_TIMEZONE', 'Time Zones', 'CORE', 'IANA time-zone identifiers', true, true, 20),
  ('CORE_LANGUAGE', 'Languages', 'CORE', 'ISO 639-1 language codes', true, true, 30)
ON CONFLICT (group_code) DO NOTHING;

-- Currencies
INSERT INTO public.core_reference_value (group_id, value_code, value_label, description, sort_order, is_default, is_system, module_code)
SELECT g.id, v.code, v.label, v.descr, v.ord, v.is_def, true, 'CORE'
FROM public.core_reference_group g
CROSS JOIN (VALUES
  ('XCD','XCD — East Caribbean Dollar','Eastern Caribbean Currency Union',10,true),
  ('USD','USD — US Dollar',NULL,20,false),
  ('EUR','EUR — Euro',NULL,30,false),
  ('GBP','GBP — British Pound',NULL,40,false),
  ('CAD','CAD — Canadian Dollar',NULL,50,false),
  ('TTD','TTD — Trinidad & Tobago Dollar',NULL,60,false),
  ('BBD','BBD — Barbadian Dollar',NULL,70,false)
) AS v(code,label,descr,ord,is_def)
WHERE g.group_code = 'CORE_CURRENCY'
ON CONFLICT (group_id, value_code) DO NOTHING;

-- Timezones
INSERT INTO public.core_reference_value (group_id, value_code, value_label, sort_order, is_default, is_system, module_code)
SELECT g.id, v.code, v.label, v.ord, v.is_def, true, 'CORE'
FROM public.core_reference_group g
CROSS JOIN (VALUES
  ('America/St_Kitts','America/St_Kitts (AST, UTC-4)',10,true),
  ('America/Port_of_Spain','America/Port_of_Spain (AST, UTC-4)',20,false),
  ('America/New_York','America/New_York (ET)',30,false),
  ('America/Chicago','America/Chicago (CT)',40,false),
  ('America/Denver','America/Denver (MT)',50,false),
  ('America/Los_Angeles','America/Los_Angeles (PT)',60,false),
  ('Europe/London','Europe/London (GMT/BST)',70,false),
  ('UTC','UTC',80,false)
) AS v(code,label,ord,is_def)
WHERE g.group_code = 'CORE_TIMEZONE'
ON CONFLICT (group_id, value_code) DO NOTHING;

-- Languages
INSERT INTO public.core_reference_value (group_id, value_code, value_label, sort_order, is_default, is_system, module_code)
SELECT g.id, v.code, v.label, v.ord, v.is_def, true, 'CORE'
FROM public.core_reference_group g
CROSS JOIN (VALUES
  ('en','English',10,true),
  ('es','Spanish',20,false),
  ('fr','French',30,false)
) AS v(code,label,ord,is_def)
WHERE g.group_code = 'CORE_LANGUAGE'
ON CONFLICT (group_id, value_code) DO NOTHING;

-- 3. Team & Workbasket masters (lightweight; per-module so any module can register its own)
CREATE TABLE IF NOT EXISTS public.core_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  module_code TEXT NOT NULL DEFAULT 'CORE',
  organization_id UUID REFERENCES public.core_organization(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_team TO authenticated;
GRANT ALL ON public.core_team TO service_role;
-- NO-RLS architecture: app-layer enforcement only.
ALTER TABLE public.core_team DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.core_workbasket (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workbasket_code TEXT NOT NULL UNIQUE,
  workbasket_name TEXT NOT NULL,
  module_code TEXT NOT NULL DEFAULT 'CORE',
  organization_id UUID REFERENCES public.core_organization(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.core_team(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_workbasket TO authenticated;
GRANT ALL ON public.core_workbasket TO service_role;
ALTER TABLE public.core_workbasket DISABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_core_team_updated_at BEFORE UPDATE ON public.core_team FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER trg_core_workbasket_updated_at BEFORE UPDATE ON public.core_workbasket FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Seed a couple of starter teams/workbaskets for the SSB org
INSERT INTO public.core_team (team_code, team_name, module_code, organization_id, description, sort_order)
SELECT v.code, v.name, v.module, o.id, v.descr, v.ord
FROM public.core_organization o
CROSS JOIN (VALUES
  ('TEAM-INSP','Inspectors','COMPLIANCE','Field compliance inspectors',10),
  ('TEAM-CASH','Cashiers','PAYMENTS','Cashier desk team',20),
  ('TEAM-BEN','Benefits Officers','BN','Benefits processing team',30),
  ('TEAM-LEGAL','Legal Officers','LEGAL','Legal department team',40)
) AS v(code,name,module,descr,ord)
WHERE o.org_code = 'SKN-SSB'
ON CONFLICT (team_code) DO NOTHING;

INSERT INTO public.core_workbasket (workbasket_code, workbasket_name, module_code, organization_id, description, sort_order)
SELECT v.code, v.name, v.module, o.id, v.descr, v.ord
FROM public.core_organization o
CROSS JOIN (VALUES
  ('WB-INSP-NEW','Inspectors — New Cases','COMPLIANCE','New compliance cases for inspectors',10),
  ('WB-CASH-DAILY','Cashier Daily Queue','PAYMENTS','Daily cashier transactions',20),
  ('WB-BEN-INTAKE','Benefits Intake','BN','New benefit claims',30),
  ('WB-LEGAL-INTAKE','Legal Intake','LEGAL','New legal matters',40)
) AS v(code,name,module,descr,ord)
WHERE o.org_code = 'SKN-SSB'
ON CONFLICT (workbasket_code) DO NOTHING;
