
DO $$
DECLARE
  v_tpl_id UUID;
  v_ver_id UUID;
  v_legacy RECORD;
BEGIN
  SELECT * INTO v_legacy FROM public.legal_templates WHERE type = 'JUDGMENT_SUMMONS' LIMIT 1;
  IF FOUND AND NOT EXISTS (
    SELECT 1 FROM public.core_template
     WHERE code = 'LG-TPL-JUDGMENT-SUMMONS' AND country_code = 'KN' AND scope = 'COUNTRY'
  ) THEN
    INSERT INTO public.core_template
      (code, name, description, module_code, module_name, country_code, institution_code,
       template_type, template_category, status, source_system, source_ref_id,
       scope, is_active, created_by, updated_by, tags)
    VALUES
      ('LG-TPL-JUDGMENT-SUMMONS', v_legacy.name,
       'Migrated from legacy legal_templates.JUDGMENT_SUMMONS',
       'LEGAL', 'Legal', 'KN', 'SSB',
       'DOCUMENT', 'LEGAL', 'ACTIVE', 'COMPLIANCE_LEGACY', v_legacy.id,
       'COUNTRY', TRUE, 'MIGRATION', 'MIGRATION',
       ARRAY['legal','summons','migrated'])
    RETURNING id INTO v_tpl_id;

    INSERT INTO public.core_template_version
      (template_id, version_no, status, subject, body_html, body_text,
       change_summary, published_at, published_by, created_by, updated_by)
    VALUES
      (v_tpl_id, 1, 'PUBLISHED', v_legacy.name, v_legacy.content, NULL,
       'Initial import from legacy legal_templates', COALESCE(v_legacy.published_at, now()),
       COALESCE(v_legacy.published_by::text, 'MIGRATION'), 'MIGRATION', 'MIGRATION')
    RETURNING id INTO v_ver_id;

    UPDATE public.core_template SET active_version_id = v_ver_id WHERE id = v_tpl_id;
  END IF;

  SELECT * INTO v_legacy FROM public.legal_templates WHERE type = 'REQUEST_INFO_SOURCE' LIMIT 1;
  IF FOUND AND NOT EXISTS (
    SELECT 1 FROM public.core_template
     WHERE code = 'LG-TPL-REQUEST-INFO-SOURCE' AND country_code = 'KN' AND scope = 'COUNTRY'
  ) THEN
    INSERT INTO public.core_template
      (code, name, description, module_code, module_name, country_code, institution_code,
       template_type, template_category, status, source_system, source_ref_id,
       scope, is_active, created_by, updated_by, tags)
    VALUES
      ('LG-TPL-REQUEST-INFO-SOURCE', v_legacy.name,
       'Migrated from legacy legal_templates.REQUEST_INFO_SOURCE',
       'LEGAL', 'Legal', 'KN', 'SSB',
       'LETTER', 'LEGAL', 'ACTIVE', 'COMPLIANCE_LEGACY', v_legacy.id,
       'COUNTRY', TRUE, 'MIGRATION', 'MIGRATION',
       ARRAY['legal','information-request','migrated'])
    RETURNING id INTO v_tpl_id;

    INSERT INTO public.core_template_version
      (template_id, version_no, status, subject, body_html, body_text,
       change_summary, published_at, published_by, created_by, updated_by)
    VALUES
      (v_tpl_id, 1, 'PUBLISHED', v_legacy.name, v_legacy.content, NULL,
       'Initial import from legacy legal_templates', COALESCE(v_legacy.published_at, now()),
       COALESCE(v_legacy.published_by::text, 'MIGRATION'), 'MIGRATION', 'MIGRATION')
    RETURNING id INTO v_ver_id;

    UPDATE public.core_template SET active_version_id = v_ver_id WHERE id = v_tpl_id;
  END IF;
END $$;

-- Phase 1b: mark all legacy legal_templates rows as MIGRATED / inactive.
UPDATE public.legal_templates lt
   SET is_active = FALSE,
       status = 'MIGRATED_TO_CORE',
       description = COALESCE(NULLIF(lt.description, ''), lt.name)
                     || ' [MIGRATED_TO_CORE:' || COALESCE(map.core_id::text, 'unmapped') || ']',
       updated_at = now()
  FROM (
    SELECT lt2.id AS legacy_id,
           (SELECT ct.id FROM public.core_template ct
             WHERE ct.module_code = 'LEGAL'
               AND ct.code = CASE lt2.type
                 WHEN 'DEMAND_LETTER'              THEN 'LG-TPL-DEMAND-LETTER'
                 WHEN 'FINAL_DEMAND_LETTER'        THEN 'LG-TPL-FINAL-DEMAND'
                 WHEN 'PAYMENT_ARRANGEMENT_LETTER' THEN 'LG-TPL-PAYPLAN-LEGAL'
                 WHEN 'ADJOURNMENT_LETTER'         THEN 'LG-TPL-ADJOURNMENT'
                 WHEN 'JUDGMENT_LETTER'            THEN 'LG-TPL-JUDGMENT'
                 WHEN 'SUMMONS_APPEAR'             THEN 'LG-TPL-SUMMONS'
                 WHEN 'JUDGMENT_SUMMONS'           THEN 'LG-TPL-JUDGMENT-SUMMONS'
                 WHEN 'WRIT_EXECUTION'             THEN 'LG-TPL-EXECUTION'
                 WHEN 'WARRANT_COMMITMENT'         THEN 'LG-TPL-WARRANT-COMMIT'
                 WHEN 'COURT_ORDER_NOTICE'         THEN 'LG-TPL-FINAL-ORDER'
                 WHEN 'SETTLEMENT_CONFIRMATION'    THEN 'LG-TPL-SETTLE-TERMS'
                 WHEN 'PAYMENT_DEFAULT_NOTICE'     THEN 'LG-TPL-PAYMENT-DEFAULT'
                 WHEN 'ENFORCEMENT_NOTICE'         THEN 'LG-TPL-ENFORCEMENT'
                 WHEN 'CASE_CLOSURE'               THEN 'LG-TPL-CASE-CLOSURE'
                 WHEN 'REQUEST_INFO_SOURCE'        THEN 'LG-TPL-REQUEST-INFO-SOURCE'
                 ELSE NULL
               END
               AND ct.country_code = 'KN'
             ORDER BY (ct.scope = 'COUNTRY') DESC
             LIMIT 1) AS core_id
      FROM public.legal_templates lt2
     WHERE lt2.is_active IS DISTINCT FROM FALSE
  ) map
 WHERE lt.id = map.legacy_id
   AND lt.description NOT LIKE '%[MIGRATED_TO_CORE:%';

