-- =====================================================
-- PART 1: BASE TABLES (No dependencies)
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Office Locations
CREATE TABLE IF NOT EXISTS public.office_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES public.office_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(office_id, name)
);

-- App Modules
CREATE TABLE IF NOT EXISTS public.app_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  route TEXT,
  parent_id UUID REFERENCES public.app_modules(id),
  sort_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Module Actions
CREATE TABLE IF NOT EXISTS public.module_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.app_modules(id) ON DELETE CASCADE,
  action_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, action_name)
);

-- Enable RLS on base tables
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_actions ENABLE ROW LEVEL SECURITY;

-- Office Locations policies
DROP POLICY IF EXISTS "Anyone can view active office locations" ON public.office_locations;
CREATE POLICY "Anyone can view active office locations"
  ON public.office_locations FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'Admin'));

DROP POLICY IF EXISTS "Admins can manage office locations" ON public.office_locations;
CREATE POLICY "Admins can manage office locations"
  ON public.office_locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- Departments policies
DROP POLICY IF EXISTS "Anyone can view active departments" ON public.departments;
CREATE POLICY "Anyone can view active departments"
  ON public.departments FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'Admin'));

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- App Modules policies
DROP POLICY IF EXISTS "Anyone can view enabled modules" ON public.app_modules;
CREATE POLICY "Anyone can view enabled modules"
  ON public.app_modules FOR SELECT TO authenticated
  USING (is_enabled = true OR public.has_role(auth.uid(), 'Admin'));

DROP POLICY IF EXISTS "Admins can manage modules" ON public.app_modules;
CREATE POLICY "Admins can manage modules"
  ON public.app_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- Module Actions policies
DROP POLICY IF EXISTS "Anyone can view enabled actions" ON public.module_actions;
CREATE POLICY "Anyone can view enabled actions"
  ON public.module_actions FOR SELECT TO authenticated
  USING (is_enabled = true OR public.has_role(auth.uid(), 'Admin'));

DROP POLICY IF EXISTS "Admins can manage actions" ON public.module_actions;
CREATE POLICY "Admins can manage actions"
  ON public.module_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'Admin'))
  WITH CHECK (public.has_role(auth.uid(), 'Admin'));

-- Update triggers
DROP TRIGGER IF EXISTS update_office_locations_updated_at ON public.office_locations;
CREATE TRIGGER update_office_locations_updated_at
  BEFORE UPDATE ON public.office_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_departments_updated_at ON public.departments;
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_modules_updated_at ON public.app_modules;
CREATE TRIGGER update_app_modules_updated_at
  BEFORE UPDATE ON public.app_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES public.office_locations(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mfa_method TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);