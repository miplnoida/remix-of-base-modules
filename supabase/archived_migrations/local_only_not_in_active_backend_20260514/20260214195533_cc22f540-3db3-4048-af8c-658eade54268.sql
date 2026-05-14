
-- API Registry table
CREATE TABLE IF NOT EXISTS public.api_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name VARCHAR(100) NOT NULL,
  api_version VARCHAR(20) NOT NULL DEFAULT 'v1',
  http_method VARCHAR(10) NOT NULL DEFAULT 'GET',
  endpoint_path VARCHAR(255) NOT NULL,
  description TEXT,
  requires_auth BOOLEAN NOT NULL DEFAULT true,
  rate_limit_override INT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  category VARCHAR(50) DEFAULT 'master-data',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50),
  UNIQUE(http_method, endpoint_path)
);

ALTER TABLE public.api_registry ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_registry' AND policyname = 'Authenticated users can read api_registry') THEN
    CREATE POLICY "Authenticated users can read api_registry" ON public.api_registry FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_registry' AND policyname = 'Admins can manage api_registry') THEN
    CREATE POLICY "Admins can manage api_registry" ON public.api_registry FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));
  END IF;
END $$;

-- API Config Audit Logs
CREATE TABLE IF NOT EXISTS public.api_config_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR(50),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address VARCHAR(45),
  metadata JSONB
);

ALTER TABLE public.api_config_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_config_audit_logs' AND policyname = 'Authenticated users can read api_config_audit_logs') THEN
    CREATE POLICY "Authenticated users can read api_config_audit_logs" ON public.api_config_audit_logs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_config_audit_logs' AND policyname = 'Admins can insert api_config_audit_logs') THEN
    CREATE POLICY "Admins can insert api_config_audit_logs" ON public.api_config_audit_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'Admin'));
  END IF;
END $$;

-- Rate Limit Policies
CREATE TABLE IF NOT EXISTS public.api_rate_limit_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name VARCHAR(100) NOT NULL,
  description TEXT,
  requests_per_minute INT NOT NULL DEFAULT 60,
  requests_per_hour INT,
  requests_per_day INT,
  burst_limit INT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by VARCHAR(50)
);

ALTER TABLE public.api_rate_limit_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_rate_limit_policies' AND policyname = 'Authenticated users can read api_rate_limit_policies') THEN
    CREATE POLICY "Authenticated users can read api_rate_limit_policies" ON public.api_rate_limit_policies FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_rate_limit_policies' AND policyname = 'Admins can manage api_rate_limit_policies') THEN
    CREATE POLICY "Admins can manage api_rate_limit_policies" ON public.api_rate_limit_policies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));
  END IF;
END $$;

-- API Key Scope Assignments
CREATE TABLE IF NOT EXISTS public.api_key_scope_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES public.public_api_keys(id) ON DELETE CASCADE,
  api_registry_id UUID NOT NULL REFERENCES public.api_registry(id) ON DELETE CASCADE,
  is_allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(50),
  UNIQUE(api_key_id, api_registry_id)
);

ALTER TABLE public.api_key_scope_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_key_scope_assignments' AND policyname = 'Authenticated users can read api_key_scope_assignments') THEN
    CREATE POLICY "Authenticated users can read api_key_scope_assignments" ON public.api_key_scope_assignments FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_key_scope_assignments' AND policyname = 'Admins can manage api_key_scope_assignments') THEN
    CREATE POLICY "Admins can manage api_key_scope_assignments" ON public.api_key_scope_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'Admin')) WITH CHECK (public.has_role(auth.uid(), 'Admin'));
  END IF;
END $$;

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_api_registry_enabled ON public.api_registry(is_enabled);
CREATE INDEX IF NOT EXISTS idx_api_registry_path ON public.api_registry(endpoint_path);
CREATE INDEX IF NOT EXISTS idx_api_config_audit_entity ON public.api_config_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_api_config_audit_changed_at ON public.api_config_audit_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_access_logs_endpoint ON public.public_api_access_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_access_logs_key_id ON public.public_api_access_logs(api_key_id);

