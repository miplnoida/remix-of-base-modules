
-- Seed comprehensive email templates covering all identified workflow scenarios
-- Uses ON CONFLICT DO NOTHING so re-running is safe

INSERT INTO public.notification_templates
  (name, template_code, channel, subject, body, html_body, category, trigger_event, description, is_enabled, placeholders, version_no)
VALUES

-- ═══════════════════════════════════════════════════════
-- MODULE: INSURED PERSON REGISTRATION
-- ═══════════════════════════════════════════════════════

('IP Registration Submitted', 'IP_REG_SUBMITTED', 'email',
 'Application Received – {{REF_NUMBER}}',
 'Dear {{APPLICANT_NAME}}, your insured person registration application {{REF_NUMBER}} has been received and is under review.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px 0;">Thank you for submitting your registration application. We have received it and it is currently under review by our team.</p>
<div style="background:#f0f4fa;border:1px solid #c3d3e8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <h3 style="color:#1a3353;margin:0 0 12px 0;font-size:15px;">Application Details</h3>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Reference Number:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{REF_NUMBER}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Submission Date:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{TODAY}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Status:</td><td style="color:#e07b00;font-size:13px;padding:5px 0;font-weight:bold;">Under Review</td></tr>
  </table>
</div>
<div style="background:#e8f4fd;border:1px solid #b3d7f0;border-radius:6px;padding:14px;margin-bottom:20px;">
  <p style="color:#1a5276;font-size:13px;margin:0;"><strong>Next Steps:</strong> {{NEXT_STEPS}}</p>
</div>
<p style="color:#777;font-size:13px;">If you need assistance, please contact us at <a href="mailto:{{OFFICE_EMAIL}}" style="color:#1a3353;">{{OFFICE_EMAIL}}</a> or call {{OFFICE_PHONE}}.</p>',
 'informational', 'ip_registration_submitted',
 'Sent to applicant upon successful submission of IP registration form.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{TODAY}}"},{"key":"{{NEXT_STEPS}}"},{"key":"{{OFFICE_EMAIL}}"},{"key":"{{OFFICE_PHONE}}"}]', 1),

('IP Meeting Scheduled', 'IP_MEETING_SCHEDULED', 'email',
 'Appointment Scheduled – {{REF_NUMBER}}',
 'Dear {{APPLICANT_NAME}}, your appointment for registration application {{REF_NUMBER}} has been scheduled.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Your appointment has been scheduled for your registration application <strong>{{REF_NUMBER}}</strong>.</p>
<div style="background:#f0faf4;border:1px solid #b7dfc8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <h3 style="color:#1a7a45;margin:0 0 12px 0;font-size:15px;">Appointment Details</h3>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Date:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{MEETING_DATE}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Time:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{MEETING_TIME}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Location:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{MEETING_LOCATION}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Meeting With:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{MEETING_WITH}}</td></tr>
  </table>
</div>
<div style="background:#fef9e7;border:1px solid #f7dc6f;border-radius:6px;padding:14px;margin-bottom:12px;">
  <p style="color:#7d6608;font-size:13px;margin:0;"><strong>Note:</strong> {{REMARKS}}</p>
</div>
<div style="background:#e8f4fd;border:1px solid #b3d7f0;border-radius:6px;padding:14px;margin-bottom:20px;">
  <p style="color:#1a5276;font-size:13px;margin:0;"><strong>Important:</strong> Please bring all original documents and valid photo ID to your appointment.</p>
</div>
<p style="color:#777;font-size:13px;">If you need to reschedule, please contact our office.</p>',
 'informational', 'ip_meeting_scheduled',
 'Sent to applicant when an appointment is scheduled for their registration.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{MEETING_DATE}}"},{"key":"{{MEETING_TIME}}"},{"key":"{{MEETING_LOCATION}}"},{"key":"{{MEETING_WITH}}"},{"key":"{{REMARKS}}"}]', 1),

('IP Meeting Rescheduled', 'IP_MEETING_RESCHEDULED', 'email',
 'Appointment Rescheduled – {{REF_NUMBER}}',
 'Dear {{APPLICANT_NAME}}, your appointment for {{REF_NUMBER}} has been rescheduled.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Your appointment for registration application <strong>{{REF_NUMBER}}</strong> has been <strong>rescheduled</strong>. Please find the updated details below.</p>
<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:20px;margin-bottom:20px;">
  <h3 style="color:#e65100;margin:0 0 12px 0;font-size:15px;">Updated Appointment Details</h3>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">New Date:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{MEETING_DATE}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">New Time:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{MEETING_TIME}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Location:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{MEETING_LOCATION}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Meeting With:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{MEETING_WITH}}</td></tr>
  </table>
</div>
<div style="background:#fef9e7;border:1px solid #f7dc6f;border-radius:6px;padding:14px;margin-bottom:20px;">
  <p style="color:#7d6608;font-size:13px;margin:0;"><strong>Reason for Rescheduling:</strong> {{REMARKS}}</p>
