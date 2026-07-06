INSERT INTO public.app_modules (name, display_name, description, icon, route, parent_id, sort_order, is_enabled, show_in_menu)
SELECT 'platform_readiness_centre','Platform Readiness','BN Wave 1 readiness cockpit.','ShieldCheck','/admin/platform-readiness','e3000000-0000-4000-8000-000000000001',40,true,true
WHERE NOT EXISTS (SELECT 1 FROM public.app_modules WHERE name='platform_readiness_centre');