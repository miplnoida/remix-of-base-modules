-- 1) Move role_permissions from app_role enum to roles(id)
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS role_id uuid;

-- 2) Backfill role_id for existing rows where names match
UPDATE public.role_permissions rp
SET role_id = r.id
FROM public.roles r
WHERE rp.role_id IS NULL
  AND r.role_name = rp.role::text;

-- 3) Create missing roles referenced by existing permissions (keeps current data usable)
INSERT INTO public.roles (role_name, description, is_active, is_system_role, mfa_required)
SELECT DISTINCT rp.role::text,
       'Auto-created from existing permissions',
       true,
       false,
       false
FROM public.role_permissions rp
LEFT JOIN public.roles r ON r.role_name = rp.role::text
WHERE r.id IS NULL;

-- 4) Backfill again after inserting missing roles
UPDATE public.role_permissions rp
SET role_id = r.id
FROM public.roles r
WHERE rp.role_id IS NULL
  AND r.role_name = rp.role::text;

-- 5) Ensure backfill succeeded
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id IS NULL) THEN
    RAISE EXCEPTION 'role_permissions.role_id backfill failed: some rows have no matching roles.role_name';
  END IF;
END $$;

-- 6) Enforce FK + uniqueness on (role_id, module_id, action_id)
ALTER TABLE public.role_permissions ALTER COLUMN role_id SET NOT NULL;

ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_role_id_fkey
  FOREIGN KEY (role_id) REFERENCES public.roles(id)
  ON DELETE CASCADE;

ALTER TABLE public.role_permissions
  DROP CONSTRAINT IF EXISTS role_permissions_role_module_id_action_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_role_id_module_id_action_id_uidx
  ON public.role_permissions(role_id, module_id, action_id);

-- 7) Drop old enum column
ALTER TABLE public.role_permissions DROP COLUMN IF EXISTS role;

-- 8) Atomic backend endpoint: clone a role + copy all permissions in one transaction
CREATE OR REPLACE FUNCTION public.clone_role(source_role_id uuid, new_role_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_role_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.has_role(auth.uid(), 'Admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF new_role_name IS NULL OR btrim(new_role_name) = '' THEN
    RAISE EXCEPTION 'Role name is required';
  END IF;

  IF EXISTS (SELECT 1 FROM public.roles WHERE role_name = new_role_name) THEN
    RAISE EXCEPTION 'Role name already exists';
  END IF;

  INSERT INTO public.roles (role_name, description, is_active, is_system_role, mfa_required)
  SELECT new_role_name,
         'Cloned from ' || r.role_name,
         true,
         false,
         COALESCE(r.mfa_required, false)
  FROM public.roles r
  WHERE r.id = source_role_id
  RETURNING id INTO new_role_id;

  IF new_role_id IS NULL THEN
    RAISE EXCEPTION 'Source role not found';
  END IF;

  INSERT INTO public.role_permissions (role_id, module_id, action_id, is_granted)
  SELECT new_role_id, rp.module_id, rp.action_id, rp.is_granted
  FROM public.role_permissions rp
  WHERE rp.role_id = source_role_id;

  RETURN new_role_id;
END;
$$;