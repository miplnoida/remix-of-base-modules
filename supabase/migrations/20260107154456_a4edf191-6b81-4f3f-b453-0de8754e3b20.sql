-- Bootstrap admin user and seed initial data

-- 1. Seed app_modules with initial modules
INSERT INTO app_modules (id, name, display_name, description, icon, route, sort_order, is_enabled) VALUES
  (gen_random_uuid(), 'dashboard', 'Dashboard', 'Main dashboard', 'LayoutDashboard', '/dashboard', 1, true),
  (gen_random_uuid(), 'user_management', 'User Management', 'Manage system users', 'Users', '/admin/users', 2, true),
  (gen_random_uuid(), 'role_management', 'Role Management', 'Manage roles and permissions', 'Shield', '/system-admin/roles', 3, true),
  (gen_random_uuid(), 'module_management', 'Module Management', 'Manage application modules', 'Boxes', '/system-admin/modules', 4, true),
  (gen_random_uuid(), 'office_management', 'Office & Departments', 'Manage offices and departments', 'Building', '/system-admin/offices', 5, true),
  (gen_random_uuid(), 'audit_logs', 'Audit Logs', 'View system audit logs', 'FileText', '/system-admin/audit-logs', 6, true),
  (gen_random_uuid(), 'notifications', 'Notifications', 'Notification management', 'Bell', '/system-admin/notifications', 7, true),
  (gen_random_uuid(), 'security_settings', 'Security Settings', 'Password and MFA policies', 'Lock', '/system-admin/security', 8, true)
ON CONFLICT DO NOTHING;

-- 2. Seed office locations
INSERT INTO office_locations (id, branch_name, address, city, is_active) VALUES
  (gen_random_uuid(), 'Head Office', 'Government Headquarters', 'Basseterre', true),
  (gen_random_uuid(), 'Nevis Branch', 'Main Street', 'Charlestown', true)
ON CONFLICT DO NOTHING;

-- 3. Update has_role function to use app_role enum properly
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Update RLS policies to use has_role with enum
-- Drop existing restrictive policies on profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create more permissive policies for profiles
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'Admin'));

-- 5. Update RLS on user_roles for admin management
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

CREATE POLICY "Authenticated users can view roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert user roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins can delete user roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'));

-- 6. Update RLS on roles table (UI roles)
DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;

CREATE POLICY "Anyone can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert roles"
  ON roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins can update roles"
  ON roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins can delete non-system roles"
  ON roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin') AND NOT is_system_role);

-- 7. Update RLS on role_permissions
DROP POLICY IF EXISTS "Anyone can view role permissions" ON role_permissions;
DROP POLICY IF EXISTS "Admins can manage role permissions" ON role_permissions;

CREATE POLICY "Authenticated can view role_permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert role_permissions"
  ON role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins can delete role_permissions"
  ON role_permissions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'));

-- 8. Update RLS on app_modules
DROP POLICY IF EXISTS "Anyone can view modules" ON app_modules;
DROP POLICY IF EXISTS "Admins can manage modules" ON app_modules;

CREATE POLICY "Authenticated can view app_modules"
  ON app_modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert app_modules"
  ON app_modules FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins can update app_modules"
  ON app_modules FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins can delete app_modules"
  ON app_modules FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'));

-- 9. Update RLS on module_actions
DROP POLICY IF EXISTS "Anyone can view module actions" ON module_actions;
DROP POLICY IF EXISTS "Admins can manage module actions" ON module_actions;

CREATE POLICY "Authenticated can view module_actions"
  ON module_actions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert module_actions"
  ON module_actions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins can update module_actions"
  ON module_actions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins can delete module_actions"
  ON module_actions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'));

-- 10. Update RLS on office_locations
DROP POLICY IF EXISTS "Anyone can view offices" ON office_locations;
DROP POLICY IF EXISTS "Admins can manage offices" ON office_locations;

CREATE POLICY "Authenticated can view office_locations"
  ON office_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert office_locations"
  ON office_locations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins can update office_locations"
  ON office_locations FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'));

-- 11. Update RLS on departments
DROP POLICY IF EXISTS "Anyone can view departments" ON departments;
DROP POLICY IF EXISTS "Admins can manage departments" ON departments;

CREATE POLICY "Authenticated can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

CREATE POLICY "Admins can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'));