
-- =====================================================================
-- 1) lg_team
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.lg_team (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_code           varchar(64) NOT NULL UNIQUE,
  team_name           text        NOT NULL,
  description         text,
  is_active           boolean     NOT NULL DEFAULT true,
  is_default          boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  created_by          varchar(50)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_team TO authenticated;
GRANT ALL ON public.lg_team TO service_role;
ALTER TABLE public.lg_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lg_team DISABLE ROW LEVEL SECURITY; -- project NO-RLS standard

-- =====================================================================
-- 2) lg_team_member
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.lg_team_member (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id                  uuid NOT NULL REFERENCES public.lg_team(id) ON DELETE CASCADE,
  user_id                  uuid NOT NULL,
  role_code                varchar(64) NOT NULL,                    -- LEGAL_OFFICER, LEGAL_MANAGER, ...
  member_function          varchar(32) NOT NULL DEFAULT 'LAWYER',   -- LAWYER | SUPPORT | CLERK | MANAGER | ADMIN
  can_own_case             boolean NOT NULL DEFAULT false,
  can_prepare_documents    boolean NOT NULL DEFAULT true,
  can_schedule_hearing     boolean NOT NULL DEFAULT false,
  can_post_fee             boolean NOT NULL DEFAULT false,
  can_generate_notice      boolean NOT NULL DEFAULT false,
  can_approve              boolean NOT NULL DEFAULT false,
  is_active                boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  created_by               varchar(50),
  UNIQUE (team_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_team_member TO authenticated;
GRANT ALL ON public.lg_team_member TO service_role;
ALTER TABLE public.lg_team_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lg_team_member DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lg_team_member_user ON public.lg_team_member(user_id);
CREATE INDEX IF NOT EXISTS idx_lg_team_member_team ON public.lg_team_member(team_id);

-- =====================================================================
-- 3) lg_workbasket_role  (per-workbasket responsibility map)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.lg_workbasket_role (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workbasket_code         varchar(64) NOT NULL UNIQUE,
  owning_team_code        varchar(64),
  responsible_role_code   varchar(64),
  support_role_code       varchar(64),
  description             text,
  is_active               boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_workbasket_role TO authenticated;
GRANT ALL ON public.lg_workbasket_role TO service_role;
ALTER TABLE public.lg_workbasket_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lg_workbasket_role DISABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4) Extend lg_case_task to distinguish lawyer vs support tasks
-- =====================================================================
ALTER TABLE public.lg_case_task
  ADD COLUMN IF NOT EXISTS task_kind varchar(16) NOT NULL DEFAULT 'LAWYER';
COMMENT ON COLUMN public.lg_case_task.task_kind IS
  'LAWYER | SUPPORT | CLERK | MANAGER — separates ownership work from preparation/clerical work.';

-- =====================================================================
-- 5) Triggers for updated_at
-- =====================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='update_updated_at_column' AND pronamespace='public'::regnamespace) THEN
    CREATE FUNCTION public.update_updated_at_column() RETURNS trigger AS $f$
      BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $f$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_lg_team_updated      ON public.lg_team;
DROP TRIGGER IF EXISTS trg_lg_team_member_upd   ON public.lg_team_member;
DROP TRIGGER IF EXISTS trg_lg_wb_role_updated   ON public.lg_workbasket_role;
CREATE TRIGGER trg_lg_team_updated    BEFORE UPDATE ON public.lg_team           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lg_team_member_upd BEFORE UPDATE ON public.lg_team_member    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_lg_wb_role_updated BEFORE UPDATE ON public.lg_workbasket_role FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- 6) Seed: default GENERAL_LEGAL team
-- =====================================================================
INSERT INTO public.lg_team (team_code, team_name, description, is_active, is_default)
VALUES
  ('GENERAL_LEGAL', 'General Legal',    'Default legal team — handles all matters until specialised teams are configured.', true,  true),
  ('LITIGATION',    'Litigation Team',  'Court-bound matters and proceedings.',                                              false, false),
  ('ENFORCEMENT',   'Enforcement Team', 'Post-judgment enforcement and recovery.',                                           false, false),
  ('SUPPORT',       'Legal Support',    'Clerical and document-preparation pool.',                                           false, false)
ON CONFLICT (team_code) DO NOTHING;

-- =====================================================================
-- 7) Seed: workbasket role responsibilities (SKN minimal)
-- =====================================================================
INSERT INTO public.lg_workbasket_role (workbasket_code, owning_team_code, responsible_role_code, support_role_code, description)
VALUES
  ('LEGAL_INTAKE_REVIEW',       'GENERAL_LEGAL', 'LEGAL_OFFICER',  'LEGAL_SUPPORT_STAFF', 'Triage of newly opened cases'),
  ('LEGAL_REFERRAL_REVIEW',     'GENERAL_LEGAL', 'LEGAL_OFFICER',  'LEGAL_SUPPORT_STAFF', 'Compliance referral review'),
  ('LEGAL_CASE_ASSIGNMENT',     'GENERAL_LEGAL', 'LEGAL_MANAGER',  'LEGAL_SUPPORT_STAFF', 'Cases pending officer assignment'),
  ('LEGAL_HEARING_PREPARATION', 'GENERAL_LEGAL', 'LEGAL_OFFICER',  'LEGAL_CLERK',         'Hearing preparation work'),
  ('LEGAL_SETTLEMENT_REVIEW',   'GENERAL_LEGAL', 'LEGAL_MANAGER',  'LEGAL_SUPPORT_STAFF', 'Settlement approvals'),
  ('LEGAL_FEE_POSTING',         'GENERAL_LEGAL', 'LEGAL_OFFICER',  'LEGAL_CLERK',         'Posting court / legal fees'),
  ('LEGAL_ENFORCEMENT',         'GENERAL_LEGAL', 'LEGAL_OFFICER',  'LEGAL_CLERK',         'Enforcement of orders'),
  ('LEGAL_MANAGER_REVIEW',      'GENERAL_LEGAL', 'LEGAL_MANAGER',  NULL,                  'Manager-only escalation review')
ON CONFLICT (workbasket_code) DO NOTHING;

-- =====================================================================
-- 8) Ensure missing workbasket reference values exist for the new codes
-- =====================================================================
DO $$
DECLARE v_group_id uuid;
BEGIN
  SELECT id INTO v_group_id FROM public.core_reference_group WHERE group_code = 'LG_WORKBASKET';
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.core_reference_value (group_id, value_code, value_label, sort_order, is_active, is_system, description)
    VALUES
      (v_group_id, 'LEGAL_INTAKE_REVIEW',  'Legal Intake Review',  5,  true, true, 'Triage of newly opened cases'),
      (v_group_id, 'LEGAL_MANAGER_REVIEW', 'Legal Manager Review', 70, true, true, 'Manager-only escalation review')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =====================================================================
-- 9) Default team on routing policy
-- =====================================================================
UPDATE public.legal_complainant_settings
   SET default_team_code = 'GENERAL_LEGAL'
 WHERE default_team_code IS NULL OR default_team_code = '';