</div>
<p style="color:#777;font-size:13px;">If you have any concerns, please contact us at {{OFFICE_EMAIL}} or {{OFFICE_PHONE}}.</p>',
 'informational', 'ip_meeting_rescheduled',
 'Sent when a previously scheduled IP registration meeting is rescheduled.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{MEETING_DATE}}"},{"key":"{{MEETING_TIME}}"},{"key":"{{MEETING_LOCATION}}"},{"key":"{{MEETING_WITH}}"},{"key":"{{REMARKS}}"},{"key":"{{OFFICE_EMAIL}}"},{"key":"{{OFFICE_PHONE}}"}]', 1),

('IP Meeting Cancelled', 'IP_MEETING_CANCELLED', 'email',
 'Appointment Cancelled – {{REF_NUMBER}}',
 'Dear {{APPLICANT_NAME}}, your appointment for {{REF_NUMBER}} has been cancelled.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Your appointment for registration application <strong>{{REF_NUMBER}}</strong> has been <strong>cancelled</strong>.</p>
<div style="background:#fdf2f8;border:1px solid #e8b4cf;border-radius:8px;padding:16px;margin-bottom:20px;">
  <p style="color:#641e47;font-size:13px;margin:0;"><strong>Reason:</strong> {{REMARKS}}</p>
</div>
<p style="color:#555;font-size:14px;margin-bottom:16px;">{{NEXT_STEPS}}</p>
<p style="color:#777;font-size:13px;">To reschedule, please contact us at {{OFFICE_EMAIL}} or call {{OFFICE_PHONE}}.</p>',
 'informational', 'ip_meeting_cancelled',
 'Sent when a scheduled IP registration appointment is cancelled.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{REMARKS}}"},{"key":"{{NEXT_STEPS}}"},{"key":"{{OFFICE_EMAIL}}"},{"key":"{{OFFICE_PHONE}}"}]', 1),

('IP Registration Approved', 'IP_REG_APPROVED', 'email',
 'Registration Approved – {{REF_NUMBER}}',
 'Dear {{APPLICANT_NAME}}, congratulations! Your insured person registration has been approved.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">We are pleased to inform you that your insured person registration application <strong>{{REF_NUMBER}}</strong> has been <strong style="color:#1a7a45;">approved</strong>.</p>
<div style="background:#f0faf4;border:1px solid #b7dfc8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <h3 style="color:#1a7a45;margin:0 0 12px 0;font-size:15px;">Registration Details</h3>
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Reference:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{REF_NUMBER}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">SSN:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{SSN}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Status:</td><td style="color:#1a7a45;font-size:13px;padding:5px 0;font-weight:bold;">Approved</td></tr>
  </table>
</div>
<div style="background:#e8f4fd;border:1px solid #b3d7f0;border-radius:6px;padding:14px;margin-bottom:20px;">
  <p style="color:#1a5276;font-size:13px;margin:0;"><strong>Next Steps:</strong> {{NEXT_STEPS}}</p>
</div>
<p style="color:#777;font-size:13px;">Thank you for registering with the Social Security Board.</p>',
 'approval-notification', 'ip_registration_approved',
 'Sent when IP registration application is approved.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{SSN}}"},{"key":"{{NEXT_STEPS}}"}]', 1),

('IP Registration Rejected', 'IP_REG_REJECTED', 'email',
 'Registration Update – {{REF_NUMBER}}',
 'Dear {{APPLICANT_NAME}}, we regret to inform you that your registration application has not been approved at this time.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">After reviewing your registration application <strong>{{REF_NUMBER}}</strong>, we regret to inform you that it has not been approved at this time.</p>
<div style="background:#fdf2f2;border:1px solid #f5c6cb;border-radius:8px;padding:20px;margin-bottom:20px;">
  <h3 style="color:#c0392b;margin:0 0 12px 0;font-size:15px;">Reason for Decision</h3>
  <p style="color:#555;font-size:13px;margin:0;">{{REJECTION_REASON}}</p>
</div>
<div style="background:#e8f4fd;border:1px solid #b3d7f0;border-radius:6px;padding:14px;margin-bottom:20px;">
  <p style="color:#1a5276;font-size:13px;margin:0;"><strong>What you can do:</strong> {{NEXT_STEPS}}</p>
</div>
<p style="color:#777;font-size:13px;">If you believe this decision is incorrect, you may appeal by contacting our office at {{OFFICE_EMAIL}}.</p>',
 'rejection-notification', 'ip_registration_rejected',
 'Sent when IP registration application is rejected.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{REJECTION_REASON}}"},{"key":"{{NEXT_STEPS}}"},{"key":"{{OFFICE_EMAIL}}"}]', 1),

