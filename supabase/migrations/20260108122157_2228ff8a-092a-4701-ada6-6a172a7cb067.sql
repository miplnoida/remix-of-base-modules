-- Ensure all modules have a 'view' action in module_actions with proper display_name
INSERT INTO module_actions (module_id, action_name, display_name, description, is_enabled)
SELECT m.id, 'view', 'View', 'View ' || m.display_name, true
FROM app_modules m
WHERE NOT EXISTS (
  SELECT 1 FROM module_actions ma 
  WHERE ma.module_id = m.id AND ma.action_name = 'view'
)
ON CONFLICT DO NOTHING;