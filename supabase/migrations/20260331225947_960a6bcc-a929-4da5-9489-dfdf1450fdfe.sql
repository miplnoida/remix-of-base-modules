
-- Drop the FK constraint on triggered_by so user code strings can be stored
ALTER TABLE public.notification_logs DROP CONSTRAINT IF EXISTS notification_logs_triggered_by_fkey;

-- Seed invoice email template
INSERT INTO public.notification_templates (
  name, template_code, channel, subject, body, html_body, placeholders, 
  is_enabled, trigger_event, category, description, version_no
) VALUES (
  'Invoice Email Notification',
  'INVOICE_EMAIL',
  'email',
  'Invoice {{DOCUMENT_NUMBER}} — Social Security Board',
  'Your invoice {{DOCUMENT_NUMBER}} has been generated for {{TOTAL_AMOUNT}} {{CURRENCY_CODE}}.',
  '<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Dear <strong>{{PAYER_NAME}}</strong>,</p>
<p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">Please find attached your invoice. Details are summarized below:</p>
<div style="background: #f0faf4; border: 1px solid #b7dfc8; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
  <h3 style="color: #1a7a45; margin: 0 0 12px 0; font-size: 15px;">Invoice Details</h3>
  <table style="width:100%; border-collapse: collapse;">
    <tr><td style="color:#555; font-size:13px; padding:4px 0; width:40%;">Invoice Number:</td><td style="color:#222; font-size:13px; padding:4px 0; font-weight:bold;">{{DOCUMENT_NUMBER}}</td></tr>
    <tr><td style="color:#555; font-size:13px; padding:4px 0;">Date:</td><td style="color:#222; font-size:13px; padding:4px 0;">{{DOCUMENT_DATE}}</td></tr>
    <tr><td style="color:#555; font-size:13px; padding:4px 0;">Payer ID:</td><td style="color:#222; font-size:13px; padding:4px 0;">{{PAYER_ID}}</td></tr>
    <tr><td style="color:#555; font-size:13px; padding:4px 0;">Total Amount:</td><td style="color:#222; font-size:13px; padding:4px 0; font-weight:bold;">{{CURRENCY_CODE}} {{TOTAL_AMOUNT}}</td></tr>
  </table>
</div>
<p style="color: #777; font-size: 13px; margin-top: 24px;">If you have any questions regarding this invoice, please contact our office.</p>',
  '[{"key":"{{DOCUMENT_NUMBER}}"},{"key":"{{PAYER_NAME}}"},{"key":"{{PAYER_ID}}"},{"key":"{{TOTAL_AMOUNT}}"},{"key":"{{CURRENCY_CODE}}"},{"key":"{{DOCUMENT_DATE}}"}]'::jsonb,
  true,
  'invoice_email_sent',
  'informational',
  'Email sent to payer when an invoice is created. The full invoice document is attached as an HTML file.',
  1
)
ON CONFLICT DO NOTHING;

-- Seed receipt email template
INSERT INTO public.notification_templates (
  name, template_code, channel, subject, body, html_body, placeholders,
  is_enabled, trigger_event, category, description, version_no
) VALUES (
  'Receipt Email Notification',
  'RECEIPT_EMAIL',
  'email',
  'Receipt {{DOCUMENT_NUMBER}} — Social Security Board',
  'Your receipt {{DOCUMENT_NUMBER}} has been generated for {{TOTAL_AMOUNT}} {{CURRENCY_CODE}}.',
  '<p style="color: #333; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Dear <strong>{{PAYER_NAME}}</strong>,</p>
<p style="color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">Please find attached your payment receipt. Details are summarized below:</p>
<div style="background: #f0f4fa; border: 1px solid #b7c8df; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
  <h3 style="color: #1a457a; margin: 0 0 12px 0; font-size: 15px;">Receipt Details</h3>
  <table style="width:100%; border-collapse: collapse;">
    <tr><td style="color:#555; font-size:13px; padding:4px 0; width:40%;">Receipt Number:</td><td style="color:#222; font-size:13px; padding:4px 0; font-weight:bold;">{{DOCUMENT_NUMBER}}</td></tr>
    <tr><td style="color:#555; font-size:13px; padding:4px 0;">Date:</td><td style="color:#222; font-size:13px; padding:4px 0;">{{DOCUMENT_DATE}}</td></tr>
    <tr><td style="color:#555; font-size:13px; padding:4px 0;">Payer ID:</td><td style="color:#222; font-size:13px; padding:4px 0;">{{PAYER_ID}}</td></tr>
    <tr><td style="color:#555; font-size:13px; padding:4px 0;">Total Amount:</td><td style="color:#222; font-size:13px; padding:4px 0; font-weight:bold;">{{CURRENCY_CODE}} {{TOTAL_AMOUNT}}</td></tr>
  </table>
</div>
<p style="color: #777; font-size: 13px; margin-top: 24px;">Thank you for your payment. If you have any questions, please contact our office.</p>',
  '[{"key":"{{DOCUMENT_NUMBER}}"},{"key":"{{PAYER_NAME}}"},{"key":"{{PAYER_ID}}"},{"key":"{{TOTAL_AMOUNT}}"},{"key":"{{CURRENCY_CODE}}"},{"key":"{{DOCUMENT_DATE}}"}]'::jsonb,
  true,
  'receipt_email_sent',
  'informational',
  'Email sent to payer when a receipt is created. The full receipt document is attached as an HTML file.',
  1
)
ON CONFLICT DO NOTHING;
