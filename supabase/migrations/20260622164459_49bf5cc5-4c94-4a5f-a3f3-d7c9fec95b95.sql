
CREATE TABLE IF NOT EXISTS public.lg_routing_precedence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  priority_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lg_routing_precedence_rule_type_chk CHECK (rule_type IN (
    'STAGE_CASE_TYPE','STAGE','CASE_TYPE','SOURCE_CASE_TYPE','SOURCE','GLOBAL_DEFAULT','FALLBACK'
  )),
  CONSTRAINT lg_routing_precedence_unique UNIQUE (country_code, rule_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_routing_precedence TO authenticated;
GRANT ALL ON public.lg_routing_precedence TO service_role;

CREATE OR REPLACE FUNCTION public.lg_routing_precedence_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_lg_routing_precedence_touch ON public.lg_routing_precedence;
CREATE TRIGGER trg_lg_routing_precedence_touch
BEFORE UPDATE ON public.lg_routing_precedence
FOR EACH ROW EXECUTE FUNCTION public.lg_routing_precedence_touch();

-- Seed SKN defaults
INSERT INTO public.lg_routing_precedence (country_code, rule_type, priority_order, is_active, description, created_by)
VALUES
  ('SKN','STAGE_CASE_TYPE',1,true,'Stage override matching the case type (most specific)','SEED'),
  ('SKN','STAGE',2,true,'Stage override (any case type)','SEED'),
  ('SKN','CASE_TYPE',3,true,'Case type routing','SEED'),
  ('SKN','SOURCE_CASE_TYPE',4,true,'Source routing matching the case type','SEED'),
  ('SKN','SOURCE',5,true,'Source routing (any case type)','SEED'),
  ('SKN','GLOBAL_DEFAULT',6,true,'Global default workbasket and team','SEED'),
  ('SKN','FALLBACK',7,true,'Hardcoded fallback when defaults are missing/invalid','SEED')
ON CONFLICT (country_code, rule_type) DO NOTHING;
