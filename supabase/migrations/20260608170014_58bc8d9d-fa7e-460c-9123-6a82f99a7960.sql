
-- =========================================================
-- Rule Catalogue Refactor (master configuration architecture)
-- =========================================================

-- 1) Extend Fact Catalogue ----------------------------------
ALTER TABLE public.bn_eligibility_fact
  ADD COLUMN IF NOT EXISTS business_domain   varchar(60),
  ADD COLUMN IF NOT EXISTS source_system     varchar(60),
  ADD COLUMN IF NOT EXISTS required_context  varchar(20) NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS sample_values     jsonb,
  ADD COLUMN IF NOT EXISTS owner             varchar(80);

ALTER TABLE public.bn_eligibility_fact
  DROP CONSTRAINT IF EXISTS bn_elig_fact_ctx_chk;
ALTER TABLE public.bn_eligibility_fact
  ADD CONSTRAINT bn_elig_fact_ctx_chk
  CHECK (required_context IN ('NONE','CLAIM','PERSON','EMPLOYER','DEPENDENT','DECEASED','EVENT'));

-- 2) Extend Rule Catalogue ----------------------------------
ALTER TABLE public.bn_rule_catalogue
  ADD COLUMN IF NOT EXISTS product_type   varchar(40),
  ADD COLUMN IF NOT EXISTS priority       integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS rule_status    varchar(20) NOT NULL DEFAULT 'DRAFT';

ALTER TABLE public.bn_rule_catalogue
  DROP CONSTRAINT IF EXISTS bn_rule_catalogue_status_chk;
ALTER TABLE public.bn_rule_catalogue
  ADD CONSTRAINT bn_rule_catalogue_status_chk
  CHECK (rule_status IN ('DRAFT','READY','PUBLISHED','RETIRED'));

-- 3) Coverage Type master -----------------------------------
CREATE TABLE IF NOT EXISTS public.bn_coverage_type (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_code   varchar(40) NOT NULL UNIQUE,
  coverage_name   varchar(160) NOT NULL,
  description     text,
  active_flag     boolean NOT NULL DEFAULT true,
  created_by      varchar(50),
  updated_by      varchar(50),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_coverage_type TO authenticated;
GRANT ALL ON public.bn_coverage_type TO service_role;

-- 4) Coverage Type ↔ Rule assignment ------------------------
CREATE TABLE IF NOT EXISTS public.bn_coverage_type_rule (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coverage_type_id   uuid NOT NULL REFERENCES public.bn_coverage_type(id) ON DELETE CASCADE,
  rule_code          varchar(60) NOT NULL,
  priority           integer NOT NULL DEFAULT 100,
  effective_date     date,
  end_date           date,
  created_by         varchar(50),
  updated_by         varchar(50),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coverage_type_id, rule_code)
);

CREATE INDEX IF NOT EXISTS idx_bn_cov_type_rule_rule_code ON public.bn_coverage_type_rule(rule_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_coverage_type_rule TO authenticated;
GRANT ALL ON public.bn_coverage_type_rule TO service_role;

-- 5) Rule Conditions (multi-condition / AND-OR / nested) ----
CREATE TABLE IF NOT EXISTS public.bn_rule_condition (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id           uuid NOT NULL REFERENCES public.bn_rule_catalogue(id) ON DELETE CASCADE,
  group_id          varchar(40) NOT NULL DEFAULT 'root',
  parent_group_id   varchar(40),
  group_op          varchar(4) NOT NULL DEFAULT 'AND',
  sequence          integer NOT NULL DEFAULT 0,
  fact_key          varchar(80) NOT NULL,
  operator          varchar(30) NOT NULL,
  value_from        text,
  value_to          text,
  values            jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bn_rule_condition
  DROP CONSTRAINT IF EXISTS bn_rule_condition_groupop_chk;
ALTER TABLE public.bn_rule_condition
  ADD CONSTRAINT bn_rule_condition_groupop_chk CHECK (group_op IN ('AND','OR'));

CREATE INDEX IF NOT EXISTS idx_bn_rule_condition_rule ON public.bn_rule_condition(rule_id);
CREATE INDEX IF NOT EXISTS idx_bn_rule_condition_fact ON public.bn_rule_condition(fact_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_rule_condition TO authenticated;
GRANT ALL ON public.bn_rule_condition TO service_role;

-- 6) Touch trigger function (reuse if it exists) -----------
CREATE OR REPLACE FUNCTION public.bn_rule_cfg_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_bn_coverage_type_touch ON public.bn_coverage_type;
CREATE TRIGGER trg_bn_coverage_type_touch BEFORE UPDATE ON public.bn_coverage_type
FOR EACH ROW EXECUTE FUNCTION public.bn_rule_cfg_touch();

DROP TRIGGER IF EXISTS trg_bn_coverage_type_rule_touch ON public.bn_coverage_type_rule;
CREATE TRIGGER trg_bn_coverage_type_rule_touch BEFORE UPDATE ON public.bn_coverage_type_rule
FOR EACH ROW EXECUTE FUNCTION public.bn_rule_cfg_touch();

DROP TRIGGER IF EXISTS trg_bn_rule_condition_touch ON public.bn_rule_condition;
CREATE TRIGGER trg_bn_rule_condition_touch BEFORE UPDATE ON public.bn_rule_condition
FOR EACH ROW EXECUTE FUNCTION public.bn_rule_cfg_touch();

-- 7) Backfill existing single-condition rules ---------------
INSERT INTO public.bn_rule_condition (rule_id, group_id, group_op, sequence, fact_key, operator, value_from, value_to, values)
SELECT r.id, 'root', 'AND', 0,
       COALESCE(r.fact_key, r.parameter),
       r.operator, r.value_from, r.value_to, r.values
FROM public.bn_rule_catalogue r
WHERE COALESCE(r.fact_key, r.parameter) IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.bn_rule_condition c WHERE c.rule_id = r.id);
