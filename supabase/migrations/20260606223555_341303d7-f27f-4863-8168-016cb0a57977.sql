
-- ============================================================================
-- 1. bn_product_amendment_policy
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bn_product_amendment_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_version_id uuid NOT NULL UNIQUE REFERENCES public.bn_product_version(id) ON DELETE CASCADE,
  allow_officer_amendments boolean NOT NULL DEFAULT true,
  allow_public_corrections boolean NOT NULL DEFAULT true,
  allow_participant_amendments boolean NOT NULL DEFAULT true,
  editable_until_status varchar(50) NOT NULL DEFAULT 'DECISION_PENDING',
  lock_after_eligibility boolean NOT NULL DEFAULT false,
  lock_after_calculation boolean NOT NULL DEFAULT false,
  lock_after_decision boolean NOT NULL DEFAULT true,
  lock_after_approval boolean NOT NULL DEFAULT true,
  lock_after_payment boolean NOT NULL DEFAULT true,
  requires_reason_for_amendment boolean NOT NULL DEFAULT true,
  requires_supervisor_approval_for_locked_changes boolean NOT NULL DEFAULT true,
  participant_details_editable_until varchar(50) NOT NULL DEFAULT 'DECISION_PENDING',
  benefit_facts_editable_until varchar(50) NOT NULL DEFAULT 'DECISION_PENDING',
  document_details_editable_until varchar(50) NOT NULL DEFAULT 'PAYMENT_PENDING',
  payment_details_editable_until varchar(50) NOT NULL DEFAULT 'PAYMENT_PENDING',
  calculation_inputs_editable_until varchar(50) NOT NULL DEFAULT 'CALCULATION_DONE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by varchar(50),
  updated_by varchar(50)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_product_amendment_policy TO authenticated;
GRANT ALL ON public.bn_product_amendment_policy TO service_role;

