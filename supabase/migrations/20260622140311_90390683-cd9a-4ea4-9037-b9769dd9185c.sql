
-- Legal Team -> Workbasket assignment
CREATE TABLE IF NOT EXISTS public.lg_team_workbasket (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.lg_team(id) ON DELETE CASCADE,
  workbasket_code VARCHAR(64) NOT NULL,
  responsibility_type VARCHAR(16) NOT NULL DEFAULT 'OWNER'
    CHECK (responsibility_type IN ('OWNER','SUPPORT','REVIEW','APPROVAL')),
  can_receive_new_cases BOOLEAN NOT NULL DEFAULT true,
  can_auto_assign BOOLEAN NOT NULL DEFAULT false,
  default_for_stage VARCHAR(64),
  default_for_case_type VARCHAR(64),
  escalation_target BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_team_workbasket TO authenticated;
GRANT ALL ON public.lg_team_workbasket TO service_role;

CREATE INDEX IF NOT EXISTS idx_lg_team_workbasket_team ON public.lg_team_workbasket(team_id);
CREATE INDEX IF NOT EXISTS idx_lg_team_workbasket_wb   ON public.lg_team_workbasket(workbasket_code);

-- prevent duplicate active responsibility per team+workbasket+type
CREATE UNIQUE INDEX IF NOT EXISTS uq_lg_team_workbasket_active
  ON public.lg_team_workbasket(team_id, workbasket_code, responsibility_type)
  WHERE is_active = true;

CREATE TRIGGER trg_lg_team_workbasket_upd
  BEFORE UPDATE ON public.lg_team_workbasket
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default mappings using existing lg_team rows.
-- GENERAL_LEGAL owns intake/referral/assignment.
INSERT INTO public.lg_team_workbasket (team_id, workbasket_code, responsibility_type, can_receive_new_cases, can_auto_assign, is_active, created_by)
SELECT t.id, wb, 'OWNER', true, true, true, 'SEED'
FROM public.lg_team t
CROSS JOIN (VALUES ('LEGAL_INTAKE_REVIEW'),('LEGAL_REFERRAL_REVIEW'),('LEGAL_CASE_ASSIGNMENT')) AS v(wb)
WHERE t.team_code = 'GENERAL_LEGAL'
ON CONFLICT DO NOTHING;

-- Manager review always escalation target for GENERAL_LEGAL
INSERT INTO public.lg_team_workbasket (team_id, workbasket_code, responsibility_type, can_receive_new_cases, can_auto_assign, escalation_target, is_active, created_by)
SELECT t.id, 'LEGAL_MANAGER_REVIEW', 'REVIEW', true, false, true, true, 'SEED'
FROM public.lg_team t WHERE t.team_code = 'GENERAL_LEGAL'
ON CONFLICT DO NOTHING;

-- LITIGATION
INSERT INTO public.lg_team_workbasket (team_id, workbasket_code, responsibility_type, can_receive_new_cases, can_auto_assign, is_active, created_by)
SELECT t.id, wb, 'OWNER', true, true, true, 'SEED'
FROM public.lg_team t
CROSS JOIN (VALUES ('LEGAL_HEARING_PREPARATION'),('LEGAL_FEE_POSTING')) AS v(wb)
WHERE t.team_code = 'LITIGATION'
ON CONFLICT DO NOTHING;

-- ENFORCEMENT
INSERT INTO public.lg_team_workbasket (team_id, workbasket_code, responsibility_type, can_receive_new_cases, can_auto_assign, is_active, created_by)
SELECT t.id, wb, 'OWNER', true, true, true, 'SEED'
FROM public.lg_team t
CROSS JOIN (VALUES ('LEGAL_ENFORCEMENT'),('LEGAL_SETTLEMENT_REVIEW')) AS v(wb)
WHERE t.team_code = 'ENFORCEMENT'
ON CONFLICT DO NOTHING;

-- Small-office fallback: if only GENERAL_LEGAL is active, ensure it owns ALL workbaskets
INSERT INTO public.lg_team_workbasket (team_id, workbasket_code, responsibility_type, can_receive_new_cases, can_auto_assign, is_active, created_by)
SELECT t.id, rv.value_code, 'OWNER', true, true, true, 'SEED'
FROM public.lg_team t
JOIN public.core_reference_group g ON g.group_code = 'LG_WORKBASKET'
JOIN public.core_reference_value rv ON rv.group_id = g.id AND rv.is_active = true
WHERE t.team_code = 'GENERAL_LEGAL'
  AND (SELECT count(*) FROM public.lg_team WHERE is_active = true) = 1
ON CONFLICT DO NOTHING;
