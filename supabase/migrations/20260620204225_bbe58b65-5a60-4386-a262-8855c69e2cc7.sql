
DO $$
DECLARE
  v_layout uuid;
  v_tpl_id uuid;
  v_ver_id uuid;
  v_cat_id uuid;
  rec record;
  v_ref uuid;
BEGIN
  SELECT id INTO v_layout FROM public.core_template_layout WHERE code='LETTERHEAD_FULL' LIMIT 1;

  FOR rec IN
    SELECT * FROM (VALUES
    -- LEGAL (23 missing)
    ('LG-TPL-CASE-CREATION','Case Creation Notice','NOTICE','LG_INTERNAL','LEGAL','Legal Case Created','<p>Dear {{person.name}},</p><p>A legal case <strong>{{case.number}}</strong> has been created on {{system.date}} regarding {{case.subject}}. Please refer to enclosed case details.</p><p>{{legal_reference.citation}}</p>','SSA_CAP329'),
    ('LG-TPL-CASE-TRANSFER','Case Transfer Notice','NOTICE','LG_INTERNAL','LEGAL','Case Transfer Notice','<p>Case <strong>{{case.number}}</strong> has been transferred to {{case.new_owner}} effective {{system.date}}.</p>','SSA_CAP329'),
    ('LG-TPL-HEARING-RESCHEDULE','Hearing Reschedule Notice','NOTICE','LG_HEARING','LEGAL','Hearing Rescheduled - {{case.number}}','<p>Dear {{person.name}},</p><p>The hearing in case {{case.number}} originally set for {{case.hearing_date_old}} has been rescheduled to <strong>{{case.hearing_date}}</strong> at {{case.hearing_venue}}.</p>','SSA_CAP329'),
    ('LG-TPL-HEARING-CANCEL','Hearing Cancellation Notice','NOTICE','LG_HEARING','LEGAL','Hearing Cancelled - {{case.number}}','<p>The hearing in case {{case.number}} scheduled for {{case.hearing_date}} has been cancelled. Reason: {{case.cancellation_reason}}.</p>','SSA_CAP329'),
    ('LG-TPL-HEARING-REMINDER','Hearing Reminder','NOTICE','LG_HEARING','LEGAL','Reminder: Hearing on {{case.hearing_date}}','<p>This is a reminder that you are required to attend the hearing in case {{case.number}} on {{case.hearing_date}} at {{case.hearing_venue}}.</p>','SSA_CAP329'),
    ('LG-TPL-INTERIM-ORDER','Interim Order','NOTICE','LG_ORDER','LEGAL','Interim Order - {{case.number}}','<p>By order of the Tribunal, the following interim measures are imposed in case {{case.number}}: {{case.order_terms}}.</p><p>{{legal_reference.citation}}</p>','SSA_CAP329'),
    ('LG-TPL-FINAL-ORDER','Final Order','NOTICE','LG_ORDER','LEGAL','Final Order - {{case.number}}','<p>Following hearing and consideration, the following final order is made in case {{case.number}}: {{case.order_terms}}.</p>','SSA_CAP329'),
    ('LG-TPL-SUSPENSION-ORDER','Suspension Order','NOTICE','LG_ORDER','LEGAL','Suspension Order - {{employer.name}}','<p>Pursuant to {{legal_reference.citation}}, the operations of {{employer.name}} are SUSPENDED effective {{system.date}} pending compliance with {{case.compliance_terms}}.</p>','SSA_S46_RECOVERY'),
    ('LG-TPL-REVOCATION-ORDER','Revocation Order','NOTICE','LG_ORDER','LEGAL','Revocation Order - {{employer.name}}','<p>The registration/authorisation of {{employer.name}} is REVOKED effective {{system.date}}. Reason: {{case.revocation_reason}}.</p>','SSA_CAP329'),
    ('LG-TPL-PRELIM-DECISION','Preliminary Decision','LETTER','LG_DECISION','LEGAL','Preliminary Decision - {{case.number}}','<p>The preliminary decision in case {{case.number}} is as follows: {{case.decision_text}}. You have {{case.appeal_window_days}} days to respond.</p>','SSA_CAP329'),
    ('LG-TPL-FINAL-DECISION','Final Decision','LETTER','LG_DECISION','LEGAL','Final Decision - {{case.number}}','<p>The final decision in case {{case.number}} is: {{case.decision_text}}. This decision is binding pursuant to {{legal_reference.citation}}.</p>','SSA_CAP329'),
    ('LG-TPL-APPEAL-DECISION','Appeal Decision','LETTER','LG_DECISION','LEGAL','Appeal Decision - {{case.number}}','<p>Your appeal in case {{case.number}} has been {{case.appeal_outcome}}. Reasons: {{case.appeal_reasons}}.</p>','SSA_CAP329'),
    ('LG-TPL-SHOW-CAUSE','Show Cause Notice','NOTICE','LG_NOTICE','LEGAL','Show Cause Notice','<p>Dear {{employer.name}},</p><p>You are hereby required to SHOW CAUSE within {{case.response_days}} days why action should not be taken under {{legal_reference.citation}} for: {{case.allegation}}.</p>','SSA_S20_REG'),
    ('LG-TPL-WARNING','Warning Notice','NOTICE','LG_NOTICE','LEGAL','Warning Notice','<p>This is a formal WARNING regarding {{case.subject}}. Failure to remedy within {{case.remedy_days}} days will result in further action under {{legal_reference.citation}}.</p>','SSA_S20_REG'),
    ('LG-TPL-BREACH','Breach Notice','NOTICE','LG_NOTICE','LEGAL','Breach Notice','<p>You are in breach of {{legal_reference.citation}} in respect of: {{case.breach_details}}. Remedial action is required by {{case.due_date}}.</p>','SSA_S26_REMIT'),
    ('LG-TPL-INVESTIGATION','Investigation Notice','NOTICE','LG_NOTICE','LEGAL','Investigation Notice','<p>An investigation has been opened regarding {{case.subject}}. You are required to produce the following: {{case.evidence_list}} by {{case.due_date}}.</p>','SSA_CAP329'),
    ('LG-TPL-PENALTY','Penalty Notice','NOTICE','LG_ENFORCEMENT','LEGAL','Penalty Notice - {{case.number}}','<p>A penalty of {{case.penalty_amount}} has been imposed pursuant to {{legal_reference.citation}}. Payable by {{case.due_date}}.</p>','SSA_S46_RECOVERY'),
    ('LG-TPL-FINE','Fine Notice','NOTICE','LG_ENFORCEMENT','LEGAL','Fine Notice - {{case.number}}','<p>A statutory fine of {{case.fine_amount}} is hereby imposed under {{legal_reference.citation}}.</p>','SSA_S46_RECOVERY'),
    ('LG-TPL-APPEAL-ACK','Appeal Acknowledgement','LETTER','LG_APPEAL','LEGAL','Appeal Acknowledgement - {{case.number}}','<p>We acknowledge receipt of your appeal in case {{case.number}} on {{system.date}}. A hearing date will be notified separately.</p>','SSA_CAP329'),
    ('LG-TPL-APPEAL-HEARING','Appeal Hearing Notice','NOTICE','LG_APPEAL','LEGAL','Appeal Hearing Notice - {{case.number}}','<p>The hearing of your appeal in case {{case.number}} is scheduled for {{case.hearing_date}} at {{case.hearing_venue}}.</p>','SSA_CAP329'),
    ('LG-TPL-CERT-COMPLIANCE','Compliance Certificate','LETTER','LG_CERTIFICATE','LEGAL','Compliance Certificate','<p>This certifies that {{employer.name}} (Reg No: {{employer.regno}}) is in compliance with the Social Security Act as of {{system.date}}.</p>','SSA_CAP329'),
    ('LG-TPL-CERT-REGISTRATION','Registration Certificate','LETTER','LG_CERTIFICATE','LEGAL','Registration Certificate','<p>This certifies the registration of {{employer.name}} under Registration No {{employer.regno}}, effective {{employer.commence_date}}.</p>','SSA_CAP329'),
    ('LG-TPL-LEGAL-MEMO','Legal Memo','LETTER','LG_CORRESPONDENCE','LEGAL','Legal Memo - {{case.subject}}','<p>MEMO</p><p>To: {{memo.to}}<br/>From: {{memo.from}}<br/>Re: {{case.subject}}</p><p>{{memo.body}}</p>','SSA_CAP329'),
    -- BENEFITS (11)
    ('BN-TPL-AWARD-APPROVAL','Benefit Award Approval','LETTER','BN_AWARD','BN','Benefit Award Approved','<p>Dear {{person.name}},</p><p>Your application for {{benefit.product}} (Ref: {{benefit.claim_no}}) has been APPROVED. Award amount: {{benefit.amount}} effective {{benefit.start_date}}.</p>','SSA_PART4'),
    ('BN-TPL-AWARD-REJECTION','Benefit Award Rejection','LETTER','BN_AWARD','BN','Benefit Award Decision','<p>Dear {{person.name}},</p><p>Your application for {{benefit.product}} has been DECLINED. Reason: {{benefit.rejection_reason}}. You may appeal within {{benefit.appeal_days}} days.</p>','SSA_PART4'),
    ('BN-TPL-AWARD-SUSPENSION','Benefit Suspension Notice','NOTICE','BN_AWARD','BN','Benefit Suspension Notice','<p>Your {{benefit.product}} benefit has been SUSPENDED effective {{benefit.suspend_date}}. Reason: {{benefit.suspend_reason}}.</p>','SSA_PART4'),
    ('BN-TPL-AWARD-TERMINATION','Benefit Termination Notice','NOTICE','BN_AWARD','BN','Benefit Termination Notice','<p>Your {{benefit.product}} benefit has been TERMINATED effective {{benefit.end_date}}. Reason: {{benefit.termination_reason}}.</p>','SSA_PART4'),
    ('BN-TPL-AWARD-APPEAL','Benefit Appeal Acknowledgement','LETTER','BN_AWARD','BN','Benefit Appeal Acknowledged','<p>We acknowledge receipt of your appeal regarding {{benefit.product}} (Claim {{benefit.claim_no}}). A decision will be communicated within {{benefit.review_days}} days.</p>','SSA_PART4'),
    ('BN-TPL-PAYMENT-NOTICE','Benefit Payment Notice','NOTICE','BN_PAYMENT','BN','Benefit Payment Notice','<p>A payment of {{benefit.amount}} has been issued to you on {{benefit.payment_date}} via {{benefit.payment_method}}.</p>','SSA_PART4'),
    ('BN-TPL-ELIGIBILITY','Benefit Eligibility Notice','LETTER','BN_AWARD','BN','Benefit Eligibility Notice','<p>Based on our records, you are eligible for {{benefit.product}}. Please complete the enclosed application by {{benefit.due_date}}.</p>','SSA_PART4'),
    ('BN-TPL-REVIEW','Benefit Review Notice','NOTICE','BN_REVIEW','BN','Benefit Review Notice','<p>Your {{benefit.product}} benefit is due for review on {{benefit.review_date}}. Please submit the required documents listed enclosed.</p>','SSA_PART4'),
    ('BN-TPL-RENEWAL','Benefit Renewal Notice','NOTICE','BN_REVIEW','BN','Benefit Renewal Notice','<p>Your {{benefit.product}} benefit has been RENEWED for the period {{benefit.start_date}} to {{benefit.end_date}}.</p>','SSA_PART4'),
    ('BN-TPL-OVERPAYMENT','Benefit Overpayment Notice','NOTICE','BN_RECOVERY','BN','Benefit Overpayment Notice','<p>An overpayment of {{benefit.overpayment_amount}} has been identified for the period {{benefit.period}}. Repayment is required by {{benefit.due_date}} pursuant to {{legal_reference.citation}}.</p>','SSA_S46_RECOVERY'),
    ('BN-TPL-RECOVERY','Benefit Recovery Notice','NOTICE','BN_RECOVERY','BN','Benefit Recovery Notice','<p>Recovery action has commenced for outstanding overpayment of {{benefit.overpayment_amount}} under {{legal_reference.citation}}.</p>','SSA_S46_RECOVERY'),
    -- COMPLIANCE (8)
    ('CE-TPL-WARNING','Compliance Warning','NOTICE','CE_WARNING','CE','Compliance Warning','<p>Dear {{employer.name}},</p><p>You are warned regarding non-compliance with {{compliance.requirement}}. Remedy required by {{compliance.due_date}}.</p>','SSA_S20_REG'),
    ('CE-TPL-INVESTIGATION','Compliance Investigation Notice','NOTICE','CE_INVESTIGATION','CE','Compliance Investigation Notice','<p>A compliance investigation has been initiated regarding {{compliance.subject}}. You are required to make available: {{compliance.evidence_list}}.</p>','SSA_CAP329'),
    ('CE-TPL-FINDING','Compliance Finding','LETTER','CE_FINDING','CE','Compliance Finding - {{compliance.case_no}}','<p>Following investigation, the following findings have been made: {{compliance.findings}}. Severity: {{compliance.severity}}.</p>','SSA_CAP329'),
    ('CE-TPL-BREACH','Compliance Breach Notice','NOTICE','CE_FINDING','CE','Compliance Breach Notice','<p>A breach of {{legal_reference.citation}} has been confirmed. Breach type: {{compliance.breach_type}}.</p>','SSA_S26_REMIT'),
    ('CE-TPL-CLOSURE','Compliance Closure Notice','LETTER','CE_FINDING','CE','Compliance Case Closure','<p>Compliance case {{compliance.case_no}} has been CLOSED. Outcome: {{compliance.outcome}}.</p>','SSA_CAP329'),
    ('CE-TPL-ESCALATION','Compliance Escalation Notice','NOTICE','CE_INVESTIGATION','CE','Compliance Escalation Notice','<p>Compliance case {{compliance.case_no}} has been ESCALATED to {{compliance.escalation_level}} due to {{compliance.escalation_reason}}.</p>','SSA_CAP329'),
    ('CE-TPL-AUDIT-RESULT','Compliance Audit Result','LETTER','CE_AUDIT','CE','Compliance Audit Result','<p>The audit conducted on {{compliance.audit_date}} has concluded with rating {{compliance.audit_rating}}. Detailed findings enclosed.</p>','SSA_CAP329'),
    ('CE-TPL-REMEDIATION','Compliance Remediation Notice','NOTICE','CE_REMEDIATION','CE','Compliance Remediation Notice','<p>You are required to complete the following remediation actions by {{compliance.remediation_due}}: {{compliance.remediation_actions}}.</p>','SSA_CAP329')
    ) AS t(code, name, template_type, cat_code, module_code, subject, body_html, ref_code)
  LOOP
    -- skip if exists
    IF EXISTS (SELECT 1 FROM public.core_template WHERE code = rec.code) THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_cat_id FROM public.core_template_category WHERE code = rec.cat_code;

    INSERT INTO public.core_template (
      code, name, description, module_code, module_name, country_code, institution_code,
      template_type, template_category, category_id, status, default_layout_id, scope,
      source_system, is_active, created_by
    ) VALUES (
      rec.code, rec.name, rec.name, rec.module_code,
      CASE rec.module_code WHEN 'LEGAL' THEN 'Legal' WHEN 'BN' THEN 'Benefits' WHEN 'CE' THEN 'Compliance' END,
      'KN','SSB', rec.template_type, rec.cat_code, v_cat_id, 'ACTIVE', v_layout, 'COUNTRY',
      'CORE', true, 'SEED-FRAMEWORK'
    ) RETURNING id INTO v_tpl_id;

    INSERT INTO public.core_template_version (
      template_id, version_no, status, subject, body_html, body_text, layout_id,
      change_summary, published_at, published_by, created_by
    ) VALUES (
      v_tpl_id, 1, 'PUBLISHED', rec.subject, rec.body_html, regexp_replace(rec.body_html, '<[^>]+>', '', 'g'),
      v_layout, 'Initial seed', now(), 'SEED-FRAMEWORK', 'SEED-FRAMEWORK'
    ) RETURNING id INTO v_ver_id;

    UPDATE public.core_template SET active_version_id = v_ver_id WHERE id = v_tpl_id;

    -- default PDF channel variant
    INSERT INTO public.core_template_channel_variant (template_version_id, channel_code, subject, body_html, body_text, is_default)
    VALUES (v_ver_id, 'PDF', rec.subject, rec.body_html, regexp_replace(rec.body_html, '<[^>]+>', '', 'g'), true);

    -- legal reference link if mapping exists
    IF rec.ref_code IS NOT NULL THEN
      SELECT id INTO v_ref FROM public.core_legal_reference WHERE ref_code = rec.ref_code AND country_code = 'SKN' AND is_active = true LIMIT 1;
      IF v_ref IS NOT NULL THEN
        INSERT INTO public.core_template_legal_reference (template_id, template_version_id, legal_reference_id, required_flag, display_order, created_by)
        VALUES (v_tpl_id, v_ver_id, v_ref, true, 1, 'SEED-FRAMEWORK')
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  -- Fix the one missing legal reference link
  SELECT id INTO v_ref FROM public.core_legal_reference WHERE ref_code = 'SSA_CAP329' AND country_code='SKN' LIMIT 1;
  IF v_ref IS NOT NULL THEN
    INSERT INTO public.core_template_legal_reference (template_id, template_version_id, legal_reference_id, required_flag, display_order, created_by)
    SELECT t.id, t.active_version_id, v_ref, false, 1, 'SEED-FRAMEWORK'
    FROM public.core_template t
    WHERE t.code = 'LG-TPL-EVIDENCE-COVER'
      AND NOT EXISTS (SELECT 1 FROM public.core_template_legal_reference x WHERE x.template_id = t.id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