-- Seed api_registry (only if empty)
INSERT INTO public.api_registry (api_name, api_version, http_method, endpoint_path, description, requires_auth, category, sort_order)
SELECT * FROM (VALUES
  ('Health Check', 'v1', 'GET', '/api/v1/health', 'API health and availability check', false, 'system', 0),
  ('Countries', 'v1', 'GET', '/api/v1/countries', 'List of all countries', true, 'master-data', 1),
  ('Districts', 'v1', 'GET', '/api/v1/districts', 'List of all districts', true, 'master-data', 2),
  ('Postal Districts', 'v1', 'GET', '/api/v1/postal-districts', 'List of all postal districts', true, 'master-data', 3),
  ('Occupations', 'v1', 'GET', '/api/v1/occupations', 'List of all occupations', true, 'master-data', 4),
  ('Industries', 'v1', 'GET', '/api/v1/industries', 'List of all industries', true, 'master-data', 5),
  ('Sectors', 'v1', 'GET', '/api/v1/sectors', 'List of all sectors', true, 'master-data', 6),
  ('Relations', 'v1', 'GET', '/api/v1/relations', 'List of all relations', true, 'master-data', 7),
  ('Dependent Relations', 'v1', 'GET', '/api/v1/dependent-relations', 'List of all dependent relations', true, 'master-data', 8),
  ('Activities', 'v1', 'GET', '/api/v1/activities', 'List of all activities', true, 'master-data', 9),
  ('Eye Colors', 'v1', 'GET', '/api/v1/eye-colors', 'List of all eye colors', true, 'master-data', 10),
  ('Offices', 'v1', 'GET', '/api/v1/offices', 'List of all offices', true, 'master-data', 11),
  ('Office Departments', 'v1', 'GET', '/api/v1/office-departments', 'List of all office departments', true, 'master-data', 12),
  ('Inspectors', 'v1', 'GET', '/api/v1/inspectors', 'List of all inspectors', true, 'master-data', 13),
  ('Legal Statuses', 'v1', 'GET', '/api/v1/legal-statuses', 'List of all legal statuses', true, 'master-data', 14),
  ('C3 Statuses', 'v1', 'GET', '/api/v1/c3-statuses', 'List of all C3 statuses', true, 'master-data', 15),
  ('SSC Rates', 'v1', 'GET', '/api/v1/ssc-rates', 'Social security contribution rates', true, 'master-data', 16),
  ('Levy Slabs', 'v1', 'GET', '/api/v1/levy-slabs', 'Levy slab configurations', true, 'master-data', 17),
  ('Levy Slab Details', 'v1', 'GET', '/api/v1/levy-slab-details', 'Levy slab detail breakdowns', true, 'master-data', 18),
  ('Self-Employment Rates', 'v1', 'GET', '/api/v1/self-emp-rates', 'Self-employment contribution rates', true, 'master-data', 19),
  ('Voluntary Contribution Rates', 'v1', 'GET', '/api/v1/vc-rates', 'Voluntary contribution rates', true, 'master-data', 20),
  ('Penalties', 'v1', 'GET', '/api/v1/penalties', 'Penalty configurations', true, 'master-data', 21),
  ('Deduction Tax Headers', 'v1', 'GET', '/api/v1/deduction-tax-headers', 'Deduction tax table headers', true, 'master-data', 22),
  ('Deduction Tax Details', 'v1', 'GET', '/api/v1/deduction-tax-details', 'Deduction tax table details', true, 'master-data', 23)
) AS v(api_name, api_version, http_method, endpoint_path, description, requires_auth, category, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.api_registry LIMIT 1);

-- Seed default rate limit policies (only if empty)
INSERT INTO public.api_rate_limit_policies (policy_name, description, requests_per_minute, requests_per_hour, requests_per_day, is_default, created_by)
SELECT * FROM (VALUES
  ('Default', 'Default rate limit policy for all API keys', 60, 3000, 50000, true, 'SYSTEM'),
  ('High Volume', 'For trusted partners with high traffic needs', 200, 10000, 200000, false, 'SYSTEM'),
  ('Low Volume', 'For development and testing purposes', 20, 500, 5000, false, 'SYSTEM')
) AS v(policy_name, description, requests_per_minute, requests_per_hour, requests_per_day, is_default, created_by)
WHERE NOT EXISTS (SELECT 1 FROM public.api_rate_limit_policies LIMIT 1);
