
UPDATE public.app_modules SET route = '/compliance/reports/violations/status', updated_at = now() WHERE name = 'violations_by_status';
UPDATE public.app_modules SET route = '/compliance/reports/violations/type', updated_at = now() WHERE name = 'violations_by_type';
UPDATE public.app_modules SET route = '/compliance/reports/violations/resolution-time', updated_at = now() WHERE name = 'violation_resolution_time';
UPDATE public.app_modules SET route = '/compliance/reports/violations/zone', updated_at = now() WHERE name = 'violations_by_zone';

INSERT INTO public.app_modules (name, display_name, route, parent_id, sort_order, is_enabled, show_in_menu)
SELECT 'violations_summary', 'Violations Summary', '/compliance/reports/violations/summary',
       (SELECT parent_id FROM public.app_modules WHERE name = 'violations_by_status'),
       COALESCE((SELECT MIN(sort_order) FROM public.app_modules WHERE name IN ('violations_by_status','violations_by_type','violation_resolution_time','violations_by_zone')), 0) - 1,
       true, true
WHERE NOT EXISTS (SELECT 1 FROM public.app_modules WHERE name = 'violations_summary');
