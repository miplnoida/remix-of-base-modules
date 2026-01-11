-- ============================================
-- DATA ACCESS CONTROL SYSTEM - TABLES & MODULES
-- ============================================

-- 1. Create enums if not exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'data_scope_condition_type') THEN
    CREATE TYPE public.data_scope_condition_type AS ENUM ('owner', 'department', 'office', 'created_by', 'custom_sql');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_masking_type') THEN
    CREATE TYPE public.field_masking_type AS ENUM ('none', 'partial', 'full');
  END IF;
END $$;

-- 2. Create tables
CREATE TABLE IF NOT EXISTS public.data_scope_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.app_modules(id) ON DELETE CASCADE,
  target_table TEXT NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  condition_type public.data_scope_condition_type NOT NULL,
  condition_value TEXT,
  custom_sql TEXT,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.field_security_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.app_modules(id) ON DELETE CASCADE,
  target_table TEXT NOT NULL,
  field_name TEXT NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  masking_type public.field_masking_type NOT NULL DEFAULT 'none',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.user_data_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES public.app_modules(id) ON DELETE CASCADE,
  target_table TEXT NOT NULL,
  override_type TEXT NOT NULL CHECK (override_type IN ('row_allow', 'row_block', 'field_allow', 'field_block')),
  field_name TEXT,
  condition_sql TEXT,
  record_ids UUID[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.data_policy_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  module_name TEXT,
  target_table TEXT,
  record_id TEXT,
  rules_applied JSONB,
  access_granted BOOLEAN,
  denial_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.data_scope_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_security_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_policy_audit_log ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Admins can manage data scope rules" ON public.data_scope_rules;
CREATE POLICY "Admins can manage data scope rules"
ON public.data_scope_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'Admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage field security rules" ON public.field_security_rules;
CREATE POLICY "Admins can manage field security rules"
ON public.field_security_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'Admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage user data overrides" ON public.user_data_overrides;
CREATE POLICY "Admins can manage user data overrides"
ON public.user_data_overrides FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'Admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'Admin'::app_role));

DROP POLICY IF EXISTS "Admins can view policy audit log" ON public.data_policy_audit_log;
CREATE POLICY "Admins can view policy audit log"
ON public.data_policy_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'Admin'::app_role));

-- 5. Insert parent module
INSERT INTO public.app_modules (name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
VALUES ('data_access_control', 'Data Access Control', 'ShieldCheck', NULL, NULL, 900, true, 'Manage data access policies and security rules')
ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, icon = EXCLUDED.icon, sort_order = EXCLUDED.sort_order;

-- 6. Insert child modules (using explicit subquery)
DO $$
DECLARE
  parent_id UUID;
BEGIN
  SELECT id INTO parent_id FROM app_modules WHERE name = 'data_access_control';
  
  INSERT INTO app_modules (name, display_name, icon, route, parent_id, sort_order, is_enabled, description)
  VALUES 
    ('data_scope_rules', 'Data Scope Rules', 'Rows3', '/admin/data-access/scope-rules', parent_id, 1, true, 'Define row-level data access rules'),
    ('field_security', 'Field Security', 'Lock', '/admin/data-access/field-security', parent_id, 2, true, 'Configure field-level visibility and editing'),
    ('role_data_policies', 'Role Data Policies', 'Users', '/admin/data-access/role-policies', parent_id, 3, true, 'View and manage policies by role'),
    ('user_data_overrides', 'User Data Overrides', 'UserCog', '/admin/data-access/user-overrides', parent_id, 4, true, 'Configure user-specific access overrides'),
    ('policy_test_console', 'Policy Test Console', 'TestTube', '/admin/data-access/test-console', parent_id, 5, true, 'Test and debug access policies')
  ON CONFLICT (name) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    icon = EXCLUDED.icon,
    route = EXCLUDED.route,
    parent_id = EXCLUDED.parent_id,
    sort_order = EXCLUDED.sort_order;
END $$;