('IP Documents Required', 'IP_DOCUMENTS_REQUIRED', 'email',
 'Additional Documents Required – {{REF_NUMBER}}',
 'Dear {{APPLICANT_NAME}}, we require additional documents to process your registration application {{REF_NUMBER}}.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">To continue processing your registration application <strong>{{REF_NUMBER}}</strong>, we require the following additional documents:</p>
<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:20px;margin-bottom:20px;">
  <h3 style="color:#e65100;margin:0 0 12px 0;font-size:15px;">Required Documents</h3>
  <p style="color:#555;font-size:13px;line-height:1.8;margin:0;">{{DOCUMENT_LIST}}</p>
</div>
<div style="background:#e8f4fd;border:1px solid #b3d7f0;border-radius:6px;padding:14px;margin-bottom:20px;">
  <p style="color:#1a5276;font-size:13px;margin:0;"><strong>Submission Deadline:</strong> {{DUE_DATE}}<br><strong>How to submit:</strong> {{NEXT_STEPS}}</p>
</div>
<p style="color:#777;font-size:13px;">Failure to provide documents by the deadline may result in your application being placed on hold.</p>',
 'action-required', 'ip_document_required',
 'Sent when additional documents are needed for IP registration.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{DOCUMENT_LIST}}"},{"key":"{{DUE_DATE}}"},{"key":"{{NEXT_STEPS}}"}]', 1),

('IP Account Activated', 'IP_ACCOUNT_ACTIVATED', 'email',
 'Your Social Security Account is Active – {{SSN}}',
 'Dear {{APPLICANT_NAME}}, your Social Security account has been activated.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Congratulations! Your Social Security account has been successfully <strong style="color:#1a7a45;">activated</strong>.</p>
<div style="background:#f0faf4;border:1px solid #b7dfc8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Social Security Number:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{SSN}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Activation Date:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{TODAY}}</td></tr>
  </table>
</div>
<p style="color:#555;font-size:14px;margin-bottom:16px;">You are now entitled to contribute to and receive benefits from the Social Security Board. {{NEXT_STEPS}}</p>
<p style="color:#777;font-size:13px;">For any queries, please contact us at {{OFFICE_EMAIL}} or {{OFFICE_PHONE}}.</p>',
 'approval-notification', 'ip_account_activated',
 'Sent when insured person account is activated in the system.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{SSN}}"},{"key":"{{TODAY}}"},{"key":"{{NEXT_STEPS}}"},{"key":"{{OFFICE_EMAIL}}"},{"key":"{{OFFICE_PHONE}}"}]', 1),

-- ═══════════════════════════════════════════════════════
-- MODULE: EMPLOYER REGISTRATION
-- ═══════════════════════════════════════════════════════

('Employer Registration Submitted', 'EMP_REG_SUBMITTED', 'email',
 'Employer Registration Received – {{REF_NUMBER}}',
 'Dear {{EMPLOYER_NAME}}, your employer registration application {{REF_NUMBER}} has been successfully submitted.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{EMPLOYER_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Thank you for submitting your employer registration application. Your reference number is <strong>{{REF_NUMBER}}</strong>.</p>
<div style="background:#f0f4fa;border:1px solid #c3d3e8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Reference Number:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{REF_NUMBER}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Submitted:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{TODAY}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Status:</td><td style="color:#e07b00;font-size:13px;padding:5px 0;font-weight:bold;">Pending Review</td></tr>
  </table>
</div>
<p style="color:#555;font-size:14px;margin-bottom:16px;">Our team will review your application and contact you within 5–7 business days.</p>',
 'informational', 'employer_registration_submitted',
 'Sent to employer upon employer registration submission.', true,
 '[{"key":"{{EMPLOYER_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{TODAY}}"}]', 1),

('Employer Registration Approved', 'EMP_REG_APPROVED', 'email',
 'Employer Registration Approved – {{REF_NUMBER}}',
 'Dear {{EMPLOYER_NAME}}, your employer registration has been approved.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{EMPLOYER_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">We are pleased to confirm that your employer registration <strong>{{REF_NUMBER}}</strong> has been <strong style="color:#1a7a45;">approved</strong>.</p>
<div style="background:#f0faf4;border:1px solid #b7dfc8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Employer Reference:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{REF_NUMBER}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Approval Date:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{TODAY}}</td></tr>
  </table>
</div>
<div style="background:#e8f4fd;border:1px solid #b3d7f0;border-radius:6px;padding:14px;margin-bottom:20px;">
  <p style="color:#1a5276;font-size:13px;margin:0;"><strong>Next Steps:</strong> {{NEXT_STEPS}}</p>
</div>',
 'approval-notification', 'employer_registration_approved',
 'Sent when employer registration is approved.', true,
 '[{"key":"{{EMPLOYER_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{TODAY}}"},{"key":"{{NEXT_STEPS}}"}]', 1),

