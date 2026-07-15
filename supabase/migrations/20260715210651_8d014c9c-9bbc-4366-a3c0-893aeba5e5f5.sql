INSERT INTO public.module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'view', 'View', 'View survivor beneficiary workspace and roster', true
FROM public.app_modules m
WHERE m.name = 'bn_survivors'
  AND NOT EXISTS (
    SELECT 1 FROM public.module_actions ma
    WHERE ma.module_id = m.id AND ma.action_name = 'view'
  );