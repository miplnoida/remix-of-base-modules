
-- Change user_roles.role from app_role enum to text to support dynamic roles
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;

-- Add a foreign-key-like check: ensure role values match roles.role_name
-- We use a trigger instead of FK since role_name isn't a PK
CREATE OR REPLACE FUNCTION public.validate_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE role_name = NEW.role AND is_active = true) THEN
    RAISE EXCEPTION 'Invalid role: %. Role must exist in roles table and be active.', NEW.role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_user_role ON public.user_roles;
CREATE TRIGGER trg_validate_user_role
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_role();

-- Update the can_access_module function to work with text role column
CREATE OR REPLACE FUNCTION public.can_access_module(_user_id uuid, _module_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can access ALL active modules
  IF public.is_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Check if user has 'view' permission for this module through any role
  RETURN EXISTS(
    SELECT 1
    FROM app_modules m
    INNER JOIN module_actions ma ON ma.module_id = m.id
    INNER JOIN role_permissions rp ON rp.module_id = m.id AND rp.action_id = ma.id
    INNER JOIN roles r ON r.id = rp.role_id
    INNER JOIN user_roles ur ON ur.role = r.role_name
    WHERE ur.user_id = _user_id
      AND m.name = _module_name
      AND m.is_enabled = true
      AND ma.action_name = 'view'
      AND ma.is_enabled = true
      AND rp.is_granted = true
  );
END;
$$;
