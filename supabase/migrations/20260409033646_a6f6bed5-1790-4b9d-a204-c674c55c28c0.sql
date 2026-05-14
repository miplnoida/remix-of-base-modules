INSERT INTO public.app_modules (name, display_name, description, route, icon, parent_id, sort_order, is_enabled, show_in_menu)
SELECT 'audit_entity_summary', 'Entity Summary', 'Department-level risk overview across all assessed entities', '/audit/entity-summary', 'Building2',
  (SELECT id FROM public.app_modules WHERE name = 'internal_audit' LIMIT 1),
  (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.app_modules WHERE parent_id = (SELECT id FROM public.app_modules WHERE name = 'internal_audit' LIMIT 1)),
  true, true
WHERE NOT EXISTS (SELECT 1 FROM public.app_modules WHERE name = 'audit_entity_summary');