('Employer Registration Rejected', 'EMP_REG_REJECTED', 'email',
 'Employer Registration Update – {{REF_NUMBER}}',
 'Dear {{EMPLOYER_NAME}}, your employer registration application could not be approved at this time.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{EMPLOYER_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">After careful review, your employer registration application <strong>{{REF_NUMBER}}</strong> has not been approved.</p>
<div style="background:#fdf2f2;border:1px solid #f5c6cb;border-radius:8px;padding:16px;margin-bottom:20px;">
  <p style="color:#c0392b;font-size:13px;margin:0;"><strong>Reason:</strong> {{REJECTION_REASON}}</p>
</div>
<p style="color:#555;font-size:14px;">{{NEXT_STEPS}}</p>',
 'rejection-notification', 'employer_registration_rejected',
 'Sent when employer registration is rejected.', true,
 '[{"key":"{{EMPLOYER_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{REJECTION_REASON}}"},{"key":"{{NEXT_STEPS}}"}]', 1),

-- ═══════════════════════════════════════════════════════
-- MODULE: BENEFITS / CLAIMS
-- ═══════════════════════════════════════════════════════

('Claim Submitted', 'CLAIM_SUBMITTED', 'email',
 'Claim Received – {{CLAIM_NUMBER}}',
 'Dear {{APPLICANT_NAME}}, your {{BENEFIT_TYPE}} claim {{CLAIM_NUMBER}} has been received.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Your <strong>{{BENEFIT_TYPE}}</strong> claim has been successfully submitted and is now under review.</p>
<div style="background:#f0f4fa;border:1px solid #c3d3e8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Claim Number:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{CLAIM_NUMBER}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Benefit Type:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{BENEFIT_TYPE}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">SSN:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{SSN}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Submitted:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{TODAY}}</td></tr>
  </table>
</div>',
 'informational', 'claim_submitted',
 'Sent to insured person when a benefit claim is submitted.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{CLAIM_NUMBER}}"},{"key":"{{BENEFIT_TYPE}}"},{"key":"{{SSN}}"},{"key":"{{TODAY}}"}]', 1),

('Claim Approved', 'CLAIM_APPROVED', 'email',
 'Claim Approved – {{CLAIM_NUMBER}}',
 'Dear {{APPLICANT_NAME}}, your {{BENEFIT_TYPE}} claim has been approved.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">We are pleased to inform you that your <strong>{{BENEFIT_TYPE}}</strong> claim <strong>{{CLAIM_NUMBER}}</strong> has been <strong style="color:#1a7a45;">approved</strong>.</p>
<div style="background:#f0faf4;border:1px solid #b7dfc8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Claim Number:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{CLAIM_NUMBER}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Approved Amount:</td><td style="color:#1a7a45;font-size:13px;padding:5px 0;font-weight:bold;">{{AMOUNT}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Payment Date:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{PAYMENT_DATE}}</td></tr>
  </table>
</div>',
 'approval-notification', 'claim_approved',
 'Sent when a benefit claim is approved.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{CLAIM_NUMBER}}"},{"key":"{{BENEFIT_TYPE}}"},{"key":"{{AMOUNT}}"},{"key":"{{PAYMENT_DATE}}"}]', 1),

('Claim Rejected', 'CLAIM_REJECTED', 'email',
 'Claim Decision – {{CLAIM_NUMBER}}',
 'Dear {{APPLICANT_NAME}}, your {{BENEFIT_TYPE}} claim could not be approved.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">After reviewing your <strong>{{BENEFIT_TYPE}}</strong> claim <strong>{{CLAIM_NUMBER}}</strong>, we are unable to approve it at this time.</p>
<div style="background:#fdf2f2;border:1px solid #f5c6cb;border-radius:8px;padding:16px;margin-bottom:20px;">
  <p style="color:#c0392b;font-size:13px;margin:0;"><strong>Reason:</strong> {{REJECTION_REASON}}</p>
</div>
<p style="color:#555;font-size:14px;">{{NEXT_STEPS}}</p>',
 'rejection-notification', 'claim_rejected',
 'Sent when a benefit claim is rejected.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{CLAIM_NUMBER}}"},{"key":"{{BENEFIT_TYPE}}"},{"key":"{{REJECTION_REASON}}"},{"key":"{{NEXT_STEPS}}"}]', 1),

