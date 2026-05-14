
-- Drop existing function to change return type
DROP FUNCTION IF EXISTS public.get_user_accessible_modules(uuid);

-- Helper: check if user has rollout access to a module
CREATE OR REPLACE FUNCTION public.check_module_rollout_access(
  _user_id uuid,
  _rollout_state text,
  _internal_only boolean,
  _pilot_user_ids uuid[],
  _pilot_role_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _rollout_state = 'public' AND NOT _internal_only THEN
    RETURN true;
  END IF;
  IF _rollout_state = 'hidden' THEN
    RETURN false;
  END IF;
  IF public.is_admin(_user_id) THEN
    RETURN true;
  END IF;
  IF _internal_only THEN
    RETURN false;
  END IF;
  IF _rollout_state = 'internal_pilot' THEN
    IF _user_id = ANY(_pilot_user_ids) THEN
      RETURN true;
    END IF;
    IF array_length(_pilot_role_ids, 1) > 0 THEN
      RETURN EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.role_name = ur.role::text
        WHERE ur.user_id = _user_id
          AND r.id = ANY(_pilot_role_ids)
      );
    END IF;
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

-- Recreate with base_url in return type + rollout filtering
CREATE OR REPLACE FUNCTION public.get_user_accessible_modules(_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  display_name text,
  icon text,
  route text,
  parent_id uuid,
  sort_order integer,
  description text,
  base_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    WITH permitted_modules AS (
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
    required_parents AS (
      SELECT DISTINCT m2.parent_id AS module_id
      FROM app_modules m2
      INNER JOIN permitted_modules pm ON pm.module_id = m2.id
      WHERE m2.parent_id IS NOT NULL
    ),
    all_visible AS (
      SELECT pm.module_id FROM permitted_modules pm
      UNION
      SELECT rp2.module_id FROM required_parents rp2
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
$$;

-- Feature flag check function
CREATE OR REPLACE FUNCTION public.check_feature_flag(
  _flag_key text,
  _user_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _flag record;
BEGIN
  SELECT * INTO _flag FROM feature_flags WHERE flag_key = _flag_key;
  IF NOT FOUND OR NOT _flag.is_enabled THEN
    RETURN false;
  END IF;
  RETURN public.check_module_rollout_access(
    COALESCE(_user_id, auth.uid()),
    _flag.rollout_state,
    false,
    _flag.pilot_user_ids,
    _flag.pilot_role_ids
  );
END;
$$;
