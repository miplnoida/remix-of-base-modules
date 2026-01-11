
-- Fix the get_user_accessible_modules function to handle app_role enum to text comparison
CREATE OR REPLACE FUNCTION public.get_user_accessible_modules(_user_id uuid)
RETURNS TABLE(id uuid, name text, display_name text, icon text, route text, parent_id uuid, sort_order integer, description text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- Cast app_role enum to text for comparison with roles.role_name
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
    INNER JOIN roles r ON r.id = rp.role_id
    INNER JOIN user_roles ur ON ur.role::text = r.role_name
    WHERE ur.user_id = _user_id
      AND m.is_enabled = true
      AND ma.action_name = 'view'
      AND ma.is_enabled = true
      AND rp.is_granted = true
    ORDER BY m.sort_order NULLS LAST, m.display_name;
  END IF;
END;
$function$;
