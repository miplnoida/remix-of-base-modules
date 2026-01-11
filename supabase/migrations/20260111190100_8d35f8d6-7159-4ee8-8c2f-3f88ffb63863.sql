-- Create module_tables mapping table
CREATE TABLE IF NOT EXISTS public.module_tables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES app_modules(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, table_name)
);

-- Enable RLS
ALTER TABLE module_tables ENABLE ROW LEVEL SECURITY;

-- Only admins can manage module tables mapping
CREATE POLICY "Admins can manage module tables" ON module_tables
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Function to get tables for a module
CREATE OR REPLACE FUNCTION public.get_module_tables(_module_id UUID)
RETURNS TABLE(table_name TEXT, display_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT mt.table_name, COALESCE(mt.display_name, mt.table_name) as display_name
  FROM module_tables mt
  WHERE mt.module_id = _module_id
  ORDER BY mt.display_name;
END;
$$;

-- Function to get all public tables (fallback if no mapping exists)
CREATE OR REPLACE FUNCTION public.get_all_public_tables()
RETURNS TABLE(table_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT t.tablename::TEXT as table_name
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$;

-- Function to get columns for a table
CREATE OR REPLACE FUNCTION public.get_table_columns(_table_name TEXT)
RETURNS TABLE(column_name TEXT, data_type TEXT, is_nullable BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    (c.is_nullable = 'YES')::BOOLEAN
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = _table_name
  ORDER BY c.ordinal_position;
END;
$$;

-- Insert some default module-table mappings for existing modules
INSERT INTO module_tables (module_id, table_name, display_name) VALUES
  ((SELECT id FROM app_modules WHERE name = 'user_management'), 'profiles', 'User Profiles'),
  ((SELECT id FROM app_modules WHERE name = 'user_management'), 'user_roles', 'User Roles'),
  ((SELECT id FROM app_modules WHERE name = 'role_management'), 'roles', 'Roles'),
  ((SELECT id FROM app_modules WHERE name = 'role_management'), 'role_permissions', 'Role Permissions'),
  ((SELECT id FROM app_modules WHERE name = 'module_management'), 'app_modules', 'App Modules'),
  ((SELECT id FROM app_modules WHERE name = 'module_management'), 'module_actions', 'Module Actions'),
  ((SELECT id FROM app_modules WHERE name = 'data_scope_rules'), 'data_scope_rules', 'Data Scope Rules'),
  ((SELECT id FROM app_modules WHERE name = 'field_security'), 'field_security_rules', 'Field Security Rules'),
  ((SELECT id FROM app_modules WHERE name = 'user_data_overrides'), 'user_data_overrides', 'User Data Overrides'),
  ((SELECT id FROM app_modules WHERE name = 'Audit Logs'), 'audit_logs', 'Audit Logs')
ON CONFLICT (module_id, table_name) DO NOTHING;