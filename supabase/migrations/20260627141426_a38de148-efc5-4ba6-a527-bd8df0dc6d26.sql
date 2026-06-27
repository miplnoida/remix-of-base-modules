
-- Seed reusable text blocks per module. Safe to re-run.
WITH seed(code, name, module_code, category, content_text, content_html) AS (
  VALUES
    -- Global / Org
    ('GLOBAL.DISCLAIMER','Standard Disclaimer','core','disclaimer',
      'This document is issued by the Social Security Enterprise System. Information contained herein is confidential.',
      '<p>This document is issued by the <strong>Social Security Enterprise System</strong>. Information contained herein is confidential and intended solely for the named recipient.</p>'),
    ('GLOBAL.CONFIDENTIALITY','Confidentiality Notice','core','notice',
      'The information in this communication is confidential and may be legally privileged.',
      '<p>The information in this communication is <em>confidential</em> and may be legally privileged. If you are not the intended recipient, please notify the sender and delete this message.</p>'),
    ('GLOBAL.PRIVACY_NOTICE','Privacy Notice','core','notice',
      'Personal data is processed in accordance with the Data Protection Act.',
      '<p>Your personal data is processed in accordance with the <strong>Data Protection Act</strong>. For details on how we handle your information, please refer to our Privacy Policy.</p>'),
    ('GLOBAL.APPEAL_RIGHTS','Appeal Rights','core','notice',
      'You may appeal this decision within 30 days by submitting a written request.',
      '<p>You may appeal this decision within <strong>30 days</strong> by submitting a written request to the Appeals Tribunal at the address above.</p>'),
    ('GLOBAL.FOOTER_ADDRESS','Footer — Office Address','core','footer',
      'Social Security Board — Head Office. Tel: (869) 000-0000.',
      '<p style="text-align:center"><small>Social Security Board — Head Office · Tel: (869) 000-0000 · www.example.gov</small></p>'),
    ('GLOBAL.SIGNATURE_BLOCK','Standard Signature Block','core','footer',
      'Yours sincerely, Authorised Officer.',
      '<p>Yours sincerely,</p><p>&nbsp;</p><p><strong>{{officer_name}}</strong><br/>{{officer_title}}</p>'),

    -- Payments
    ('PAY.RECEIPT_FOOTER','Receipt Footer','payments','footer',
      'Thank you for your payment. Please retain this receipt for your records.',
      '<p style="text-align:center"><em>Thank you for your payment. Please retain this receipt for your records.</em></p>'),
    ('PAY.STATEMENT_DISCLAIMER','Statement Disclaimer','payments','disclaimer',
      'This statement reflects contributions received as of the print date. Subsequent adjustments may apply.',
      '<p>This statement reflects contributions received as of the print date. Subsequent adjustments may apply.</p>'),
    ('PAY.LATE_PAYMENT_NOTICE','Late Payment Notice','payments','warning',
      'Payments received after the due date are subject to interest and penalties.',
      '<p><strong>Notice:</strong> Payments received after the due date are subject to interest and penalties under the Social Security Act.</p>'),
    ('PAY.REFUND_POLICY','Refund Policy','payments','notice',
      'Refunds are processed within 14 business days of approval.',
      '<p>Refunds are processed within <strong>14 business days</strong> of approval and credited to the originating payment method.</p>'),
    ('PAY.PAYMENT_INSTRUCTIONS','Payment Instructions','payments','instruction',
      'Please quote the reference number when making any payment.',
      '<ol><li>Quote the reference number on all payments.</li><li>Payments may be made by cash, cheque, or bank transfer.</li><li>Retain proof of payment.</li></ol>'),

    -- C3 Management
    ('C3.FILING_INSTRUCTIONS','C3 Filing Instructions','c3-management','instruction',
      'Submit your C3 return by the 14th of the following month.',
      '<p>Submit your C3 return by the <strong>14th of the following month</strong>. Late filings attract penalties.</p>'),
    ('C3.AMENDMENT_NOTICE','C3 Amendment Notice','c3-management','notice',
      'Amendments to a filed C3 require supporting documentation and supervisor approval.',
      '<p>Amendments to a filed C3 require supporting documentation and supervisor approval before posting.</p>'),
    ('C3.DIRECTOR_DECLARATION','Director Declaration','c3-management','consent',
      'I declare that the wages reported are true and complete to the best of my knowledge.',
      '<p>I, the undersigned director, declare that the wages reported are <strong>true and complete</strong> to the best of my knowledge.</p>'),
    ('C3.LATE_FILING_WARNING','Late Filing Warning','c3-management','warning',
      'Failure to file the C3 on time constitutes an offence under the Social Security Act.',
      '<p><strong>Warning:</strong> Failure to file the C3 on time constitutes an offence under the Social Security Act.</p>'),

    -- Compliance
    ('CE.VIOLATION_NOTICE','Violation Notice','compliance','notice',
      'A compliance violation has been recorded against the above account.',
      '<p>A compliance violation has been recorded against the above account. Please respond within the period specified.</p>'),
    ('CE.CASE_OPENING','Case Opening Letter','compliance','notice',
      'A compliance case has been opened. You are required to respond within 14 days.',
      '<p>A compliance case has been opened in respect of the above matter. You are required to respond within <strong>14 days</strong> from the date of this notice.</p>'),
    ('CE.HEARING_NOTICE','Hearing Notice','compliance','notice',
      'You are required to attend a hearing on the date and time stated below.',
      '<p>You are required to attend a compliance hearing on the date and time stated below. Failure to attend may result in adverse findings.</p>'),
    ('CE.SETTLEMENT_TERMS','Settlement Terms','compliance','consent',
      'The terms of settlement are binding upon acceptance.',
      '<p>The terms of settlement, once accepted, are binding upon both parties and enforceable under law.</p>'),
    ('CE.LEGAL_ESCALATION','Legal Escalation Notice','compliance','warning',
      'This matter will be referred to the Legal Department for further action.',
      '<p><strong>Final Notice:</strong> This matter will be referred to the Legal Department for further action if not resolved within 7 days.</p>'),

    -- Benefits (BN)
    ('BN.CLAIM_INSTRUCTIONS','Benefit Claim Instructions','benefits','instruction',
      'Submit all required documents to the nearest branch office.',
      '<ol><li>Complete the claim form in full.</li><li>Attach supporting documents.</li><li>Submit at the nearest branch office.</li></ol>'),
    ('BN.SICKNESS_DISCLAIMER','Sickness Benefit Disclaimer','benefits','disclaimer',
      'Sickness benefit is payable subject to medical certification and contribution conditions.',
      '<p>Sickness benefit is payable subject to medical certification and satisfaction of the contribution conditions.</p>'),
    ('BN.MATERNITY_NOTICE','Maternity Benefit Notice','benefits','notice',
      'Maternity benefit is payable for up to 13 weeks subject to eligibility.',
      '<p>Maternity benefit is payable for up to <strong>13 weeks</strong> subject to eligibility and supporting documentation.</p>'),
    ('BN.PENSION_DECLARATION','Pension Life Declaration','benefits','consent',
      'I declare that I am alive and entitled to continue receiving pension benefits.',
      '<p>I, the undersigned beneficiary, declare that I am alive and entitled to continue receiving pension benefits.</p>'),
    ('BN.MEDICAL_PRIVACY','Medical Information Privacy','benefits','notice',
      'Medical information is collected solely for benefit assessment and treated as confidential.',
      '<p>Medical information is collected solely for benefit assessment and is treated as strictly <em>confidential</em>.</p>'),
    ('BN.REIMBURSEMENT_TERMS','Medical Reimbursement Terms','benefits','disclaimer',
      'Reimbursements are limited to the published tariff and approved procedures.',
      '<p>Reimbursements are limited to the published tariff and approved procedures. Excess amounts are the responsibility of the patient.</p>'),

    -- Employers
    ('ER.REGISTRATION_WELCOME','Employer Registration Welcome','employers','notice',
      'Welcome. Your employer registration has been received and is being processed.',
      '<p>Welcome. Your employer registration has been received and is being processed. You will receive your permanent employer number once approved.</p>'),
    ('ER.CESSATION_NOTICE','Employer Cessation Notice','employers','notice',
      'Notification of cessation of business must be filed within 14 days.',
      '<p>Notification of cessation of business must be filed within <strong>14 days</strong> of the effective date.</p>'),
    ('ER.OBLIGATIONS_REMINDER','Employer Obligations Reminder','employers','instruction',
      'As an employer you are required to file C3 returns and remit contributions monthly.',
      '<p>As an employer you are required to:</p><ul><li>File C3 returns monthly</li><li>Remit contributions by the 14th</li><li>Maintain accurate wage records</li></ul>'),

    -- Contributors / IP
    ('IP.REGISTRATION_WELCOME','Contributor Registration Welcome','contributors','notice',
      'Welcome. Your registration as an insured person has been received.',
      '<p>Welcome. Your registration as an <strong>insured person</strong> has been received and is being processed.</p>'),
    ('IP.CARD_INSTRUCTIONS','Social Security Card Instructions','contributors','instruction',
      'Please carry your social security card whenever visiting our offices.',
      '<p>Please carry your social security card whenever visiting our offices. Report loss or theft of your card immediately.</p>'),
    ('IP.DEPENDANT_DECLARATION','Dependant Declaration','contributors','consent',
      'I declare that the dependants listed are accurate and dependent on me for support.',
      '<p>I declare that the dependants listed are accurate and dependent on me for support.</p>'),

    -- Self-Employed
    ('SE.REGISTRATION_WELCOME','Self-Employed Registration Welcome','self-employed','notice',
      'Welcome. Your self-employed registration has been received.',
      '<p>Welcome. Your <strong>self-employed</strong> registration has been received and is being processed.</p>'),
    ('SE.WAGE_CATEGORY_NOTICE','Wage Category Notice','self-employed','notice',
      'Your selected wage category determines the contribution due each month.',
      '<p>Your selected wage category determines the contribution due each month. You may request a change once per calendar year.</p>'),

    -- Online Applications
    ('OA.SUBMISSION_RECEIPT','Online Submission Receipt','online-applications','notice',
      'Your application has been received. Please retain the reference number for follow-up.',
      '<p>Your application has been received. Please retain the reference number <strong>{{reference_no}}</strong> for follow-up.</p>'),
    ('OA.APPROVAL_NOTICE','Application Approval Notice','online-applications','notice',
      'We are pleased to inform you that your application has been approved.',
      '<p>We are pleased to inform you that your application has been <strong>approved</strong>.</p>'),
    ('OA.REJECTION_NOTICE','Application Rejection Notice','online-applications','notice',
      'After careful review, your application has not been approved.',
      '<p>After careful review, your application has not been approved. Please refer to the reasons stated and your right of appeal.</p>'),

    -- Meetings
    ('MT.AGENDA_HEADER','Meeting Agenda Header','meetings','header',
      'Agenda for the meeting scheduled on the date below.',
      '<h3 style="text-align:center">Agenda</h3><p style="text-align:center">{{meeting_date}}</p>'),
    ('MT.MINUTES_FOOTER','Meeting Minutes Footer','meetings','footer',
      'Minutes recorded by the Secretary and approved by the Chair.',
      '<p><em>Minutes recorded by the Secretary and approved by the Chair.</em></p>'),

    -- Notifications
    ('NOTIF.EMAIL_FOOTER','Notification Email Footer','notifications','footer',
      'This is an automated message. Do not reply.',
      '<p style="text-align:center"><small>This is an automated message. Please do not reply directly. For assistance, contact our help desk.</small></p>'),
    ('NOTIF.SMS_BRAND_TAG','SMS Brand Tag','notifications','footer',
      '— Social Security',
      '<p>— Social Security</p>'),

    -- Legal
    ('LG.PRIVACY_POLICY','Privacy Policy Reference','legal','notice',
      'Refer to our published Privacy Policy for details on data handling.',
      '<p>Refer to our published <a href="#">Privacy Policy</a> for details on data handling.</p>'),
    ('LG.TERMS_OF_USE','Terms of Use Reference','legal','notice',
      'Use of our services is subject to the published Terms of Use.',
      '<p>Use of our services is subject to the published <a href="#">Terms of Use</a>.</p>'),
    ('LG.DATA_RETENTION','Data Retention Notice','legal','notice',
      'Records are retained in accordance with statutory retention periods.',
      '<p>Records are retained in accordance with statutory retention periods, after which they are securely destroyed.</p>')
)
INSERT INTO public.core_text_block (
  text_block_code, name, module_code, category,
  content_text, content_html,
  language_code, version_no, is_active
)
SELECT code, name, module_code, category, content_text, content_html, 'en', 1, true
FROM seed
ON CONFLICT (text_block_code, language_code, version_no) DO NOTHING;
