-- Fix infinite recursion in RLS policies by removing self-referential subqueries.
-- Use SECURITY DEFINER helper functions with stable search_path.

-- 1) Helper functions (SECURITY DEFINER)

CREATE OR REPLACE FUNCTION public.identity_current_identity_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uim.identity_user_id
  FROM public.user_identity_map uim
  WHERE uim.supabase_auth_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.identity_current_user_code()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uim.generated_user_code
  FROM public.user_identity_map uim
  WHERE uim.supabase_auth_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.identity_has_role(_identity_user_id text, _role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."AspNetUserRoles" ur
    JOIN public."AspNetRoles" r ON r."Id" = ur."RoleId"
    WHERE ur."UserId" = _identity_user_id
      AND r."Name" = _role_name
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  )
$$;

CREATE OR REPLACE FUNCTION public.identity_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.identity_has_role(public.identity_current_identity_user_id(), 'Admin')
$$;

-- 2) Drop ALL existing policies on identity tables and user_identity_map
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'AspNetUsers',
        'AspNetRoles',
        'AspNetUserRoles',
        'AspNetUserClaims',
        'AspNetRoleClaims',
        'AspNetUserLogins',
        'AspNetUserTokens',
        'user_identity_map'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 3) Recreate RLS policies (secure + non-recursive)

-- user_identity_map
CREATE POLICY "uim_select_own_or_admin"
ON public.user_identity_map
FOR SELECT
TO authenticated
USING (
  supabase_auth_id = auth.uid()
  OR public.identity_is_admin()
);

CREATE POLICY "uim_insert_admin_only"
ON public.user_identity_map
FOR INSERT
TO authenticated
WITH CHECK (public.identity_is_admin());

CREATE POLICY "uim_update_admin_only"
ON public.user_identity_map
FOR UPDATE
TO authenticated
USING (public.identity_is_admin())
WITH CHECK (public.identity_is_admin());

CREATE POLICY "uim_delete_admin_only"
ON public.user_identity_map
FOR DELETE
TO authenticated
USING (public.identity_is_admin());

-- AspNetUsers (PII) - admin can see all; users can see/update self
CREATE POLICY "aspnetusers_select_own_or_admin"
ON public."AspNetUsers"
FOR SELECT
TO authenticated
USING (
  public.identity_is_admin()
  OR "Id" = public.identity_current_identity_user_id()
);

CREATE POLICY "aspnetusers_insert_admin_only"
ON public."AspNetUsers"
FOR INSERT
TO authenticated
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetusers_update_admin_or_self"
ON public."AspNetUsers"
FOR UPDATE
TO authenticated
USING (
  public.identity_is_admin()
  OR "Id" = public.identity_current_identity_user_id()
)
WITH CHECK (
  public.identity_is_admin()
  OR "Id" = public.identity_current_identity_user_id()
);

CREATE POLICY "aspnetusers_delete_admin_only"
ON public."AspNetUsers"
FOR DELETE
TO authenticated
USING (public.identity_is_admin());

-- AspNetRoles - authenticated can read; admin can write
CREATE POLICY "aspnetroles_select_authenticated"
ON public."AspNetRoles"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "aspnetroles_insert_admin_only"
ON public."AspNetRoles"
FOR INSERT
TO authenticated
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetroles_update_admin_only"
ON public."AspNetRoles"
FOR UPDATE
TO authenticated
USING (public.identity_is_admin())
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetroles_delete_admin_only"
ON public."AspNetRoles"
FOR DELETE
TO authenticated
USING (public.identity_is_admin());

-- AspNetUserRoles - admin can see/manage all; users can see own
CREATE POLICY "aspnetuserroles_select_own_or_admin"
ON public."AspNetUserRoles"
FOR SELECT
TO authenticated
USING (
  public.identity_is_admin()
  OR "UserId" = public.identity_current_identity_user_id()
);

CREATE POLICY "aspnetuserroles_insert_admin_only"
ON public."AspNetUserRoles"
FOR INSERT
TO authenticated
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetuserroles_update_admin_only"
ON public."AspNetUserRoles"
FOR UPDATE
TO authenticated
USING (public.identity_is_admin())
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetuserroles_delete_admin_only"
ON public."AspNetUserRoles"
FOR DELETE
TO authenticated
USING (public.identity_is_admin());

-- AspNetUserClaims - admin can see/manage all; users can see own
CREATE POLICY "aspnetuserclaims_select_own_or_admin"
ON public."AspNetUserClaims"
FOR SELECT
TO authenticated
USING (
  public.identity_is_admin()
  OR "UserId" = public.identity_current_identity_user_id()
);

CREATE POLICY "aspnetuserclaims_insert_admin_only"
ON public."AspNetUserClaims"
FOR INSERT
TO authenticated
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetuserclaims_update_admin_only"
ON public."AspNetUserClaims"
FOR UPDATE
TO authenticated
USING (public.identity_is_admin())
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetuserclaims_delete_admin_only"
ON public."AspNetUserClaims"
FOR DELETE
TO authenticated
USING (public.identity_is_admin());

-- AspNetRoleClaims - authenticated can read; admin can write
CREATE POLICY "aspnetroleclaims_select_authenticated"
ON public."AspNetRoleClaims"
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "aspnetroleclaims_insert_admin_only"
ON public."AspNetRoleClaims"
FOR INSERT
TO authenticated
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetroleclaims_update_admin_only"
ON public."AspNetRoleClaims"
FOR UPDATE
TO authenticated
USING (public.identity_is_admin())
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetroleclaims_delete_admin_only"
ON public."AspNetRoleClaims"
FOR DELETE
TO authenticated
USING (public.identity_is_admin());

-- AspNetUserLogins - admin can see/manage all; users can see own
CREATE POLICY "aspnetuserlogins_select_own_or_admin"
ON public."AspNetUserLogins"
FOR SELECT
TO authenticated
USING (
  public.identity_is_admin()
  OR "UserId" = public.identity_current_identity_user_id()
);

CREATE POLICY "aspnetuserlogins_insert_admin_only"
ON public."AspNetUserLogins"
FOR INSERT
TO authenticated
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetuserlogins_update_admin_only"
ON public."AspNetUserLogins"
FOR UPDATE
TO authenticated
USING (public.identity_is_admin())
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetuserlogins_delete_admin_only"
ON public."AspNetUserLogins"
FOR DELETE
TO authenticated
USING (public.identity_is_admin());

-- AspNetUserTokens - admin can see/manage all; users can see own
CREATE POLICY "aspnetusertokens_select_own_or_admin"
ON public."AspNetUserTokens"
FOR SELECT
TO authenticated
USING (
  public.identity_is_admin()
  OR "UserId" = public.identity_current_identity_user_id()
);

CREATE POLICY "aspnetusertokens_insert_admin_only"
ON public."AspNetUserTokens"
FOR INSERT
TO authenticated
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetusertokens_update_admin_only"
ON public."AspNetUserTokens"
FOR UPDATE
TO authenticated
USING (public.identity_is_admin())
WITH CHECK (public.identity_is_admin());

CREATE POLICY "aspnetusertokens_delete_admin_only"
ON public."AspNetUserTokens"
FOR DELETE
TO authenticated
USING (public.identity_is_admin());
