ALTER TABLE public.bn_letter
  ADD COLUMN IF NOT EXISTS reference_number varchar(100),
  ADD COLUMN IF NOT EXISTS template_version_id uuid,
  ADD COLUMN IF NOT EXISTS rendered_subject text,
  ADD COLUMN IF NOT EXISTS rendered_body_html text,
  ADD COLUMN IF NOT EXISTS rendered_body_text text,
  ADD COLUMN IF NOT EXISTS issued_office_code varchar(40),
  ADD COLUMN IF NOT EXISTS issued_department_code varchar(40),
  ADD COLUMN IF NOT EXISTS template_version_no integer,
  ADD COLUMN IF NOT EXISTS department_code varchar(40),
  ADD COLUMN IF NOT EXISTS document_type varchar(60),
  ADD COLUMN IF NOT EXISTS issued_by_office uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bn_letter_reference_number_unique
  ON public.bn_letter(reference_number) WHERE reference_number IS NOT NULL;

UPDATE public.system_reference_sequence
SET prefix_pattern = '{MODULE}/{DEPT}/{DOC_TYPE}/{YYYY}/{SEQ}',
    updated_at = now()
WHERE module_code = 'BN'
  AND department_code = 'BENEFITS'
  AND document_type IN ('LETTER', 'CLAIM_NOTICE', 'DECISION_LETTER', 'EVIDENCE_REQUEST');

INSERT INTO public.system_reference_sequence
  (module_code, department_code, document_type, prefix_pattern, current_number, padding, financial_year, active, description)
VALUES
  ('BN', 'BENEFITS', 'LETTER', '{MODULE}/{DEPT}/{DOC_TYPE}/{YYYY}/{SEQ}', 0, 6, date_part('year', now())::int, true, 'Benefits general letters'),
  ('BN', 'BENEFITS', 'CLAIM_NOTICE', '{MODULE}/{DEPT}/{DOC_TYPE}/{YYYY}/{SEQ}', 0, 6, date_part('year', now())::int, true, 'Benefits claim notices'),
  ('BN', 'BENEFITS', 'DECISION_LETTER', '{MODULE}/{DEPT}/{DOC_TYPE}/{YYYY}/{SEQ}', 0, 6, date_part('year', now())::int, true, 'Benefits decision letters'),
  ('BN', 'BENEFITS', 'EVIDENCE_REQUEST', '{MODULE}/{DEPT}/{DOC_TYPE}/{YYYY}/{SEQ}', 0, 6, date_part('year', now())::int, true, 'Benefits evidence request letters')
ON CONFLICT (module_code, department_code, document_type, financial_year)
DO UPDATE SET prefix_pattern = EXCLUDED.prefix_pattern,
              padding = EXCLUDED.padding,
              active = true,
              description = EXCLUDED.description,
              updated_at = now();

INSERT INTO public.system_office_settings
  (office_code, office_name, department_name, address_line_1, address_line_2, city, country, phone, email, logo_url, signature_block, is_default, is_active, created_by, updated_by)
