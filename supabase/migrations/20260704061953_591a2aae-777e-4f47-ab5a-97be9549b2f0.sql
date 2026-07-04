
ALTER TABLE public.lg_scheduled_report
  ADD COLUMN IF NOT EXISTS subject_template TEXT,
  ADD COLUMN IF NOT EXISTS recipient_group_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attach_data BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS execution_history JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.lg_report_recipient_group (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name TEXT NOT NULL,
  description TEXT,
  emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_report_recipient_group TO authenticated;
GRANT ALL ON public.lg_report_recipient_group TO service_role;

DROP TRIGGER IF EXISTS trg_lg_report_recipient_group_updated ON public.lg_report_recipient_group;
CREATE TRIGGER trg_lg_report_recipient_group_updated
BEFORE UPDATE ON public.lg_report_recipient_group
FOR EACH ROW EXECUTE FUNCTION public.lg_reporting_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.lg_dashboard_preference (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  kpi_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  chart_layout TEXT NOT NULL DEFAULT 'grid',
  default_report_code TEXT,
  default_date_range TEXT NOT NULL DEFAULT 'last30d',
  favourites JSONB NOT NULL DEFAULT '[]'::jsonb,
  pinned JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lg_dashboard_preference TO authenticated;
GRANT ALL ON public.lg_dashboard_preference TO service_role;

DROP TRIGGER IF EXISTS trg_lg_dashboard_preference_updated ON public.lg_dashboard_preference;
CREATE TRIGGER trg_lg_dashboard_preference_updated
BEFORE UPDATE ON public.lg_dashboard_preference
FOR EACH ROW EXECUTE FUNCTION public.lg_reporting_touch_updated_at();
