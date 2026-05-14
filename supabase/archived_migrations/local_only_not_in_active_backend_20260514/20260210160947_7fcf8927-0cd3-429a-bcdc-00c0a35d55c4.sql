
-- Seed route_security_config from app_modules data
-- This maps routes to modules for security enforcement

INSERT INTO route_security_config (route_pattern, module_name, screen_name, requires_auth, admin_only, is_settings_route, severity_on_violation)
SELECT 
  m.route,
  m.name,
  m.display_name,
  true,
  CASE 
    WHEN m.route LIKE '/admin/%' THEN false
    ELSE false
  END,
  CASE 
    WHEN m.name IN ('Password Policy', 'security_policy_settings') 
      OR m.route LIKE '/admin/security/%' THEN true
    ELSE false
  END,
  CASE 
    WHEN m.route LIKE '/admin/security/%' THEN 'high'
    WHEN m.route LIKE '/admin/%' THEN 'medium'
    ELSE 'medium'
  END
FROM app_modules m
WHERE m.route IS NOT NULL 
  AND m.route != '' 
  AND m.is_enabled = true
ON CONFLICT DO NOTHING;

-- Add settings routes that should be admin-only + settings-restricted
UPDATE route_security_config 
SET is_settings_route = true, admin_only = true, severity_on_violation = 'high'
WHERE route_pattern LIKE '/admin/security/%';

-- Add explicit entries for security-specific routes not in app_modules
INSERT INTO route_security_config (route_pattern, module_name, screen_name, requires_auth, admin_only, is_settings_route, severity_on_violation)
VALUES
  ('/admin/security/policy', 'security_policy_settings', 'Security Policy Settings', true, true, true, 'high'),
  ('/admin/settings/*', 'system_settings', 'System Settings', true, true, true, 'high'),
  ('/admin/global-settings', 'global_settings', 'Global Settings', true, true, true, 'high')
ON CONFLICT DO NOTHING;
