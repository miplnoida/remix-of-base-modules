-- Harden get_user_accessible_modules to include parent modules for permitted children
-- and be resilient to no-role/no-permission cases

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
SET search_path = public
AS $$
BEGIN
  -- If user is admin, return ALL enabled modules that are visible in menu
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
      AND m.show_in_menu = true
    ORDER BY m.sort_order NULLS LAST, m.display_name;
  ELSE
    -- Use CTE: first find directly permitted modules, then include their parents
    RETURN QUERY
    WITH permitted_modules AS (
      SELECT DISTINCT m.id AS module_id
      FROM app_modules m
      INNER JOIN module_actions ma ON ma.module_id = m.id
      INNER JOIN role_permissions rp ON rp.module_id = m.id AND rp.action_id = ma.id
      INNER JOIN roles r ON r.id = rp.role_id
      INNER JOIN user_roles ur ON ur.role::text = r.role_name
      WHERE ur.user_id = _user_id
        AND m.is_enabled = true
        AND m.show_in_menu = true
        AND ma.action_name = 'view'
        AND ma.is_enabled = true
        AND rp.is_granted = true
    ),
    -- Also include parent modules for any permitted child
    required_parents AS (
      SELECT DISTINCT m.parent_id AS module_id
      FROM app_modules m
      INNER JOIN permitted_modules pm ON pm.module_id = m.id
      WHERE m.parent_id IS NOT NULL
    ),
    all_visible AS (
      SELECT module_id FROM permitted_modules
      UNION
      SELECT module_id FROM required_parents
    )
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
    INNER JOIN all_visible av ON av.module_id = m.id
    WHERE m.is_enabled = true
      AND m.show_in_menu = true
    ORDER BY m.sort_order NULLS LAST, m.display_name;
  END IF;
END;
$$;

-- Add indexes to support the navigation permission path
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_module ON public.role_permissions(role_id, module_id);
CREATE INDEX IF NOT EXISTS idx_module_actions_module_action ON public.module_actions(module_id, action_name);
CREATE INDEX IF NOT EXISTS idx_app_modules_parent_enabled ON public.app_modules(parent_id) WHERE is_enabled = true AND show_in_menu = true;
CREATE INDEX IF NOT EXISTS idx_app_modules_enabled_menu ON public.app_modules(is_enabled, show_in_menu) WHERE is_enabled = true AND show_in_menu = true;