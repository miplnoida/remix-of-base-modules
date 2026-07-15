
-- Register missing `view` actions on route-owning Benefit modules that
-- exist in app_modules but have zero rows in module_actions. Without this,
-- Award 360 (and every other consumer) cannot check permissions against
-- these modules and every user is silently denied.
INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'view', 'View', 'View records', true
FROM public.app_modules m
WHERE m.name IN ('bn_life_certificates', 'bn_medical_reviews', 'bn_overpayments')
  AND NOT EXISTS (
    SELECT 1 FROM public.module_actions a
    WHERE a.module_id = m.id AND a.action_name = 'view'
  );
