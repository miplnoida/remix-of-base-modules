
CREATE TABLE IF NOT EXISTS public.lg_routing_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'SKN' UNIQUE,
  default_workbasket_code TEXT,
  default_team_code TEXT,
  default_strategy_code TEXT,
  auto_assign_on_referral BOOLEAN NOT NULL DEFAULT true,
  auto_assign_on_manual BOOLEAN NOT NULL DEFAULT false,
  allow_manual_override BOOLEAN NOT NULL DEFAULT true,
  escalate_unassigned_after_days INT NOT NULL DEFAULT 3,
  escalation_workbasket_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_routing_policy TO authenticated;
GRANT ALL ON public.lg_routing_policy TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_routing_source_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'SKN',
  source_code TEXT NOT NULL,
  workbasket_code TEXT,
  team_code TEXT,
  case_type_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  UNIQUE (country_code, source_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_routing_source_map TO authenticated;
GRANT ALL ON public.lg_routing_source_map TO service_role;

CREATE TABLE IF NOT EXISTS public.lg_routing_stage_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'SKN',
  stage_code TEXT NOT NULL,
  workbasket_code TEXT,
  team_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  UNIQUE (country_code, stage_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_routing_stage_override TO authenticated;
GRANT ALL ON public.lg_routing_stage_override TO service_role;

-- Reusable updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_lg_routing_policy_updated ON public.lg_routing_policy;
CREATE TRIGGER trg_lg_routing_policy_updated BEFORE UPDATE ON public.lg_routing_policy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_lg_routing_source_map_updated ON public.lg_routing_source_map;
CREATE TRIGGER trg_lg_routing_source_map_updated BEFORE UPDATE ON public.lg_routing_source_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_lg_routing_stage_override_updated ON public.lg_routing_stage_override;
CREATE TRIGGER trg_lg_routing_stage_override_updated BEFORE UPDATE ON public.lg_routing_stage_override
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed singleton row for SKN
INSERT INTO public.lg_routing_policy (country_code)
VALUES ('SKN')
ON CONFLICT (country_code) DO NOTHING;
