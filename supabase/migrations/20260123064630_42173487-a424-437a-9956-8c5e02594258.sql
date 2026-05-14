-- Drop and recreate get_user_permissions function with correct return type
DROP FUNCTION IF EXISTS public.get_user_permissions(uuid);

CREATE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(
  module_name text,
  action_name text,
  is_granted boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If admin, return all module actions as granted
  IF public.is_admin(_user_id) THEN
    RETURN QUERY
    SELECT 
      m.name::text as module_name,
      ma.action_name::text as action_name,
      true as is_granted
    FROM app_modules m
    INNER JOIN module_actions ma ON ma.module_id = m.id
    WHERE m.is_enabled = true
      AND ma.is_enabled = true
    ORDER BY m.name, ma.action_name;
  ELSE
    -- Return granted permissions through user_roles
    RETURN QUERY
    SELECT DISTINCT
      m.name::text as module_name,
      ma.action_name::text as action_name,
      rp.is_granted
    FROM app_modules m
    INNER JOIN module_actions ma ON ma.module_id = m.id
    INNER JOIN role_permissions rp ON rp.module_id = m.id AND rp.action_id = ma.id
    INNER JOIN roles r ON r.id = rp.role_id
    INNER JOIN user_roles ur ON ur.role::text = r.role_name
    WHERE ur.user_id = _user_id
      AND m.is_enabled = true
      AND ma.is_enabled = true
      AND rp.is_granted = true
    ORDER BY m.name, ma.action_name;
  END IF;
END;
$$;