('Claim Payment Issued', 'CLAIM_PAYMENT_ISSUED', 'email',
 'Payment Processed – {{CLAIM_NUMBER}}',
 'Dear {{APPLICANT_NAME}}, payment for your {{BENEFIT_TYPE}} claim has been issued.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Payment for your <strong>{{BENEFIT_TYPE}}</strong> claim has been successfully processed.</p>
<div style="background:#f0faf4;border:1px solid #b7dfc8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Claim Number:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{CLAIM_NUMBER}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Amount Paid:</td><td style="color:#1a7a45;font-size:13px;padding:5px 0;font-weight:bold;">{{AMOUNT}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Payment Date:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{PAYMENT_DATE}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Period:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{PERIOD}}</td></tr>
  </table>
</div>',
 'informational', 'claim_payment_issued',
 'Sent when payment is issued for an approved claim.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{CLAIM_NUMBER}}"},{"key":"{{BENEFIT_TYPE}}"},{"key":"{{AMOUNT}}"},{"key":"{{PAYMENT_DATE}}"},{"key":"{{PERIOD}}"}]', 1),

-- ═══════════════════════════════════════════════════════
-- MODULE: COMPLIANCE
-- ═══════════════════════════════════════════════════════

('Compliance Notice 1', 'COMP_NOTICE_1', 'email',
 'First Notice – Outstanding Contributions – {{EMPLOYER_NAME}}',
 'Dear {{EMPLOYER_NAME}}, this is a first notice regarding outstanding contributions.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{EMPLOYER_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Our records indicate that contributions for the period <strong>{{PERIOD}}</strong> remain outstanding. This is a formal first notice requesting immediate payment.</p>
<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Case Number:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{CASE_NUMBER}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Outstanding Amount:</td><td style="color:#c0392b;font-size:13px;padding:5px 0;font-weight:bold;">{{AMOUNT}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Period:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{PERIOD}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Payment Due By:</td><td style="color:#c0392b;font-size:13px;padding:5px 0;font-weight:bold;">{{DUE_DATE}}</td></tr>
  </table>
</div>
<p style="color:#555;font-size:14px;margin-bottom:16px;">Failure to pay by the due date may result in penalties and further legal action.</p>',
 'action-required', 'compliance_notice_1',
 'First formal compliance notice sent to employer with outstanding contributions.', true,
 '[{"key":"{{EMPLOYER_NAME}}"},{"key":"{{CASE_NUMBER}}"},{"key":"{{AMOUNT}}"},{"key":"{{PERIOD}}"},{"key":"{{DUE_DATE}}"}]', 1),

('Compliance Final Notice', 'COMP_FINAL_NOTICE', 'email',
 'FINAL NOTICE – Legal Action Pending – {{EMPLOYER_NAME}}',
 'Dear {{EMPLOYER_NAME}}, this is a final notice before legal proceedings are initiated.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{EMPLOYER_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px 0;"><strong style="color:#c0392b;">URGENT:</strong> Despite previous notices, contributions for the period <strong>{{PERIOD}}</strong> remain unpaid. This is your final notice.</p>
<div style="background:#fdf2f2;border:1px solid #f5c6cb;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Case Number:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{CASE_NUMBER}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Total Amount Due:</td><td style="color:#c0392b;font-size:13px;padding:5px 0;font-weight:bold;">{{AMOUNT}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Penalty Amount:</td><td style="color:#c0392b;font-size:13px;padding:5px 0;font-weight:bold;">{{PENALTY_AMOUNT}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Legal Action Date:</td><td style="color:#c0392b;font-size:13px;padding:5px 0;font-weight:bold;">{{DUE_DATE}}</td></tr>
  </table>
</div>
<p style="color:#c0392b;font-size:14px;font-weight:bold;">If payment is not received by {{DUE_DATE}}, this matter will be referred to our Legal department for prosecution.</p>',
 'escalation', 'compliance_final_notice',
 'Final compliance notice before legal escalation.', true,
 '[{"key":"{{EMPLOYER_NAME}}"},{"key":"{{CASE_NUMBER}}"},{"key":"{{AMOUNT}}"},{"key":"{{PENALTY_AMOUNT}}"},{"key":"{{PERIOD}}"},{"key":"{{DUE_DATE}}"}]', 1),

('Compliance Legal Escalated', 'COMP_LEGAL_ESCALATED', 'email',
 'Matter Referred to Legal – {{CASE_NUMBER}}',
 'Dear {{EMPLOYER_NAME}}, your case has been referred to our Legal department.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{EMPLOYER_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Due to continued non-compliance, your case <strong>{{CASE_NUMBER}}</strong> has been formally referred to the Legal department of the Social Security Board.</p>
<div style="background:#fdf2f2;border:1px solid #f5c6cb;border-radius:8px;padding:20px;margin-bottom:20px;">
  <p style="color:#c0392b;font-size:13px;font-weight:bold;margin:0;">Outstanding Amount: {{AMOUNT}} | Period: {{PERIOD}}</p>
</div>
<p style="color:#555;font-size:14px;">Legal proceedings may be initiated. To avoid further action, contact our office immediately.</p>',
 'escalation', 'compliance_legal_escalated',
 'Sent when compliance case is escalated to legal department.', true,
 '[{"key":"{{EMPLOYER_NAME}}"},{"key":"{{CASE_NUMBER}}"},{"key":"{{AMOUNT}}"},{"key":"{{PERIOD}}"},{"key":"{{OFFICE_PHONE}}"},{"key":"{{OFFICE_EMAIL}}"}]', 1),

('Inspection Scheduled', 'INSPECTION_SCHEDULED', 'email',
 'Compliance Inspection Scheduled – {{EMPLOYER_NAME}}',
 'Dear {{EMPLOYER_NAME}}, a compliance inspection has been scheduled.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{EMPLOYER_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">A compliance inspection has been scheduled for your establishment.</p>
<div style="background:#f0faf4;border:1px solid #b7dfc8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Date:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{MEETING_DATE}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Inspector:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{INSPECTOR_NAME}}</td></tr>
  </table>
</div>
<p style="color:#555;font-size:14px;">Please ensure all wage books and employment records are available for inspection.</p>',
 'informational', 'inspection_scheduled',
 'Sent to employer when compliance inspection is scheduled.', true,
 '[{"key":"{{EMPLOYER_NAME}}"},{"key":"{{MEETING_DATE}}"},{"key":"{{INSPECTOR_NAME}}"}]', 1),

-- ═══════════════════════════════════════════════════════
-- MODULE: FINANCE / C3 / BEMA
-- ═══════════════════════════════════════════════════════

('C3 Submission Confirmed', 'C3_SUBMITTED', 'email',
 'C3 Submission Confirmed – {{PERIOD}}',
 'Dear {{EMPLOYER_NAME}}, your C3 contribution return for {{PERIOD}} has been received.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{EMPLOYER_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Your C3 contribution return for the period <strong>{{PERIOD}}</strong> has been successfully received.</p>
<div style="background:#f0f4fa;border:1px solid #c3d3e8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Period:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{PERIOD}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Total Amount:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{AMOUNT}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Submitted:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{TODAY}}</td></tr>
  </table>
</div>',
 'informational', 'c3_submission_confirmed',
 'Sent when C3 return is confirmed received.', true,
 '[{"key":"{{EMPLOYER_NAME}}"},{"key":"{{PERIOD}}"},{"key":"{{AMOUNT}}"},{"key":"{{TODAY}}"}]', 1),

('Payment Overdue', 'PAYMENT_OVERDUE', 'email',
 'Payment Overdue – {{PERIOD}}',
 'Dear {{EMPLOYER_NAME}}, your payment for the period {{PERIOD}} is overdue.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{EMPLOYER_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Your contribution payment for <strong>{{PERIOD}}</strong> is now overdue. Please make payment immediately to avoid penalties.</p>
<div style="background:#fdf2f2;border:1px solid #f5c6cb;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Amount Due:</td><td style="color:#c0392b;font-size:13px;padding:5px 0;font-weight:bold;">{{AMOUNT}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Period:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{PERIOD}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Penalty (if not paid):</td><td style="color:#c0392b;font-size:13px;padding:5px 0;">{{PENALTY_AMOUNT}}</td></tr>
  </table>
</div>',
 'reminder', 'payment_overdue',
 'Sent when an employer payment is overdue.', true,
 '[{"key":"{{EMPLOYER_NAME}}"},{"key":"{{PERIOD}}"},{"key":"{{AMOUNT}}"},{"key":"{{PENALTY_AMOUNT}}"},{"key":"{{DUE_DATE}}"}]', 1),

('Payment Plan Created', 'PAYMENT_PLAN_CREATED', 'email',
 'Payment Plan Confirmed – {{EMPLOYER_NAME}}',
 'Dear {{EMPLOYER_NAME}}, your payment plan has been set up.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{EMPLOYER_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">A payment plan has been established for your outstanding balance.</p>
<div style="background:#f0f4fa;border:1px solid #c3d3e8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Total Debt:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{AMOUNT}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">First Payment Due:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{DUE_DATE}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Remarks:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{REMARKS}}</td></tr>
  </table>
</div>',
 'informational', 'payment_plan_created',
 'Sent when a payment plan is established for an employer.', true,
 '[{"key":"{{EMPLOYER_NAME}}"},{"key":"{{AMOUNT}}"},{"key":"{{DUE_DATE}}"},{"key":"{{REMARKS}}"}]', 1),

