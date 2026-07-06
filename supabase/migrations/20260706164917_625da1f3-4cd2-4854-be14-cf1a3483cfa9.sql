
CREATE TABLE IF NOT EXISTS public.ssb_process_catalogue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_code text NOT NULL UNIQUE,
  process_name text NOT NULL,
  process_group text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ssb_process_catalogue TO anon, authenticated;
GRANT ALL ON public.ssb_process_catalogue TO service_role;

INSERT INTO public.ssb_process_catalogue (process_code, process_name, process_group, sort_order) VALUES
  ('MEMBER_REGISTRATION',        'Member Registration',         'REGISTRATION', 10),
  ('EMPLOYER_REGISTRATION',      'Employer Registration',       'REGISTRATION', 20),
  ('CONTRIBUTION_COLLECTION',    'Contribution Collection',     'CONTRIBUTION', 30),
  ('BENEFIT_ADMINISTRATION',     'Benefit Administration',      'BENEFITS',     40),
  ('CLAIMS_PROCESSING',          'Claims Processing',           'CLAIMS',       50),
  ('PAYMENTS',                   'Payments',                    'PAYMENTS',     60),
  ('COMPLIANCE_CASE_MANAGEMENT', 'Compliance Case Management',  'COMPLIANCE',   70)
ON CONFLICT (process_code) DO NOTHING;