-- Phase 1c: deprecate notification_templates rows with category='legal'.
UPDATE public.notification_templates nt
   SET is_enabled = FALSE,
       description = COALESCE(NULLIF(nt.description, ''), nt.name)
                     || ' [MIGRATED_TO_CORE:' || COALESCE(map.core_id::text, 'unmapped') || ']',
       updated_at = now()
  FROM (
    SELECT nt2.id AS legacy_id,
           (SELECT ct.id FROM public.core_template ct
             WHERE ct.module_code = 'LEGAL' AND ct.country_code = 'KN'
               AND ct.code = CASE nt2.template_code
                 WHEN 'LG_DEMAND_LETTER'        THEN 'LG-TPL-DEMAND-LETTER'
                 WHEN 'LG_FINAL_DEMAND'         THEN 'LG-TPL-FINAL-DEMAND'
                 WHEN 'LG_NOTICE_BEFORE_ACTION' THEN 'LG-TPL-NBA'
                 WHEN 'LG_HEARING_NOTICE'       THEN 'LG-TPL-HEARING-NOTICE'
                 WHEN 'LG_COURT_FILING_COVER'   THEN 'LG-TPL-COURT-COVER'
                 WHEN 'LG_SETTLEMENT_OFFER'     THEN 'LG-TPL-SETTLEMENT-OFFER'
                 WHEN 'LG_PAYMENT_DEFAULT'      THEN 'LG-TPL-PAYMENT-DEFAULT'
                 WHEN 'LG_JUDGMENT_NOTICE'      THEN 'LG-TPL-JUDGMENT'
                 WHEN 'LG_ENFORCEMENT_NOTICE'   THEN 'LG-TPL-ENFORCEMENT'
                 ELSE NULL
               END
             ORDER BY (ct.scope = 'COUNTRY') DESC
             LIMIT 1) AS core_id
      FROM public.notification_templates nt2
     WHERE lower(nt2.category) = 'legal'
       AND nt2.is_enabled IS DISTINCT FROM FALSE
  ) map
 WHERE nt.id = map.legacy_id
   AND nt.description NOT LIKE '%[MIGRATED_TO_CORE:%';

-- Phase 4: register missing LEGAL tokens centrally.
INSERT INTO public.core_template_token
  (token_code, token_label, module_code, entity_type, resolver_service,
   sample_value, token_group, data_type, is_required)
VALUES
  ('legal.party_name',        'Party name',                 'LEGAL', 'lg_case_party', 'legalTemplateContextService', 'Acme Ltd',          'legal',  'text', FALSE),
  ('legal.employer_name',     'Employer name (case)',       'LEGAL', 'au_er_master',   'legalTemplateContextService', 'Acme Ltd',          'legal',  'text', FALSE),
  ('legal.employer_no',       'Employer registration no.',  'LEGAL', 'au_er_master',   'legalTemplateContextService', 'EMP-000123',        'legal',  'text', FALSE),
  ('legal.member_name',       'Insured person name',        'LEGAL', 'ip_master',      'legalTemplateContextService', 'John Doe',          'legal',  'text', FALSE),
  ('legal.claim_no',          'Benefit claim number',       'LEGAL', 'bn_claim',       'legalTemplateContextService', 'CLM-2025-0001',     'legal',  'text', FALSE),
  ('legal.hearing_date',      'Hearing date',               'LEGAL', 'lg_hearing',     'legalTemplateContextService', '2026-07-15',        'legal',  'date', FALSE),
  ('legal.hearing_time',      'Hearing time',               'LEGAL', 'lg_hearing',     'legalTemplateContextService', '10:00',             'legal',  'text', FALSE),
  ('legal.court_name',        'Court name',                 'LEGAL', 'lg_court',       'legalTemplateContextService', 'Magistrates Court', 'legal',  'text', FALSE),
  ('legal.officer_name',      'Assigned officer name',      'LEGAL', 'lg_staff',       'legalTemplateContextService', 'Jane Smith',        'legal',  'text', FALSE),
  ('legal.referral_no',       'Legal referral number',      'LEGAL', 'legal_referral', 'legalTemplateContextService', 'LR-2026-0001',      'legal',  'text', FALSE),
  ('legal.due_date',          'Deadline / due date',        'LEGAL', 'lg_case_deadline','legalTemplateContextService','2026-08-01',        'legal',  'date', FALSE),
  ('legal.decision_summary',  'Decision summary',           'LEGAL', 'lg_order',       'legalTemplateContextService', 'Judgment granted',  'legal',  'text', FALSE)
ON CONFLICT (token_code) DO NOTHING;