('Fee Waiver Approved', 'WAIVER_APPROVED', 'email',
 'Fee Waiver Approved – {{EMPLOYER_NAME}}',
 'Dear {{EMPLOYER_NAME}}, your fee waiver request has been approved.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{EMPLOYER_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Your fee waiver request has been <strong style="color:#1a7a45;">approved</strong>.</p>
<div style="background:#f0faf4;border:1px solid #b7dfc8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Approved Amount:</td><td style="color:#1a7a45;font-size:13px;padding:5px 0;font-weight:bold;">{{AMOUNT}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Remarks:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{REMARKS}}</td></tr>
  </table>
</div>',
 'approval-notification', 'waiver_approved',
 'Sent when a fee waiver is approved.', true,
 '[{"key":"{{EMPLOYER_NAME}}"},{"key":"{{AMOUNT}}"},{"key":"{{REMARKS}}"}]', 1),

('Fee Waiver Rejected', 'WAIVER_REJECTED', 'email',
 'Fee Waiver Decision – {{EMPLOYER_NAME}}',
 'Dear {{EMPLOYER_NAME}}, your fee waiver request has not been approved.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{EMPLOYER_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">After review, your fee waiver request has not been approved.</p>
<div style="background:#fdf2f2;border:1px solid #f5c6cb;border-radius:8px;padding:16px;margin-bottom:20px;">
  <p style="color:#c0392b;font-size:13px;margin:0;"><strong>Reason:</strong> {{REJECTION_REASON}}</p>
</div>
<p style="color:#555;font-size:14px;">{{NEXT_STEPS}}</p>',
 'rejection-notification', 'waiver_rejected',
 'Sent when a fee waiver request is rejected.', true,
 '[{"key":"{{EMPLOYER_NAME}}"},{"key":"{{REJECTION_REASON}}"},{"key":"{{NEXT_STEPS}}"}]', 1),

