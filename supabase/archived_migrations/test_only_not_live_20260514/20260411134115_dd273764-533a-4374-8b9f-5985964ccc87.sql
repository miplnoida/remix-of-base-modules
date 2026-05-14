
-- Employer group role enum
DO $$ BEGIN
  CREATE TYPE public.ce_employer_group_role AS ENUM ('primary', 'member', 'branch');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ce_employer_groups
CREATE TABLE IF NOT EXISTS public.ce_employer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  group_code TEXT UNIQUE,
  description TEXT,
  territory TEXT,
  sector TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);
ALTER TABLE public.ce_employer_groups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all_ce_employer_groups" ON public.ce_employer_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ce_employer_group_membership
CREATE TABLE IF NOT EXISTS public.ce_employer_group_membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.ce_employer_groups(id) ON DELETE CASCADE,
  employer_id TEXT NOT NULL,
  role public.ce_employer_group_role NOT NULL DEFAULT 'member',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  CONSTRAINT ce_egm_unique UNIQUE (group_id, employer_id, effective_from)
);
ALTER TABLE public.ce_employer_group_membership ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth_all_ce_employer_group_membership" ON public.ce_employer_group_membership FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_ce_egm_employer ON public.ce_employer_group_membership (employer_id);
CREATE INDEX IF NOT EXISTS idx_ce_egm_group ON public.ce_employer_group_membership (group_id);
CREATE INDEX IF NOT EXISTS idx_ce_egm_active ON public.ce_employer_group_membership (is_active) WHERE is_active = true;

-- Extend ce_employer_relationships
ALTER TABLE public.ce_employer_relationships
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_reference TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Triggers
CREATE TRIGGER trg_ce_employer_groups_updated
  BEFORE UPDATE ON public.ce_employer_groups
  FOR EACH ROW EXECUTE FUNCTION public.ce_update_updated_at();

CREATE TRIGGER trg_ce_employer_group_membership_updated
  BEFORE UPDATE ON public.ce_employer_group_membership
  FOR EACH ROW EXECUTE FUNCTION public.ce_update_updated_at();

-- Hierarchy view
CREATE OR REPLACE VIEW public.ce_employer_hierarchy_view AS
SELECT
  r.id AS relationship_id,
  r.relationship_type,
  r.effective_from,
  r.effective_to,
  r.is_active AS relationship_active,
  r.verification_status,
  r.parent_employer_id AS source_employer_id,
  src.name AS source_employer_name,
  src.status AS source_employer_status,
  src.sector_code AS source_sector,
  src.office_code AS source_territory,
  r.child_employer_id AS target_employer_id,
  tgt.name AS target_employer_name,
  tgt.status AS target_employer_status,
  tgt.sector_code AS target_sector,
  tgt.office_code AS target_territory,
  src_cs.overall_compliance_status AS source_compliance_status,
  src_cs.current_arrears_amount AS source_arrears,
  src_cs.active_violation_count AS source_violations,
  src_cs.active_case_count AS source_cases,
  tgt_cs.overall_compliance_status AS target_compliance_status,
  tgt_cs.current_arrears_amount AS target_arrears,
  tgt_cs.active_violation_count AS target_violations,
  tgt_cs.active_case_count AS target_cases,
  src_rp.total_score AS source_risk_score,
  src_rp.risk_band AS source_risk_band,
  tgt_rp.total_score AS target_risk_score,
  tgt_rp.risk_band AS target_risk_band,
  gm_src.group_id AS source_group_id,
  g.group_name AS source_group_name
FROM public.ce_employer_relationships r
LEFT JOIN public.er_master src ON src.regno = r.parent_employer_id
LEFT JOIN public.er_master tgt ON tgt.regno = r.child_employer_id
LEFT JOIN public.ce_employer_compliance_status src_cs ON src_cs.employer_id = r.parent_employer_id
LEFT JOIN public.ce_employer_compliance_status tgt_cs ON tgt_cs.employer_id = r.child_employer_id
LEFT JOIN public.ce_risk_profiles src_rp ON src_rp.employer_id = r.parent_employer_id
LEFT JOIN public.ce_risk_profiles tgt_rp ON tgt_rp.employer_id = r.child_employer_id
LEFT JOIN public.ce_employer_group_membership gm_src ON gm_src.employer_id = r.parent_employer_id AND gm_src.is_active = true
LEFT JOIN public.ce_employer_groups g ON g.id = gm_src.group_id;

-- Group summary view
CREATE OR REPLACE VIEW public.ce_employer_group_summary_view AS
SELECT
  g.id AS group_id,
  g.group_name,
  g.group_code,
  g.territory,
  g.sector,
  g.is_active,
  COUNT(DISTINCT gm.employer_id) AS member_count,
  COALESCE(SUM(cs.current_arrears_amount), 0) AS total_group_arrears,
  COALESCE(SUM(cs.current_penalty_amount), 0) AS total_group_penalties,
  COALESCE(SUM(cs.active_violation_count), 0) AS total_group_violations,
  COALESCE(SUM(cs.active_case_count), 0) AS total_group_cases,
  MAX(rp.total_score) AS max_risk_score,
  MIN(rp.total_score) AS min_risk_score,
  ROUND(AVG(rp.total_score)::numeric, 1) AS avg_risk_score
FROM public.ce_employer_groups g
LEFT JOIN public.ce_employer_group_membership gm ON gm.group_id = g.id AND gm.is_active = true
LEFT JOIN public.ce_employer_compliance_status cs ON cs.employer_id = gm.employer_id
LEFT JOIN public.ce_risk_profiles rp ON rp.employer_id = gm.employer_id
GROUP BY g.id, g.group_name, g.group_code, g.territory, g.sector, g.is_active;
