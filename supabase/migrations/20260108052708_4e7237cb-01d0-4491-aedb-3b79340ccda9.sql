-- Update get_user_permissions to always return all permissions for Admin role
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(module_id uuid, module_name text, action_id uuid, action_name text, is_granted boolean, source text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is Admin - if so, return ALL enabled module/action combinations
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'Admin') THEN
    RETURN QUERY
    SELECT 
      am.id as module_id,
      am.name as module_name,
      ma.id as action_id,
      ma.action_name,
      true as is_granted,
      'admin_role'::TEXT as source
    FROM app_modules am
    CROSS JOIN module_actions ma
    WHERE am.is_enabled = true AND ma.is_enabled = true;
    RETURN;
  END IF;

  -- Normal permission resolution for non-Admin users
  RETURN QUERY
  WITH role_perms AS (
    SELECT rp.module_id, am.name as module_name, rp.action_id, ma.action_name, rp.is_granted, 'role'::TEXT as source
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role = ur.role
    JOIN app_modules am ON am.id = rp.module_id
    JOIN module_actions ma ON ma.id = rp.action_id
    WHERE ur.user_id = _user_id AND am.is_enabled = true AND ma.is_enabled = true
  ),
  user_overrides AS (
    SELECT upo.module_id, am.name as module_name, upo.action_id, ma.action_name, upo.is_granted, 'user_override'::TEXT as source
    FROM user_permission_overrides upo
    JOIN app_modules am ON am.id = upo.module_id
    JOIN module_actions ma ON ma.id = upo.action_id
    WHERE upo.user_id = _user_id
  )
  SELECT DISTINCT ON (combined.module_id, combined.action_id) combined.module_id, combined.module_name, combined.action_id, combined.action_name, combined.is_granted, combined.source
  FROM (
    SELECT * FROM user_overrides
    UNION ALL
    SELECT * FROM role_perms rp WHERE NOT EXISTS (SELECT 1 FROM user_overrides uo WHERE uo.module_id = rp.module_id AND uo.action_id = rp.action_id)
  ) combined
  WHERE combined.is_granted = true;
END;
$function$;

-- Update has_permission to always return true for Admin role
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module_name text, _action_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Admin role always has permission
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'Admin') THEN
    RETURN true;
  END IF;
  
  -- Check normal permissions for non-Admin users
  RETURN EXISTS (SELECT 1 FROM public.get_user_permissions(_user_id) p WHERE p.module_name = _module_name AND p.action_name = _action_name);
END;
$function$;

-- Create a helper function to check if user is Admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'Admin'
  )
$$;