-- ═══════════════════════════════════════════════════════
-- MODULE: SYSTEM / ADMIN
-- ═══════════════════════════════════════════════════════

('User Account Created', 'USER_ACCOUNT_CREATED', 'email',
 'Your Account Has Been Created',
 'Your account on the Social Security Board portal has been created.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Your account on the Social Security Board portal has been successfully created.</p>
<div style="background:#f0f4fa;border:1px solid #c3d3e8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Username:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{USERNAME}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Created:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{TODAY}}</td></tr>
  </table>
</div>
<div style="background:#e8f4fd;border:1px solid #b3d7f0;border-radius:6px;padding:14px;margin-bottom:20px;">
  <p style="color:#1a5276;font-size:13px;margin:0;"><strong>Next Steps:</strong> {{NEXT_STEPS}}</p>
</div>',
 'informational', 'user_account_created',
 'Sent when a new user account is created by an administrator.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{USERNAME}}"},{"key":"{{TODAY}}"},{"key":"{{NEXT_STEPS}}"}]', 1),

('Password Reset Request', 'PASSWORD_RESET', 'email',
 'Password Reset Request',
 'We received a request to reset your password.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">We received a request to reset the password for your account. Click the button below to set a new password.</p>
<div style="text-align:center;margin:28px 0;">
  <a href="{{RESET_LINK}}" style="background-color:#1a3353;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:bold;display:inline-block;">Reset My Password</a>
</div>
<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:14px;margin-bottom:20px;">
  <p style="color:#7d6608;font-size:13px;margin:0;"><strong>Important:</strong> This link will expire in {{EXPIRY_DATE}}. If you did not request this, please ignore this email and your password will remain unchanged.</p>
</div>',
 'action-required', 'password_reset_requested',
 'Sent when a user requests a password reset.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{RESET_LINK}}"},{"key":"{{EXPIRY_DATE}}"}]', 1),

('API Key Generated', 'API_KEY_GENERATED', 'email',
 'New API Key Generated',
 'A new API key has been generated for your account.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">A new API key has been generated for your account on <strong>{{TODAY}}</strong>.</p>
<div style="background:#f0f4fa;border:1px solid #c3d3e8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <p style="color:#555;font-size:13px;margin:0 0 8px 0;">Key (partial): <code style="background:#e9ecef;padding:2px 8px;border-radius:4px;font-family:monospace;">{{API_KEY}}</code></p>
</div>
<div style="background:#fdf2f2;border:1px solid #f5c6cb;border-radius:6px;padding:14px;margin-bottom:20px;">
  <p style="color:#c0392b;font-size:13px;margin:0;"><strong>Security Alert:</strong> If you did not request this key, contact our security team immediately.</p>
</div>',
 'system-alert', 'api_key_generated',
 'Sent when an API key is generated for a user account.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{TODAY}}"},{"key":"{{API_KEY}}"}]', 1),

('Role Assigned', 'ROLE_ASSIGNED', 'email',
 'Role Assignment Update',
 'Your system role has been updated.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">Your role in the Social Security Board portal has been updated.</p>
<div style="background:#f0f4fa;border:1px solid #c3d3e8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">New Role:</td><td style="color:#1a3353;font-size:13px;padding:5px 0;font-weight:bold;">{{ASSIGNED_ROLE}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Effective Date:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{TODAY}}</td></tr>
  </table>
</div>',
 'informational', 'role_assigned',
 'Sent when a user role is assigned or changed.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{ASSIGNED_ROLE}}"},{"key":"{{TODAY}}"}]', 1),

