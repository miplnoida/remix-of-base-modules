-- Fix Legal document reference generation end-to-end.
-- Project architecture note: no new tables and no RLS changes are introduced.

-- Ensure the Legal generated document sequence exists and is active.
INSERT INTO public.core_number_sequence
  (module_code, entity_type, country_code, prefix_pattern, number_pattern, padding_length, reset_frequency, description, created_by, updated_by, is_active, last_period_key)
VALUES
  ('LEGAL','LEGAL_DOCUMENT','SKN','LG-DOC-SKN','LG-DOC-SKN-{YYYY}-{SEQ}', 6, 'YEARLY', 'Legal Generated Document reference', 'SEED-NUMBERING', 'SEED-NUMBERING', true, to_char((now() AT TIME ZONE 'UTC')::date, 'YYYY'))
ON CONFLICT (module_code, entity_type, country_code)
DO UPDATE SET
  prefix_pattern = EXCLUDED.prefix_pattern,
  number_pattern = EXCLUDED.number_pattern,
  padding_length = EXCLUDED.padding_length,
  reset_frequency = EXCLUDED.reset_frequency,
  description = EXCLUDED.description,
  is_active = true,
  updated_by = 'SYSTEM-FIX-LEGAL-DOC-NUMBERING',
  updated_at = now();

-- Transaction-safe central number allocator.
-- The previous version used an unqualified `sequence_id` inside the rule lookup.
-- Because RETURNS TABLE also declares an output parameter named sequence_id,
-- PostgreSQL raised: column reference "sequence_id" is ambiguous.
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

  SELECT * INTO v_seq
  FROM public.core_number_sequence cns
  WHERE cns.module_code = upper(p_module_code)
    AND cns.entity_type = upper(p_entity_type)
    AND cns.country_code = upper(coalesce(p_country_code,'SKN'))
    AND cns.is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active numbering sequence configured for %/%/%',
      p_module_code, p_entity_type, coalesce(p_country_code,'SKN')
      USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_rule
  FROM public.core_number_sequence_rule r
  WHERE r.sequence_id = v_seq.id
    AND r.is_active = TRUE
    AND (r.branch_code IS NULL OR r.branch_code = p_branch_code)
    AND (r.department_code IS NULL OR r.department_code = p_department_code)
  ORDER BY (r.branch_code IS NOT NULL)::int + (r.department_code IS NOT NULL)::int DESC
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

  UPDATE public.core_number_sequence cns
     SET current_number = v_next,
         last_period_key = v_period,
         updated_at = now(),
         updated_by = COALESCE(p_user_code, cns.updated_by)
   WHERE cns.id = v_seq.id;

  INSERT INTO public.core_number_sequence_audit(
    sequence_id, module_code, entity_type, country_code,
    branch_code, department_code, generated_number, sequence_value,
    pattern_used, is_override, generated_by
  ) VALUES (
    v_seq.id, v_seq.module_code, v_seq.entity_type, v_seq.country_code,
    p_branch_code, p_department_code, v_out, v_next,
    v_pattern, FALSE, p_user_code
  );

  core_generate_number.sequence_id := v_seq.id;
  core_generate_number.sequence_value := v_next;
  core_generate_number.generated_number := v_out;
  RETURN NEXT;
END $$;

GRANT EXECUTE ON FUNCTION public.core_generate_number(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT)
  TO authenticated, service_role, anon;

-- Keep preview aligned and fully qualified as well.
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
  v_pattern  TEXT;
  v_padding  INT;
  v_freq     TEXT;
  v_period   TEXT;
  v_next     BIGINT;
  v_out      TEXT;
  v_today    DATE := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  SELECT * INTO v_seq
  FROM public.core_number_sequence cns
  WHERE cns.module_code = upper(p_module_code)
    AND cns.entity_type = upper(p_entity_type)
    AND cns.country_code = upper(coalesce(p_country_code,'SKN'))
    AND cns.is_active = TRUE;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_rule
  FROM public.core_number_sequence_rule r
  WHERE r.sequence_id = v_seq.id
    AND r.is_active = TRUE
    AND (r.branch_code IS NULL OR r.branch_code = p_branch_code)
    AND (r.department_code IS NULL OR r.department_code = p_department_code)
  ORDER BY (r.branch_code IS NOT NULL)::int + (r.department_code IS NOT NULL)::int DESC
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

-- Make the older document-reference allocator safe for any remaining callers.
CREATE OR REPLACE FUNCTION public.core_allocate_document_reference(
  p_module_code TEXT,
  p_doc_type_code TEXT,
  p_prefix TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_type TEXT;
  v_ref TEXT;
  v_year INT := EXTRACT(YEAR FROM now())::INT;
  v_next BIGINT;
  v_padding INT;
  v_prefix TEXT;
BEGIN
  IF upper(coalesce(p_module_code, '')) = 'LEGAL' THEN
    SELECT g.generated_number INTO v_ref
    FROM public.core_generate_number('LEGAL', 'LEGAL_DOCUMENT', 'SKN', NULL, NULL, NULL) g
    LIMIT 1;
    RETURN v_ref;
  END IF;

  v_entity_type := upper(coalesce(p_module_code, 'COMMON')) || '_DOCUMENT';
  BEGIN
    SELECT g.generated_number INTO v_ref
    FROM public.core_generate_number(p_module_code, v_entity_type, 'SKN', NULL, NULL, NULL) g
    LIMIT 1;
    IF v_ref IS NOT NULL THEN
      RETURN v_ref;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Non-Legal legacy callers may not yet have central sequences configured.
    -- Preserve their old behavior, but include doc type in the emitted reference
    -- so two document types sharing a prefix cannot collide.
  END;

  INSERT INTO public.core_document_sequence(module_code, doc_type_code, prefix, year, last_number, padding)
  VALUES (p_module_code, p_doc_type_code, coalesce(nullif(p_prefix, ''), p_module_code), v_year, 0, 6)
  ON CONFLICT (module_code, doc_type_code, year) DO NOTHING;

  UPDATE public.core_document_sequence cds
     SET last_number = cds.last_number + 1,
         updated_at = now()
   WHERE cds.module_code = p_module_code
     AND cds.doc_type_code = p_doc_type_code
     AND cds.year = v_year
  RETURNING cds.last_number, cds.padding, cds.prefix INTO v_next, v_padding, v_prefix;

  RETURN v_prefix || '-' || p_doc_type_code || '-' || v_year::TEXT || '-' || lpad(v_next::TEXT, v_padding, '0');
END $$;

GRANT EXECUTE ON FUNCTION public.core_allocate_document_reference(TEXT,TEXT,TEXT)
  TO authenticated, service_role;