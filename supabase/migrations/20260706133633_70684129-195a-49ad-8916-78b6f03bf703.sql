
-- =====================================================================
-- SSB relational-policy refactor: replace JSON arrays on active policy
-- tables with proper child tables. Preserve existing data via backfill.
-- Per project rule .workspace: RLS intentionally NOT enabled — access
-- is enforced via role-based security in application services.
-- =====================================================================

-- 1. ssb_address_policy_field  (mandatory + optional address components)
CREATE TABLE public.ssb_address_policy_field (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id     uuid NOT NULL REFERENCES public.ssb_address_policy(id) ON DELETE CASCADE,
  field_code    text NOT NULL,
  field_kind    text NOT NULL CHECK (field_kind IN ('mandatory','optional')),
  display_order int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_id, field_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssb_address_policy_field TO authenticated, anon;
GRANT ALL ON public.ssb_address_policy_field TO service_role;
CREATE INDEX ix_ssb_apf_policy ON public.ssb_address_policy_field(policy_id);

-- 2. ssb_address_policy_admin_level  (which admin levels apply, ordered)
CREATE TABLE public.ssb_address_policy_admin_level (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id        uuid NOT NULL REFERENCES public.ssb_address_policy(id) ON DELETE CASCADE,
  admin_level_code text NOT NULL,
  display_order    int  NOT NULL DEFAULT 0,
  is_required      boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_id, admin_level_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssb_address_policy_admin_level TO authenticated, anon;
GRANT ALL ON public.ssb_address_policy_admin_level TO service_role;
CREATE INDEX ix_ssb_apal_policy ON public.ssb_address_policy_admin_level(policy_id);

-- 3. ssb_contribution_calendar_weekend_day
CREATE TABLE public.ssb_contribution_calendar_weekend_day (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id  uuid NOT NULL REFERENCES public.ssb_contribution_calendar_policy(id) ON DELETE CASCADE,
  weekday    int  NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ssb_contribution_calendar_weekend_day TO authenticated, anon;
GRANT ALL ON public.ssb_contribution_calendar_weekend_day TO service_role;
CREATE INDEX ix_ssb_ccwd_policy ON public.ssb_contribution_calendar_weekend_day(policy_id);

-- 4. Backfill from existing JSON columns
INSERT INTO public.ssb_address_policy_field (policy_id, field_code, field_kind, display_order)
SELECT p.id, elem.value #>> '{}', 'mandatory', elem.ord
FROM public.ssb_address_policy p,
     LATERAL jsonb_array_elements(COALESCE(p.mandatory_fields, '[]'::jsonb)) WITH ORDINALITY AS elem(value, ord)
ON CONFLICT (policy_id, field_code) DO NOTHING;

INSERT INTO public.ssb_address_policy_field (policy_id, field_code, field_kind, display_order)
SELECT p.id, elem.value #>> '{}', 'optional', elem.ord + 100
FROM public.ssb_address_policy p,
     LATERAL jsonb_array_elements(COALESCE(p.optional_fields, '[]'::jsonb)) WITH ORDINALITY AS elem(value, ord)
ON CONFLICT (policy_id, field_code) DO NOTHING;

INSERT INTO public.ssb_address_policy_admin_level (policy_id, admin_level_code, display_order, is_required)
SELECT p.id, elem.value #>> '{}', elem.ord, true
FROM public.ssb_address_policy p,
     LATERAL jsonb_array_elements(COALESCE(p.admin_level_codes, '[]'::jsonb)) WITH ORDINALITY AS elem(value, ord)
ON CONFLICT (policy_id, admin_level_code) DO NOTHING;

INSERT INTO public.ssb_contribution_calendar_weekend_day (policy_id, weekday)
SELECT p.id, (elem.value)::int
FROM public.ssb_contribution_calendar_policy p,
     LATERAL jsonb_array_elements(COALESCE(p.weekend_days, '[0,6]'::jsonb)) AS elem(value)
ON CONFLICT (policy_id, weekday) DO NOTHING;

-- 5. Drop JSON columns now that data is preserved relationally
ALTER TABLE public.ssb_address_policy
  DROP COLUMN IF EXISTS mandatory_fields,
  DROP COLUMN IF EXISTS optional_fields,
  DROP COLUMN IF EXISTS admin_level_codes;

ALTER TABLE public.ssb_contribution_calendar_policy
  DROP COLUMN IF EXISTS weekend_days;

-- 6. updated_at triggers on new tables
CREATE TRIGGER trg_ssb_apf_updated
  BEFORE UPDATE ON public.ssb_address_policy_field
  FOR EACH ROW EXECUTE FUNCTION public.ssb_set_updated_at();

CREATE TRIGGER trg_ssb_apal_updated
  BEFORE UPDATE ON public.ssb_address_policy_admin_level
  FOR EACH ROW EXECUTE FUNCTION public.ssb_set_updated_at();
