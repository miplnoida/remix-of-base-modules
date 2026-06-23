
-- ============================================================
-- Numbering Rules: rename Legal entity types, add reset/adjust
-- RPC, and enforce one active sequence per module/entity/country.
-- ============================================================

-- 1. Normalize Legal entity_type codes to LEGAL_* across sequence + audit.
UPDATE public.core_number_sequence
SET entity_type = CASE entity_type
    WHEN 'CASE'          THEN 'LEGAL_CASE'
    WHEN 'INTAKE'        THEN 'LEGAL_INTAKE'
    WHEN 'NOTICE'        THEN 'LEGAL_NOTICE'
    WHEN 'HEARING'       THEN 'LEGAL_HEARING'
    WHEN 'ORDER'         THEN 'LEGAL_ORDER'
    WHEN 'SETTLEMENT'    THEN 'LEGAL_SETTLEMENT'
    WHEN 'FEE_CHARGE'    THEN 'LEGAL_FEE_CHARGE'
    WHEN 'GENERATED_DOC' THEN 'LEGAL_DOCUMENT'
    ELSE entity_type
  END
WHERE module_code = 'LEGAL'
  AND entity_type IN ('CASE','INTAKE','NOTICE','HEARING','ORDER','SETTLEMENT','FEE_CHARGE','GENERATED_DOC');

UPDATE public.core_number_sequence_audit
SET entity_type = CASE entity_type
    WHEN 'CASE'          THEN 'LEGAL_CASE'
    WHEN 'INTAKE'        THEN 'LEGAL_INTAKE'
    WHEN 'NOTICE'        THEN 'LEGAL_NOTICE'
    WHEN 'HEARING'       THEN 'LEGAL_HEARING'
    WHEN 'ORDER'         THEN 'LEGAL_ORDER'
    WHEN 'SETTLEMENT'    THEN 'LEGAL_SETTLEMENT'
    WHEN 'FEE_CHARGE'    THEN 'LEGAL_FEE_CHARGE'
    WHEN 'GENERATED_DOC' THEN 'LEGAL_DOCUMENT'
    ELSE entity_type
  END
WHERE module_code = 'LEGAL'
  AND entity_type IN ('CASE','INTAKE','NOTICE','HEARING','ORDER','SETTLEMENT','FEE_CHARGE','GENERATED_DOC');

-- 2. Enforce one active sequence per (module, entity, country).
CREATE UNIQUE INDEX IF NOT EXISTS ux_core_number_sequence_active
  ON public.core_number_sequence (module_code, entity_type, country_code)
  WHERE is_active = true;

-- 3. Admin RPC: reset / adjust current number with mandatory reason + audit.
CREATE OR REPLACE FUNCTION public.core_reset_number_sequence(
  p_sequence_id     uuid,
  p_new_current     bigint,
  p_reason          text,
  p_user_code       varchar DEFAULT NULL
) RETURNS public.core_number_sequence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.core_number_sequence;
  v_old bigint;
BEGIN
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason (min 3 chars) is required to adjust a numbering sequence';
  END IF;
  IF p_new_current IS NULL OR p_new_current < 0 THEN
    RAISE EXCEPTION 'New current number must be >= 0';
  END IF;

  SELECT * INTO v_row FROM public.core_number_sequence WHERE id = p_sequence_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sequence % not found', p_sequence_id; END IF;
  v_old := v_row.current_number;

  UPDATE public.core_number_sequence
     SET current_number = p_new_current,
         updated_by     = COALESCE(p_user_code, updated_by),
         updated_at     = now()
   WHERE id = p_sequence_id
   RETURNING * INTO v_row;

  INSERT INTO public.core_number_sequence_audit(
    sequence_id, module_code, entity_type, country_code,
    generated_number, sequence_value, pattern_used,
    is_override, override_reason, generated_by, context
  ) VALUES (
    v_row.id, v_row.module_code, v_row.entity_type, v_row.country_code,
    format('ADJUST: %s -> %s', v_old, p_new_current),
    p_new_current,
    v_row.number_pattern,
    true,
    p_reason,
    p_user_code,
    jsonb_build_object('action','RESET_OR_ADJUST','previous', v_old, 'new', p_new_current)
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.core_reset_number_sequence(uuid,bigint,text,varchar) TO authenticated, service_role;
