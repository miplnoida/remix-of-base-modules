
CREATE TABLE IF NOT EXISTS public.ce_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_code VARCHAR NOT NULL UNIQUE,
  zone_name VARCHAR NOT NULL,
  parishes JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ce_inspectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspector_code VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  assigned_zones JSONB DEFAULT '[]'::jsonb,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  active_from DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ce_weekly_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_number VARCHAR NOT NULL UNIQUE,
  inspector_id UUID REFERENCES public.ce_inspectors(id),
  inspector_name VARCHAR,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  status VARCHAR DEFAULT 'DRAFT',
  submitted_date TIMESTAMPTZ,
  approved_date TIMESTAMPTZ,
  approved_by VARCHAR,
  approved_by_name VARCHAR,
  supervisor_comments TEXT,
  total_planned_visits INT DEFAULT 0,
  completed_visits INT DEFAULT 0,
  created_by VARCHAR,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ce_planned_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.ce_weekly_plans(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.ce_cases(id),
  employer_id VARCHAR,
  employer_name VARCHAR,
  visit_type VARCHAR,
  scheduled_date DATE,
  purpose TEXT,
  completed BOOLEAN DEFAULT false,
  completed_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ce_field_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES public.ce_weekly_plans(id),
  case_id UUID REFERENCES public.ce_cases(id),
  case_number VARCHAR,
  employer_id VARCHAR,
  employer_name VARCHAR,
  visit_type VARCHAR,
  plan_reference VARCHAR,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  status VARCHAR DEFAULT 'pending',
  evidence_count INT DEFAULT 0,
  working_papers INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
