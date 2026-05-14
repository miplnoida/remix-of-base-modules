
-- =============================================
-- STEP 1: Enhance ce_zones with office linkage
-- =============================================
ALTER TABLE public.ce_zones 
  ADD COLUMN IF NOT EXISTS office_code VARCHAR REFERENCES public.tb_office(code),
  ADD COLUMN IF NOT EXISTS territory VARCHAR DEFAULT 'St Kitts';

-- Update existing zones with office/territory
UPDATE public.ce_zones SET office_code = 'STK', territory = 'St Kitts' WHERE zone_code = 'Z1';
UPDATE public.ce_zones SET office_code = 'STK', territory = 'St Kitts' WHERE zone_code = 'Z2';
UPDATE public.ce_zones SET office_code = 'NEV', territory = 'Nevis' WHERE zone_code = 'Z3';

-- =============================================
-- STEP 2: Enhance ce_inspectors with profile linkage
-- =============================================
ALTER TABLE public.ce_inspectors
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS legacy_inspector_code VARCHAR,
  ADD COLUMN IF NOT EXISTS designation_id UUID REFERENCES public.tb_designations(id),
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.ce_inspectors(id),
  ADD COLUMN IF NOT EXISTS max_caseload INT DEFAULT 50;

CREATE INDEX IF NOT EXISTS idx_ce_inspectors_profile ON public.ce_inspectors(profile_id);
CREATE INDEX IF NOT EXISTS idx_ce_inspectors_legacy ON public.ce_inspectors(legacy_inspector_code);

-- =============================================
-- STEP 3: ce_zone_office_mapping
-- =============================================
CREATE TABLE IF NOT EXISTS public.ce_zone_office_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  office_code VARCHAR NOT NULL REFERENCES public.tb_office(code),
  zone_id UUID NOT NULL REFERENCES public.ce_zones(id),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by VARCHAR,
  UNIQUE(office_code, zone_id)
);

-- =============================================
-- STEP 4: ce_village_zone_mapping
-- =============================================
CREATE TABLE IF NOT EXISTS public.ce_village_zone_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  village_code VARCHAR NOT NULL,
  zone_id UUID NOT NULL REFERENCES public.ce_zones(id),
  office_code VARCHAR REFERENCES public.tb_office(code),
  district_code VARCHAR,
  mapping_source VARCHAR DEFAULT 'SEED',
  mapping_confidence VARCHAR DEFAULT 'HIGH',
  is_active BOOLEAN DEFAULT true,
  manually_overridden BOOLEAN DEFAULT false,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by VARCHAR,
  UNIQUE(village_code)
);

CREATE INDEX IF NOT EXISTS idx_ce_village_zone_village ON public.ce_village_zone_mapping(village_code);
CREATE INDEX IF NOT EXISTS idx_ce_village_zone_zone ON public.ce_village_zone_mapping(zone_id);

-- =============================================
-- STEP 5: ce_assignment_queues
-- =============================================
CREATE TABLE IF NOT EXISTS public.ce_assignment_queues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES public.ce_zones(id),
  queue_code VARCHAR NOT NULL,
  queue_name VARCHAR NOT NULL,
  queue_type VARCHAR NOT NULL CHECK (queue_type IN ('OPS','REV','LEG','FLB')),
  is_default BOOLEAN DEFAULT false,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by VARCHAR,
  UNIQUE(zone_id, queue_code)
);

-- =============================================
-- STEP 6: ce_queue_members
-- =============================================
CREATE TABLE IF NOT EXISTS public.ce_queue_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_id UUID NOT NULL REFERENCES public.ce_assignment_queues(id),
  inspector_id UUID NOT NULL REFERENCES public.ce_inspectors(id),
  role VARCHAR DEFAULT 'MEMBER' CHECK (role IN ('MEMBER','LEAD','SUPERVISOR','BACKUP')),
  max_caseload_override INT,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_ce_queue_members_queue ON public.ce_queue_members(queue_id);
CREATE INDEX IF NOT EXISTS idx_ce_queue_members_inspector ON public.ce_queue_members(inspector_id);

-- =============================================
-- STEP 7: ce_assignment_routing_rules
-- =============================================
CREATE TABLE IF NOT EXISTS public.ce_assignment_routing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name VARCHAR NOT NULL,
  violation_type_id UUID REFERENCES public.ce_violation_types(id),
  office_code VARCHAR REFERENCES public.tb_office(code),
  zone_id UUID REFERENCES public.ce_zones(id),
  target_queue_id UUID REFERENCES public.ce_assignment_queues(id),
  target_inspector_id UUID REFERENCES public.ce_inspectors(id),
  priority INT DEFAULT 0,
  requires_review BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by VARCHAR
);

