
-- Fix global_settings to be admin-only settings route
UPDATE route_security_config 
SET admin_only = true, is_settings_route = true, severity_on_violation = 'high'
WHERE route_pattern = '/admin/global-settings';
