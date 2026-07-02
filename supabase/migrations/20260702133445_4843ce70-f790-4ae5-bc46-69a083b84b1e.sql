
-- =========================================================================
-- Enterprise Data Explorer Framework tables
-- Follows project NO-RLS policy: RLS is disabled in public schema
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.explorer_saved_view (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_key text NOT NULL,
  name text NOT NULL,
  description text,
  scope text NOT NULL DEFAULT 'personal', -- personal | role | global
  owner_user_id uuid,
  owner_user_code varchar(50),
  role_code text,
  view_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(50),
  updated_by varchar(50)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.explorer_saved_view TO authenticated;
GRANT SELECT ON public.explorer_saved_view TO anon;
GRANT ALL ON public.explorer_saved_view TO service_role;

CREATE INDEX IF NOT EXISTS explorer_saved_view_dataset_idx ON public.explorer_saved_view(dataset_key);
CREATE INDEX IF NOT EXISTS explorer_saved_view_owner_idx ON public.explorer_saved_view(owner_user_id);
CREATE INDEX IF NOT EXISTS explorer_saved_view_scope_idx ON public.explorer_saved_view(scope, dataset_key);

-- =========================================================================
CREATE TABLE IF NOT EXISTS public.explorer_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_key text NOT NULL,
  saved_view_id uuid REFERENCES public.explorer_saved_view(id) ON DELETE SET NULL,
  name text NOT NULL,
  view_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  cadence text NOT NULL DEFAULT 'weekly', -- daily | weekly | monthly
  day_of_week smallint, -- 0-6 (Sunday=0)
  day_of_month smallint, -- 1-31
  hour_utc smallint NOT NULL DEFAULT 6,
  format text NOT NULL DEFAULT 'excel', -- excel | pdf | csv | html
  recipients text[] NOT NULL DEFAULT '{}'::text[],
  subject text,
  message text,
  active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  last_run_status text,
  last_run_error text,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(50),
  updated_by varchar(50)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.explorer_schedule TO authenticated;
GRANT ALL ON public.explorer_schedule TO service_role;

CREATE INDEX IF NOT EXISTS explorer_schedule_dataset_idx ON public.explorer_schedule(dataset_key);
CREATE INDEX IF NOT EXISTS explorer_schedule_next_run_idx ON public.explorer_schedule(next_run_at) WHERE active = true;

-- =========================================================================
CREATE TABLE IF NOT EXISTS public.explorer_ai_insight_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_key text NOT NULL,
  filter_hash text NOT NULL,
  insight jsonb NOT NULL,
  row_count integer,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.explorer_ai_insight_cache TO authenticated;
GRANT ALL ON public.explorer_ai_insight_cache TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS explorer_ai_insight_cache_key_idx ON public.explorer_ai_insight_cache(dataset_key, filter_hash);
CREATE INDEX IF NOT EXISTS explorer_ai_insight_cache_expires_idx ON public.explorer_ai_insight_cache(expires_at);

-- =========================================================================
-- updated_at triggers
CREATE OR REPLACE FUNCTION public.explorer_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS explorer_saved_view_touch ON public.explorer_saved_view;
CREATE TRIGGER explorer_saved_view_touch
  BEFORE UPDATE ON public.explorer_saved_view
  FOR EACH ROW EXECUTE FUNCTION public.explorer_touch_updated_at();

DROP TRIGGER IF EXISTS explorer_schedule_touch ON public.explorer_schedule;
CREATE TRIGGER explorer_schedule_touch
  BEFORE UPDATE ON public.explorer_schedule
  FOR EACH ROW EXECUTE FUNCTION public.explorer_touch_updated_at();