-- =============================================
-- STEP 8: ce_violation_assignments
-- =============================================
CREATE TABLE IF NOT EXISTS public.ce_violation_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  violation_id UUID NOT NULL REFERENCES public.ce_violations(id),
  assigned_to_inspector_id UUID REFERENCES public.ce_inspectors(id),
  assigned_to_queue_id UUID REFERENCES public.ce_assignment_queues(id),
  assignment_type VARCHAR DEFAULT 'AUTO' CHECK (assignment_type IN ('AUTO','MANUAL','ESCALATION','REASSIGN','FALLBACK')),
  assigned_by VARCHAR,
  routing_rule_id UUID REFERENCES public.ce_assignment_routing_rules(id),
  zone_resolved_from VARCHAR,
  resolution_method VARCHAR CHECK (resolution_method IN ('VILLAGE','OFFICE','FALLBACK','MANUAL')),
  notes TEXT,
  is_current BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  superseded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ce_violation_assignments_violation ON public.ce_violation_assignments(violation_id);
CREATE INDEX IF NOT EXISTS idx_ce_violation_assignments_current ON public.ce_violation_assignments(violation_id, is_current) WHERE is_current = true;

-- =============================================
-- STEP 9: Unified inspector view
-- =============================================
CREATE OR REPLACE VIEW public.ce_inspector_profiles AS
SELECT
  ci.id,
  ci.inspector_code,
  ci.profile_id,
  ci.legacy_inspector_code,
  ci.assigned_zones,
  ci.is_primary,
  ci.is_active AS compliance_active,
  ci.active_from,
  ci.max_caseload,
  ci.supervisor_id,
  ci.designation_id,
  p.full_name,
  p.email,
  p.office_code AS profile_office_code,
  d.name AS designation_name,
  ti.insp_name AS legacy_name
FROM public.ce_inspectors ci
LEFT JOIN public.profiles p ON p.id = ci.profile_id
LEFT JOIN public.tb_designations d ON d.id = ci.designation_id
LEFT JOIN public.tb_inspector ti ON ti.code = ci.legacy_inspector_code;

-- =============================================
-- STEP 10: Zone resolution function
-- =============================================
CREATE OR REPLACE FUNCTION public.fn_ce_resolve_zone(
  p_village_code VARCHAR DEFAULT NULL,
  p_office_code VARCHAR DEFAULT NULL
)
RETURNS TABLE(
  zone_id UUID,
  zone_code VARCHAR,
  zone_name VARCHAR,
  resolution_method VARCHAR
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Priority 1: Village-level mapping
  IF p_village_code IS NOT NULL THEN
    RETURN QUERY
    SELECT z.id, z.zone_code, z.zone_name, 'VILLAGE'::VARCHAR
    FROM ce_village_zone_mapping vzm
    JOIN ce_zones z ON z.id = vzm.zone_id
    WHERE vzm.village_code = p_village_code
      AND vzm.is_active = true
      AND z.is_active = true
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Priority 2: Office-level default
  IF p_office_code IS NOT NULL THEN
    RETURN QUERY
    SELECT z.id, z.zone_code, z.zone_name, 'OFFICE'::VARCHAR
    FROM ce_zone_office_mapping zom
    JOIN ce_zones z ON z.id = zom.zone_id
    WHERE zom.office_code = p_office_code
      AND zom.is_default = true
      AND zom.is_active = true
      AND z.is_active = true
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Priority 3: Fallback to first active zone
  RETURN QUERY
  SELECT z.id, z.zone_code, z.zone_name, 'FALLBACK'::VARCHAR
  FROM ce_zones z
  WHERE z.is_active = true
  ORDER BY z.zone_code
  LIMIT 1;
END;
$$;

-- =============================================
-- STEP 11: Seed zone-office mappings
-- =============================================
INSERT INTO public.ce_zone_office_mapping (office_code, zone_id, is_default, created_by)
VALUES
  ('STK', 'a1b2c3d4-0001-4000-8000-000000000001', true, 'SEED-ZONAL-ROUTING'),
  ('STK', 'a1b2c3d4-0002-4000-8000-000000000002', false, 'SEED-ZONAL-ROUTING'),
  ('NEV', 'a1b2c3d4-0003-4000-8000-000000000003', true, 'SEED-ZONAL-ROUTING')
ON CONFLICT (office_code, zone_id) DO NOTHING;

-- =============================================
-- STEP 12: Seed assignment queues (4 per zone)
-- =============================================
INSERT INTO public.ce_assignment_queues (zone_id, queue_code, queue_name, queue_type, is_default, priority, created_by) VALUES
  -- Zone 1 - Basseterre
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Z1-OPS', 'Zone 1 Operations', 'OPS', true, 1, 'SEED-ZONAL-ROUTING'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Z1-REV', 'Zone 1 Review', 'REV', false, 2, 'SEED-ZONAL-ROUTING'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Z1-LEG', 'Zone 1 Legal', 'LEG', false, 3, 'SEED-ZONAL-ROUTING'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Z1-FLB', 'Zone 1 Fallback', 'FLB', false, 99, 'SEED-ZONAL-ROUTING'),
  -- Zone 2 - St Peters
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Z2-OPS', 'Zone 2 Operations', 'OPS', true, 1, 'SEED-ZONAL-ROUTING'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Z2-REV', 'Zone 2 Review', 'REV', false, 2, 'SEED-ZONAL-ROUTING'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Z2-LEG', 'Zone 2 Legal', 'LEG', false, 3, 'SEED-ZONAL-ROUTING'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Z2-FLB', 'Zone 2 Fallback', 'FLB', false, 99, 'SEED-ZONAL-ROUTING'),
  -- Zone 3 - Nevis
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Z3-OPS', 'Zone 3 Operations', 'OPS', true, 1, 'SEED-ZONAL-ROUTING'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Z3-REV', 'Zone 3 Review', 'REV', false, 2, 'SEED-ZONAL-ROUTING'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Z3-LEG', 'Zone 3 Legal', 'LEG', false, 3, 'SEED-ZONAL-ROUTING'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Z3-FLB', 'Zone 3 Fallback', 'FLB', false, 99, 'SEED-ZONAL-ROUTING')
ON CONFLICT (zone_id, queue_code) DO NOTHING;

