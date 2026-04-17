-- C3 Email Templates table (master-mirror sync pattern, matches c3_site_settings/c3_email_config)
CREATE TABLE IF NOT EXISTS public.c3_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100) NOT NULL UNIQUE,
  template_name VARCHAR(200) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  from_module VARCHAR(50) NOT NULL DEFAULT 'notifications',
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  is_synced BOOLEAN NOT NULL DEFAULT false,
  sync_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR(50),
  updated_by VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_c3_email_templates_module ON public.c3_email_templates (from_module) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_c3_email_templates_pending ON public.c3_email_templates (is_synced) WHERE is_synced = false AND is_deleted = false;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_c3_email_templates_updated_at ON public.c3_email_templates;
CREATE TRIGGER trg_c3_email_templates_updated_at
  BEFORE UPDATE ON public.c3_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 13 templates from C3-Wizard production export
INSERT INTO public.c3_email_templates (template_key, template_name, subject, html_body, text_body, from_module, variables, is_active, created_by) VALUES
('account_deactivation', 'Account Deactivation Email', 'C3 Remittances — Account Deactivation', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #dc2626; color: white; padding: 20px; text-align: center;"><h1>Account Deactivated</h1></div>
  <div style="padding: 20px; background: #f9fafb;">
    <p>Dear {{name}},</p>
    <p>Your C3 Wizard account has been <strong>deactivated</strong>.</p>
    <p>If you believe this is an error, please contact support.</p>
  </div>
  <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;"><p>St. Kitts & Nevis Social Security Board</p></div>
</div>', '', 'registration', '["name"]'::jsonb, true, 'SEED-IMPORT'),
('password_reset', 'Password Reset Email', 'C3 Wizard Reset Your Password!', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #16A34A; color: white; padding: 20px; text-align: center;"><h1>Password Reset</h1></div>
  <div style="padding: 20px; background: #f9fafb;">
    <p>Dear {{name}},</p>
    <p>You requested to reset your password. Click the button below:</p>
    <p style="text-align: center;"><a href="{{resetUrl}}" style="display: inline-block; padding: 12px 24px; background: #16A34A; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
    <p>This link will expire in 1 hour.</p>
  </div>
  <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;"><p>St. Kitts & Nevis Social Security Board</p></div>
</div>', '', 'identity', '["name","resetUrl"]'::jsonb, true, 'SEED-IMPORT'),
('payment_receipt', 'Payment Receipt Email', 'C3 Remittances Transaction {{name}}', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #16A34A; color: white; padding: 20px; text-align: center;"><h1>Payment Receipt</h1></div>
  <div style="padding: 20px; background: #f9fafb;">
    <p>Dear {{name}},</p>
    <p>Your payment has been processed successfully.</p>
    <div style="background: white; padding: 15px; border-radius: 4px; margin: 10px 0;">
      <p><strong>Receipt Number:</strong> {{receiptNumber}}</p>
      <p><strong>Amount:</strong> ${{amount}}</p>
      <p><strong>Date:</strong> {{date}}</p>
      <p><strong>Period:</strong> {{period}}</p>
      <p><strong>Status:</strong> {{paymentStatus}}</p>
    </div>
  </div>
  <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;"><p>St. Kitts & Nevis Social Security Board</p></div>
</div>', '', 'finance', '["name","receiptNumber","amount","date","period","paymentStatus"]'::jsonb, true, 'SEED-IMPORT'),
('account_activation', 'Account Activation Email', 'C3 Remittances — Account Activation', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #16A34A; color: white; padding: 20px; text-align: center;"><h1>Account Activated</h1></div>
  <div style="padding: 20px; background: #f9fafb;">
    <p>Dear {{name}},</p>
    <p>Your C3 Wizard account has been <strong>activated</strong>.</p>
    <p><a href="{{loginUrl}}" style="display: inline-block; padding: 12px 24px; background: #16A34A; color: white; text-decoration: none; border-radius: 4px;">Login Now</a></p>
  </div>
  <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;"><p>St. Kitts & Nevis Social Security Board</p></div>
</div>', '', 'registration', '["name","loginUrl"]'::jsonb, true, 'SEED-IMPORT'),
('c3_submission_confirmation', 'C3 Form Submitted', 'C3 Form Submitted - {{period}}', '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #16A34A; color: white; padding: 20px; text-align: center;"><h1>C3 Form Submitted</h1></div>
  <div style="padding: 20px; background: #f9fafb;">
    <p>Dear {{name}},</p>
    <p>Your C3 contribution form has been submitted.</p>
    <div style="background: white; padding: 15px; border-radius: 4px; margin: 10px 0;">
      <p><strong>Period:</strong> {{period}}</p>
      <p><strong>Employees:</strong> {{employeeCount}}</p>
      <p><strong>Total Amount:</strong> ${{totalAmount}}</p>
    </div>
  </div>
  <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;"><p>St. Kitts & Nevis Social Security Board</p></div>
</div>', '', 'contributions', '["name","period","employeeCount","totalAmount"]'::jsonb, true, 'SEED-IMPORT')
ON CONFLICT (template_key) DO NOTHING;