VALUES
  ('SKN_SSB_BENEFITS', 'St. Christopher and Nevis Social Security Board', 'Benefits Department', 'Robert L. Bradshaw Building', 'P.O. Box 79', 'Basseterre', 'Saint Kitts and Nevis', '(869) 465-2535', 'benefits@socialsecurity.kn', 'https://admin.secureserve.biz/lovable-uploads/45d5e4aa-3f4b-421f-4f99-04e05f609948.png', 'Yours faithfully,

Benefits Department
St. Christopher and Nevis Social Security Board', true, true, 'SYSTEM', 'SYSTEM')
ON CONFLICT (office_code)
DO UPDATE SET office_name = EXCLUDED.office_name,
              department_name = EXCLUDED.department_name,
              address_line_1 = EXCLUDED.address_line_1,
              address_line_2 = EXCLUDED.address_line_2,
              city = EXCLUDED.city,
              country = EXCLUDED.country,
              phone = EXCLUDED.phone,
              email = EXCLUDED.email,
              logo_url = COALESCE(NULLIF(public.system_office_settings.logo_url, ''), EXCLUDED.logo_url),
              signature_block = EXCLUDED.signature_block,
              is_default = true,
              is_active = true,
              updated_at = now(),
              updated_by = 'SYSTEM';

UPDATE public.system_office_settings
SET is_default = false
WHERE office_code <> 'SKN_SSB_BENEFITS'
  AND is_default = true;

CREATE OR REPLACE FUNCTION public.next_reference_number(
  p_module_code varchar,
  p_department_code varchar,
  p_document_type varchar,
  p_financial_year int DEFAULT NULL
) RETURNS TABLE(reference_number text, sequence_id uuid, current_number bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fy int := COALESCE(p_financial_year, date_part('year', now())::int);
  v_row public.system_reference_sequence%ROWTYPE;
  v_formatted text;
BEGIN
  UPDATE public.system_reference_sequence
     SET current_number = current_number + 1,
         updated_at = now()
   WHERE module_code = p_module_code
     AND department_code = p_department_code
     AND document_type = p_document_type
     AND financial_year = v_fy
     AND active = true
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active reference sequence configured for %/%/%/%', p_module_code, p_department_code, p_document_type, v_fy
      USING ERRCODE = 'P0001';
  END IF;

  v_formatted := replace(v_row.prefix_pattern, '{MODULE}', v_row.module_code);
  v_formatted := replace(v_formatted, '{DEPT}', v_row.department_code);
  v_formatted := replace(v_formatted, '{DOC_TYPE}', v_row.document_type);
  v_formatted := replace(v_formatted, '{YYYY}', v_row.financial_year::text);
  v_formatted := replace(v_formatted, '{SEQ}', lpad(v_row.current_number::text, v_row.padding, '0'));

  reference_number := v_formatted;
  sequence_id := v_row.id;
  current_number := v_row.current_number;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_reference_number(varchar,varchar,varchar,int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.upsert_bn_template(
  p_template_code text,
  p_name text,
  p_trigger_event text,
  p_channel public.notification_channel,
  p_subject text,
  p_body text,
  p_description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_version_no int;
BEGIN
  SELECT id INTO v_id
  FROM public.notification_templates
  WHERE template_code = p_template_code
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.notification_templates
      (name, category, channel, subject, title, body, html_body, placeholders, is_enabled, template_code, trigger_event, description, version_no, created_at, updated_at)
    VALUES
      (p_name, 'Benefits', p_channel, p_subject, p_subject, p_body, NULL,
       '["CLAIMANT_NAME","CLAIM_NUMBER","BENEFIT_NAME","REFERENCE_NUMBER","OFFICE_NAME","OFFICE_ADDRESS","OFFICE_PHONE","OFFICE_EMAIL","DEPARTMENT_NAME","FAILED_REASON_SUMMARY","FAILED_RULES","NEXT_STEPS","APPEAL_INSTRUCTIONS","OFFICER_NAME","SIGNATURE_BLOCK"]'::jsonb,
       true, p_template_code, p_trigger_event, p_description, 1, now(), now())
    RETURNING id, version_no INTO v_id, v_version_no;
  ELSE
    UPDATE public.notification_templates
    SET name = p_name,
        category = 'Benefits',
        channel = p_channel,
        subject = p_subject,
        title = p_subject,
        body = p_body,
        html_body = NULL,
        placeholders = '["CLAIMANT_NAME","CLAIM_NUMBER","BENEFIT_NAME","REFERENCE_NUMBER","OFFICE_NAME","OFFICE_ADDRESS","OFFICE_PHONE","OFFICE_EMAIL","DEPARTMENT_NAME","FAILED_REASON_SUMMARY","FAILED_RULES","NEXT_STEPS","APPEAL_INSTRUCTIONS","OFFICER_NAME","SIGNATURE_BLOCK"]'::jsonb,
        is_enabled = true,
        trigger_event = p_trigger_event,
        description = p_description,
        version_no = COALESCE(version_no, 0) + 1,
        updated_at = now()
    WHERE id = v_id
    RETURNING version_no INTO v_version_no;
  END IF;

  INSERT INTO public.notification_template_versions
    (template_id, version_no, name, subject, body, html_body, placeholders, change_summary, changed_at)
  VALUES
    (v_id, v_version_no, p_name, p_subject, p_body, NULL,
     '["CLAIMANT_NAME","CLAIM_NUMBER","BENEFIT_NAME","REFERENCE_NUMBER","OFFICE_NAME","OFFICE_ADDRESS","OFFICE_PHONE","OFFICE_EMAIL","DEPARTMENT_NAME","FAILED_REASON_SUMMARY","FAILED_RULES","NEXT_STEPS","APPEAL_INSTRUCTIONS","OFFICER_NAME","SIGNATURE_BLOCK"]'::jsonb,
     'Formal Benefits letter template finalised', now());

  RETURN v_id;
END;
$$;

SELECT public.upsert_bn_template('BN_ACKNOWLEDGEMENT_LETTER', 'BN Acknowledgement Letter', 'bn.claim.submitted', 'letter', 'Acknowledgement of Benefit Application — {{CLAIM_NUMBER}}', 'Dear {{CLAIMANT_NAME}},

We confirm receipt of your application for {{BENEFIT_NAME}} under claim number {{CLAIM_NUMBER}}.

Your application is now recorded and will be reviewed by the Benefits Department. Please quote reference number {{REFERENCE_NUMBER}} in all correspondence about this claim.

Next steps:

{{NEXT_STEPS}}

If additional information is required, you will be contacted by the Benefits Department.

Yours faithfully,

{{OFFICER_NAME}}
{{DEPARTMENT_NAME}}', 'Formal acknowledgement letter for submitted Benefits claims.');

SELECT public.upsert_bn_template('BN_ELIGIBILITY_FAILED_LETTER', 'BN Eligibility Failed Letter', 'bn.eligibility.failed', 'letter', 'Eligibility Decision — Claim {{CLAIM_NUMBER}}', 'Dear {{CLAIMANT_NAME}},

We have reviewed your application for {{BENEFIT_NAME}} under claim number {{CLAIM_NUMBER}}.

Based on the information currently available, your claim has not met one or more eligibility requirements.

Reason:

{{FAILED_REASON_SUMMARY}}

Details:

{{FAILED_RULES}}

Next steps:

{{NEXT_STEPS}}

If you disagree with this decision, {{APPEAL_INSTRUCTIONS}}.

Yours faithfully,

{{OFFICER_NAME}}
{{DEPARTMENT_NAME}}', 'Formal eligibility failure decision letter.');

SELECT public.upsert_bn_template('BN_EVIDENCE_REQUEST_LETTER', 'BN Evidence Request Letter', 'bn.evidence.requested', 'letter', 'Request for Additional Information — Claim {{CLAIM_NUMBER}}', 'Dear {{CLAIMANT_NAME}},

We are reviewing your application for {{BENEFIT_NAME}} under claim number {{CLAIM_NUMBER}}.

To continue processing your claim, please provide the following information or documents:

{{MISSING_DOCUMENTS}}

Please submit the requested information by {{DUE_DATE}}. If the information is not provided, assessment of your claim may be delayed or a decision may be made using the information already available.

Next steps:

{{NEXT_STEPS}}

Yours faithfully,

{{OFFICER_NAME}}
{{DEPARTMENT_NAME}}', 'Formal request for additional evidence.');

SELECT public.upsert_bn_template('BN_APPROVAL_LETTER', 'BN Approval Letter', 'bn.claim.approved', 'letter', 'Approval of Benefit Claim — {{CLAIM_NUMBER}}', 'Dear {{CLAIMANT_NAME}},

We are pleased to inform you that your application for {{BENEFIT_NAME}} under claim number {{CLAIM_NUMBER}} has been approved.

Effective date: {{EFFECTIVE_DATE}}
Weekly rate: {{WEEKLY_RATE}}
Monthly rate: {{MONTHLY_RATE}}
Lump sum: {{LUMP_SUM}}
Payment method: {{PAYMENT_METHOD}}

Next steps:

{{NEXT_STEPS}}

Please quote reference number {{REFERENCE_NUMBER}} in all correspondence.

Yours faithfully,

{{OFFICER_NAME}}
{{DEPARTMENT_NAME}}', 'Formal approval and award letter.');

SELECT public.upsert_bn_template('BN_DENIAL_LETTER', 'BN Denial Letter', 'bn.claim.denied', 'letter', 'Decision on Benefit Claim — {{CLAIM_NUMBER}}', 'Dear {{CLAIMANT_NAME}},

We have completed our review of your application for {{BENEFIT_NAME}} under claim number {{CLAIM_NUMBER}}.

Your claim has not been approved for the following reason:

{{REASON_DESCRIPTION}}

Next steps:

{{NEXT_STEPS}}

If you disagree with this decision, {{APPEAL_INSTRUCTIONS}}.

Yours faithfully,

{{OFFICER_NAME}}
{{DEPARTMENT_NAME}}', 'Formal denial decision letter with appeal instructions.');

SELECT public.upsert_bn_template('BN_DISALLOWANCE_LETTER', 'BN Disallowance Letter', 'bn.claim.disallowed', 'letter', 'Disallowance of Benefit Claim — {{CLAIM_NUMBER}}', 'Dear {{CLAIMANT_NAME}},

Following review of your application for {{BENEFIT_NAME}} under claim number {{CLAIM_NUMBER}}, the claim has been disallowed.

Reason for disallowance:

{{REASON_DESCRIPTION}}

Next steps:

{{NEXT_STEPS}}

If you disagree with this decision, {{APPEAL_INSTRUCTIONS}}.

Yours faithfully,

{{OFFICER_NAME}}
{{DEPARTMENT_NAME}}', 'Formal disallowance decision letter.');

SELECT public.upsert_bn_template('BN_PAYMENT_ISSUED_LETTER', 'BN Payment Issued Letter', 'bn.payment.issued', 'letter', 'Benefit Payment Issued — {{CLAIM_NUMBER}}', 'Dear {{CLAIMANT_NAME}},

A payment has been issued for your {{BENEFIT_NAME}} claim under claim number {{CLAIM_NUMBER}}.

Payment amount: {{LUMP_SUM}}
Payment method: {{PAYMENT_METHOD}}
Effective date: {{EFFECTIVE_DATE}}

Please contact the Benefits Department if the payment is not received within the expected processing period.

Yours faithfully,

{{OFFICER_NAME}}
{{DEPARTMENT_NAME}}', 'Formal payment issued notice.');

SELECT public.upsert_bn_template('BN_LIFE_CERTIFICATE_DUE_LETTER', 'BN Life Certificate Due Letter', 'bn.life_certificate.due', 'letter', 'Life Certificate Required — {{CLAIM_NUMBER}}', 'Dear {{CLAIMANT_NAME}},

Our records show that a Life Certificate is required to continue benefit payments under claim number {{CLAIM_NUMBER}}.

Please complete and return the Life Certificate by {{DUE_DATE}} to avoid interruption of payment.

Next steps:

{{NEXT_STEPS}}

Yours faithfully,

{{OFFICER_NAME}}
{{DEPARTMENT_NAME}}', 'Formal life certificate reminder letter.');

SELECT public.upsert_bn_template('BN_SCHOOL_CERTIFICATE_DUE_LETTER', 'BN School Certificate Due Letter', 'bn.school_certificate.due', 'letter', 'School Certificate Required — {{CLAIM_NUMBER}}', 'Dear {{CLAIMANT_NAME}},

A current school attendance certificate is required to continue benefit payments under claim number {{CLAIM_NUMBER}}.

Please submit the certificate by {{DUE_DATE}}.

Next steps:

{{NEXT_STEPS}}

Yours faithfully,

{{OFFICER_NAME}}
{{DEPARTMENT_NAME}}', 'Formal school certificate reminder letter.');

SELECT public.upsert_bn_template('BN_OVERPAYMENT_CREATED_LETTER', 'BN Overpayment Created Letter', 'bn.overpayment.created', 'letter', 'Notice of Overpayment — Claim {{CLAIM_NUMBER}}', 'Dear {{CLAIMANT_NAME}},

An overpayment has been identified in relation to your {{BENEFIT_NAME}} claim under claim number {{CLAIM_NUMBER}}.

Reason:

{{REASON_DESCRIPTION}}

Amount recoverable: {{LUMP_SUM}}

Next steps:

Please contact the Benefits Department to discuss repayment arrangements. {{NEXT_STEPS}}

If you disagree with this decision, {{APPEAL_INSTRUCTIONS}}.

Yours faithfully,

{{OFFICER_NAME}}
{{DEPARTMENT_NAME}}', 'Formal overpayment notice letter.');

SELECT public.upsert_bn_template('BN_SUSPENSION_LETTER', 'BN Suspension Letter', 'bn.benefit.suspended', 'letter', 'Suspension of Benefit Payment — {{CLAIM_NUMBER}}', 'Dear {{CLAIMANT_NAME}},

We are writing to inform you that payment of your {{BENEFIT_NAME}} under claim number {{CLAIM_NUMBER}} has been suspended.

Reason:

{{REASON_DESCRIPTION}}

Next steps:

{{NEXT_STEPS}}

If you disagree with this decision, {{APPEAL_INSTRUCTIONS}}.

Yours faithfully,

{{OFFICER_NAME}}
{{DEPARTMENT_NAME}}', 'Formal benefit suspension letter.');

DROP FUNCTION public.upsert_bn_template(text, text, text, public.notification_channel, text, text, text);

WITH preferred_templates AS (
  SELECT * FROM (VALUES
    ('bn.claim.submitted', 'LETTER', 'BN_ACKNOWLEDGEMENT_LETTER'),
    ('bn.eligibility.failed', 'LETTER', 'BN_ELIGIBILITY_FAILED_LETTER'),
    ('bn.evidence.requested', 'LETTER', 'BN_EVIDENCE_REQUEST_LETTER'),
    ('bn.claim.approved', 'LETTER', 'BN_APPROVAL_LETTER'),
    ('bn.claim.denied', 'LETTER', 'BN_DENIAL_LETTER'),
    ('bn.claim.disallowed', 'LETTER', 'BN_DISALLOWANCE_LETTER'),
    ('bn.payment.issued', 'LETTER', 'BN_PAYMENT_ISSUED_LETTER'),
    ('bn.life_certificate.due', 'LETTER', 'BN_LIFE_CERTIFICATE_DUE_LETTER'),
    ('bn.school_certificate.due', 'LETTER', 'BN_SCHOOL_CERTIFICATE_DUE_LETTER'),
    ('bn.overpayment.created', 'LETTER', 'BN_OVERPAYMENT_CREATED_LETTER'),
    ('bn.benefit.suspended', 'LETTER', 'BN_SUSPENSION_LETTER'),
    ('bn.claim.submitted', 'EMAIL', 'BN_ACKNOWLEDGEMENT_EMAIL'),
    ('bn.claim.submitted', 'SMS', 'BN_ACKNOWLEDGEMENT_SMS')
  ) AS v(event_code, delivery_method, template_code)
), resolved AS (
  SELECT p.event_code, p.delivery_method, nt.id AS template_id
  FROM preferred_templates p
  JOIN public.notification_templates nt ON nt.template_code = p.template_code
)
UPDATE public.bn_comm_mapping cm
SET template_id = r.template_id,
    channel = r.delivery_method,
    delivery_method = r.delivery_method,
    updated_at = now()
FROM resolved r
WHERE cm.event_code = r.event_code
  AND upper(coalesce(cm.delivery_method, cm.channel)) = r.delivery_method;

UPDATE public.bn_comm_mapping cm
SET template_id = NULL,
    updated_at = now()
FROM public.notification_templates nt
WHERE cm.template_id = nt.id
  AND cm.active = true
  AND upper(coalesce(cm.delivery_method, cm.channel)) <> upper(nt.channel::text);

SELECT pg_notify('pgrst', 'reload schema');