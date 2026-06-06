
ALTER TABLE public.bn_product_channel_config
  ADD COLUMN IF NOT EXISTS public_online_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_applicant_types text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS allowed_subject_types text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS applicant_must_equal_insured boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_apply_for_self boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_apply_for_deceased boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_apply_for_child_dependant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_apply_as_guardian boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_apply_as_payee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_apply_as_representative boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_managed_contributor_selection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS required_participant_roles text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS public_screen_template_id uuid REFERENCES public.bn_screen_template(id),
  ADD COLUMN IF NOT EXISTS assisted_screen_template_id uuid REFERENCES public.bn_screen_template(id),
  ADD COLUMN IF NOT EXISTS internal_screen_template_id uuid REFERENCES public.bn_screen_template(id),
  ADD COLUMN IF NOT EXISTS estimated_processing_days integer,
  ADD COLUMN IF NOT EXISTS public_intent_tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS public_short_description text,
  ADD COLUMN IF NOT EXISTS public_who_can_apply text;

CREATE INDEX IF NOT EXISTS idx_bn_pcc_public_lookup
  ON public.bn_product_channel_config (channel_code, public_online_enabled)
  WHERE public_online_enabled = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_eupl_user_ssn_rel
  ON public.external_user_person_link (user_id, ssn, relationship_type);

INSERT INTO public.external_portal_feature_config (feature_key, feature_name, description, enabled, affected_personas, affected_menus, last_updated_by, last_updated_at)
SELECT 'people_i_manage_enabled', 'People I Manage',
       'Allows external portal users to link, manage, and apply on behalf of other insured persons via guardian/payee/representative relationships.',
       false, ARRAY['CLAIMANT'], ARRAY['/claimant/managed/people'], 'SEED-PR1', now()
WHERE NOT EXISTS (SELECT 1 FROM public.external_portal_feature_config WHERE feature_key = 'people_i_manage_enabled');

ALTER TABLE public.bn_field_metadata
  ADD COLUMN IF NOT EXISTS requires_self_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_internal_only boolean NOT NULL DEFAULT false;

CREATE OR REPLACE VIEW public.v_bn_product_public_config_issues AS
WITH cfg AS (
  SELECT
    pcc.id AS channel_config_id,
    pcc.product_id,
    pcc.product_version_id,
    pcc.channel_code,
    pcc.public_online_enabled,
    pcc.allowed_applicant_types,
    pcc.allowed_subject_types,
    pcc.allow_apply_for_self,
    pcc.allow_apply_for_deceased,
    pcc.allow_apply_for_child_dependant,
    pcc.allow_apply_as_guardian,
    pcc.allow_apply_as_payee,
    pcc.allow_apply_as_representative,
    pcc.allow_managed_contributor_selection,
    pcc.required_participant_roles,
    pcc.public_screen_template_id,
    pcc.applicant_must_equal_insured,
    p.benefit_code,
    p.benefit_name
  FROM public.bn_product_channel_config pcc
  LEFT JOIN public.bn_product p ON p.id = pcc.product_id
  WHERE pcc.channel_code = 'PUBLIC_ONLINE' AND pcc.public_online_enabled = true
)
SELECT channel_config_id, product_id, product_version_id, benefit_code, benefit_name,
       'MISSING_PUBLIC_TEMPLATE'::text AS issue_code,
       'Public-enabled but public_screen_template_id is NULL'::text AS issue_message
FROM cfg WHERE public_screen_template_id IS NULL
UNION ALL
SELECT channel_config_id, product_id, product_version_id, benefit_code, benefit_name,
       'MISSING_ALLOWED_APPLICANT_TYPES',
       'Public-enabled but allowed_applicant_types is empty'
FROM cfg WHERE array_length(allowed_applicant_types, 1) IS NULL
UNION ALL
SELECT channel_config_id, product_id, product_version_id, benefit_code, benefit_name,
       'SURVIVOR_WITHOUT_DECEASED',
       'allowed_applicant_types includes SURVIVOR/FUNERAL_RESPONSIBLE_PERSON but allowed_subject_types is missing DECEASED_INSURED_PERSON'
FROM cfg
WHERE (allowed_applicant_types && ARRAY['SURVIVOR','FUNERAL_RESPONSIBLE_PERSON'])
  AND NOT (allowed_subject_types && ARRAY['DECEASED_INSURED_PERSON'])
UNION ALL
SELECT channel_config_id, product_id, product_version_id, benefit_code, benefit_name,
       'SELF_ONLY_CONFLICT',
       'applicant_must_equal_insured = true but non-self applicant types are also allowed'
FROM cfg
WHERE applicant_must_equal_insured = true
  AND (allow_apply_for_deceased OR allow_apply_for_child_dependant OR allow_apply_as_guardian OR allow_apply_as_payee OR allow_apply_as_representative)
UNION ALL
SELECT channel_config_id, product_id, product_version_id, benefit_code, benefit_name,
       'MANAGED_WITHOUT_RELATIONSHIP',
       'allow_managed_contributor_selection = true but no guardian/payee/representative applicant types enabled'
FROM cfg
WHERE allow_managed_contributor_selection = true
  AND NOT (allow_apply_as_guardian OR allow_apply_as_payee OR allow_apply_as_representative)
UNION ALL
SELECT cfg.channel_config_id, cfg.product_id, cfg.product_version_id, cfg.benefit_code, cfg.benefit_name,
       'PUBLIC_TEMPLATE_INTERNAL_FIELDS',
       'Public template contains fields marked is_internal_only = true (count: ' || COUNT(fm.id)::text || ')'
FROM cfg
JOIN public.bn_field_metadata fm ON fm.screen_template_id = cfg.public_screen_template_id
WHERE fm.is_internal_only = true
GROUP BY cfg.channel_config_id, cfg.product_id, cfg.product_version_id, cfg.benefit_code, cfg.benefit_name;

GRANT SELECT ON public.v_bn_product_public_config_issues TO authenticated;
GRANT SELECT ON public.v_bn_product_public_config_issues TO service_role;
