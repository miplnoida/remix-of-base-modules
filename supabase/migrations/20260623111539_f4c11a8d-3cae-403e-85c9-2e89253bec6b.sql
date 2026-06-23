
DO $$
DECLARE
  r RECORD;
  n INT;
  total INT;
  sid UUID;
  pat TEXT;
BEGIN
  -- LEGAL_CASE
  n := 0;
  FOR r IN SELECT id FROM public.lg_case ORDER BY created_at ASC, id ASC LOOP
    n := n + 1;
    UPDATE public.lg_case SET lg_case_no = 'LG-SKN-2026-' || LPAD(n::text, 6, '0') WHERE id = r.id;
  END LOOP;
  total := n;
  SELECT id, number_pattern INTO sid, pat FROM public.core_number_sequence WHERE module_code='LEGAL' AND entity_type='LEGAL_CASE' AND is_active=true LIMIT 1;
  UPDATE public.core_number_sequence SET current_number = total, last_period_key = '2026', updated_at = now() WHERE id = sid;
  INSERT INTO public.core_number_sequence_audit (sequence_id, module_code, entity_type, country_code, generated_number, sequence_value, pattern_used, is_override, override_reason, context, generated_by)
  VALUES (sid, 'LEGAL', 'LEGAL_CASE', 'SKN', 'LG-SKN-2026-' || LPAD(total::text,6,'0'), total, pat, true, 'BACKFILL: uniform renumber of seeded cases', jsonb_build_object('action','BACKFILL','records',total), 'SYSTEM');

  -- LEGAL_INTAKE
  n := 0;
  FOR r IN SELECT id FROM public.lg_case_intake ORDER BY created_at ASC, id ASC LOOP
    n := n + 1;
    UPDATE public.lg_case_intake SET intake_no = 'LG-INT-SKN-2026-' || LPAD(n::text, 6, '0') WHERE id = r.id;
  END LOOP;
  total := n;
  SELECT id, number_pattern INTO sid, pat FROM public.core_number_sequence WHERE module_code='LEGAL' AND entity_type='LEGAL_INTAKE' AND is_active=true LIMIT 1;
  UPDATE public.core_number_sequence SET current_number = total, last_period_key = '2026', updated_at = now() WHERE id = sid;
  INSERT INTO public.core_number_sequence_audit (sequence_id, module_code, entity_type, country_code, generated_number, sequence_value, pattern_used, is_override, override_reason, context, generated_by)
  VALUES (sid, 'LEGAL', 'LEGAL_INTAKE', 'SKN', 'LG-INT-SKN-2026-' || LPAD(total::text,6,'0'), total, pat, true, 'BACKFILL: uniform renumber of seeded intakes', jsonb_build_object('action','BACKFILL','records',total), 'SYSTEM');

  -- LEGAL_NOTICE
  n := 0;
  FOR r IN SELECT id FROM public.lg_notice ORDER BY created_at ASC, id ASC LOOP
    n := n + 1;
    UPDATE public.lg_notice SET notice_no = 'LG-NOT-SKN-2026-' || LPAD(n::text, 6, '0') WHERE id = r.id;
  END LOOP;
  total := n;
  SELECT id, number_pattern INTO sid, pat FROM public.core_number_sequence WHERE module_code='LEGAL' AND entity_type='LEGAL_NOTICE' AND is_active=true LIMIT 1;
  UPDATE public.core_number_sequence SET current_number = total, last_period_key = '2026', updated_at = now() WHERE id = sid;
  INSERT INTO public.core_number_sequence_audit (sequence_id, module_code, entity_type, country_code, generated_number, sequence_value, pattern_used, is_override, override_reason, context, generated_by)
  VALUES (sid, 'LEGAL', 'LEGAL_NOTICE', 'SKN', 'LG-NOT-SKN-2026-' || LPAD(total::text,6,'0'), total, pat, true, 'BACKFILL: uniform renumber of seeded notices', jsonb_build_object('action','BACKFILL','records',total), 'SYSTEM');

  -- LEGAL_ORDER
  n := 0;
  FOR r IN SELECT id FROM public.lg_order ORDER BY created_at ASC, id ASC LOOP
    n := n + 1;
    UPDATE public.lg_order SET order_no = 'LG-ORD-SKN-2026-' || LPAD(n::text, 6, '0') WHERE id = r.id;
  END LOOP;
  total := n;
  SELECT id, number_pattern INTO sid, pat FROM public.core_number_sequence WHERE module_code='LEGAL' AND entity_type='LEGAL_ORDER' AND is_active=true LIMIT 1;
  UPDATE public.core_number_sequence SET current_number = total, last_period_key = '2026', updated_at = now() WHERE id = sid;
  INSERT INTO public.core_number_sequence_audit (sequence_id, module_code, entity_type, country_code, generated_number, sequence_value, pattern_used, is_override, override_reason, context, generated_by)
  VALUES (sid, 'LEGAL', 'LEGAL_ORDER', 'SKN', 'LG-ORD-SKN-2026-' || LPAD(total::text,6,'0'), total, pat, true, 'BACKFILL: uniform renumber of seeded orders', jsonb_build_object('action','BACKFILL','records',total), 'SYSTEM');
END $$;
