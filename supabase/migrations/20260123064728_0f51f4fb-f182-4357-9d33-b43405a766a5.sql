-- Fix all RBAC functions to use user_roles table with app_role enum
-- Using CREATE OR REPLACE to avoid dropping functions with dependencies

-- 1. Replace is_admin to use user_roles
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
    WHERE user_id = _user_id
      AND role = 'Admin'
  )
$$;

-- 2. Replace has_role to use user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Replace can_access_module to use user_roles
CREATE OR REPLACE FUNCTION public.can_access_module(_user_id uuid, _module_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    INNER JOIN user_roles ur ON ur.role::text = r.role_name
    WHERE ur.user_id = _user_id
      AND m.name = _module_name
      AND m.is_enabled = true
      AND ma.action_name = 'view'
      AND ma.is_enabled = true
      AND rp.is_granted = true
  );
END;
$$;

-- 4. Replace get_user_accessible_modules to use user_roles
CREATE OR REPLACE FUNCTION public.get_user_accessible_modules(_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  display_name text,
  icon text,
  route text,
  parent_id uuid,
  sort_order integer,
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If user is admin, return ALL enabled modules
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
    -- Return modules where user has 'view' permission through any role in user_roles
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
$$;

-- 5. Replace has_permission to use user_roles
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module_name text, _action_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admins have all permissions
  IF public.is_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Check if user has the specific permission through any role in user_roles
  RETURN EXISTS(
    SELECT 1
    FROM app_modules m
    INNER JOIN module_actions ma ON ma.module_id = m.id
    INNER JOIN role_permissions rp ON rp.module_id = m.id AND rp.action_id = ma.id
    INNER JOIN roles r ON r.id = rp.role_id
    INNER JOIN user_roles ur ON ur.role::text = r.role_name
    WHERE ur.user_id = _user_id
      AND m.name = _module_name
      AND m.is_enabled = true
      AND ma.action_name = _action_name
      AND ma.is_enabled = true
      AND rp.is_granted = true
  );
END;
$$;