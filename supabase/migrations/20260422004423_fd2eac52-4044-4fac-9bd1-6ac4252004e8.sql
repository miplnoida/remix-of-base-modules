
-- Phase 2: Suites for SSC Compliance API Test Console

CREATE TABLE IF NOT EXISTS public.api_test_suites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'smoke',
  stop_on_failure boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  tags text[],
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_test_suite_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id uuid NOT NULL REFERENCES public.api_test_suites(id) ON DELETE CASCADE,
  saved_case_id uuid NOT NULL REFERENCES public.api_test_saved_cases(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  override_expected_status integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (suite_id, saved_case_id)
);

CREATE TABLE IF NOT EXISTS public.api_test_suite_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id uuid NOT NULL REFERENCES public.api_test_suites(id) ON DELETE CASCADE,
  environment_id uuid REFERENCES public.api_test_environments(id) ON DELETE SET NULL,
  total_cases integer NOT NULL DEFAULT 0,
  passed integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  errored integer NOT NULL DEFAULT 0,
  duration_ms integer,
  triggered_by uuid,
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

-- Link executions to suite runs (best-effort tracking)
ALTER TABLE public.api_test_executions
  ADD COLUMN IF NOT EXISTS suite_run_id uuid REFERENCES public.api_test_suite_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_api_test_suite_cases_suite ON public.api_test_suite_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_api_test_suite_runs_suite ON public.api_test_suite_runs(suite_id);
CREATE INDEX IF NOT EXISTS idx_api_test_executions_suite_run ON public.api_test_executions(suite_run_id);

-- Per project policy: no RLS, role-based security at the application layer.
ALTER TABLE public.api_test_suites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_test_suite_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_test_suite_runs DISABLE ROW LEVEL SECURITY;
