
-- EPIC-09C — Enterprise BI backing tables
-- Project rule: no RLS on public tables (role-based security via services).

-- Part 8: Shared dashboards
CREATE TABLE IF NOT EXISTS public.lg_shared_dashboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_user_id UUID NOT NULL,
  scope TEXT NOT NULL DEFAULT 'private' CHECK (scope IN ('private','team','department','organization','template')),
  team_code TEXT,
  department_code TEXT,
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  widgets_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  access_mode TEXT NOT NULL DEFAULT 'read_only' CHECK (access_mode IN ('read_only','editable')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_template BOOLEAN NOT NULL DEFAULT false,
  cloned_from UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lg_shared_dashboard_scope ON public.lg_shared_dashboard(scope);
CREATE INDEX IF NOT EXISTS idx_lg_shared_dashboard_owner ON public.lg_shared_dashboard(owner_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_shared_dashboard TO authenticated;
GRANT ALL ON public.lg_shared_dashboard TO service_role;
DROP TRIGGER IF EXISTS trg_lg_shared_dashboard_updated ON public.lg_shared_dashboard;
CREATE TRIGGER trg_lg_shared_dashboard_updated BEFORE UPDATE ON public.lg_shared_dashboard
  FOR EACH ROW EXECUTE FUNCTION public.lg_reporting_touch_updated_at();

-- Part 9: Report certification
CREATE TABLE IF NOT EXISTS public.lg_report_certification (
  report_code TEXT NOT NULL PRIMARY KEY,
  certification_status TEXT NOT NULL DEFAULT 'draft' CHECK (certification_status IN ('certified','draft','deprecated')),
  business_owner TEXT,
  financial_source TEXT,
  data_freshness_minutes INTEGER,
  last_validated_at TIMESTAMPTZ,
  last_validated_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_report_certification TO authenticated;
GRANT ALL ON public.lg_report_certification TO service_role;
DROP TRIGGER IF EXISTS trg_lg_report_certification_updated ON public.lg_report_certification;
CREATE TRIGGER trg_lg_report_certification_updated BEFORE UPDATE ON public.lg_report_certification
  FOR EACH ROW EXECUTE FUNCTION public.lg_reporting_touch_updated_at();

-- Part 11: Report performance metrics
CREATE TABLE IF NOT EXISTS public.lg_report_performance_metric (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_code TEXT NOT NULL,
  user_id UUID,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  row_count INTEGER NOT NULL DEFAULT 0,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lg_report_perf_code ON public.lg_report_performance_metric(report_code);
CREATE INDEX IF NOT EXISTS idx_lg_report_perf_at ON public.lg_report_performance_metric(captured_at DESC);
GRANT SELECT, INSERT ON public.lg_report_performance_metric TO authenticated;
GRANT ALL ON public.lg_report_performance_metric TO service_role;

-- Part 12: Enterprise report/dashboard audit
CREATE TABLE IF NOT EXISTS public.lg_report_audit_event (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'dashboard_view','report_open','export','print','email','schedule_create','schedule_delete',
    'dashboard_share','dashboard_modify','filter_change','drilldown','certification_change'
  )),
  report_code TEXT,
  dashboard_id UUID,
  actor_user_id UUID NOT NULL,
  target_user_id UUID,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lg_report_audit_type ON public.lg_report_audit_event(event_type);
CREATE INDEX IF NOT EXISTS idx_lg_report_audit_at ON public.lg_report_audit_event(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_lg_report_audit_actor ON public.lg_report_audit_event(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_lg_report_audit_code ON public.lg_report_audit_event(report_code);
GRANT SELECT, INSERT ON public.lg_report_audit_event TO authenticated;
GRANT ALL ON public.lg_report_audit_event TO service_role;

-- Part 7: Extend scheduled report with advanced cadence
ALTER TABLE public.lg_scheduled_report
  ADD COLUMN IF NOT EXISTS days_of_week JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS days_of_month JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS skip_holidays BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS business_calendar_code TEXT,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_max INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS retry_backoff_minutes INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS cloned_from UUID;

-- Relax frequency constraint to include annual
ALTER TABLE public.lg_scheduled_report DROP CONSTRAINT IF EXISTS lg_scheduled_report_frequency_check;
ALTER TABLE public.lg_scheduled_report ADD CONSTRAINT lg_scheduled_report_frequency_check
  CHECK (frequency IN ('daily','weekly','monthly','quarterly','annual'));
