-- Function to get all modules a user can access based on their roles
CREATE OR REPLACE FUNCTION public.get_user_accessible_modules(_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  display_name TEXT,
  icon TEXT,
  route TEXT,
  parent_id UUID,
  sort_order INTEGER,
  description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If user is admin, return all enabled modules
  IF public.is_admin(_user_id) THEN
    RETURN QUERY
    SELECT 
      m.id,
      m.name,
      m.display_name,
      m.icon,
      m.route,
      m.parent_id,
      m.sort_order,
      m.description
    FROM app_modules m
    WHERE m.is_enabled = true
    ORDER BY m.sort_order NULLS LAST, m.display_name;
  ELSE
    -- Return modules where user has 'view' permission through any role
    RETURN QUERY
    SELECT DISTINCT
      m.id,
      m.name,
      m.display_name,
      m.icon,
      m.route,
      m.parent_id,
      m.sort_order,
      m.description
    FROM app_modules m
    INNER JOIN module_actions ma ON ma.module_id = m.id
    INNER JOIN role_permissions rp ON rp.module_id = m.id AND rp.action_id = ma.id
    INNER JOIN user_roles ur ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND m.is_enabled = true
      AND ma.action_name = 'view'
      AND ma.is_enabled = true
      AND rp.is_granted = true
    ORDER BY m.sort_order NULLS LAST, m.display_name;
  END IF;
END;
$$;

-- Function to check if a user can access a specific module
CREATE OR REPLACE FUNCTION public.can_access_module(_user_id UUID, _module_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admins can access everything
  IF public.is_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Check if user has 'view' permission for this module through any role
  RETURN EXISTS(
    SELECT 1
    FROM app_modules m
    INNER JOIN module_actions ma ON ma.module_id = m.id
    INNER JOIN role_permissions rp ON rp.module_id = m.id AND rp.action_id = ma.id
    INNER JOIN user_roles ur ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND m.name = _module_name
      AND m.is_enabled = true
      AND ma.action_name = 'view'
      AND ma.is_enabled = true
      AND rp.is_granted = true
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_accessible_modules(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_module(UUID, TEXT) TO authenticated;