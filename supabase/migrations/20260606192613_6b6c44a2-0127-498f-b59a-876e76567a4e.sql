
CREATE TABLE IF NOT EXISTS public.external_portal_feature_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  feature_name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  affected_personas text[] NOT NULL DEFAULT '{}',
  affected_menus text[] NOT NULL DEFAULT '{}',
  last_updated_by text,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.external_portal_feature_config TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.external_portal_feature_config TO authenticated;
GRANT ALL ON public.external_portal_feature_config TO service_role;

-- RLS intentionally disabled per project convention (role-based security only).

-- Seed default feature toggles (idempotent)
INSERT INTO public.external_portal_feature_config (feature_key, feature_name, description, enabled, affected_personas, affected_menus) VALUES
  ('peopleIMangeEnabled', 'People I Manage', 'Master toggle for the People-I-Manage area (managed claims, managed benefits, guardian dashboard).', true, ARRAY['GUARDIAN','PAYEE','REPRESENTATIVE'], ARRAY['People I Manage','Managed Claims','Managed Benefits']),
  ('guardianPayeeEnabled', 'Guardian / Payee Management', 'Allow guardian / payee functions including filing for dependants and receiving payments on their behalf.', true, ARRAY['GUARDIAN','PAYEE'], ARRAY['People I Manage']),
  ('representativeAccessEnabled', 'Representative Access', 'Allow authorised representatives (lawyers, agents) to access claimant data with consent.', true, ARRAY['REPRESENTATIVE'], ARRAY['People I Manage']),
  ('beneficiarySelfServiceEnabled', 'Beneficiary Self-Service', 'Allow beneficiaries (survivors, funeral applicants) to use the portal.', true, ARRAY['BENEFICIARY','CLAIMANT'], ARRAY['Benefits','Claims']),
  ('contributionHistoryEnabled', 'Contribution History', 'Show contribution history to verified insured persons.', true, ARRAY['INSURED_PERSON'], ARRAY['Contribution History','My Social Security']),
  ('employmentHistoryEnabled', 'Employment History', 'Show employer / employment history to verified insured persons.', true, ARRAY['INSURED_PERSON'], ARRAY['Employment History']),
  ('paymentHistoryEnabled', 'Payment History', 'Show benefit payment history to recipients.', true, ARRAY['INSURED_PERSON','BENEFICIARY','PENSIONER','PAYEE'], ARRAY['Payments']),
  ('lifeCertificateEnabled', 'Life Certificates', 'Annual proof-of-life submission for pensioners.', true, ARRAY['PENSIONER'], ARRAY['Life Certificates','Compliance']),
  ('schoolCertificateEnabled', 'School Certificates', 'Enrolment certificates for survivor / orphan beneficiaries.', true, ARRAY['BENEFICIARY','GUARDIAN'], ARRAY['School Certificates','Compliance']),
  ('bankUpdateEnabled', 'Bank Update', 'Self-service EFT / bank-account update.', true, ARRAY['INSURED_PERSON','BENEFICIARY','PENSIONER','PAYEE'], ARRAY['Bank Details']),
  ('appealsEnabled', 'Appeals / Reconsideration', 'Submit appeals and reconsiderations of decisions.', true, ARRAY['INSURED_PERSON','CLAIMANT','BENEFICIARY'], ARRAY['Appeals']),
  ('eligibilityEstimatorEnabled', 'Eligibility Estimator', 'Run dry-run eligibility simulations without creating a claim.', true, ARRAY['INSURED_PERSON','CLAIMANT'], ARRAY['Eligibility Estimator'])
ON CONFLICT (feature_key) DO NOTHING;