-- ============================================================================
-- 2. bn_claim_field_ownership
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bn_claim_field_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_version_id uuid NOT NULL REFERENCES public.bn_product_version(id) ON DELETE CASCADE,
  field_key varchar(100) NOT NULL,
  field_label varchar(200),
  field_area varchar(50) NOT NULL DEFAULT 'BENEFIT_FACTS',
  field_owner varchar(40) NOT NULL DEFAULT 'STAFF_REVIEW',
  editable_channels text[] NOT NULL DEFAULT ARRAY['STAFF_OFFLINE','ASSISTED_COUNTER','BACK_OFFICE_ENTRY']::text[],
  editable_until_status varchar(50) NOT NULL DEFAULT 'DECISION_PENDING',
  requires_reason boolean NOT NULL DEFAULT false,
  requires_supervisor_approval boolean NOT NULL DEFAULT false,
  affects_eligibility boolean NOT NULL DEFAULT false,
  affects_calculation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_version_id, field_key),
  CHECK (field_owner IN ('APPLICANT_SUBMITTED','STAFF_REVIEW','EMPLOYER_SUBMITTED','DOCTOR_SUBMITTED','SYSTEM_DERIVED','DECISION_FIELD','PAYMENT_FIELD'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_claim_field_ownership TO authenticated;
GRANT ALL ON public.bn_claim_field_ownership TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_field_ownership_pv ON public.bn_claim_field_ownership(product_version_id);

-- ============================================================================
-- 3. bn_claim_amendment_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bn_claim_amendment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.bn_claim(id) ON DELETE CASCADE,
  field_key varchar(100) NOT NULL,
  field_area varchar(50),
  before_value jsonb,
  after_value jsonb,
  reason text,
  amended_by varchar(50) NOT NULL,
  amended_at timestamptz NOT NULL DEFAULT now(),
  source_channel varchar(30) NOT NULL,
  claim_status_at_change varchar(50),
  approval_status varchar(30) NOT NULL DEFAULT 'APPLIED',
  approved_by varchar(50),
  approved_at timestamptz,
  audit_trail_id uuid,
  CHECK (source_channel IN ('PUBLIC_ONLINE','STAFF_OFFLINE','ASSISTED_COUNTER','BACK_OFFICE_ENTRY','MIGRATED_LEGACY')),
  CHECK (approval_status IN ('APPLIED','PENDING_APPROVAL','APPROVED','REJECTED'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_claim_amendment_log TO authenticated;
GRANT ALL ON public.bn_claim_amendment_log TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_amendment_log_claim ON public.bn_claim_amendment_log(claim_id, amended_at DESC);

-- ============================================================================
-- 4. bn_claim_correction_request + bn_claim_correction_field
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bn_claim_correction_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.bn_claim(id) ON DELETE CASCADE,
  requested_by varchar(50) NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  message text NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'PENDING',
  submitted_by varchar(50),
  submitted_at timestamptz,
  reviewed_by varchar(50),
  reviewed_at timestamptz,
  review_notes text,
  source_channel varchar(30) NOT NULL DEFAULT 'PUBLIC_ONLINE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status IN ('PENDING','SUBMITTED','ACCEPTED','REJECTED','CANCELLED'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_claim_correction_request TO authenticated;
GRANT ALL ON public.bn_claim_correction_request TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_correction_req_claim ON public.bn_claim_correction_request(claim_id, status);

CREATE TABLE IF NOT EXISTS public.bn_claim_correction_field (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.bn_claim_correction_request(id) ON DELETE CASCADE,
  field_key varchar(100) NOT NULL,
  field_label varchar(200),
  current_value jsonb,
  proposed_value jsonb,
  field_status varchar(30) NOT NULL DEFAULT 'PENDING',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (field_status IN ('PENDING','SUBMITTED','ACCEPTED','REJECTED'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bn_claim_correction_field TO authenticated;
GRANT ALL ON public.bn_claim_correction_field TO service_role;
CREATE INDEX IF NOT EXISTS idx_bn_correction_fld_req ON public.bn_claim_correction_field(request_id);

-- ============================================================================
-- 5. stale flags on bn_claim
-- ============================================================================
ALTER TABLE public.bn_claim
  ADD COLUMN IF NOT EXISTS eligibility_stale boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS calculation_stale boolean NOT NULL DEFAULT false;

-- ============================================================================
-- 6. atomic amendment RPC (audit-write-or-fail)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.bn_record_claim_amendment(
  p_claim_id uuid,
  p_field_key varchar,
  p_field_area varchar,
  p_before jsonb,
  p_after jsonb,
  p_reason text,
  p_user_code varchar,
  p_channel varchar,
  p_status_at_change varchar,
  p_approval_status varchar DEFAULT 'APPLIED',
  p_affects_eligibility boolean DEFAULT false,
  p_affects_calculation boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_audit_id uuid;
BEGIN
  IF p_user_code IS NULL OR p_user_code = '' THEN
    RAISE EXCEPTION 'amendment requires user_code';
  END IF;

  INSERT INTO public.system_audit_trail (
    entity_type, entity_id, action, severity, user_code, details, created_at
  ) VALUES (
    'bn_claim', p_claim_id::text, 'AMEND_CLAIM_FIELD', 'info', p_user_code,
    jsonb_build_object(
      'field_key', p_field_key,
      'field_area', p_field_area,
      'before', p_before,
      'after', p_after,
      'reason', p_reason,
      'channel', p_channel,
      'status_at_change', p_status_at_change,
      'approval_status', p_approval_status
    ),
    now()
  )
  RETURNING id INTO v_audit_id;

  INSERT INTO public.bn_claim_amendment_log (
    claim_id, field_key, field_area, before_value, after_value, reason,
    amended_by, source_channel, claim_status_at_change, approval_status, audit_trail_id
  ) VALUES (
    p_claim_id, p_field_key, p_field_area, p_before, p_after, p_reason,
    p_user_code, p_channel, p_status_at_change, p_approval_status, v_audit_id
  )
  RETURNING id INTO v_log_id;

  IF p_approval_status IN ('APPLIED','APPROVED') THEN
    UPDATE public.bn_claim
       SET eligibility_stale = CASE WHEN p_affects_eligibility THEN true ELSE eligibility_stale END,
           calculation_stale = CASE WHEN p_affects_calculation THEN true ELSE calculation_stale END
     WHERE id = p_claim_id;
  END IF;

  RETURN v_log_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.bn_record_claim_amendment(uuid, varchar, varchar, jsonb, jsonb, text, varchar, varchar, varchar, varchar, boolean, boolean) TO authenticated, service_role;

-- ============================================================================
-- 7. updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.bn_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_bn_amend_policy_touch ON public.bn_product_amendment_policy;
CREATE TRIGGER trg_bn_amend_policy_touch BEFORE UPDATE ON public.bn_product_amendment_policy
  FOR EACH ROW EXECUTE FUNCTION public.bn_touch_updated_at();

DROP TRIGGER IF EXISTS trg_bn_field_own_touch ON public.bn_claim_field_ownership;
CREATE TRIGGER trg_bn_field_own_touch BEFORE UPDATE ON public.bn_claim_field_ownership
  FOR EACH ROW EXECUTE FUNCTION public.bn_touch_updated_at();

DROP TRIGGER IF EXISTS trg_bn_corr_req_touch ON public.bn_claim_correction_request;
CREATE TRIGGER trg_bn_corr_req_touch BEFORE UPDATE ON public.bn_claim_correction_request
  FOR EACH ROW EXECUTE FUNCTION public.bn_touch_updated_at();

DROP TRIGGER IF EXISTS trg_bn_corr_fld_touch ON public.bn_claim_correction_field;
CREATE TRIGGER trg_bn_corr_fld_touch BEFORE UPDATE ON public.bn_claim_correction_field
  FOR EACH ROW EXECUTE FUNCTION public.bn_touch_updated_at();

-- ============================================================================
-- 8. Seed default amendment policy for every existing product version
-- ============================================================================
INSERT INTO public.bn_product_amendment_policy (product_version_id, created_by)
SELECT pv.id, 'SEED'
  FROM public.bn_product_version pv
 WHERE NOT EXISTS (
   SELECT 1 FROM public.bn_product_amendment_policy p WHERE p.product_version_id = pv.id
 );

-- Seed common field ownership rows for every product version (sickness/maternity facts etc.)
WITH defaults(field_key, field_label, field_area, field_owner, affects_eligibility, affects_calculation) AS (
  VALUES
    ('illness_start_date',     'Illness Start Date',     'BENEFIT_FACTS',  'APPLICANT_SUBMITTED', true,  true),
    ('illness_end_date',       'Illness End Date',       'BENEFIT_FACTS',  'APPLICANT_SUBMITTED', true,  true),
    ('incapacity_start_date',  'Incapacity Start Date',  'BENEFIT_FACTS',  'DOCTOR_SUBMITTED',    true,  true),
    ('incapacity_end_date',    'Incapacity End Date',    'BENEFIT_FACTS',  'DOCTOR_SUBMITTED',    true,  true),
    ('confinement_date',       'Confinement Date',       'BENEFIT_FACTS',  'APPLICANT_SUBMITTED', true,  true),
    ('expected_delivery_date', 'Expected Delivery Date', 'BENEFIT_FACTS',  'APPLICANT_SUBMITTED', true,  false),
    ('funeral_date',           'Funeral Date',           'BENEFIT_FACTS',  'APPLICANT_SUBMITTED', false, false),
    ('deceased_ssn',           'Deceased SSN',           'PARTICIPANTS',   'APPLICANT_SUBMITTED', true,  true),
    ('payment_method',         'Payment Method',         'PAYMENT',        'PAYMENT_FIELD',       false, false),
    ('bank_account_no',        'Bank Account No',        'PAYMENT',        'PAYMENT_FIELD',       false, false),
    ('decision_outcome',       'Decision Outcome',       'DECISION',       'DECISION_FIELD',      false, false),
    ('weekly_wage',            'Weekly Wage',            'CALC_INPUTS',    'SYSTEM_DERIVED',      false, true)
)
INSERT INTO public.bn_claim_field_ownership (
  product_version_id, field_key, field_label, field_area, field_owner,
  affects_eligibility, affects_calculation, requires_reason, requires_supervisor_approval
)
SELECT pv.id, d.field_key, d.field_label, d.field_area, d.field_owner,
       d.affects_eligibility, d.affects_calculation,
       CASE WHEN d.field_owner IN ('DECISION_FIELD','PAYMENT_FIELD') THEN true ELSE false END,
       CASE WHEN d.field_owner = 'DECISION_FIELD' THEN true ELSE false END
  FROM public.bn_product_version pv
 CROSS JOIN defaults d
 ON CONFLICT (product_version_id, field_key) DO NOTHING;
