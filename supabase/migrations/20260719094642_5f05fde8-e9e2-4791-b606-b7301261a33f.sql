
UPDATE public.app_modules SET parent_id='839cee37-4006-43a4-a53c-6d0cea76a6b0', show_in_menu=true, routes_enabled=true, is_enabled=true, route='/bn/mortality', icon=COALESCE(NULLIF(icon,''),'HeartOff'), sort_order=60 WHERE name='bn_mortality';
UPDATE public.app_modules SET parent_id='839cee37-4006-43a4-a53c-6d0cea76a6b0', show_in_menu=true, routes_enabled=true, is_enabled=true, route='/bn/appeals-workspace', icon=COALESCE(NULLIF(icon,''),'Gavel'), sort_order=61 WHERE name='bn_appeals';
UPDATE public.app_modules SET parent_id='839cee37-4006-43a4-a53c-6d0cea76a6b0', show_in_menu=true, routes_enabled=true, is_enabled=true, route='/bn/means-tests', icon=COALESCE(NULLIF(icon,''),'Scale'), sort_order=62 WHERE name='bn_means_tests';
UPDATE public.app_modules SET parent_id='839cee37-4006-43a4-a53c-6d0cea76a6b0', show_in_menu=true, routes_enabled=true, is_enabled=true, route='/bn/risk-management', icon=COALESCE(NULLIF(icon,''),'ShieldAlert'), sort_order=63 WHERE name='bn_risk_management';
UPDATE public.app_modules SET parent_id='839cee37-4006-43a4-a53c-6d0cea76a6b0', show_in_menu=true, routes_enabled=true, is_enabled=true, route='/bn/uprating', icon=COALESCE(NULLIF(icon,''),'TrendingUp'), sort_order=64 WHERE name='bn_uprating';
UPDATE public.app_modules SET parent_id='839cee37-4006-43a4-a53c-6d0cea76a6b0', show_in_menu=true, routes_enabled=true, is_enabled=true, route='/bn/overpayments', icon=COALESCE(NULLIF(icon,''),'TrendingDown'), sort_order=65 WHERE name='bn_overpayments';

INSERT INTO public.module_actions (module_id, action_name, display_name, description)
SELECT id, 'view', 'View', 'View the module workspace and read-only landing.'
FROM public.app_modules
WHERE name IN ('bn_mortality','bn_appeals','bn_means_tests','bn_risk_management','bn_uprating')
ON CONFLICT (module_id, action_name) DO NOTHING;
