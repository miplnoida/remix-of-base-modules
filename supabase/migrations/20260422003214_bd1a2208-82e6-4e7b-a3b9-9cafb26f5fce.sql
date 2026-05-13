-- ============================================================================
-- API Test Console schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_test_environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  env_key varchar(20) NOT NULL UNIQUE,
  label varchar(50) NOT NULL,
  description text,
  base_url text NOT NULL,
  edge_functions_url text NOT NULL,
  color_hex varchar(7) DEFAULT '#1e3a8a',
  default_api_key_id uuid REFERENCES public.public_api_keys(id) ON DELETE SET NULL,
  destructive_allowed boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.api_test_saved_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(150) NOT NULL,
  description text,
  category varchar(50) NOT NULL DEFAULT 'compliance',
  http_method varchar(10) NOT NULL DEFAULT 'GET',
  endpoint_path text NOT NULL,
  requires_auth boolean NOT NULL DEFAULT true,
  requires_api_key boolean NOT NULL DEFAULT true,
  default_headers jsonb DEFAULT '{}'::jsonb,
  default_query_params jsonb DEFAULT '{}'::jsonb,
  default_body jsonb,
  expected_status integer DEFAULT 200,
  expected_response_shape jsonb,
  tags text[] DEFAULT '{}',
  is_destructive boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  owner_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.api_test_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_case_id uuid REFERENCES public.api_test_saved_cases(id) ON DELETE SET NULL,
  environment_id uuid REFERENCES public.api_test_environments(id) ON DELETE SET NULL,
  api_key_id uuid REFERENCES public.public_api_keys(id) ON DELETE SET NULL,
  test_name varchar(200),
  http_method varchar(10) NOT NULL,
  full_url text NOT NULL,
  request_headers jsonb,
  request_body jsonb,
  response_status integer,
  response_headers jsonb,
  response_body jsonb,
  duration_ms integer,
  result varchar(20) NOT NULL DEFAULT 'pending',  -- pending|pass|fail|warning|error
  failure_reason text,
  expected_status integer,
  notes text,
  executed_at timestamptz NOT NULL DEFAULT now(),
  executed_by uuid
);

CREATE INDEX IF NOT EXISTS idx_atc_executions_env ON public.api_test_executions(environment_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_atc_executions_case ON public.api_test_executions(saved_case_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_atc_executions_result ON public.api_test_executions(result, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_atc_saved_cases_category ON public.api_test_saved_cases(category, is_active);

CREATE TRIGGER trg_atc_envs_updated BEFORE UPDATE ON public.api_test_environments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_atc_cases_updated BEFORE UPDATE ON public.api_test_saved_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed environments
INSERT INTO public.api_test_environments (env_key, label, description, base_url, edge_functions_url, color_hex, destructive_allowed, sort_order)
VALUES
  ('test', 'Test',
   'SEED- Lovable Cloud Test environment. Safe for destructive runs.',
   'https://xynceskeiiisiefqlgxo.supabase.co',
   'https://xynceskeiiisiefqlgxo.supabase.co/functions/v1',
   '#0f766e', true, 1),
  ('live', 'Live',
   'SEED- Production environment. Destructive operations disabled.',
   'https://xynceskeiiisiefqlgxo.supabase.co',
   'https://xynceskeiiisiefqlgxo.supabase.co/functions/v1',
   '#9f1239', false, 2)
ON CONFLICT (env_key) DO NOTHING;

-- Seed starter test cases
INSERT INTO public.api_test_saved_cases (name, description, category, http_method, endpoint_path, requires_auth, requires_api_key, default_body, expected_status, tags)
VALUES
  ('SEED- Auth Login (Happy Path)',
   'Officer login with valid email + password + API key.',
   'auth', 'POST', '/compliance-mobile-auth/login',
   false, true,
   '{"email":"admin@secureserve.gov","password":"Admin@123","device_id":"console-test-device","device_name":"API Test Console","platform":"web","app_version":"1.0.0"}'::jsonb,
   200, ARRAY['smoke','auth','happy-path']),
  ('SEED- Auth Login (Missing API Key)',
   'Verify request is rejected with 401 when X-API-Key header is absent.',
   'auth', 'POST', '/compliance-mobile-auth/login',
   false, false,
   '{"email":"admin@secureserve.gov","password":"Admin@123","device_id":"console-test-device","device_name":"API Test Console","platform":"web","app_version":"1.0.0"}'::jsonb,
   401, ARRAY['negative','security']),
  ('SEED- Officer Profile (/me)',
   'Fetch current officer profile. Requires bearer token + API key.',
   'compliance', 'GET', '/compliance-mobile-api/api/v1/compliance/me',
   true, true, NULL, 200, ARRAY['smoke','officer']),
  ('SEED- My Inspections',
   'List inspections assigned to the logged-in officer.',
   'compliance', 'GET', '/compliance-mobile-api/api/v1/compliance/my/inspections',
   true, true, NULL, 200, ARRAY['smoke','inspections']),
  ('SEED- My Cases',
   'List compliance cases assigned to the logged-in officer.',
   'compliance', 'GET', '/compliance-mobile-api/api/v1/compliance/my/cases',
   true, true, NULL, 200, ARRAY['smoke','cases']),
  ('SEED- Employer 360',
   'Fetch employer 360 view by registration number. Replace {regno} in path.',
   'compliance', 'GET', '/compliance-mobile-api/api/v1/compliance/employers/{regno}/360',
   true, true, NULL, 200, ARRAY['employer','360'])
ON CONFLICT DO NOTHING;