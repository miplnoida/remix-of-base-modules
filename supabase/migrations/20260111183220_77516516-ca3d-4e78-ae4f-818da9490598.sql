-- Fix the protect_admin_permissions trigger function
CREATE OR REPLACE FUNCTION public.protect_admin_permissions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  admin_role_id UUID;
BEGIN
  -- Get the Admin role ID
  SELECT id INTO admin_role_id FROM roles WHERE role_name = 'Admin';
  
  IF TG_OP = 'DELETE' AND OLD.role_id = admin_role_id THEN
    RAISE EXCEPTION 'Cannot delete Admin role permissions';
  END IF;
  
  IF TG_OP = 'UPDATE' AND OLD.role_id = admin_role_id THEN
    IF NEW.is_granted = false THEN
      RAISE EXCEPTION 'Cannot revoke Admin role permissions';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;