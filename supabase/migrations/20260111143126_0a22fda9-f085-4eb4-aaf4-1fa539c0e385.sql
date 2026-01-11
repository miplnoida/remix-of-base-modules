-- Fix get_user_accessible_modules to use role_id instead of role
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
    INNER JOIN user_roles ur ON ur.role = r.role_name
    WHERE ur.user_id = _user_id
      AND m.is_enabled = true
      AND ma.action_name = 'view'
      AND ma.is_enabled = true
      AND rp.is_granted = true
    ORDER BY m.sort_order NULLS LAST, m.display_name;
  END IF;
END;
$function$;

-- Fix can_access_module to use role_id instead of role
CREATE OR REPLACE FUNCTION public.can_access_module(_user_id uuid, _module_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

-- Fix get_user_permissions to use role_id instead of role
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
    JOIN roles r ON r.role_name = ur.role
    JOIN role_permissions rp ON rp.role_id = r.id
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