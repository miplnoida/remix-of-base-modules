
-- Add fields to lg_team
ALTER TABLE public.lg_team
  ADD COLUMN IF NOT EXISTS country_code varchar(8) NOT NULL DEFAULT 'SKN',
  ADD COLUMN IF NOT EXISTS manager_user_id uuid;

-- Add is_primary to lg_team_member; role_code becomes optional snapshot
ALTER TABLE public.lg_team_member
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date,
  ALTER COLUMN role_code DROP NOT NULL;

-- Only one primary per team
CREATE UNIQUE INDEX IF NOT EXISTS uq_lg_team_member_primary
  ON public.lg_team_member(team_id) WHERE is_primary = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_team TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_team_member TO authenticated;
GRANT ALL ON public.lg_team TO service_role;
GRANT ALL ON public.lg_team_member TO service_role;
