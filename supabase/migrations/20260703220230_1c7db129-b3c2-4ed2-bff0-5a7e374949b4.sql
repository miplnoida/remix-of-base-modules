
-- Extensions needed for scheduled report dispatch
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Shared updated_at trigger (idempotent)
CREATE OR REPLACE FUNCTION public.lg_reporting_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- 1. Saved reports
-- =========================================================
CREATE TABLE IF NOT EXISTS public.lg_saved_report (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_code TEXT NOT NULL,
  report_name TEXT NOT NULL,
  owner_user_id UUID NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','shared')),
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  columns_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  grouping_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_saved_report TO authenticated;
GRANT ALL ON public.lg_saved_report TO service_role;

CREATE INDEX IF NOT EXISTS idx_lg_saved_report_owner ON public.lg_saved_report(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_lg_saved_report_code ON public.lg_saved_report(report_code);
CREATE INDEX IF NOT EXISTS idx_lg_saved_report_visibility ON public.lg_saved_report(visibility);

DROP TRIGGER IF EXISTS trg_lg_saved_report_updated ON public.lg_saved_report;
CREATE TRIGGER trg_lg_saved_report_updated
BEFORE UPDATE ON public.lg_saved_report
FOR EACH ROW EXECUTE FUNCTION public.lg_reporting_touch_updated_at();

-- =========================================================
-- 2. Scheduled reports
-- =========================================================
CREATE TABLE IF NOT EXISTS public.lg_scheduled_report (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_code TEXT NOT NULL,
  schedule_name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','quarterly')),
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  format TEXT NOT NULL DEFAULT 'xlsx' CHECK (format IN ('xlsx','csv','pdf')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_run_error TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_scheduled_report TO authenticated;
GRANT ALL ON public.lg_scheduled_report TO service_role;

CREATE INDEX IF NOT EXISTS idx_lg_scheduled_report_active ON public.lg_scheduled_report(is_active);
CREATE INDEX IF NOT EXISTS idx_lg_scheduled_report_next_run ON public.lg_scheduled_report(next_run_at) WHERE is_active = true;

DROP TRIGGER IF EXISTS trg_lg_scheduled_report_updated ON public.lg_scheduled_report;
CREATE TRIGGER trg_lg_scheduled_report_updated
BEFORE UPDATE ON public.lg_scheduled_report
FOR EACH ROW EXECUTE FUNCTION public.lg_reporting_touch_updated_at();

-- =========================================================
-- 3. Report export audit (append-only)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.lg_report_export_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_code TEXT NOT NULL,
  report_name TEXT NOT NULL,
  exported_by UUID NOT NULL,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  format TEXT NOT NULL,
  filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  row_count INTEGER NOT NULL DEFAULT 0,
  file_name TEXT NOT NULL,
  delivery_channel TEXT NOT NULL DEFAULT 'download' CHECK (delivery_channel IN ('download','email','scheduled'))
);

GRANT SELECT, INSERT ON public.lg_report_export_audit TO authenticated;
GRANT ALL ON public.lg_report_export_audit TO service_role;

CREATE INDEX IF NOT EXISTS idx_lg_report_export_audit_code ON public.lg_report_export_audit(report_code);
CREATE INDEX IF NOT EXISTS idx_lg_report_export_audit_exporter ON public.lg_report_export_audit(exported_by);
CREATE INDEX IF NOT EXISTS idx_lg_report_export_audit_at ON public.lg_report_export_audit(exported_at DESC);
