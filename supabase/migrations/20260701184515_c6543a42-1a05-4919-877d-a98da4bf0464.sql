
WITH bl AS (
  SELECT code, id FROM public.core_template_layout
),
seed(code, name, description, module_code, template_type, layout_code) AS (
  VALUES
    -- ORG / System
    ('ORG-EMAIL-WELCOME',        'Welcome Email',                       'Welcome message on account creation.',           'ORG',        'EMAIL',   'BASE_EMAIL'),
    ('ORG-EMAIL-PASSWORD-RESET', 'Password Reset Email',                'Password reset link.',                            'ORG',        'EMAIL',   'BASE_EMAIL'),
    ('ORG-EMAIL-OTP',            'OTP / MFA Email',                     'One-time passcode for MFA.',                     'ORG',        'EMAIL',   'BASE_EMAIL'),
    ('ORG-EMAIL-ACCOUNT-CREATED','Account Created Email',               'Confirmation that an account was created.',      'ORG',        'EMAIL',   'BASE_EMAIL'),
    ('ORG-EMAIL-GENERIC',        'Generic Notification Email',          'Reusable generic notification email shell.',     'ORG',        'EMAIL',   'BASE_EMAIL'),
    ('ORG-INAPP-GENERIC',        'Generic In-App Notification',         'Reusable in-app notification.',                  'ORG',        'IN_APP',  'BASE_IN_APP'),

    -- EMPLOYER
    ('EMPLOYER-EMAIL-REG-APPROVED', 'Employer Registration Approved',   'Approval email after employer registration.',    'EMPLOYER',   'EMAIL',   'BASE_EMAIL'),
    ('EMPLOYER-EMAIL-REG-REJECTED', 'Employer Registration Rejected',   'Rejection email after employer registration.',   'EMPLOYER',   'EMAIL',   'BASE_EMAIL'),
    ('EMPLOYER-NOTICE-CONTRIB-REMINDER','Contribution Reminder Notice', 'Reminder that contributions are due.',           'EMPLOYER',   'NOTICE',  'BASE_NOTICE'),
    ('EMPLOYER-NOTICE-COMPLIANCE',  'Employer Compliance Notice',       'General compliance notice to employer.',         'EMPLOYER',   'NOTICE',  'BASE_NOTICE'),

    -- MEMBER
    ('MEMBER-EMAIL-REG-CONFIRM',    'Member Registration Confirmation', 'Confirmation of member registration.',           'MEMBER',     'EMAIL',   'BASE_EMAIL'),
    ('MEMBER-EMAIL-STATEMENT',      'Member Statement Notification',    'Statement is ready notification.',               'MEMBER',     'EMAIL',   'BASE_EMAIL'),
    ('MEMBER-LETTER-BENEFIT-COMM',  'Member Benefit Communication',     'Benefit-related communication.',                 'MEMBER',     'LETTER',  'BASE_LETTER'),

    -- BENEFITS
    ('BENEFITS-EMAIL-CLAIM-RECEIVED','Benefit Claim Received',          'Acknowledgement of benefit claim receipt.',      'BENEFITS',   'EMAIL',   'BASE_EMAIL'),
    ('BENEFITS-LETTER-APPROVAL',    'Benefit Approval Letter',          'Approval letter for a benefit claim.',           'BENEFITS',   'LETTER',  'BASE_LETTER'),
    ('BENEFITS-LETTER-REJECTION',   'Benefit Rejection Letter',         'Rejection letter for a benefit claim.',          'BENEFITS',   'LETTER',  'BASE_LETTER'),
    ('BENEFITS-NOTICE-DOC-REQUEST', 'Request for Documents',            'Request additional documents for a claim.',      'BENEFITS',   'NOTICE',  'BASE_NOTICE'),
    ('BENEFITS-EMAIL-PAYMENT',      'Benefit Payment Notification',     'Notification that a benefit payment was sent.',  'BENEFITS',   'EMAIL',   'BASE_EMAIL'),

    -- COMPLIANCE
    ('COMPLIANCE-NOTICE-INVESTIGATION','Compliance Investigation Notice','Notice of investigation.',                       'COMPLIANCE', 'NOTICE',  'BASE_NOTICE'),
    ('COMPLIANCE-NOTICE-INFO-REQUEST','Compliance Request for Information','Request for information.',                     'COMPLIANCE', 'NOTICE',  'BASE_NOTICE'),
    ('COMPLIANCE-LETTER-FINDING',   'Compliance Finding Letter',        'Findings letter after audit / inspection.',      'COMPLIANCE', 'LETTER',  'BASE_LETTER'),
    ('COMPLIANCE-EMAIL-ESCALATION', 'Compliance Escalation Email',      'Escalation notification.',                       'COMPLIANCE', 'EMAIL',   'BASE_EMAIL'),

    -- LEGAL (fill missing standards)
    ('LEGAL-NOTICE-HEARING',        'Legal Hearing Notice',             'Formal hearing notice.',                         'LEGAL',      'NOTICE',  'BASE_NOTICE'),
    ('LEGAL-NOTICE-DEMAND',         'Legal Demand Notice',              'Formal demand notice.',                          'LEGAL',      'NOTICE',  'BASE_NOTICE'),
    ('LEGAL-LETTER-REFERRAL-RESP',  'Legal Referral Response',          'Response to a legal referral.',                  'LEGAL',      'LETTER',  'BASE_LETTER'),
    ('LEGAL-LETTER-DECISION-ORDER', 'Legal Decision / Order Letter',    'Decision / order letter.',                       'LEGAL',      'LETTER',  'BASE_LETTER'),
    ('LEGAL-NOTICE-INFO-REQUEST',   'Legal Request for Information',    'Request for information from a party.',          'LEGAL',      'NOTICE',  'BASE_NOTICE'),
    ('LEGAL-NOTICE-CASE-CLOSURE',   'Legal Case Closure Notice',        'Case closure notice.',                           'LEGAL',      'NOTICE',  'BASE_NOTICE'),

    -- PAYMENTS
    ('PAYMENTS-RECEIPT',            'Payment Receipt',                  'Standard payment receipt.',                      'PAYMENTS',   'RECEIPT', 'BASE_RECEIPT'),
    ('PAYMENTS-EMAIL-FAILED',       'Payment Failure Notification',     'Notification that a payment failed.',            'PAYMENTS',   'EMAIL',   'BASE_EMAIL'),
    ('PAYMENTS-EMAIL-REFUND',       'Refund Notification',              'Notification that a refund has been issued.',    'PAYMENTS',   'EMAIL',   'BASE_EMAIL'),

    -- REPORTS
    ('REPORTS-EMAIL-READY',         'Report Ready Notification',        'Notification that a report is ready.',           'REPORTS',    'EMAIL',   'BASE_EMAIL'),
    ('REPORTS-PDF-STATEMENT',       'Statement PDF Template',           'PDF statement template.',                        'REPORTS',    'STATEMENT','BASE_STATEMENT')
)
INSERT INTO public.core_template
  (code, name, description, module_code, template_type, status, is_active, scope, owner_scope, default_layout_id, created_by, updated_by)
SELECT
  s.code, s.name, s.description, s.module_code, s.template_type,
  'ACTIVE', true, 'COUNTRY', 'GLOBAL',
  bl.id,
  'SEED-CORE', 'SEED-CORE'
FROM seed s
JOIN bl ON bl.code = s.layout_code
WHERE NOT EXISTS (
  SELECT 1 FROM public.core_template t WHERE t.code = s.code
);
