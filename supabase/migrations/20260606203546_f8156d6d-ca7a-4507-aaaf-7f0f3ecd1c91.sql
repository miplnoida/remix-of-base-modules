
ALTER TABLE public.bn_product_channel_config
  ADD COLUMN IF NOT EXISTS requires_self_verified_ssn boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_deceased_person boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_active_award boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_existing_ei_claim boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_employer_task boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_doctor_task boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_school_task boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_employer_initiated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_doctor_initiated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_card_message text,
  ADD COLUMN IF NOT EXISTS public_disabled_reason text;

DROP VIEW IF EXISTS public.v_bn_product_public_config_issues;
CREATE VIEW public.v_bn_product_public_config_issues AS
WITH cfg AS (
  SELECT pcc.id AS channel_config_id, pcc.product_id, pcc.product_version_id,
         pcc.public_online_enabled, pcc.allowed_applicant_types, pcc.allow_apply_for_self,
         pcc.allow_apply_for_deceased, pcc.allow_apply_for_child_dependant,
         pcc.allow_apply_as_guardian, pcc.allow_apply_as_payee, pcc.allow_apply_as_representative,
         pcc.allow_employer_initiated, pcc.allow_doctor_initiated,
         pcc.requires_self_verified_ssn, pcc.requires_deceased_person,
         pcc.requires_active_award, pcc.requires_existing_ei_claim,
         pcc.public_screen_template_id, pcc.applicant_must_equal_insured,
         p.benefit_code, p.benefit_name
    FROM public.bn_product_channel_config pcc
    LEFT JOIN public.bn_product p ON p.id = pcc.product_id
   WHERE pcc.channel_code = 'ONLINE' AND pcc.public_online_enabled = true
)
SELECT channel_config_id, product_id, product_version_id, benefit_code, benefit_name,
       'MISSING_PUBLIC_TEMPLATE'::text AS issue_code,
       'Public-enabled but public_screen_template_id is NULL' AS issue_message
  FROM cfg WHERE public_screen_template_id IS NULL
UNION ALL
SELECT channel_config_id, product_id, product_version_id, benefit_code, benefit_name,
       'SELF_ONLY_MISSING_SSN_REQ', 'Self-only product must require a verified SELF SSN'
  FROM cfg
 WHERE allow_apply_for_self = true
   AND allow_apply_for_deceased = false
   AND allow_apply_for_child_dependant = false
   AND requires_self_verified_ssn = false
UNION ALL
SELECT channel_config_id, product_id, product_version_id, benefit_code, benefit_name,
       'DECEASED_PRODUCT_MISSING_FLAG', 'Survivor/funeral product must allow deceased person'
  FROM cfg
 WHERE (allow_apply_for_deceased = false AND requires_deceased_person = true)
UNION ALL
SELECT channel_config_id, product_id, product_version_id, benefit_code, benefit_name,
       'SERVICE_MISSING_AWARD_REQ', 'Service product (life/school/EFT) must require an active award'
  FROM cfg
 WHERE benefit_code IN ('SKN-SVC-LIFE','SKN-SVC-SCH','SKN-SVC-EFT')
   AND requires_active_award = false
UNION ALL
SELECT channel_config_id, product_id, product_version_id, benefit_code, benefit_name,
       'EIR_VISIBLE_TO_CLAIMANT', 'Employer Information Request must not appear in claimant apply list'
  FROM cfg
 WHERE benefit_code = 'SKN-SVC-EIR';

GRANT SELECT ON public.v_bn_product_public_config_issues TO authenticated, service_role;
