-- Create designations table for master data
CREATE TABLE public.designations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Create designation_hierarchy table
CREATE TABLE public.designation_hierarchy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  designation_id UUID NOT NULL REFERENCES public.designations(id) ON DELETE CASCADE,
  parent_designation_id UUID REFERENCES public.designations(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(designation_id)
);

-- Create role_hierarchy table for role parent-child relationships
CREATE TABLE public.role_hierarchy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  parent_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id)
);

-- Create office_departments junction table for many-to-many relationship
CREATE TABLE public.office_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  office_id UUID NOT NULL REFERENCES public.office_locations(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(office_id, department_id)
);

-- Add designation_id to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation_id UUID REFERENCES public.designations(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designation_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for designations (viewable by all authenticated, manageable by admins)
CREATE POLICY "Designations viewable by authenticated users"
  ON public.designations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Designations manageable by admins"
  ON public.designations FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS Policies for designation_hierarchy
CREATE POLICY "Designation hierarchy viewable by authenticated users"
  ON public.designation_hierarchy FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Designation hierarchy manageable by admins"
  ON public.designation_hierarchy FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS Policies for role_hierarchy
CREATE POLICY "Role hierarchy viewable by authenticated users"
  ON public.role_hierarchy FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Role hierarchy manageable by admins"
  ON public.role_hierarchy FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS Policies for office_departments
CREATE POLICY "Office departments viewable by authenticated users"
  ON public.office_departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Office departments manageable by admins"
  ON public.office_departments FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_designations_updated_at
  BEFORE UPDATE ON public.designations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_designation_hierarchy_updated_at
  BEFORE UPDATE ON public.designation_hierarchy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_hierarchy_updated_at
  BEFORE UPDATE ON public.role_hierarchy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();