
CREATE TABLE IF NOT EXISTS public.enterprise_capability_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_key text NOT NULL UNIQUE,
  capability_name text NOT NULL,
  category text NOT NULL,
  grouping text NOT NULL,
  owner text,
  status text NOT NULL DEFAULT 'active',
  version text,
  canonical_route text,
  menu_module_name text,
  permission_hint text,
  feature_flag text,
  consumers text[] NOT NULL DEFAULT '{}',
  dependencies text[] NOT NULL DEFAULT '{}',
  documentation_link text,
  architecture_link text,
  acceptance_link text,
  health_architecture text DEFAULT 'unknown',
  health_implementation text DEFAULT 'unknown',
  health_menu text DEFAULT 'unknown',
  health_permissions text DEFAULT 'unknown',
  health_documentation text DEFAULT 'unknown',
  health_acceptance text DEFAULT 'unknown',
  health_migration text DEFAULT 'unknown',
  overall_health text DEFAULT 'unknown',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_ecr_grouping ON public.enterprise_capability_registry (grouping);
CREATE INDEX IF NOT EXISTS idx_ecr_status ON public.enterprise_capability_registry (status);
CREATE INDEX IF NOT EXISTS idx_ecr_category ON public.enterprise_capability_registry (category);
