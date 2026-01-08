-- Insert admin permissions for all enabled modules and their actions
INSERT INTO role_permissions (role, module_id, action_id, is_granted, created_at)
SELECT 
  'Admin'::app_role,
  m.id,
  a.id,
  true,
  now()
FROM app_modules m
JOIN module_actions a ON a.module_id = m.id
WHERE m.is_enabled = true 
  AND a.is_enabled = true
ON CONFLICT (role, module_id, action_id) DO UPDATE SET is_granted = true;

-- Create trigger function to protect Admin role permissions
CREATE OR REPLACE FUNCTION protect_admin_permissions()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.role = 'Admin'::app_role THEN
    RAISE EXCEPTION 'Cannot delete Admin role permissions';
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.role = 'Admin'::app_role THEN
    IF NEW.is_granted = false THEN
      RAISE EXCEPTION 'Cannot revoke Admin role permissions';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to protect admin permissions
DROP TRIGGER IF EXISTS admin_permissions_protection ON role_permissions;
CREATE TRIGGER admin_permissions_protection
BEFORE UPDATE OR DELETE ON role_permissions
FOR EACH ROW
EXECUTE FUNCTION protect_admin_permissions();

-- Create function to auto-grant admin permissions for new actions
CREATE OR REPLACE FUNCTION auto_grant_admin_permission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO role_permissions (role, module_id, action_id, is_granted)
  VALUES ('Admin'::app_role, NEW.module_id, NEW.id, true)
  ON CONFLICT (role, module_id, action_id) DO UPDATE SET is_granted = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-granting admin permissions on new actions
DROP TRIGGER IF EXISTS auto_admin_action_permission ON module_actions;
CREATE TRIGGER auto_admin_action_permission
AFTER INSERT ON module_actions
FOR EACH ROW
EXECUTE FUNCTION auto_grant_admin_permission();