
-- Extend lg_department_profile with SKN Legal Department identity fields
ALTER TABLE public.lg_department_profile
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS department_name  text,
  ADD COLUMN IF NOT EXISTS country_code     text,
  ADD COLUMN IF NOT EXISTS email            text,
  ADD COLUMN IF NOT EXISTS phone            text,
  ADD COLUMN IF NOT EXISTS address_line1    text,
  ADD COLUMN IF NOT EXISTS address_line2    text,
  ADD COLUMN IF NOT EXISTS city             text,
  ADD COLUMN IF NOT EXISTS state_region     text,
  ADD COLUMN IF NOT EXISTS postal_code      text,
  ADD COLUMN IF NOT EXISTS website          text,
  ADD COLUMN IF NOT EXISTS created_at       timestamptz NOT NULL DEFAULT now();

-- Seed a single SKN Legal Department row if none exists
INSERT INTO public.lg_department_profile (
  institution_name, department_name, country_code, email
)
SELECT
  'St. Christopher and Nevis Social Security Board',
  'Legal Department',
  'SKN',
  'legal@socialsecurity.kn'
WHERE NOT EXISTS (SELECT 1 FROM public.lg_department_profile);
