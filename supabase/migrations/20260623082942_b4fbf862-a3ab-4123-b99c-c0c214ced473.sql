
-- =====================================================================
-- Central Numbering / Code Generation Framework
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.core_number_sequence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_code     VARCHAR(20)  NOT NULL,
  entity_type     VARCHAR(40)  NOT NULL,
  country_code    VARCHAR(10)  NOT NULL DEFAULT 'SKN',
  prefix_pattern  VARCHAR(120) NOT NULL DEFAULT '',
  number_pattern  VARCHAR(200) NOT NULL,
  separator       VARCHAR(5)   NOT NULL DEFAULT '-',
  padding_length  INT          NOT NULL DEFAULT 6,
  current_number  BIGINT       NOT NULL DEFAULT 0,
  reset_frequency VARCHAR(10)  NOT NULL DEFAULT 'YEARLY'
    CHECK (reset_frequency IN ('NEVER','YEARLY','MONTHLY','DAILY')),
  last_period_key VARCHAR(20),
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  description     TEXT,
  created_by      VARCHAR(50),
  updated_by      VARCHAR(50),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_core_number_sequence_key
    UNIQUE (module_code, entity_type, country_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_number_sequence TO authenticated;
GRANT ALL ON public.core_number_sequence TO service_role;
GRANT SELECT ON public.core_number_sequence TO anon;

CREATE TABLE IF NOT EXISTS public.core_number_sequence_rule (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id     UUID NOT NULL REFERENCES public.core_number_sequence(id) ON DELETE CASCADE,
  branch_code     VARCHAR(20),
  department_code VARCHAR(20),
  number_pattern  VARCHAR(200),
  padding_length  INT,
  separator       VARCHAR(5),
  reset_frequency VARCHAR(10) CHECK (reset_frequency IN ('NEVER','YEARLY','MONTHLY','DAILY')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.core_number_sequence_rule TO authenticated;
GRANT ALL ON public.core_number_sequence_rule TO service_role;

CREATE TABLE IF NOT EXISTS public.core_number_sequence_audit (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id       UUID REFERENCES public.core_number_sequence(id) ON DELETE SET NULL,
  module_code       VARCHAR(20)  NOT NULL,
  entity_type       VARCHAR(40)  NOT NULL,
  country_code      VARCHAR(10)  NOT NULL,
  branch_code       VARCHAR(20),
  department_code   VARCHAR(20),
  generated_number  VARCHAR(120) NOT NULL,
  sequence_value    BIGINT       NOT NULL,
  pattern_used      VARCHAR(200) NOT NULL,
  is_override       BOOLEAN      NOT NULL DEFAULT FALSE,
  override_reason   TEXT,
  generated_by      VARCHAR(50),
  generated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  context           JSONB
);

GRANT SELECT, INSERT ON public.core_number_sequence_audit TO authenticated;
GRANT ALL ON public.core_number_sequence_audit TO service_role;

CREATE INDEX IF NOT EXISTS idx_cnsa_seq ON public.core_number_sequence_audit(sequence_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cnsa_key ON public.core_number_sequence_audit(module_code, entity_type, generated_at DESC);

-- Per-project rule: no RLS in public schema; auth enforced at app layer.

-- ---------------------------------------------------------------------
-- updated_at triggers (reuse common updater if present)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.core_number_sequence_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_core_number_sequence_touch ON public.core_number_sequence;
CREATE TRIGGER trg_core_number_sequence_touch BEFORE UPDATE ON public.core_number_sequence
FOR EACH ROW EXECUTE FUNCTION public.core_number_sequence_touch();

DROP TRIGGER IF EXISTS trg_core_number_sequence_rule_touch ON public.core_number_sequence_rule;
CREATE TRIGGER trg_core_number_sequence_rule_touch BEFORE UPDATE ON public.core_number_sequence_rule
FOR EACH ROW EXECUTE FUNCTION public.core_number_sequence_touch();

-- =====================================================================
-- RPC: core_generate_number  (transaction-safe)
-- =====================================================================
DROP FUNCTION IF EXISTS public.core_generate_number(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT);
DROP FUNCTION IF EXISTS public.core_preview_next_number(TEXT,TEXT,TEXT,TEXT,TEXT);

CREATE OR REPLACE FUNCTION public.core_generate_number(
  p_module_code     TEXT,
  p_entity_type     TEXT,
  p_country_code    TEXT DEFAULT 'SKN',
  p_branch_code     TEXT DEFAULT NULL,
  p_department_code TEXT DEFAULT NULL,
  p_user_code       TEXT DEFAULT NULL
)
RETURNS TABLE (sequence_id UUID, sequence_value BIGINT, generated_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq      public.core_number_sequence%ROWTYPE;
  v_rule     public.core_number_sequence_rule%ROWTYPE;
  v_pattern  TEXT;
  v_padding  INT;
  v_freq     TEXT;
  v_period   TEXT;
  v_next     BIGINT;
  v_out      TEXT;
  v_today    DATE := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF p_module_code IS NULL OR p_entity_type IS NULL THEN
    RAISE EXCEPTION 'module_code and entity_type are required';
  END IF;

  -- Lock the sequence row to prevent concurrent duplicates
  SELECT * INTO v_seq
  FROM public.core_number_sequence
  WHERE module_code = upper(p_module_code)
    AND entity_type = upper(p_entity_type)
    AND country_code = upper(coalesce(p_country_code,'SKN'))
    AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active numbering sequence configured for %/%/%',
      p_module_code, p_entity_type, coalesce(p_country_code,'SKN')
      USING ERRCODE = 'P0002';
  END IF;

  -- Resolve optional override rule (branch / department)
  SELECT * INTO v_rule
  FROM public.core_number_sequence_rule
  WHERE sequence_id = v_seq.id
    AND is_active = TRUE
    AND (branch_code     IS NULL OR branch_code     = p_branch_code)
    AND (department_code IS NULL OR department_code = p_department_code)
  ORDER BY (branch_code IS NOT NULL)::int + (department_code IS NOT NULL)::int DESC
  LIMIT 1;

  v_pattern := COALESCE(v_rule.number_pattern, v_seq.number_pattern);
  v_padding := COALESCE(v_rule.padding_length,  v_seq.padding_length);
  v_freq    := COALESCE(v_rule.reset_frequency, v_seq.reset_frequency);

  v_period := CASE v_freq
    WHEN 'NEVER'   THEN 'ALL'
    WHEN 'YEARLY'  THEN to_char(v_today,'YYYY')
    WHEN 'MONTHLY' THEN to_char(v_today,'YYYY-MM')
    WHEN 'DAILY'   THEN to_char(v_today,'YYYY-MM-DD')
    ELSE 'ALL'
  END;

  IF v_seq.last_period_key IS DISTINCT FROM v_period THEN
    v_next := 1;
  ELSE
    v_next := v_seq.current_number + 1;
  END IF;

  -- Token substitution
  v_out := v_pattern;
  v_out := replace(v_out, '{MODULE}',     v_seq.module_code);
  v_out := replace(v_out, '{ENTITY}',     v_seq.entity_type);
  v_out := replace(v_out, '{COUNTRY}',    v_seq.country_code);
  v_out := replace(v_out, '{YYYY}',       to_char(v_today,'YYYY'));
  v_out := replace(v_out, '{YY}',         to_char(v_today,'YY'));
  v_out := replace(v_out, '{MM}',         to_char(v_today,'MM'));
  v_out := replace(v_out, '{DD}',         to_char(v_today,'DD'));
  v_out := replace(v_out, '{BRANCH}',     COALESCE(p_branch_code,''));
  v_out := replace(v_out, '{DEPARTMENT}', COALESCE(p_department_code,''));
  v_out := replace(v_out, '{SEQ}',        lpad(v_next::text, v_padding, '0'));

  UPDATE public.core_number_sequence
     SET current_number = v_next,
         last_period_key = v_period,
         updated_at = now(),
         updated_by = COALESCE(p_user_code, updated_by)
   WHERE id = v_seq.id;

  INSERT INTO public.core_number_sequence_audit(
    sequence_id, module_code, entity_type, country_code,
    branch_code, department_code, generated_number, sequence_value,
    pattern_used, is_override, generated_by
  ) VALUES (
    v_seq.id, v_seq.module_code, v_seq.entity_type, v_seq.country_code,
    p_branch_code, p_department_code, v_out, v_next,
    v_pattern, FALSE, p_user_code
  );

  sequence_id := v_seq.id;
  sequence_value := v_next;
  generated_number := v_out;
  RETURN NEXT;
END $$;

GRANT EXECUTE ON FUNCTION public.core_generate_number(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT)
  TO authenticated, service_role, anon;

-- =====================================================================
-- RPC: core_preview_next_number  (no commit)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.core_preview_next_number(
  p_module_code     TEXT,
  p_entity_type     TEXT,
  p_country_code    TEXT DEFAULT 'SKN',
  p_branch_code     TEXT DEFAULT NULL,
  p_department_code TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq      public.core_number_sequence%ROWTYPE;
  v_rule     public.core_number_sequence_rule%ROWTYPE;
  v_pattern  TEXT; v_padding INT; v_freq TEXT; v_period TEXT;
  v_next     BIGINT; v_out TEXT;
  v_today    DATE := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  SELECT * INTO v_seq FROM public.core_number_sequence
   WHERE module_code = upper(p_module_code) AND entity_type = upper(p_entity_type)
     AND country_code = upper(coalesce(p_country_code,'SKN'));
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_rule FROM public.core_number_sequence_rule
   WHERE sequence_id = v_seq.id AND is_active = TRUE
     AND (branch_code IS NULL OR branch_code = p_branch_code)
     AND (department_code IS NULL OR department_code = p_department_code)
   ORDER BY (branch_code IS NOT NULL)::int + (department_code IS NOT NULL)::int DESC LIMIT 1;

  v_pattern := COALESCE(v_rule.number_pattern, v_seq.number_pattern);
  v_padding := COALESCE(v_rule.padding_length, v_seq.padding_length);
  v_freq    := COALESCE(v_rule.reset_frequency, v_seq.reset_frequency);
  v_period  := CASE v_freq
    WHEN 'NEVER' THEN 'ALL' WHEN 'YEARLY' THEN to_char(v_today,'YYYY')
    WHEN 'MONTHLY' THEN to_char(v_today,'YYYY-MM') WHEN 'DAILY' THEN to_char(v_today,'YYYY-MM-DD') END;
  v_next := CASE WHEN v_seq.last_period_key IS DISTINCT FROM v_period THEN 1 ELSE v_seq.current_number + 1 END;
  v_out := v_pattern;
  v_out := replace(v_out,'{MODULE}',v_seq.module_code);
  v_out := replace(v_out,'{ENTITY}',v_seq.entity_type);
  v_out := replace(v_out,'{COUNTRY}',v_seq.country_code);
  v_out := replace(v_out,'{YYYY}',to_char(v_today,'YYYY'));
  v_out := replace(v_out,'{YY}',to_char(v_today,'YY'));
  v_out := replace(v_out,'{MM}',to_char(v_today,'MM'));
  v_out := replace(v_out,'{DD}',to_char(v_today,'DD'));
  v_out := replace(v_out,'{BRANCH}',COALESCE(p_branch_code,''));
  v_out := replace(v_out,'{DEPARTMENT}',COALESCE(p_department_code,''));
  v_out := replace(v_out,'{SEQ}',lpad(v_next::text,v_padding,'0'));
  RETURN v_out;
END $$;

GRANT EXECUTE ON FUNCTION public.core_preview_next_number(TEXT,TEXT,TEXT,TEXT,TEXT)
  TO authenticated, service_role, anon;

-- =====================================================================
-- RPC: core_record_number_override  (manual entry audit)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.core_record_number_override(
  p_module_code     TEXT,
  p_entity_type     TEXT,
  p_country_code    TEXT,
  p_manual_number   TEXT,
  p_override_reason TEXT,
  p_user_code       TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq_id UUID;
  v_id     UUID;
BEGIN
  SELECT id INTO v_seq_id FROM public.core_number_sequence
   WHERE module_code=upper(p_module_code) AND entity_type=upper(p_entity_type)
     AND country_code=upper(coalesce(p_country_code,'SKN'));
  INSERT INTO public.core_number_sequence_audit(
    sequence_id, module_code, entity_type, country_code,
    generated_number, sequence_value, pattern_used, is_override, override_reason, generated_by
  ) VALUES (
    v_seq_id, upper(p_module_code), upper(p_entity_type), upper(coalesce(p_country_code,'SKN')),
    p_manual_number, 0, 'MANUAL_OVERRIDE', TRUE, p_override_reason, p_user_code
  ) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.core_record_number_override(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT)
  TO authenticated, service_role;

-- =====================================================================
-- Seed: Legal module numbering sequences
-- =====================================================================
INSERT INTO public.core_number_sequence
  (module_code, entity_type, country_code, prefix_pattern, number_pattern, padding_length, reset_frequency, description, created_by)
VALUES
  ('LEGAL','CASE',        'SKN','LG-SKN',     'LG-SKN-{YYYY}-{SEQ}',     6,'YEARLY','Legal Case number',         'SEED-NUMBERING'),
  ('LEGAL','INTAKE',      'SKN','LG-INT-SKN', 'LG-INT-SKN-{YYYY}-{SEQ}', 6,'YEARLY','Legal Intake number',       'SEED-NUMBERING'),
  ('LEGAL','NOTICE',      'SKN','LG-NOT-SKN', 'LG-NOT-SKN-{YYYY}-{SEQ}', 6,'YEARLY','Legal Notice number',       'SEED-NUMBERING'),
  ('LEGAL','HEARING',     'SKN','LG-HRN-SKN', 'LG-HRN-SKN-{YYYY}-{SEQ}', 6,'YEARLY','Legal Hearing number',      'SEED-NUMBERING'),
  ('LEGAL','ORDER',       'SKN','LG-ORD-SKN', 'LG-ORD-SKN-{YYYY}-{SEQ}', 6,'YEARLY','Legal Order/Judgment number','SEED-NUMBERING'),
  ('LEGAL','SETTLEMENT',  'SKN','LG-SET-SKN', 'LG-SET-SKN-{YYYY}-{SEQ}', 6,'YEARLY','Legal Settlement number',   'SEED-NUMBERING'),
  ('LEGAL','FEE_CHARGE',  'SKN','LG-FEE-SKN', 'LG-FEE-SKN-{YYYY}-{SEQ}', 6,'YEARLY','Legal Fee Charge number',   'SEED-NUMBERING'),
  ('LEGAL','GENERATED_DOC','SKN','LG-DOC-SKN','LG-DOC-SKN-{YYYY}-{SEQ}', 6,'YEARLY','Legal Generated Document ref','SEED-NUMBERING')
ON CONFLICT (module_code, entity_type, country_code) DO NOTHING;