-- =============================================
-- STEP 13: Seed village-to-zone mappings
-- Nevis villages (codes known from Nevis parish names) → Z3
-- Remaining St Kitts villages split: Basseterre-area → Z1, northern → Z2
-- =============================================

-- Known Nevis villages → Z3
INSERT INTO public.ce_village_zone_mapping (village_code, zone_id, office_code, mapping_source, created_by)
SELECT v.code, 'a1b2c3d4-0003-4000-8000-000000000003'::UUID, 'NEV', 'SEED-NEVIS', 'SEED-ZONAL-ROUTING'
FROM tb_villages v
WHERE v.description ILIKE ANY(ARRAY[
  '%charlestown%','%gingerland%','%figtree%','%newcastle%','%bath%','%cotton ground%',
  '%brown hill%','%jessups%','%whitehall%','%stoney grove%','%hamilton%','%brick kiln%',
  '%butlers%','%camps%','%church ground%','%clifton%','%cole hill%','%craddock road%',
  '%eden brown%','%fothergills%','%fountain%','%government road%','%hanley%','%hermitage%',
  '%jones%','%lowlands%','%maddens%','%market shop%','%mount lily%','%mount pleasant%',
  '%nelson spring%','%nisbett%','%oualie%','%pinneys%','%prospect%','%rawlins%',
  '%st. james%','%st. john%','%st. paul%','%st. thomas%','%zetlands%','%zion%',
  '%morning star%','%brown pasture%','%bucks hill%','%cades bay%','%cotton%',
  '%fig tree%','%indian castle%','%long point%','%new river%','%round hill%',
  '%saddle hill%','%shaw%','%westbury%','%windward%','%chicken stone%','%clay ghaut%',
  '%coconut walk%','%colquhoun%','%content%','%dasent%','%docker%','%garner%',
  '%golden rock%','%hardtimes%','%hick%','%hurricane hill%','%lime kiln%',
  '%mannings%','%montpelier%','%mus%','%nag%','%ortley%','%potwork%','%rices%',
  '%scarborough%','%shaws road%','%smiths%','%stapleton%','%stoney hill%',
  '%sugar loaf%','%taylor%','%zetland%','%bourryeau%'
])
ON CONFLICT (village_code) DO NOTHING;

-- Zone 2 - Northern St Kitts villages
INSERT INTO public.ce_village_zone_mapping (village_code, zone_id, office_code, mapping_source, created_by)
SELECT v.code, 'a1b2c3d4-0002-4000-8000-000000000002'::UUID, 'STK', 'SEED-STK-NORTH', 'SEED-ZONAL-ROUTING'
FROM tb_villages v
WHERE v.code NOT IN (SELECT village_code FROM ce_village_zone_mapping)
  AND v.description ILIKE ANY(ARRAY[
    '%cayon%','%dieppe bay%','%sandy point%','%st. peter%','%st. paul%',
    '%tabernacle%','%newton ground%','%sadlers%','%molyneux%','%mansion%',
    '%lavington%','%keys%','%lodge%','%molineux%','%phillips%','%parsons%',
    '%ottley%','%estridge%','%saddlers%','%halfway tree%','%belle vue%',
    '%belmont%','%lodge project%','%stapleton%','%pogson%','%hermitage%',
    '%palmetto point%','%st mary%','%nicola town%','%capisterre%'
  ])
ON CONFLICT (village_code) DO NOTHING;

-- All remaining unmapped villages → Z1 (Basseterre default)
INSERT INTO public.ce_village_zone_mapping (village_code, zone_id, office_code, mapping_source, created_by)
SELECT v.code, 'a1b2c3d4-0001-4000-8000-000000000001'::UUID, 'STK', 'SEED-STK-DEFAULT', 'SEED-ZONAL-ROUTING'
FROM tb_villages v
WHERE v.code NOT IN (SELECT village_code FROM ce_village_zone_mapping)
ON CONFLICT (village_code) DO NOTHING;
