-- 1) Allow group/container nodes (Plans, Visits, Employer, Findings) to flow through the RPC
UPDATE public.app_modules
SET routes_enabled = true,
    updated_at = now()
WHERE id IN (
  'ca000000-0000-0000-0000-0000000002a1',
  'ca000000-0000-0000-0000-0000000002a2',
  'ca000000-0000-0000-0000-0000000002a3',
  'ca000000-0000-0000-0000-0000000002a4'
);

-- 2) Recursive parent walk so any depth (3+) survives the permission filter
CREATE OR REPLACE FUNCTION public.get_user_accessible_modules(_user_id uuid)
 RETURNS TABLE(id uuid, name text, display_name text, icon text, route text, parent_id uuid, sort_order integer, description text, base_url text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_admin(_user_id) THEN
    RETURN QUERY
    SELECT 
      m.id, m.name, m.display_name, m.icon, m.route, m.parent_id, 
      m.sort_order, m.description, m.base_url
    FROM app_modules m
    WHERE m.is_enabled = true
      AND m.show_in_menu = true
      AND m.routes_enabled = true
      AND public.check_module_rollout_access(
        _user_id, m.rollout_state, m.internal_only, 
        m.pilot_user_ids, m.pilot_role_ids
      )
    ORDER BY m.sort_order NULLS LAST, m.display_name;
  ELSE
    RETURN QUERY
    WITH RECURSIVE permitted_modules AS (
      SELECT DISTINCT m2.id AS module_id
      FROM app_modules m2
      INNER JOIN module_actions ma ON ma.module_id = m2.id
      INNER JOIN role_permissions rp ON rp.module_id = m2.id AND rp.action_id = ma.id
      INNER JOIN roles r ON r.id = rp.role_id
      INNER JOIN user_roles ur ON ur.role::text = r.role_name
      WHERE ur.user_id = _user_id
        AND m2.is_enabled = true
        AND m2.show_in_menu = true
        AND m2.routes_enabled = true
        AND ma.action_name = 'view'
        AND ma.is_enabled = true
        AND rp.is_granted = true
        AND public.check_module_rollout_access(
          _user_id, m2.rollout_state, m2.internal_only,
          m2.pilot_user_ids, m2.pilot_role_ids
        )
    ),
    -- Recursively walk up the parent chain so 3+ level trees survive
    ancestor_chain AS (
      SELECT m.id AS module_id, m.parent_id
      FROM app_modules m
      INNER JOIN permitted_modules pm ON pm.module_id = m.id
      UNION
      SELECT m.id, m.parent_id
      FROM app_modules m
      INNER JOIN ancestor_chain ac ON ac.parent_id = m.id
    ),
    all_visible AS (
      SELECT module_id FROM ancestor_chain
    )
    SELECT 
      m.id, m.name, m.display_name, m.icon, m.route, m.parent_id, 
      m.sort_order, m.description, m.base_url
    FROM app_modules m
    INNER JOIN all_visible av ON av.module_id = m.id
    WHERE m.is_enabled = true
      AND m.show_in_menu = true
      AND m.routes_enabled = true
    ORDER BY m.sort_order NULLS LAST, m.display_name;
  END IF;
END;
$function$;