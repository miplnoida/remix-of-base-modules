
DO $$
DECLARE
  v_year     text := to_char(now(), 'YYYY');
  v_seq_id   uuid;
  v_pattern  text;
  v_max      bigint;
  v_prev     bigint;
  v_new      bigint;
  r          record;
  v_mapping  jsonb := jsonb_build_array(
    jsonb_build_object('entity', 'LEGAL_CASE',   'tbl', 'lg_case',        'col', 'lg_case_no'),
    jsonb_build_object('entity', 'LEGAL_INTAKE', 'tbl', 'lg_case_intake', 'col', 'intake_no'),
    jsonb_build_object('entity', 'LEGAL_NOTICE', 'tbl', 'lg_notice',      'col', 'notice_no'),
    jsonb_build_object('entity', 'LEGAL_ORDER',  'tbl', 'lg_order',       'col', 'order_no')
  );
BEGIN
  FOR r IN SELECT * FROM jsonb_to_recordset(v_mapping) AS x(entity text, tbl text, col text)
  LOOP
    EXECUTE format(
      'SELECT COALESCE(MAX(NULLIF(regexp_replace(%I, ''.*[^0-9]([0-9]+)$'', ''\1''), '''')::bigint), 0)
         FROM %I
        WHERE %I LIKE ''%%'' || $1 || ''%%''
          AND %I ~ ''[0-9]+$''',
      r.col, r.tbl, r.col, r.col
    ) INTO v_max USING v_year;

    SELECT id, current_number, number_pattern
      INTO v_seq_id, v_prev, v_pattern
      FROM public.core_number_sequence
     WHERE module_code='LEGAL' AND entity_type=r.entity
       AND country_code='SKN' AND is_active=true;

    IF v_seq_id IS NULL THEN CONTINUE; END IF;

    v_new := GREATEST(v_prev, v_max);

    UPDATE public.core_number_sequence
       SET current_number  = v_new,
           last_period_key = v_year,
           updated_by      = 'SYSTEM_BACKFILL',
           updated_at      = now()
     WHERE id = v_seq_id;

    INSERT INTO public.core_number_sequence_audit
      (sequence_id, module_code, entity_type, country_code,
       generated_number, sequence_value, pattern_used,
       is_override, override_reason, generated_by, context)
    VALUES
      (v_seq_id, 'LEGAL', r.entity, 'SKN',
       format('BACKFILL:%s->%s', v_prev, v_new), v_new, v_pattern,
       true,
       format('Backfilled counter from existing %s.%s (max seq found=%s, prev=%s) to prevent collisions',
              r.tbl, r.col, v_max, v_prev),
       'SYSTEM_BACKFILL',
       jsonb_build_object('source_table', r.tbl, 'source_column', r.col, 'period_key', v_year));
  END LOOP;

  UPDATE public.core_number_sequence
     SET last_period_key = v_year, updated_by='SYSTEM_BACKFILL', updated_at=now()
   WHERE module_code='LEGAL' AND last_period_key IS NULL AND is_active=true;
END $$;