('Security Alert', 'SECURITY_ALERT', 'email',
 'Security Alert – Unusual Activity Detected',
 'We detected unusual activity on your account.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;"><strong style="color:#c0392b;">Security Alert:</strong> Unusual activity has been detected on your account.</p>
<div style="background:#fdf2f2;border:1px solid #f5c6cb;border-radius:8px;padding:20px;margin-bottom:20px;">
  <p style="color:#555;font-size:13px;margin:0;">{{REMARKS}}</p>
</div>
<p style="color:#555;font-size:14px;">If this was you, no action is needed. If not, please contact our security team immediately at <a href="mailto:{{OFFICE_EMAIL}}" style="color:#1a3353;">{{OFFICE_EMAIL}}</a>.</p>',
 'system-alert', 'security_alert',
 'Sent when unusual security activity is detected.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{REMARKS}}"},{"key":"{{OFFICE_EMAIL}}"},{"key":"{{OFFICE_PHONE}}"}]', 1),

-- ═══════════════════════════════════════════════════════
-- MODULE: WORKFLOW
-- ═══════════════════════════════════════════════════════

('Workflow Task Assigned', 'WF_TASK_ASSIGNED', 'email',
 'New Task Assigned: {{TASK_NAME}}',
 'A new workflow task has been assigned to you.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{ASSIGNED_TO}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">A new workflow task has been assigned to you and requires your attention.</p>
<div style="background:#f0f4fa;border:1px solid #c3d3e8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Task:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{TASK_NAME}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Related To:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{REF_NUMBER}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">SLA Deadline:</td><td style="color:#c0392b;font-size:13px;padding:5px 0;font-weight:bold;">{{SLA_DEADLINE}}</td></tr>
  </table>
</div>
<div style="background:#e8f4fd;border:1px solid #b3d7f0;border-radius:6px;padding:14px;margin-bottom:20px;">
  <p style="color:#1a5276;font-size:13px;margin:0;"><strong>Action Required:</strong> {{NEXT_STEPS}}</p>
</div>',
 'action-required', 'workflow_task_assigned',
 'Sent to staff when a workflow task is assigned to them.', true,
 '[{"key":"{{ASSIGNED_TO}}"},{"key":"{{TASK_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{SLA_DEADLINE}}"},{"key":"{{NEXT_STEPS}}"}]', 1),

('Workflow SLA Breach', 'WF_SLA_BREACH', 'email',
 'SLA Breach Alert – {{TASK_NAME}}',
 'A workflow task has breached its SLA deadline.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{ASSIGNED_TO}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;"><strong style="color:#c0392b;">SLA Breach Alert:</strong> The following task has exceeded its deadline.</p>
<div style="background:#fdf2f2;border:1px solid #f5c6cb;border-radius:8px;padding:20px;margin-bottom:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="color:#555;font-size:13px;padding:5px 0;width:40%;">Task:</td><td style="color:#222;font-size:13px;padding:5px 0;font-weight:bold;">{{TASK_NAME}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Reference:</td><td style="color:#222;font-size:13px;padding:5px 0;">{{REF_NUMBER}}</td></tr>
    <tr><td style="color:#555;font-size:13px;padding:5px 0;">Deadline Was:</td><td style="color:#c0392b;font-size:13px;padding:5px 0;font-weight:bold;">{{SLA_DEADLINE}}</td></tr>
  </table>
</div>
<p style="color:#c0392b;font-size:14px;font-weight:bold;">Immediate action is required to prevent further escalation.</p>',
 'escalation', 'workflow_sla_breach',
 'Sent when a workflow task SLA deadline is breached.', true,
 '[{"key":"{{ASSIGNED_TO}}"},{"key":"{{TASK_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{SLA_DEADLINE}}"}]', 1),

('Workflow Completed', 'WF_COMPLETED', 'email',
 'Workflow Completed – {{REF_NUMBER}}',
 'The workflow for {{REF_NUMBER}} has been completed.',
 '<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px 0;">Dear <strong>{{APPLICANT_NAME}}</strong>,</p>
<p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px 0;">The processing workflow for your case <strong>{{REF_NUMBER}}</strong> has been <strong style="color:#1a7a45;">completed</strong>.</p>
<div style="background:#f0faf4;border:1px solid #b7dfc8;border-radius:8px;padding:20px;margin-bottom:20px;">
  <p style="color:#555;font-size:13px;margin:0;"><strong>Outcome:</strong> {{STATUS}}</p>
  <p style="color:#555;font-size:13px;margin:8px 0 0 0;"><strong>Remarks:</strong> {{REMARKS}}</p>
</div>',
 'informational', 'workflow_completed',
 'Sent when all workflow steps for a case are completed.', true,
 '[{"key":"{{APPLICANT_NAME}}"},{"key":"{{REF_NUMBER}}"},{"key":"{{STATUS}}"},{"key":"{{REMARKS}}"}]', 1)

ON CONFLICT (name) DO NOTHING;
