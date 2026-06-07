CREATE OR REPLACE FUNCTION public.next_reference_number(
  p_module_code varchar,
  p_department_code varchar,
  p_document_type varchar,
  p_financial_year integer DEFAULT NULL
)
RETURNS TABLE(reference_number text, sequence_id uuid, current_number bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fy integer := COALESCE(p_financial_year, EXTRACT(YEAR FROM now())::int);
  v_row public.system_reference_sequence%ROWTYPE;
  v_seq text;
  v_ref text;
BEGIN
  UPDATE public.system_reference_sequence s
     SET current_number = s.current_number + 1,
         updated_at = now()
   WHERE s.module_code = p_module_code
     AND s.department_code = p_department_code
     AND s.document_type = p_document_type
     AND s.financial_year = v_fy
     AND s.active = true
  RETURNING s.* INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active reference sequence configured for %/%/% (FY %)',
      p_module_code, p_department_code, p_document_type, v_fy;
  END IF;

  v_seq := lpad(v_row.current_number::text, COALESCE(v_row.padding, 6), '0');
  v_ref := COALESCE(v_row.prefix_pattern, '{MODULE}/{DOC_TYPE}/{YYYY}/{SEQ}');
  v_ref := replace(v_ref, '{MODULE}', p_module_code);
  v_ref := replace(v_ref, '{DEPT}', p_department_code);
  v_ref := replace(v_ref, '{DOC_TYPE}', p_document_type);
  v_ref := replace(v_ref, '{YYYY}', v_fy::text);
  v_ref := replace(v_ref, '{SEQ}', v_seq);

  reference_number := v_ref;
  sequence_id := v_row.id;
  current_number := v_row.current_number;
  RETURN NEXT;
END;
$$;